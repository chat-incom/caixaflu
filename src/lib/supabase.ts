import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
