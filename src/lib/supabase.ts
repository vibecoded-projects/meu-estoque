import { createClient } from '@supabase/supabase-js';

// Lendo as variáveis nos dois formatos (Next.js padrão ou Vercel Integration)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || 'https://dummy.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || 'dummy-key';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || 'dummy-key';

// Cliente público para coisas simples, como Storage de imagens ou leitura se fosse RLS
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Cliente de administração para rodar as Server Actions com plenos privilégios (já que contornamos o RLS)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
