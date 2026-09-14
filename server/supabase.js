import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

let supabaseClient = null;

if (isSupabaseConfigured) {
  try {
    supabaseClient = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });
    console.log('[Database] Connected to Supabase at:', supabaseUrl);
  } catch (err) {
    console.error('[Database] Failed to initialize Supabase client:', err.message);
  }
} else {
  console.warn('[Database] Warning: SUPABASE_URL or SUPABASE_KEY not set. Operating with in-memory store until configured.');
}

export const supabase = supabaseClient;
