import { Router } from 'express';
import {
  getProvidersWithKeys,
  addProvider,
  updateProviderTier,
  deleteProvider,
  addProviderKey,
  deleteProviderKey
} from '../providerRotator.js';

const router = Router();

// GET all providers and their keys with tier and detected service
router.get('/', async (req, res) => {
  try {
    const providers = await getProvidersWithKeys();
    const sanitized = providers.map(p => ({
      id: p.id,
      name: p.name,
      category: p.category,
      tier: p.tier || 'middle',
      endpoint_url: p.endpoint_url,
      keys: (p.keys || []).map(k => ({
        id: k.id,
        masked: k.masked_key || k.masked,
        status: k.status, // 'active' (green) or 'failed' (red)
        detected_service: k.detected_service || 'API Service',
        validation_message: k.validation_message || (k.status === 'active' ? 'Active & verified' : 'Unverified / failed'),
        lastUsed: k.last_used ? new Date(k.last_used).toLocaleTimeString() : 'never',
        added: k.created_at ? new Date(k.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'recently',
      }))
    }));
    res.json({ providers: sanitized });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST add new provider with optional tier
router.post('/', async (req, res) => {
  try {
    const { name, category, endpoint_url, tier } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Provider name is required' });
    }
    const created = await addProvider(name, category, endpoint_url, tier || 'middle');
    res.json({ provider: { ...created, keys: [] } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH update provider tier (top, middle, bottom)
router.patch('/:id/tier', async (req, res) => {
  try {
    const { id } = req.params;
    const { tier } = req.body;
    const result = await updateProviderTier(id, tier);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE remove provider
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await deleteProvider(id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST add key to provider with instant live test
router.post('/:id/keys', async (req, res) => {
  try {
    const { id } = req.params;
    const { apiKey } = req.body;
    if (!apiKey || !apiKey.trim()) {
      return res.status(400).json({ error: 'API key is required' });
    }
    const createdKey = await addProviderKey(id, apiKey);
    res.json({
      key: {
        id: createdKey.id,
        masked: createdKey.masked_key,
        status: createdKey.status,
        detected_service: createdKey.detected_service,
        validation_message: createdKey.validation_message,
        lastUsed: 'never',
        added: 'just now',
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE key from provider
router.delete('/:id/keys/:keyId', async (req, res) => {
  try {
    const { id, keyId } = req.params;
    await deleteProviderKey(id, keyId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

