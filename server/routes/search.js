import { Router } from 'express';
import { supabase, isSupabaseConfigured } from '../supabase.js';
import { classifyQuery } from '../brainRotator.js';
import { getProvidersWithKeys, executeSearchStream } from '../providerRotator.js';
import { recordActivity } from './stats.js';

const router = Router();

// Validate Client Key Middleware
async function authenticateClientKey(req, res, next) {
  let rawKey = req.headers.authorization?.replace(/^Bearer\s+/i, '') ||
               req.headers['x-api-key'] ||
               req.query.key;

  if (!rawKey) {
    return res.status(401).json({
      error: 'Unauthorized. Please provide your permanent client API key via Authorization header or ?key parameter.'
    });
  }

  rawKey = rawKey.trim();

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('client_keys')
        .select('*')
        .eq('raw_key', rawKey)
        .eq('status', 'active')
        .maybeSingle();

      if (error || !data) {
        return res.status(401).json({ error: 'Invalid or revoked client API key.' });
      }

      // Update key last used in background
      supabase
        .from('client_keys')
        .update({ last_used: new Date().toISOString() })
        .eq('id', data.id)
        .then(() => {});

      req.clientKey = data;
      return next();
    } catch (err) {
      console.error('[SearchAuth] Error verifying key:', err.message);
      return res.status(500).json({ error: 'Authentication service error' });
    }
  }

  // Fallback for local demo testing if DB is not yet connected
  req.clientKey = { id: 'local-key', raw_key: rawKey };
  next();
}

/**
 * Public Permanent Search Endpoint with Zero-Cost SSE Streaming
 * POST /api/v1/search or GET /api/v1/search?q=...
 */
router.all('/', authenticateClientKey, async (req, res) => {
  const query = req.body?.query || req.query?.q || req.query?.query;

  if (!query || !query.trim()) {
    return res.status(400).json({ error: 'Search query parameter "query" (or "q") is required.' });
  }

  // Set up Server-Sent Events (SSE) headers for real-time zero-cost streaming
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no', // Disables proxy buffering in Nginx/Render
  });

  const startTime = Date.now();

  try {
    // 1. Fetch available provider categories
    const providers = await getProvidersWithKeys();

    // 2. Classify query via rotating Gemini Brain (ultra-low token routing)
    if (!res.writableEnded && !res.destroyed) {
      res.write(`data: ${JSON.stringify({ type: 'status', message: 'Classifying query via Gemini brain...' })}\n\n`);
    }
    const brainResult = await classifyQuery(query, providers);

    if (!res.writableEnded && !res.destroyed) {
      res.write(`data: ${JSON.stringify({
        type: 'classified',
        providerId: brainResult.providerId,
        category: brainResult.category,
        brainKey: brainResult.brainKeyMasked || 'rotated-gemini-key',
        classificationLatencyMs: brainResult.latencyMs
      })}\n\n`);
    }

    // 3. Dispatch to Provider with automatic Provider Key Rotation & Streaming
    if (!res.writableEnded && !res.destroyed) {
      res.write(`data: ${JSON.stringify({ type: 'status', message: `Routing to provider ${brainResult.category}...` })}\n\n`);
    }

    const executionResult = await executeSearchStream(brainResult.providerId, query, res);

    const totalLatency = Date.now() - startTime;

    // 4. Record routing activity permanently
    const matchedProvider = providers.find(p => p.id === brainResult.providerId);
    const keySuffix = (executionResult?.providerKeyId || '1').slice(-3);
    const brainSuffix = (brainResult?.brainKeyId || '1').slice(-3);

    recordActivity({
      clientKeyId: req.clientKey?.id || 'local-key',
      query,
      category: brainResult.category,
      providerId: brainResult.providerId,
      providerName: matchedProvider?.name || brainResult.providerId,
      text: `classified as ${matchedProvider?.name?.toUpperCase() || 'SEARCH'}`,
      keyLabel: `Key #${keySuffix}`,
      brainLabel: `Brain key #${brainSuffix}`,
      brainKeyId: brainResult.brainKeyId,
      providerKeyId: executionResult?.providerKeyId || 'none',
      latencyMs: totalLatency,
      status: 'success'
    });

  } catch (err) {
    console.error('[Search] Routing error:', err.message);
    if (!res.writableEnded && !res.destroyed) {
      res.write(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`);
      res.end();
    }
  }
});

export default router;
