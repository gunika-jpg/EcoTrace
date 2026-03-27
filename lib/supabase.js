import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wrakcsasbvhongthaeto.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndyYWtjc2FzYnZob25ndGhhZXRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1MDk3NDksImV4cCI6MjA5MDA4NTc0OX0._idt8DMpT_yO9fBH8ykIUv0Qkt6nzvbzY769ui0gXtA';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
