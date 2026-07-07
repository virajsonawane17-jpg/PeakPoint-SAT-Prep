/* ============================================
   PEAKPOINT SAT PREP — Supabase client
   The URL and publishable key are safe to ship in the browser;
   all data access is guarded by Row-Level Security in Postgres.
   ============================================ */

window.PP = window.PP || {};

PP.SUPABASE_URL = 'https://mqufrgsxxnadwnipgaxh.supabase.co';
PP.SUPABASE_KEY = 'sb_publishable_b1Wiz03ZvaDLNwqNLurEEw_BE_PzHpD';

// `supabase` is the global exposed by vendor/supabase.js (UMD build).
PP.sb = window.supabase.createClient(PP.SUPABASE_URL, PP.SUPABASE_KEY);
