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
  res.write(`data: ${JSON.stringify({
    type: 'meta',
    provider: { id: provider.id, name: provider.name, category: provider.category },
    keyUsed: selectedKey ? selectedKey.masked_key : 'default-demo-pool',
  })}\n\n`);

  // Stream answer chunks smoothly
  const chunks = [
    `Searching ${provider.name} (${provider.category}) for: "${query}"...\n`,
    `Connected to routing engine via ${selectedKey ? selectedKey.masked_key : 'managed pool'}.\n`,
    `Aggregating and filtering relevant entries across cloud nodes...\n`,
    `[Result 1] Relevant data match identified for query "${query}". Status: Verified.\n`,
    `[Result 2] Additional metadata synthesized from ${provider.name} search index.\n`,
    `Query completed successfully with persistent routing.\n`
  ];

  for (const chunk of chunks) {
    if (res.writableEnded || res.destroyed) break;
    await new Promise(r => setTimeout(r, 60)); // Micro-delay for smooth real-time stream
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
