// src/lib/supabase.ts (VERSÃO COMPLETA COM EXPORTS)

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// ✅ Cache da sessão para evitar múltiplas chamadas
let sessionCache: any = null;
let lastSessionFetch = 0;
const SESSION_CACHE_TTL = 60000; // 1 minuto

// ✅ Cliente Supabase otimizado
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    storage: window.localStorage,
    flowType: 'pkce',
    debug: false,
    storageKey: 'supabase.auth.token',
  },
});

// ✅ EXPORTAR função para buscar sessão com cache
export const getCachedSession = async () => {
  const now = Date.now();
  
  // Usar cache se estiver dentro do TTL
  if (sessionCache && (now - lastSessionFetch) < SESSION_CACHE_TTL) {
    return sessionCache;
  }
  
  // Buscar nova sessão
  const { data: { session } } = await supabase.auth.getSession();
  sessionCache = session;
  lastSessionFetch = now;
  
  return session;
};

// ✅ EXPORTAR função para limpar cache
export const clearSessionCache = () => {
  sessionCache = null;
  lastSessionFetch = 0;
};

// ✅ Tipos
export type InitialBalance = {
  id: string;
  user_id: string;
  amount: number;
  created_at: string;
  updated_at: string;
};

export type Transaction = {
  id: string;
  user_id: string;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  date: string;
  reference_month?: string;
  payment_method?: 'credit_card' | 'debit_card' | 'pix' | 'cash' | 'deposito';
  income_category?: 'consultorio' | 'externo' | 'rateio' | 'cirurgias' | 'outros';
  category?: 'repasse_medico' | 'imposto' | 'adiantamento' | 'fatura' | 'investimentos' | 'fixed' | 'variable';
  subcategory?: string;
  fixed_subcategory?: 'internet' | 'contabilidade' | 'sistema' | 'impressora' | 'supermercado' | 'insumo' | 'condominio' | 'funcionario' | 'energia';
  created_at: string;
  updated_at: string;
};
