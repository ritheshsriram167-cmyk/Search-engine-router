import { Router } from 'express';
import {
  getProvidersWithKeys,
  addProvider,
  deleteProvider,
  addProviderKey,
  deleteProviderKey
} from '../providerRotator.js';

const router = Router();

// GET all providers and their keys
router.get('/', async (req, res) => {
  try {
    const providers = await getProvidersWithKeys();
    const sanitized = providers.map(p => ({
      id: p.id,
      name: p.name,
      category: p.category,
      endpoint_url: p.endpoint_url,
      keys: (p.keys || []).map(k => ({
        id: k.id,
        masked: k.masked_key || k.masked,
        status: k.status,
        lastUsed: k.last_used ? new Date(k.last_used).toLocaleTimeString() : 'never',
        added: k.created_at ? new Date(k.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'recently',
      }))
    }));
    res.json({ providers: sanitized });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST add new provider
router.post('/', async (req, res) => {
  try {
    const { name, category, endpoint_url } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Provider name is required' });
    }
    const created = await addProvider(name, category, endpoint_url);
    res.json({ provider: { ...created, keys: [] } });
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

// POST add key to provider
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
