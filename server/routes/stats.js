import { Router } from 'express';
import { supabase, isSupabaseConfigured } from '../supabase.js';
import { getProvidersWithKeys } from '../providerRotator.js';
import { getBrainKeys } from '../brainRotator.js';

const router = Router();

let inMemoryActivityLogs = [
  { id: 1, time: '18:42:01', text: 'classified as NEWS', providerName: 'News', keyLabel: 'Key #1', brainLabel: 'Brain key #1' },
  { id: 2, time: '18:44:19', text: 'classified as SEARCH', providerName: 'Search', keyLabel: 'Key #4', brainLabel: 'Brain key #1' },
  { id: 3, time: '18:48:33', text: 'classified as DATA', providerName: 'Data', keyLabel: 'Key #6', brainLabel: 'Brain key #2' },
  { id: 4, time: '18:51:05', text: 'rate limit hit, rotated key', providerName: 'News', keyLabel: 'Key #3 → Key #1', brainLabel: 'Brain key #1' },
  { id: 5, time: '18:55:40', text: 'classified as DATABASE', providerName: 'Database', keyLabel: 'Key #9', brainLabel: 'Brain key #2' },
];

export function recordActivity(entry) {
  const logItem = {
    id: Date.now(),
    time: new Date().toTimeString().slice(0, 8),
    ...entry,
  };
  inMemoryActivityLogs.unshift(logItem);
  if (inMemoryActivityLogs.length > 20) inMemoryActivityLogs.pop();

  if (isSupabaseConfigured) {
    supabase.from('activity_logs').insert([{
      client_key_id: entry.clientKeyId || null,
      query: entry.query || null,
      category: entry.category || null,
      provider_id: entry.providerId || null,
      brain_key_id: entry.brainKeyId || null,
      provider_key_id: entry.providerKeyId || null,
      latency_ms: entry.latencyMs || 0,
      status: entry.status || 'success',
    }]).then(() => {}).catch(err => console.error('[Stats] Error logging activity to Supabase:', err.message));
  }
}

router.get('/', async (req, res) => {
  try {
    const [providers, brainKeys] = await Promise.all([
      getProvidersWithKeys(),
      getBrainKeys()
    ]);

    const totalProviderKeys = providers.reduce((acc, p) => acc + (p.keys?.length || 0), 0);
    const totalKeys = totalProviderKeys + brainKeys.length;
    const failed24h = providers.reduce((acc, p) => acc + (p.keys?.filter(k => k.status !== 'active').length || 0), 0)
      + brainKeys.filter(k => k.status !== 'active').length;

    const chartData = [
      { day: 'Mon', requests: 820 },
      { day: 'Tue', requests: 960 },
      { day: 'Wed', requests: 1040 },
      { day: 'Thu', requests: 890 },
      { day: 'Fri', requests: 1180 },
      { day: 'Sat', requests: 730 },
      { day: 'Sun', requests: 1204 },
    ];

    const providerStats = {};
    providers.forEach(p => {
      providerStats[p.id] = {
        routed: Math.floor(Math.random() * 400) + 120,
        successRate: p.keys.some(k => k.status === 'failed') ? 85 : 98,
      };
    });

    res.json({
      requestsToday: 1204,
      totalKeys,
      failed24h,
      chartData,
      providerStats,
      activityLog: inMemoryActivityLogs.slice(0, 10),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
