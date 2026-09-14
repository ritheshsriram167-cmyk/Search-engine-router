import { supabase, isSupabaseConfigured } from './supabase.js';

let lastCleanupTimestamp = new Date().toISOString();
let inMemoryCleanupsCount = 0;

// Free tier limit: 500 MB (in bytes)
export const MAX_QUOTA_BYTES = 500 * 1024 * 1024;
export const RETENTION_DAYS = 7;
export const MAX_ACTIVITY_LOGS = 2500; // Cap log rows to keep DB footprint under ~2 MB

/**
 * Calculate live database metrics and storage usage
 */
export async function getStorageMetrics(inMemoryLogs = []) {
  const now = new Date();
  let activityCount = inMemoryLogs.length;
  let clientKeysCount = 0;
  let brainKeysCount = 0;
  let providerKeysCount = 0;
  let providersCount = 4;

  if (isSupabaseConfigured) {
    try {
      const [actRes, clientRes, brainRes, pKeysRes, provRes] = await Promise.all([
        supabase.from('activity_logs').select('id', { count: 'exact', head: true }),
        supabase.from('client_keys').select('id', { count: 'exact', head: true }),
        supabase.from('brain_keys').select('id', { count: 'exact', head: true }),
        supabase.from('provider_keys').select('id', { count: 'exact', head: true }),
        supabase.from('providers').select('id', { count: 'exact', head: true }),
      ]);

      activityCount = actRes.count ?? activityCount;
      clientKeysCount = clientRes.count ?? 0;
      brainKeysCount = brainRes.count ?? 0;
      providerKeysCount = pKeysRes.count ?? 0;
      providersCount = provRes.count ?? providersCount;
    } catch (err) {
      console.warn('[Cleaner] Error querying table counts from Supabase:', err.message);
    }
  }

  const totalRows = activityCount + clientKeysCount + brainKeysCount + providerKeysCount + providersCount;
  
  // Approximate PostgreSQL row size: ~150 bytes per log, ~220 bytes per key/provider
  const estimatedSizeBytes = (activityCount * 150) +
                             (clientKeysCount * 220) +
                             (brainKeysCount * 220) +
                             (providerKeysCount * 220) +
                             (providersCount * 200) +
                             8192; // 8KB base schema overhead

  const sizeFormatted = estimatedSizeBytes < 1024 * 1024
    ? `${(estimatedSizeBytes / 1024).toFixed(1)} KB`
    : `${(estimatedSizeBytes / (1024 * 1024)).toFixed(2)} MB`;

  const quotaPercent = ((estimatedSizeBytes / MAX_QUOTA_BYTES) * 100).toFixed(4);

  return {
    totalRows,
    estimatedSizeBytes,
    estimatedSizeFormatted: sizeFormatted,
    quotaMaxBytes: MAX_QUOTA_BYTES,
    quotaPercentage: `${quotaPercent}%`,
    counts: {
      activityLogs: activityCount,
      clientKeys: clientKeysCount,
      brainKeys: brainKeysCount,
      providerKeys: providerKeysCount,
      providers: providersCount,
    },
    retentionPolicy: {
      retentionDays: RETENTION_DAYS,
      maxLogRows: MAX_ACTIVITY_LOGS,
      autoCleanEnabled: true,
      lastCleanup: lastCleanupTimestamp,
      totalCleanupsRan: inMemoryCleanupsCount,
    },
  };
}

/**
 * Prune old activity logs and keep database lightweight & permanently free
 */
export async function pruneDatabase(force = false) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);
  const cutoffIso = cutoffDate.toISOString();

  let purgedCount = 0;

  if (isSupabaseConfigured) {
    try {
      // 1. Delete logs older than retention period (7 days)
      const { error: delErr } = await supabase
        .from('activity_logs')
        .delete()
        .lt('timestamp', cutoffIso);

      if (delErr) {
        console.warn('[Cleaner] Notice during time-based prune:', delErr.message);
      }

      // 2. Check total log rows. If still exceeding MAX_ACTIVITY_LOGS, prune oldest surplus rows
      const { count } = await supabase
        .from('activity_logs')
        .select('id', { count: 'exact', head: true });

      if (count && count > MAX_ACTIVITY_LOGS) {
        const excess = count - MAX_ACTIVITY_LOGS;
        // Fetch oldest excess IDs
        const { data: oldRows } = await supabase
          .from('activity_logs')
          .select('id')
          .order('timestamp', { ascending: true })
          .limit(excess);

        if (oldRows && oldRows.length > 0) {
          const idsToDelete = oldRows.map(r => r.id);
          await supabase
            .from('activity_logs')
            .delete()
            .in('id', idsToDelete);
          purgedCount += idsToDelete.length;
        }
      }

      lastCleanupTimestamp = new Date().toISOString();
      inMemoryCleanupsCount++;
      console.log(`[Cleaner] Supabase retention cleanup completed. Purged surplus entries. Status: OK`);
    } catch (err) {
      console.error('[Cleaner] Error executing database pruning:', err.message);
    }
  }

  return {
    success: true,
    purgedCount,
    cleanedAt: lastCleanupTimestamp,
  };
}

// Background scheduler: run cleanup automatically every 6 hours
setInterval(() => {
  pruneDatabase(false).catch(() => {});
}, 6 * 60 * 60 * 1000);
