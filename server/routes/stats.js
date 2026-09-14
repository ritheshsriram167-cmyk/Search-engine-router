import { Router } from 'express';
import { supabase, isSupabaseConfigured } from '../supabase.js';
import { getProvidersWithKeys } from '../providerRotator.js';
import { getBrainKeys } from '../brainRotator.js';
import { getStorageMetrics, pruneDatabase } from '../cleaner.js';

const router = Router();

// In-memory activity store for real requests
let inMemoryActivityLogs = [];

export function recordActivity(entry) {
  const logItem = {
    id: entry.id || Date.now(),
    time: new Date().toTimeString().slice(0, 8),
    timestamp: new Date().toISOString(),
    ...entry,
  };
  inMemoryActivityLogs.unshift(logItem);
  if (inMemoryActivityLogs.length > 50) inMemoryActivityLogs.pop();

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

// GET real live analytics & database storage stats
router.get('/', async (req, res) => {
  try {
    const [providers, brainKeys, storage] = await Promise.all([
      getProvidersWithKeys(),
      getBrainKeys(),
      getStorageMetrics(inMemoryActivityLogs)
    ]);

    let logs = inMemoryActivityLogs;

    // Fetch latest real logs from Supabase if configured
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('activity_logs')
          .select('*')
          .order('timestamp', { ascending: false })
          .limit(30);

        if (!error && data && data.length > 0) {
          logs = data.map(item => ({
            id: item.id,
            time: item.timestamp ? new Date(item.timestamp).toTimeString().slice(0, 8) : 'recent',
            timestamp: item.timestamp,
            query: item.query,
            category: item.category,
            providerId: item.provider_id,
            providerName: providers.find(p => p.id === item.provider_id)?.name || item.provider_id || 'Search',
            text: `classified as ${(item.category || 'SEARCH').toUpperCase()}`,
            keyLabel: `Key #${item.provider_key_id ? String(item.provider_key_id).slice(-3) : '1'}`,
            brainLabel: `Brain #${item.brain_key_id ? String(item.brain_key_id).slice(-3) : '1'}`,
            latencyMs: item.latency_ms || 0,
            status: item.status || 'success',
          }));
        }
      } catch (e) {
        console.warn('[Stats] Failed to fetch live logs from Supabase:', e.message);
      }
    }

    // 1. Calculate Real "Requests Today"
    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);

    const requestsToday = logs.filter(l => {
      if (!l.timestamp) return true;
      return new Date(l.timestamp) >= todayMidnight;
    }).length;

    // 2. Real 7-day trend chart from actual log timestamps
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const chartData = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStart = new Date(d);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(d);
      dayEnd.setHours(23, 59, 59, 999);

      const dayName = daysOfWeek[d.getDay()];
      const count = logs.filter(l => {
        if (!l.timestamp) return false;
        const logDate = new Date(l.timestamp);
        return logDate >= dayStart && logDate <= dayEnd;
      }).length;

      chartData.push({ day: dayName, requests: count });
    }

    // 3. Real Provider Breakdown & Key Rate-Limit Tracking
    const providerStats = {};
    const rateLimitedKeys = [];

    providers.forEach(p => {
      const providerLogs = logs.filter(l => l.providerId === p.id || l.providerName === p.name);
      const routedCount = providerLogs.length;
      const successCount = providerLogs.filter(l => l.status === 'success').length;
      const successRate = routedCount > 0 ? Math.round((successCount / routedCount) * 100) : 100;

      providerStats[p.id] = {
        routed: routedCount,
        successRate,
      };

      // Check for rate-limited keys
      (p.keys || []).forEach(k => {
        if (k.status === 'rate-limited' || k.status === 'failed') {
          rateLimitedKeys.push({
            id: k.id,
            providerName: p.name,
            maskedKey: k.masked,
            status: k.status,
            cooldownUntil: k.cooldown_until || null,
          });
        }
      });
    });

    // Check brain rate-limited keys
    brainKeys.forEach(bk => {
      if (bk.status === 'rate-limited' || bk.status === 'failed') {
        rateLimitedKeys.push({
          id: bk.id,
          providerName: 'Brain (Classifier)',
          maskedKey: bk.masked,
          status: bk.status,
          cooldownUntil: bk.cooldown_until || null,
        });
      }
    });

    // 4. Brain Usage Metrics
    const brainClassifications = logs.length;
    const avgLatency = logs.length > 0
      ? Math.round(logs.reduce((acc, l) => acc + (l.latencyMs || 0), 0) / logs.length)
      : 35;

    const totalProviderKeys = providers.reduce((acc, p) => acc + (p.keys?.length || 0), 0);
    const totalKeys = totalProviderKeys + brainKeys.length;
    const failed24h = rateLimitedKeys.length;

    res.json({
      requestsToday,
      totalKeys,
      failed24h,
      chartData,
      providerStats,
      rateLimitedKeys,
      brainMetrics: {
        totalClassifications: brainClassifications,
        avgLatencyMs: avgLatency,
        activeBrainKeys: brainKeys.filter(k => k.status === 'active').length,
      },
      storage,
      activityLog: logs.slice(0, 15),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST manual database retention cleanup
router.post('/cleanup', async (req, res) => {
  try {
    const result = await pruneDatabase(true);
    res.json({ success: true, message: 'Database retention cleanup executed.', ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
