import { createClient } from '@supabase/supabase-js';

// Load Supabase URL and Public Anon Key from Vite environment variables with safe fallbacks
export const SUPABASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) ||
  'https://jhdfamkdxytpgtjxlhpm.supabase.co';

export const SUPABASE_ANON_KEY =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) ||
  'sb_publishable_qMryclSp1_MAgNukSnozXg_NakAcLOg';

// Export initialized client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
