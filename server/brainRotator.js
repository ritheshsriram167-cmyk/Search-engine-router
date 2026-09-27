import { supabase, isSupabaseConfigured } from './supabase.js';

// In-memory cache for ultra-fast lookup and zero latency
let cachedBrainKeys = [];
let currentIndex = 0;
let lastFetchTime = 0;
const CACHE_TTL_MS = 15000; // Refresh from DB every 15s

export function maskKey(raw) {
  if (!raw || raw.length < 10) return '••••••••••••';
  return raw.slice(0, 7) + '••••••••••••' + raw.slice(-4);
}

/**
 * Fetch brain keys from Supabase or use in-memory fallback
 */
export async function getBrainKeys() {
  const now = Date.now();
  if (isSupabaseConfigured && (now - lastFetchTime > CACHE_TTL_MS || cachedBrainKeys.length === 0)) {
    try {
      const { data, error } = await supabase
        .from('brain_keys')
        .select('*')
        .order('created_at', { ascending: true });

      if (!error && data) {
        cachedBrainKeys = data.map(k => {
          // Check if rate-limit cooldown expired
          if (k.status === 'rate-limited' && k.cooldown_until && new Date(k.cooldown_until).getTime() <= now) {
            k.status = 'active';
            updateKeyStatusInDb(k.id, 'active', null);
          }
          return k;
        });
        lastFetchTime = now;
      }
    } catch (err) {
      console.error('[BrainRotator] Failed to refresh keys from DB:', err.message);
    }
  } else {
    // Check in-memory cooldowns
    cachedBrainKeys = cachedBrainKeys.map(k => {
      if (k.status === 'rate-limited' && k.cooldown_until && new Date(k.cooldown_until).getTime() <= now) {
        return { ...k, status: 'active', cooldown_until: null };
      }
      return k;
    });
  }

  return cachedBrainKeys;
}

export async function addBrainKey(apiKey) {
  const cleanKey = apiKey.trim();
  const newKey = {
    id: 'b' + Date.now(),
    api_key: cleanKey,
    masked_key: maskKey(cleanKey),
    status: 'active',
    failure_count: 0,
    created_at: new Date().toISOString(),
    last_used: null,
    cooldown_until: null,
  };

  if (isSupabaseConfigured) {
    const { error } = await supabase.from('brain_keys').insert([newKey]);
    if (error) throw error;
  }

  cachedBrainKeys.push(newKey);
  return newKey;
}

export async function deleteBrainKey(keyId) {
  if (isSupabaseConfigured) {
    const { error } = await supabase.from('brain_keys').delete().eq('id', keyId);
    if (error) throw error;
  }
  cachedBrainKeys = cachedBrainKeys.filter(k => k.id !== keyId);
  return { success: true };
}

async function updateKeyStatusInDb(id, status, cooldownUntil = null) {
  if (!isSupabaseConfigured) return;
  try {
    await supabase
      .from('brain_keys')
      .update({
        status,
        cooldown_until: cooldownUntil ? new Date(cooldownUntil).toISOString() : null,
        last_used: new Date().toISOString()
      })
      .eq('id', id);
  } catch (err) {
    console.error('[BrainRotator] Error updating key status:', err.message);
  }
}

/**
 * Classify a search query using rotating Gemini API keys
 * Consumes ~2-4 output tokens strictly for ultra-fast classification
 */
export async function classifyQuery(query, availableProviders = []) {
  const startTime = Date.now();
  const keys = await getBrainKeys();
  const activeKeys = keys.filter(k => k.status === 'active');

  // Fallback if no brain keys configured
  if (activeKeys.length === 0) {
    console.warn('[BrainRotator] No active brain keys found. Falling back to default category.');
    return {
      providerId: availableProviders[0]?.id || 'p2',
      category: availableProviders[0]?.category || 'Web search',
      brainKeyId: 'none (fallback)',
      latencyMs: Date.now() - startTime,
    };
  }

  // Sort and prioritize providers: Top tier first, then Middle, then Bottom.
  // Prioritize providers that have at least one verified active key.
  const tierWeight = { top: 1, middle: 2, bottom: 3 };
  const sortedProviders = [...availableProviders].sort((a, b) => {
    const aActive = (a.keys || []).filter(k => k.status === 'active').length > 0 ? 0 : 1;
    const bActive = (b.keys || []).filter(k => k.status === 'active').length > 0 ? 0 : 1;
    if (aActive !== bActive) return aActive - bActive;
    return (tierWeight[a.tier] || 2) - (tierWeight[b.tier] || 2);
  });

  const providerDescriptions = sortedProviders.map(p => {
    const activeKeyCount = (p.keys || []).filter(k => k.status === 'active').length;
    const keyServices = (p.keys || []).map(k => k.detected_service || 'Key').join(', ');
    return `- ID: "${p.id}", Name: "${p.name}", Category: "${p.category}", Tier: "${p.tier || 'middle'}", Active Keys: ${activeKeyCount} (${keyServices || 'none'})`;
  }).join('\n');

  const systemInstruction = `You are the Brain of an intelligent Search Engine Router.
Analyze the user's search query carefully and select the SINGLE best matching Provider ID to handle this request.
Categories:
- Weather: forecasts, temperature, rain, climate, location-based weather conditions.
- News: current events, breaking headlines, politics, world updates.
- Search: general web lookups, definitions, knowledge topics.
- Data: stock quotes, crypto, statistics, tabular records.
- Database: technical queries, deep archive lookup.

Available Providers:
${providerDescriptions}

Rules:
1. Always pick a provider whose specialty fits the query intent (e.g. weather queries MUST go to a Weather/Climate or News provider, never a generic DB).
2. If multiple providers fit, pick the highest priority Tier ("top" > "middle" > "bottom").
3. Output a single JSON object with the selected provider ID and reason: {"providerId": "p1", "reason": "Weather query matched to weather/news provider"}
Do not include any other markdown or text outside the JSON.`;

  // Try rotating through active keys on rate limits
  let attempts = 0;
  const maxAttempts = Math.min(activeKeys.length, 5);

  while (attempts < maxAttempts) {
    const keyObj = activeKeys[(currentIndex + attempts) % activeKeys.length];
    attempts++;

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${keyObj.api_key}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: `${systemInstruction}\n\nUser Query: "${query}"` }]
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 60,
          }
        }),
      });

      if (response.status === 429) {
        // Rate limit hit - apply 60s cooldown and rotate
        console.warn(`[BrainRotator] Gemini key ${keyObj.masked_key} hit rate limit (429). Rotating.`);
        keyObj.status = 'rate-limited';
        const cooldown = Date.now() + 60000;
        keyObj.cooldown_until = new Date(cooldown).toISOString();
        await updateKeyStatusInDb(keyObj.id, 'rate-limited', cooldown);
        continue;
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[BrainRotator] Gemini API returned ${response.status}: ${errorText}`);
        if (response.status === 400 || response.status === 403) {
          keyObj.status = 'failed';
          await updateKeyStatusInDb(keyObj.id, 'failed');
        }
        continue;
      }

      const result = await response.json();
      const rawAnswer = result?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

      // Update key last used
      keyObj.last_used = new Date().toISOString();
      updateKeyStatusInDb(keyObj.id, 'active');

      // Update rotation pointer for fair distribution
      currentIndex = (currentIndex + attempts) % activeKeys.length;

      // Parse JSON or extract ID pattern
      let targetId = null;
      try {
        const jsonMatch = rawAnswer.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          targetId = parsed.providerId;
        }
      } catch (e) {}

      // Fallback: inspect raw text for provider IDs or names
      let matchedProvider = null;
      if (targetId) {
        matchedProvider = availableProviders.find(p => p.id.toLowerCase() === targetId.toLowerCase());
      }
      if (!matchedProvider) {
        matchedProvider = availableProviders.find(p =>
          rawAnswer.toLowerCase().includes(p.id.toLowerCase()) ||
          rawAnswer.toLowerCase().includes(p.name.toLowerCase())
        );
      }

      // Semantic rule-based fallback if Gemini output is ambiguous
      if (!matchedProvider) {
        const lowerQ = query.toLowerCase();
        if (lowerQ.includes('weather') || lowerQ.includes('temperature') || lowerQ.includes('forecast') || lowerQ.includes('rain')) {
          matchedProvider = availableProviders.find(p => p.category.toLowerCase().includes('weather') || p.name.toLowerCase().includes('weather'))
            || availableProviders.find(p => p.name.toLowerCase().includes('news'));
        } else if (lowerQ.includes('news') || lowerQ.includes('headline') || lowerQ.includes('latest')) {
          matchedProvider = availableProviders.find(p => p.name.toLowerCase().includes('news') || p.category.toLowerCase().includes('news'));
        }
      }

      if (!matchedProvider) {
        matchedProvider = sortedProviders[0] || availableProviders[0] || { id: 'p2', category: 'Web search' };
      }

      return {
        providerId: matchedProvider.id,
        category: matchedProvider.category,
        providerName: matchedProvider.name,
        brainKeyId: keyObj.id,
        brainKeyMasked: keyObj.masked_key,
        latencyMs: Date.now() - startTime,
      };

    } catch (fetchErr) {
      console.error(`[BrainRotator] Network error calling Gemini with key ${keyObj.masked_key}:`, fetchErr.message);
    }
  }

  // If all attempts failed, gracefully fall back
  return {
    providerId: availableProviders[0]?.id || 'p2',
    category: availableProviders[0]?.category || 'Web search',
    brainKeyId: 'all-keys-exhausted',
    latencyMs: Date.now() - startTime,
  };
}
