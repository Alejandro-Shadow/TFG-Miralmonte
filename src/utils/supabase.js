import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://udyqmvvlvexibygbqbcf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkeXFtdnZsdmV4aWJ5Z2JxYmNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgxMTc1MTEsImV4cCI6MjA2MzY5MzUxMX0.yoLQvIDWd_dWnNrnUBtVYNzmCVMdwKUB939qql0GY4E';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
