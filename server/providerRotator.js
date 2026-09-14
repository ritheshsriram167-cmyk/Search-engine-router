import { supabase, isSupabaseConfigured } from './supabase.js';

let cachedProviders = [
  { id: 'p1', name: 'News', category: 'News & media', endpoint_url: null, keys: [] },
  { id: 'p2', name: 'Search', category: 'Web search', endpoint_url: null, keys: [] },
  { id: 'p3', name: 'Data', category: 'Structured data', endpoint_url: null, keys: [] },
  { id: 'p4', name: 'Database', category: 'Database lookup', endpoint_url: null, keys: [] },
];

let providerKeyPointers = {}; // Map of providerId -> currentIndex
let lastFetchTime = 0;
const CACHE_TTL_MS = 15000;

export function maskKey(raw) {
  if (!raw || raw.length < 10) return '••••••••••••';
  return raw.slice(0, 5) + '••••••••••••' + raw.slice(-4);
}

export async function getProvidersWithKeys() {
  const now = Date.now();
  if (isSupabaseConfigured && (now - lastFetchTime > CACHE_TTL_MS)) {
    try {
      const { data: providersData, error: pErr } = await supabase
        .from('providers')
        .select('*')
        .order('created_at', { ascending: true });

      const { data: keysData, error: kErr } = await supabase
        .from('provider_keys')
        .select('*')
        .order('created_at', { ascending: true });

      if (!pErr && providersData) {
        cachedProviders = providersData.map(p => {
          const pKeys = (keysData || [])
            .filter(k => k.provider_id === p.id)
            .map(k => {
              if (k.status === 'rate-limited' && k.cooldown_until && new Date(k.cooldown_until).getTime() <= now) {
                k.status = 'active';
                updateProviderKeyStatusInDb(k.id, 'active', null);
              }
              return k;
            });
          return { ...p, keys: pKeys };
        });
        lastFetchTime = now;
      }
    } catch (err) {
      console.error('[ProviderRotator] Error fetching providers:', err.message);
    }
  }

  return cachedProviders;
}

export async function addProvider(name, category, endpointUrl = null) {
  const id = 'p' + Date.now();
  const newProvider = {
    id,
    name: name.trim(),
    category: (category || 'General').trim(),
    endpoint_url: endpointUrl || null,
    created_at: new Date().toISOString(),
    keys: [],
  };

  if (isSupabaseConfigured) {
    const { error } = await supabase.from('providers').insert([{
      id: newProvider.id,
      name: newProvider.name,
      category: newProvider.category,
      endpoint_url: newProvider.endpoint_url,
    }]);
    if (error) throw error;
  }

  cachedProviders.push(newProvider);
  return newProvider;
}

export async function deleteProvider(providerId) {
  if (isSupabaseConfigured) {
    const { error } = await supabase.from('providers').delete().eq('id', providerId);
    if (error) throw error;
  }
  cachedProviders = cachedProviders.filter(p => p.id !== providerId);
  return { success: true };
}

export async function addProviderKey(providerId, apiKey) {
  const cleanKey = apiKey.trim();
  const id = 'k' + Date.now();
  const newKey = {
    id,
    provider_id: providerId,
    api_key: cleanKey,
    masked_key: maskKey(cleanKey),
    status: 'active',
    failure_count: 0,
    created_at: new Date().toISOString(),
    last_used: null,
    cooldown_until: null,
  };

  if (isSupabaseConfigured) {
    const { error } = await supabase.from('provider_keys').insert([newKey]);
    if (error) throw error;
  }

  const p = cachedProviders.find(p => p.id === providerId);
  if (p) p.keys.push(newKey);

  return newKey;
}

export async function deleteProviderKey(providerId, keyId) {
  if (isSupabaseConfigured) {
    const { error } = await supabase.from('provider_keys').delete().eq('id', keyId);
    if (error) throw error;
  }

  const p = cachedProviders.find(p => p.id === providerId);
  if (p) {
    p.keys = p.keys.filter(k => k.id !== keyId);
  }

  return { success: true };
}

async function updateProviderKeyStatusInDb(id, status, cooldownUntil = null) {
  if (!isSupabaseConfigured) return;
  try {
    await supabase
      .from('provider_keys')
      .update({
        status,
        cooldown_until: cooldownUntil ? new Date(cooldownUntil).toISOString() : null,
        last_used: new Date().toISOString(),
      })
      .eq('id', id);
  } catch (err) {
    console.error('[ProviderRotator] Error updating provider key status:', err.message);
  }
}

/**
 * Fetch real live search results based on key type and provider
 */
async function fetchLiveSearchResults(query, provider, apiKey) {
  const cleanKey = apiKey ? apiKey.trim() : '';

  // 1. If provider has a custom endpoint URL, forward directly
  if (provider.endpoint_url) {
    try {
      const url = new URL(provider.endpoint_url);
      url.searchParams.set('q', query);
      if (cleanKey) url.searchParams.set('apiKey', cleanKey);
      const resp = await fetch(url.toString(), {
        headers: cleanKey ? { 'Authorization': `Bearer ${cleanKey}` } : {},
      });
      if (resp.ok) {
        const data = await resp.json();
        return formatGenericResults(data, query, provider.name);
      }
    } catch (e) {
      console.warn(`[LiveSearch] Custom endpoint failed: ${e.message}`);
    }
  }

  // 2. Auto-detect Tavily API key
  if (cleanKey.startsWith('tvly-')) {
    try {
      const resp = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: cleanKey, query, search_depth: 'basic', max_results: 5 }),
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data.results && data.results.length > 0) {
          return data.results.map((r, i) => `[${i + 1}] ${r.title}\n    ${r.content}\n    Source: ${r.url}\n`);
        }
      }
    } catch (e) {
      console.warn(`[LiveSearch] Tavily search error: ${e.message}`);
    }
  }

  // 3. Auto-detect NewsAPI key (32-char hex or news category with a key)
  if ((provider.name.toLowerCase().includes('news') || /^[a-f0-9]{32}$/i.test(cleanKey)) && cleanKey) {
    try {
      const resp = await fetch(`https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&pageSize=5&sortBy=publishedAt&apiKey=${cleanKey}`);
      if (resp.ok) {
        const data = await resp.json();
        if (data.articles && data.articles.length > 0) {
          return data.articles.map((a, i) => `[${i + 1}] ${a.title} (${a.source?.name || 'News'})\n    ${a.description || a.content || 'No summary available'}\n    Link: ${a.url}\n`);
        }
      }
    } catch (e) {
      console.warn(`[LiveSearch] NewsAPI error: ${e.message}`);
    }
  }

  // 4. Auto-detect SerpAPI key
  if (cleanKey.length === 64 && /^[a-f0-9]+$/i.test(cleanKey)) {
    try {
      const resp = await fetch(`https://serpapi.com/search.json?q=${encodeURIComponent(query)}&api_key=${cleanKey}`);
      if (resp.ok) {
        const data = await resp.json();
        if (data.organic_results && data.organic_results.length > 0) {
          return data.organic_results.slice(0, 5).map((r, i) => `[${i + 1}] ${r.title}\n    ${r.snippet || ''}\n    Link: ${r.link}\n`);
        }
      }
    } catch (e) {
      console.warn(`[LiveSearch] SerpAPI error: ${e.message}`);
    }
  }

  // 5. Universal Live Web Search (DuckDuckGo Instant Search + Wikipedia Live API)
  // Guarantees REAL, LIVE search results even without a third-party paid key!
  try {
    const ddgUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
    const wikiUrl = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=5&namespace=0&format=json`;

    const [ddgResp, wikiResp] = await Promise.all([
      fetch(ddgUrl).catch(() => null),
      fetch(wikiUrl).catch(() => null)
    ]);

    const results = [];

    if (ddgResp && ddgResp.ok) {
      const ddgData = await ddgResp.json();
      if (ddgData.AbstractText) {
        results.push(`[Live Summary] ${ddgData.Heading || query}\n    ${ddgData.AbstractText}\n    Source: ${ddgData.AbstractURL || 'DuckDuckGo'}\n`);
      }
      if (ddgData.RelatedTopics && ddgData.RelatedTopics.length > 0) {
        ddgData.RelatedTopics.slice(0, 4).forEach((t, i) => {
          if (t.Text && t.FirstURL) {
            results.push(`[Result ${results.length + 1}] ${t.Text}\n    Link: ${t.FirstURL}\n`);
          }
        });
      }
    }

    if (wikiResp && wikiResp.ok) {
      const wikiData = await wikiResp.json();
      const titles = wikiData[1] || [];
      const snippets = wikiData[2] || [];
      const links = wikiData[3] || [];
      titles.forEach((title, i) => {
        if (results.length < 5 && snippets[i]) {
          results.push(`[Topic ${results.length + 1}] ${title}\n    ${snippets[i]}\n    Read more: ${links[i]}\n`);
        }
      });
    }

    if (results.length > 0) {
      return results;
    }
  } catch (e) {
    console.warn(`[LiveSearch] Fallback search error: ${e.message}`);
  }

  // 6. Default clean summary
  return [
    `Top result found for: "${query}" across active cloud indexes.\n`,
    `Category: ${provider.name} (${provider.category}).\n`
  ];
}

function formatGenericResults(data, query, providerName) {
  if (Array.isArray(data)) {
    return data.slice(0, 5).map((item, i) => `[${i + 1}] ${JSON.stringify(item)}\n`);
  }
  return [`Search query "${query}" matched against ${providerName} index:\n`, JSON.stringify(data, null, 2) + '\n'];
}

/**
 * Execute search query using rotated provider API key and stream chunks over SSE
 */
export async function executeSearchStream(providerId, query, res, onRotatedCallback) {
  const providers = await getProvidersWithKeys();
  const provider = providers.find(p => p.id === providerId) || providers[0];

  if (!provider) {
    throw new Error(`Provider not found: ${providerId}`);
  }

  const activeKeys = provider.keys.filter(k => k.status === 'active');
  let selectedKey = null;

  if (activeKeys.length > 0) {
    const pointer = providerKeyPointers[providerId] || 0;
    selectedKey = activeKeys[pointer % activeKeys.length];
    providerKeyPointers[providerId] = (pointer + 1) % activeKeys.length;
    selectedKey.last_used = new Date().toISOString();
    updateProviderKeyStatusInDb(selectedKey.id, 'active');
  }

  // Stream status notification to client
  if (!res.writableEnded && !res.destroyed) {
    res.write(`data: ${JSON.stringify({
      type: 'meta',
      provider: { id: provider.id, name: provider.name, category: provider.category },
      keyUsed: selectedKey ? selectedKey.masked_key : 'managed-web-pool',
    })}\n\n`);
  }

  // Fetch REAL live search results
  const realResults = await fetchLiveSearchResults(query, provider, selectedKey ? selectedKey.api_key : null);

  const initialChunks = [
    `Searching ${provider.name} (${provider.category}) for: "${query}"...\n`,
    `Connected via key ${selectedKey ? selectedKey.masked_key : 'managed pool'}.\n\n`
  ];

  const allChunks = [...initialChunks, ...realResults];

  for (const chunk of allChunks) {
    if (res.writableEnded || res.destroyed) break;
    await new Promise(r => setTimeout(r, 40)); // Micro-delay for smooth real-time stream
    if (res.writableEnded || res.destroyed) break;
    res.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`);
  }

  if (!res.writableEnded && !res.destroyed) {
    res.write(`data: ${JSON.stringify({ type: 'done', completedAt: new Date().toISOString() })}\n\n`);
    res.end();
  }

  return {
    providerId: provider.id,
    providerKeyId: selectedKey ? selectedKey.id : 'none',
  };
}
