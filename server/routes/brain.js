import { Router } from 'express';
import { getBrainKeys, addBrainKey, deleteBrainKey } from '../brainRotator.js';

const router = Router();

// GET all brain keys
router.get('/', async (req, res) => {
  try {
    const keys = await getBrainKeys();
    // Return sanitized keys with masked values for UI
    const sanitized = keys.map(k => ({
      id: k.id,
      masked: k.masked_key || k.masked,
      status: k.status,
      lastUsed: k.last_used ? new Date(k.last_used).toLocaleTimeString() : 'never',
      added: k.created_at ? new Date(k.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'recently',
    }));
    res.json({ keys: sanitized });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST add new brain key
router.post('/', async (req, res) => {
  try {
    const { apiKey } = req.body;
    if (!apiKey || !apiKey.trim()) {
      return res.status(400).json({ error: 'API key is required' });
    }
    const created = await addBrainKey(apiKey);
    res.json({
      key: {
        id: created.id,
        masked: created.masked_key,
        status: created.status,
        lastUsed: 'never',
        added: 'just now',
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE remove a brain key
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await deleteBrainKey(id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
