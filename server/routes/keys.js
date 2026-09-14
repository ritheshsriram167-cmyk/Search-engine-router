import { Router } from 'express';
import crypto from 'crypto';
import { supabase, isSupabaseConfigured } from '../supabase.js';

const router = Router();

let inMemoryClientKey = null;

function maskKey(raw) {
  if (!raw || raw.length < 15) return raw;
  return raw.slice(0, 11) + '••••••••••••' + raw.slice(-4);
}

// GET active client API key
router.get('/', async (req, res) => {
  try {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('client_keys')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        return res.json({
          apiKey: {
            id: data.id,
            raw: data.raw_key,
            masked: data.masked_key,
            created: new Date(data.created_at).toLocaleDateString('en-US', {
              month: 'short', day: 'numeric', year: 'numeric'
            }),
            lastUsed: data.last_used ? new Date(data.last_used).toLocaleTimeString() : 'never',
            status: data.status,
          }
        });
      }
      return res.json({ apiKey: null });
    }

    // In-memory fallback
    res.json({ apiKey: inMemoryClientKey });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST generate or regenerate client API key
router.post('/', async (req, res) => {
  try {
    const raw = 'rk_live_' + crypto.randomBytes(16).toString('hex');
    const id = 'key_' + Date.now();
    const masked = maskKey(raw);
    const now = new Date().toISOString();

    const keyRecord = {
      id,
      raw_key: raw,
      masked_key: masked,
      status: 'active',
      created_at: now,
      last_used: null,
    };

    if (isSupabaseConfigured) {
      // Deactivate any existing active keys
      await supabase.from('client_keys').update({ status: 'revoked' }).eq('status', 'active');
      const { error } = await supabase.from('client_keys').insert([keyRecord]);
      if (error) throw error;
    }

    inMemoryClientKey = {
      id,
      raw,
      masked,
      created: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      lastUsed: 'never',
      status: 'active',
    };

    res.json({ apiKey: inMemoryClientKey });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE revoke client API key
router.delete('/', async (req, res) => {
  try {
    if (isSupabaseConfigured) {
      await supabase.from('client_keys').update({ status: 'revoked' }).eq('status', 'active');
    }
    inMemoryClientKey = null;
    res.json({ success: true, message: 'Key revoked successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
