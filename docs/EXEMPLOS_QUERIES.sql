-- ============================================================================
-- EXEMPLOS DE QUERIES - SISTEMA DE FLUXO DE CAIXA
-- ============================================================================
--
-- Este arquivo contém exemplos práticos de queries SQL que você pode
-- executar diretamente no banco de dados Supabase.
--
-- IMPORTANTE: Todas as queries já incluem a verificação de auth.uid()
-- para garantir que você só acesse seus próprios dados.
--
-- Como usar:
-- 1. Copie a query desejada
-- 2. Cole no SQL Editor do Supabase
-- 3. Execute
--
-- ============================================================================

-- ============================================================================
-- CONSULTAS BÁSICAS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Buscar meu saldo inicial
-- ----------------------------------------------------------------------------
SELECT
  id,
  amount as saldo_inicial,
  created_at as criado_em,
  updated_at as atualizado_em
FROM initial_balances
WHERE user_id = auth.uid();

-- ----------------------------------------------------------------------------
-- Buscar todas as minhas transações
-- ----------------------------------------------------------------------------
SELECT
  id,
  CASE
    WHEN type = 'income' THEN 'Entrada'
    WHEN type = 'expense' THEN 'Saída'
  END as tipo,
  amount as valor,
  description as descricao,
  payment_method as forma_pagamento,
  category as categoria,
  date as data,
  created_at as registrado_em
FROM transactions
WHERE user_id = auth.uid()
ORDER BY date DESC, created_at DESC;

-- ----------------------------------------------------------------------------
-- Contar quantas transações eu tenho
-- ----------------------------------------------------------------------------
SELECT
  COUNT(*) as total_transacoes,
  COUNT(CASE WHEN type = 'income' THEN 1 END) as total_entradas,
  COUNT(CASE WHEN type = 'expense' THEN 1 END) as total_saidas
FROM transactions
WHERE user_id = auth.uid();

-- ============================================================================
-- CONSULTAS POR PERÍODO
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Transações de hoje
-- ----------------------------------------------------------------------------
SELECT
  type,
  description,
  amount,
  date
FROM transactions
WHERE user_id = auth.uid()
  AND date = CURRENT_DATE
ORDER BY created_at DESC;

-- ----------------------------------------------------------------------------
-- Transações da última semana
-- ----------------------------------------------------------------------------
SELECT
  type,
  description,
  amount,
  date
FROM transactions
WHERE user_id = auth.uid()
  AND date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY date DESC;

-- ----------------------------------------------------------------------------
-- Transações do último mês
-- ----------------------------------------------------------------------------
SELECT
  type,
  description,
  amount,
  date
FROM transactions
WHERE user_id = auth.uid()
  AND date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY date DESC;

-- ----------------------------------------------------------------------------
-- Transações do mês atual (mês calendário)
-- ----------------------------------------------------------------------------
SELECT
  type,
  description,
  amount,
  date
FROM transactions
WHERE user_id = auth.uid()
  AND DATE_TRUNC('month', date) = DATE_TRUNC('month', CURRENT_DATE)
ORDER BY date DESC;

-- ----------------------------------------------------------------------------
-- Transações de um período específico
-- (substitua as datas conforme necessário)
-- ----------------------------------------------------------------------------
SELECT
  type,
  description,
  amount,
  date
FROM transactions
WHERE user_id = auth.uid()
  AND date BETWEEN '2026-01-01' AND '2026-01-31'
ORDER BY date DESC;

-- ============================================================================
-- TOTALIZAÇÕES E RESUMOS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Calcular meu saldo atual
-- ----------------------------------------------------------------------------
SELECT
  COALESCE(
    (SELECT amount FROM initial_balances WHERE user_id = auth.uid()),
    0
  ) as saldo_inicial,
  COALESCE(
    (SELECT SUM(amount) FROM transactions WHERE user_id = auth.uid() AND type = 'income'),
    0
  ) as total_entradas,
  COALESCE(
    (SELECT SUM(amount) FROM transactions WHERE user_id = auth.uid() AND type = 'expense'),
    0
  ) as total_saidas,
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
  ) as saldo_atual;

-- ----------------------------------------------------------------------------
-- Total de entradas e saídas do mês
-- ----------------------------------------------------------------------------
SELECT
  SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as entradas_mes,
  SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as saidas_mes,
  SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END) as saldo_mes
FROM transactions
WHERE user_id = auth.uid()
  AND DATE_TRUNC('month', date) = DATE_TRUNC('month', CURRENT_DATE);

-- ----------------------------------------------------------------------------
-- Entradas por forma de pagamento
-- ----------------------------------------------------------------------------
SELECT
  CASE payment_method
    WHEN 'cash' THEN 'Dinheiro'
    WHEN 'pix' THEN 'PIX'
    WHEN 'debit_card' THEN 'Cartão de Débito'
    WHEN 'credit_card' THEN 'Cartão de Crédito'
    ELSE 'Não especificado'
  END as forma_pagamento,
  COUNT(*) as quantidade_transacoes,
  SUM(amount) as total,
  ROUND(AVG(amount), 2) as media_por_transacao
FROM transactions
WHERE user_id = auth.uid()
  AND type = 'income'
  AND payment_method IS NOT NULL
GROUP BY payment_method
ORDER BY total DESC;

-- ----------------------------------------------------------------------------
-- Saídas por categoria
-- ----------------------------------------------------------------------------
SELECT
  CASE category
    WHEN 'fixed' THEN 'Despesa Fixa'
    WHEN 'variable' THEN 'Despesa Variável'
    ELSE 'Não especificado'
  END as categoria,
  COUNT(*) as quantidade_transacoes,
  SUM(amount) as total,
  ROUND(AVG(amount), 2) as media_por_transacao
FROM transactions
WHERE user_id = auth.uid()
  AND type = 'expense'
  AND category IS NOT NULL
GROUP BY category
ORDER BY total DESC;

-- ============================================================================
-- ANÁLISES AVANÇADAS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Comparativo mensal (últimos 6 meses)
-- ----------------------------------------------------------------------------
SELECT
  TO_CHAR(DATE_TRUNC('month', date), 'YYYY-MM') as mes,
  TO_CHAR(DATE_TRUNC('month', date), 'TMMonth/YYYY') as mes_nome,
  SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as entradas,
  SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as saidas,
  SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END) as saldo
FROM transactions
WHERE user_id = auth.uid()
  AND date >= CURRENT_DATE - INTERVAL '6 months'
GROUP BY DATE_TRUNC('month', date)
ORDER BY mes DESC;

-- ----------------------------------------------------------------------------
-- Maiores entradas
-- ----------------------------------------------------------------------------
SELECT
  description as descricao,
  amount as valor,
  CASE payment_method
    WHEN 'cash' THEN 'Dinheiro'
    WHEN 'pix' THEN 'PIX'
    WHEN 'debit_card' THEN 'Débito'
    WHEN 'credit_card' THEN 'Crédito'
  END as forma,
  date as data
FROM transactions
WHERE user_id = auth.uid()
  AND type = 'income'
ORDER BY amount DESC
LIMIT 10;

-- ----------------------------------------------------------------------------
-- Maiores saídas
-- ----------------------------------------------------------------------------
SELECT
  description as descricao,
  amount as valor,
  CASE category
    WHEN 'fixed' THEN 'Fixa'
    WHEN 'variable' THEN 'Variável'
  END as categoria,
  date as data
FROM transactions
WHERE user_id = auth.uid()
  AND type = 'expense'
ORDER BY amount DESC
LIMIT 10;

-- ----------------------------------------------------------------------------
-- Transações agrupadas por dia
-- ----------------------------------------------------------------------------
SELECT
  date as data,
  TO_CHAR(date, 'TMDay, DD/MM/YYYY') as data_formatada,
  COUNT(*) as total_transacoes,
  SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as entradas,
  SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as saidas,
  SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END) as saldo_dia
FROM transactions
WHERE user_id = auth.uid()
  AND date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY date
ORDER BY date DESC;

-- ----------------------------------------------------------------------------
-- Média diária de entradas e saídas (último mês)
-- ----------------------------------------------------------------------------
SELECT
  ROUND(AVG(CASE WHEN type = 'income' THEN amount END), 2) as media_entradas,
  ROUND(AVG(CASE WHEN type = 'expense' THEN amount END), 2) as media_saidas,
  COUNT(CASE WHEN type = 'income' THEN 1 END) as qtd_entradas,
  COUNT(CASE WHEN type = 'expense' THEN 1 END) as qtd_saidas
FROM transactions
WHERE user_id = auth.uid()
  AND date >= CURRENT_DATE - INTERVAL '30 days';

-- ----------------------------------------------------------------------------
-- Descrições mais frequentes
-- ----------------------------------------------------------------------------
SELECT
  description as descricao,
  type as tipo,
  COUNT(*) as vezes_usada,
  SUM(amount) as total,
  ROUND(AVG(amount), 2) as media
FROM transactions
WHERE user_id = auth.uid()
GROUP BY description, type
ORDER BY vezes_usada DESC
LIMIT 10;

-- ============================================================================
-- BUSCAS ESPECÍFICAS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Buscar transações por descrição (busca parcial)
-- ----------------------------------------------------------------------------
SELECT
  type,
  description,
  amount,
  date
FROM transactions
WHERE user_id = auth.uid()
  AND description ILIKE '%compra%'  -- substitua 'compra' pelo termo desejado
ORDER BY date DESC;

-- ----------------------------------------------------------------------------
-- Buscar transações acima de um valor
-- ----------------------------------------------------------------------------
SELECT
  type,
  description,
  amount,
  date
FROM transactions
WHERE user_id = auth.uid()
  AND amount > 100  -- substitua 100 pelo valor desejado
ORDER BY amount DESC;

-- ----------------------------------------------------------------------------
-- Buscar apenas despesas fixas
-- ----------------------------------------------------------------------------
SELECT
  description as descricao,
  amount as valor,
  date as data
FROM transactions
WHERE user_id = auth.uid()
  AND type = 'expense'
  AND category = 'fixed'
ORDER BY date DESC;

-- ----------------------------------------------------------------------------
-- Buscar apenas receitas em PIX
-- ----------------------------------------------------------------------------
SELECT
  description as descricao,
  amount as valor,
  date as data
FROM transactions
WHERE user_id = auth.uid()
  AND type = 'income'
  AND payment_method = 'pix'
ORDER BY date DESC;

-- ============================================================================
-- RELATÓRIOS GERENCIAIS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Relatório completo do mês atual
-- ----------------------------------------------------------------------------
SELECT
  'Resumo Financeiro - ' || TO_CHAR(CURRENT_DATE, 'TMMonth/YYYY') as relatorio,
  (SELECT amount FROM initial_balances WHERE user_id = auth.uid()) as saldo_inicial,
  SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as entradas,
  SUM(CASE WHEN type = 'expense' AND category = 'fixed' THEN amount ELSE 0 END) as despesas_fixas,
  SUM(CASE WHEN type = 'expense' AND category = 'variable' THEN amount ELSE 0 END) as despesas_variaveis,
  SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as total_despesas,
  (
    (SELECT COALESCE(amount, 0) FROM initial_balances WHERE user_id = auth.uid()) +
    SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) -
    SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END)
  ) as saldo_final
FROM transactions
WHERE user_id = auth.uid()
  AND DATE_TRUNC('month', date) = DATE_TRUNC('month', CURRENT_DATE);

-- ----------------------------------------------------------------------------
-- Percentual de despesas fixas vs variáveis
-- ----------------------------------------------------------------------------
SELECT
  SUM(CASE WHEN category = 'fixed' THEN amount ELSE 0 END) as despesas_fixas,
  SUM(CASE WHEN category = 'variable' THEN amount ELSE 0 END) as despesas_variaveis,
  ROUND(
    (SUM(CASE WHEN category = 'fixed' THEN amount ELSE 0 END) /
    NULLIF(SUM(amount), 0)) * 100,
    2
  ) as percentual_fixas,
  ROUND(
    (SUM(CASE WHEN category = 'variable' THEN amount ELSE 0 END) /
    NULLIF(SUM(amount), 0)) * 100,
    2
  ) as percentual_variaveis
FROM transactions
WHERE user_id = auth.uid()
  AND type = 'expense'
  AND DATE_TRUNC('month', date) = DATE_TRUNC('month', CURRENT_DATE);

-- ============================================================================
-- EXPORTAÇÃO DE DADOS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Exportar todas as transações (formato para Excel/CSV)
-- ----------------------------------------------------------------------------
SELECT
  TO_CHAR(date, 'DD/MM/YYYY') as data,
  CASE type
    WHEN 'income' THEN 'Entrada'
    WHEN 'expense' THEN 'Saída'
  END as tipo,
  description as descricao,
  amount as valor,
  CASE
    WHEN type = 'income' THEN
      CASE payment_method
        WHEN 'cash' THEN 'Dinheiro'
        WHEN 'pix' THEN 'PIX'
        WHEN 'debit_card' THEN 'Débito'
        WHEN 'credit_card' THEN 'Crédito'
      END
    WHEN type = 'expense' THEN
      CASE category
        WHEN 'fixed' THEN 'Fixa'
        WHEN 'variable' THEN 'Variável'
      END
  END as detalhes,
  TO_CHAR(created_at, 'DD/MM/YYYY HH24:MI') as registrado_em
FROM transactions
WHERE user_id = auth.uid()
ORDER BY date DESC, created_at DESC;

-- ============================================================================
-- DICAS DE USO
-- ============================================================================
--
-- 1. Para filtrar por datas, use o formato: 'YYYY-MM-DD'
--    Exemplo: '2026-01-15'
--
-- 2. Para buscar texto, use ILIKE para ignorar maiúsculas/minúsculas
--    Exemplo: WHERE description ILIKE '%mercado%'
--
-- 3. Use COALESCE para evitar valores NULL
--    Exemplo: COALESCE(SUM(amount), 0)
--
-- 4. Para agrupar por mês, use: DATE_TRUNC('month', date)
--
-- 5. Para formatar datas em português, use TO_CHAR com TM
--    Exemplo: TO_CHAR(date, 'TMMonth/YYYY')
--
-- 6. Sempre inclua WHERE user_id = auth.uid() para segurança
--
-- 7. Use LIMIT para limitar resultados em queries grandes
--    Exemplo: LIMIT 10
--
-- ============================================================================
-- FIM DOS EXEMPLOS
-- ============================================================================
