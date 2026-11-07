import { createClient } from '@supabase/supabase-js';

// URL y Anon Key oficial de Supabase para AMCaudales Pro
// El anon key de Supabase es una clave pública para clientes web protegida por Row Level Security (RLS)
const DEFAULT_SUPABASE_URL = 'https://dwtuafavqqzgosrwsgdw.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR3dHVhZmF2cXF6Z29zcndzZ2R3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUyNzYxNDAsImV4cCI6MjEwMDg1MjE0MH0.kzWXph_xwLtq2PHWEvZtinNCpC-1j_2--te2X2IHC5w';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

export const isCloudConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isCloudConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        flowType: 'pkce',
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  : null;
