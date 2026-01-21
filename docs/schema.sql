-- ============================================================================
-- SCHEMA SQL - SISTEMA DE FLUXO DE CAIXA
-- ============================================================================
--
-- Este arquivo contém todo o schema SQL aplicado no banco de dados.
-- Inclui: tabelas, índices, políticas RLS, triggers e constraints.
--
-- IMPORTANTE: Esta é uma cópia para referência. A migration já foi aplicada!
-- NÃO execute este arquivo diretamente no banco de dados.
--
-- Data: 21/01/2026
-- Migration: 20260121014105_create_cashflow_schema.sql
-- ============================================================================

-- ============================================================================
-- 1. TABELA: initial_balances (Saldo Inicial)
-- ============================================================================
-- Armazena o saldo inicial do caixa de cada usuário.
-- Cada usuário pode ter apenas UM saldo inicial (constraint UNIQUE).

CREATE TABLE IF NOT EXISTS initial_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Comentários nos campos
COMMENT ON TABLE initial_balances IS 'Armazena o saldo inicial do caixa de cada usuário';
COMMENT ON COLUMN initial_balances.id IS 'Identificador único do registro';
COMMENT ON COLUMN initial_balances.user_id IS 'Referência ao usuário (auth.users). Um usuário = um saldo inicial';
COMMENT ON COLUMN initial_balances.amount IS 'Valor do saldo inicial em reais (BRL)';
COMMENT ON COLUMN initial_balances.created_at IS 'Data e hora de criação do registro';
COMMENT ON COLUMN initial_balances.updated_at IS 'Data e hora da última atualização';

-- ============================================================================
-- 2. TABELA: transactions (Transações)
-- ============================================================================
-- Armazena todas as transações (entradas e saídas) do fluxo de caixa.

CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL CHECK (type IN ('income', 'expense')),
  amount numeric NOT NULL CHECK (amount > 0),
  description text NOT NULL,
  payment_method text CHECK (payment_method IN ('credit_card', 'debit_card', 'pix', 'cash')),
  category text CHECK (category IN ('fixed', 'variable')),
  date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Comentários nos campos
COMMENT ON TABLE transactions IS 'Armazena todas as transações de entrada e saída do fluxo de caixa';
COMMENT ON COLUMN transactions.id IS 'Identificador único da transação';
COMMENT ON COLUMN transactions.user_id IS 'Referência ao usuário proprietário da transação';
COMMENT ON COLUMN transactions.type IS 'Tipo da transação: income (entrada) ou expense (saída)';
COMMENT ON COLUMN transactions.amount IS 'Valor da transação (sempre positivo)';
COMMENT ON COLUMN transactions.description IS 'Descrição da transação';
COMMENT ON COLUMN transactions.payment_method IS 'Forma de pagamento (apenas para entradas): credit_card, debit_card, pix, cash';
COMMENT ON COLUMN transactions.category IS 'Categoria da despesa (apenas para saídas): fixed (fixa) ou variable (variável)';
COMMENT ON COLUMN transactions.date IS 'Data em que a transação ocorreu';
COMMENT ON COLUMN transactions.created_at IS 'Data e hora de criação do registro';
COMMENT ON COLUMN transactions.updated_at IS 'Data e hora da última atualização';

-- ============================================================================
-- 3. TABELA: profiles (Perfis de Usuário)
-- ============================================================================
-- Esta tabela já existia no sistema anterior e foi mantida.
-- Armazena informações básicas dos usuários.

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email text,
  created_at timestamptz DEFAULT now()
);

COMMENT ON TABLE profiles IS 'Perfis de usuários do sistema';
COMMENT ON COLUMN profiles.id IS 'ID do usuário (mesma chave da tabela auth.users)';
COMMENT ON COLUMN profiles.email IS 'Email do usuário';
COMMENT ON COLUMN profiles.created_at IS 'Data de criação do perfil';

-- ============================================================================
-- 4. ÍNDICES (Performance)
-- ============================================================================
-- Índices criados para otimizar as consultas mais comuns.

-- Índice para filtrar transações por usuário
CREATE INDEX IF NOT EXISTS idx_transactions_user_id
ON transactions(user_id);

-- Índice para filtrar transações por data (filtros de período)
CREATE INDEX IF NOT EXISTS idx_transactions_date
ON transactions(date);

-- Índice para filtrar transações por tipo (entrada/saída)
CREATE INDEX IF NOT EXISTS idx_transactions_type
ON transactions(type);

-- ============================================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- ============================================================================
-- Habilita segurança em nível de linha para todas as tabelas.
-- Isso garante que cada usuário só possa acessar seus próprios dados.

ALTER TABLE initial_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 6. POLÍTICAS RLS - initial_balances
-- ============================================================================
-- Políticas que controlam quem pode fazer o quê na tabela initial_balances.

-- Política SELECT: Usuários podem visualizar apenas seu próprio saldo
DROP POLICY IF EXISTS "Users can view own initial balance" ON initial_balances;
CREATE POLICY "Users can view own initial balance"
  ON initial_balances FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Política INSERT: Usuários podem inserir apenas seu próprio saldo
DROP POLICY IF EXISTS "Users can insert own initial balance" ON initial_balances;
CREATE POLICY "Users can insert own initial balance"
  ON initial_balances FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Política UPDATE: Usuários podem atualizar apenas seu próprio saldo
DROP POLICY IF EXISTS "Users can update own initial balance" ON initial_balances;
CREATE POLICY "Users can update own initial balance"
  ON initial_balances FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Política DELETE: Usuários podem deletar apenas seu próprio saldo
DROP POLICY IF EXISTS "Users can delete own initial balance" ON initial_balances;
CREATE POLICY "Users can delete own initial balance"
  ON initial_balances FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================================
-- 7. POLÍTICAS RLS - transactions
-- ============================================================================
-- Políticas que controlam quem pode fazer o quê na tabela transactions.

-- Política SELECT: Usuários podem visualizar apenas suas próprias transações
DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;
CREATE POLICY "Users can view own transactions"
  ON transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Política INSERT: Usuários podem inserir apenas suas próprias transações
DROP POLICY IF EXISTS "Users can insert own transactions" ON transactions;
CREATE POLICY "Users can insert own transactions"
  ON transactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Política UPDATE: Usuários podem atualizar apenas suas próprias transações
DROP POLICY IF EXISTS "Users can update own transactions" ON transactions;
CREATE POLICY "Users can update own transactions"
  ON transactions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Política DELETE: Usuários podem deletar apenas suas próprias transações
DROP POLICY IF EXISTS "Users can delete own transactions" ON transactions;
CREATE POLICY "Users can delete own transactions"
  ON transactions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================================
-- 8. POLÍTICAS RLS - profiles
-- ============================================================================
-- Políticas para a tabela profiles (mantidas do sistema anterior).

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================================================
-- 9. FUNÇÕES E TRIGGERS
-- ============================================================================

-- Função para atualizar automaticamente o campo updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

COMMENT ON FUNCTION update_updated_at_column() IS
'Atualiza automaticamente o campo updated_at quando um registro é modificado';

-- Trigger para initial_balances
DROP TRIGGER IF EXISTS update_initial_balances_updated_at ON initial_balances;
CREATE TRIGGER update_initial_balances_updated_at
  BEFORE UPDATE ON initial_balances
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger para transactions
DROP TRIGGER IF EXISTS update_transactions_updated_at ON transactions;
CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Função para criar perfil automaticamente ao registrar novo usuário
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION handle_new_user() IS
'Cria automaticamente um perfil quando um novo usuário se registra';

-- Trigger para criar perfil ao criar usuário
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ============================================================================
-- 10. QUERIES ÚTEIS
-- ============================================================================
-- Exemplos de queries comuns para consultar os dados.

-- -----------------------------------------------
-- Query 1: Buscar saldo inicial do usuário atual
-- -----------------------------------------------
/*
SELECT
  id,
  amount,
  created_at,
  updated_at
FROM initial_balances
WHERE user_id = auth.uid();
*/

-- -----------------------------------------------
-- Query 2: Buscar todas as transações do usuário
-- -----------------------------------------------
/*
SELECT
  id,
  type,
  amount,
  description,
  payment_method,
  category,
  date,
  created_at
FROM transactions
WHERE user_id = auth.uid()
ORDER BY date DESC, created_at DESC;
*/

-- -----------------------------------------------
-- Query 3: Buscar transações do último mês
-- -----------------------------------------------
/*
SELECT
  id,
  type,
  amount,
  description,
  date
FROM transactions
WHERE user_id = auth.uid()
  AND date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY date DESC;
*/

-- -----------------------------------------------
-- Query 4: Total de entradas por forma de pagamento
-- -----------------------------------------------
/*
SELECT
  payment_method,
  SUM(amount) as total,
  COUNT(*) as quantidade
FROM transactions
WHERE user_id = auth.uid()
  AND type = 'income'
  AND payment_method IS NOT NULL
GROUP BY payment_method
ORDER BY total DESC;
*/

-- -----------------------------------------------
-- Query 5: Total de saídas por categoria
-- -----------------------------------------------
/*
SELECT
  category,
  SUM(amount) as total,
  COUNT(*) as quantidade
FROM transactions
WHERE user_id = auth.uid()
  AND type = 'expense'
  AND category IS NOT NULL
GROUP BY category
ORDER BY total DESC;
*/

-- -----------------------------------------------
-- Query 6: Calcular saldo atual
-- -----------------------------------------------
/*
SELECT
  COALESCE(
    (SELECT amount FROM initial_balances WHERE user_id = auth.uid()),
    0
  ) +
  COALESCE(
    (SELECT SUM(amount) FROM transactions WHERE user_id = auth.uid() AND type = 'income'),
    0
  ) -
  COALESCE(
    (SELECT SUM(amount) FROM transactions WHERE user_id = auth.uid() AND type = 'expense'),
    0
  ) AS saldo_atual;
*/

-- -----------------------------------------------
-- Query 7: Resumo financeiro completo
-- -----------------------------------------------
/*
SELECT
  (SELECT amount FROM initial_balances WHERE user_id = auth.uid()) as saldo_inicial,
  (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE user_id = auth.uid() AND type = 'income') as total_entradas,
  (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE user_id = auth.uid() AND type = 'expense') as total_saidas,
  (
    (SELECT COALESCE(amount, 0) FROM initial_balances WHERE user_id = auth.uid()) +
    (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE user_id = auth.uid() AND type = 'income') -
    (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE user_id = auth.uid() AND type = 'expense')
  ) as saldo_atual;
*/

-- -----------------------------------------------
-- Query 8: Transações agrupadas por data
-- -----------------------------------------------
/*
SELECT
  date,
  COUNT(*) as total_transacoes,
  SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as entradas,
  SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as saidas
FROM transactions
WHERE user_id = auth.uid()
GROUP BY date
ORDER BY date DESC;
*/

-- -----------------------------------------------
-- Query 9: Últimas 10 transações
-- -----------------------------------------------
/*
SELECT
  type,
  description,
  amount,
  CASE
    WHEN type = 'income' THEN payment_method
    WHEN type = 'expense' THEN category
  END as detalhes,
  date
FROM transactions
WHERE user_id = auth.uid()
ORDER BY date DESC, created_at DESC
LIMIT 10;
*/

-- -----------------------------------------------
-- Query 10: Comparativo mensal
-- -----------------------------------------------
/*
SELECT
  DATE_TRUNC('month', date) as mes,
  SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as entradas,
  SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as saidas,
  SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END) as saldo_mes
FROM transactions
WHERE user_id = auth.uid()
GROUP BY DATE_TRUNC('month', date)
ORDER BY mes DESC;
*/

-- ============================================================================
-- 11. VERIFICAÇÕES DE INTEGRIDADE
-- ============================================================================
-- Queries para verificar se o schema está correto.

-- Verificar se as tabelas existem e têm RLS habilitado
/*
SELECT
  table_name,
  (SELECT relrowsecurity FROM pg_class WHERE relname = table_name) as rls_enabled
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('initial_balances', 'transactions', 'profiles')
ORDER BY table_name;
*/

-- Verificar políticas RLS
/*
SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('initial_balances', 'transactions', 'profiles')
ORDER BY tablename, policyname;
*/

-- Verificar índices
/*
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('initial_balances', 'transactions')
ORDER BY tablename, indexname;
*/

-- Verificar triggers
/*
SELECT
  trigger_name,
  event_object_table,
  action_statement,
  action_timing,
  event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND event_object_table IN ('initial_balances', 'transactions', 'users')
ORDER BY event_object_table, trigger_name;
*/

-- ============================================================================
-- 12. CONSTRAINTS E VALIDAÇÕES
-- ============================================================================

-- Constraints aplicados:

-- initial_balances:
-- - id: PRIMARY KEY, DEFAULT gen_random_uuid()
-- - user_id: NOT NULL, UNIQUE, REFERENCES auth.users(id) ON DELETE CASCADE
-- - amount: NOT NULL, DEFAULT 0

-- transactions:
-- - id: PRIMARY KEY, DEFAULT gen_random_uuid()
-- - user_id: NOT NULL, REFERENCES auth.users(id) ON DELETE CASCADE
-- - type: NOT NULL, CHECK (type IN ('income', 'expense'))
-- - amount: NOT NULL, CHECK (amount > 0)
-- - description: NOT NULL
-- - payment_method: CHECK (payment_method IN ('credit_card', 'debit_card', 'pix', 'cash'))
-- - category: CHECK (category IN ('fixed', 'variable'))
-- - date: NOT NULL, DEFAULT CURRENT_DATE

-- ============================================================================
-- FIM DO SCHEMA
-- ============================================================================
--
-- Este schema garante:
-- ✅ Segurança através de RLS
-- ✅ Integridade de dados através de constraints
-- ✅ Performance através de índices
-- ✅ Automação através de triggers
-- ✅ Isolamento de dados por usuário
--
-- Para mais informações, consulte a documentação em docs/BANCO_DE_DADOS.md
-- ============================================================================
