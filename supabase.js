import { createClient } from '@supabase/supabase-js';
export const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://cqgbvuxjhjzqoehjlucz.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_rStHCQeh1yhz_Nr7keBpIQ_S3_Vl8Ao'
);
