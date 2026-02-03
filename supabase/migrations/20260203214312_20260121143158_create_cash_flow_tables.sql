/*
  # Sistema de Fluxo de Caixa Médico

  1. Tabelas criadas
    - `initial_balances`: Saldo inicial do usuário
    - `transactions`: Transações financeiras (entradas e saídas)

  2. Segurança
    - RLS habilitado em todas as tabelas
    - Usuários podem apenas ver e manipular seus próprios dados
*/

-- Criar tabela de saldos iniciais
CREATE TABLE IF NOT EXISTS initial_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Criar tabela de transações
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL CHECK (type IN ('income', 'expense')),
  amount numeric NOT NULL CHECK (amount > 0),
  description text NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  reference_month text,
  
  -- Campos para ENTRADAS
  payment_method text CHECK (payment_method IN ('cash', 'pix', 'debit_card', 'credit_card')),
  income_category text CHECK (income_category IN ('consulta', 'infiltracao', 'onda_choque', 'cirurgias', 'outros')),
  
  -- Campos para SAÍDAS
  category text CHECK (category IN ('repasse_medico', 'repasse', 'adiantamento', 'fixed', 'variable')),
  subcategory text,
  fixed_subcategory text CHECK (fixed_subcategory IN ('internet', 'energia', 'condominio', 'funcionario')),
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE initial_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Políticas para initial_balances
CREATE POLICY "Users can view own initial balance"
  ON initial_balances FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own initial balance"
  ON initial_balances FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own initial balance"
  ON initial_balances FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own initial balance"
  ON initial_balances FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Políticas para transactions
CREATE POLICY "Users can view own transactions"
  ON transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions"
  ON transactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transactions"
  ON transactions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own transactions"
  ON transactions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_initial_balances_user_id 
ON initial_balances(user_id);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id 
ON transactions(user_id);

CREATE INDEX IF NOT EXISTS idx_transactions_date 
ON transactions(date DESC);

CREATE INDEX IF NOT EXISTS idx_transactions_reference_month 
ON transactions(reference_month) 
WHERE reference_month IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_type 
ON transactions(type);

CREATE INDEX IF NOT EXISTS idx_transactions_category 
ON transactions(category) 
WHERE category IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_income_category 
ON transactions(income_category) 
WHERE income_category IS NOT NULL;

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_initial_balances_updated_at BEFORE UPDATE ON initial_balances
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();