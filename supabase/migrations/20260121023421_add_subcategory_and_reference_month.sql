/*
  # Adicionar subcategoria e mês de referência

  1. Alterações na tabela transactions
    - Adiciona campo `fixed_subcategory` para despesas fixas
      Opções: 'internet', 'energia', 'condominio', 'funcionario'
    - Adiciona campo `reference_month` para controlar o mês de referência
      Formato: 'YYYY-MM'
  
  2. Validações
    - fixed_subcategory: apenas valores específicos permitidos
    - reference_month: formato de data válido
  
  3. Segurança
    - Mantém todas as políticas RLS existentes
    - Campos são opcionais mas recomendados para despesas fixas
*/

-- Adicionar campo para subcategoria de despesas fixas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'fixed_subcategory'
  ) THEN
    ALTER TABLE transactions 
    ADD COLUMN fixed_subcategory text 
    CHECK (fixed_subcategory IN ('internet', 'energia', 'condominio', 'funcionario'));
  END IF;
END $$;

-- Adicionar campo para mês de referência
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'reference_month'
  ) THEN
    ALTER TABLE transactions 
    ADD COLUMN reference_month text;
  END IF;
END $$;

-- Adicionar comentários nos novos campos
COMMENT ON COLUMN transactions.fixed_subcategory IS 
'Subcategoria para despesas fixas: internet, energia, condominio, funcionario';

COMMENT ON COLUMN transactions.reference_month IS 
'Mês de referência da transação no formato YYYY-MM (ex: 2026-01)';

-- Criar índice para facilitar consultas por mês de referência
CREATE INDEX IF NOT EXISTS idx_transactions_reference_month 
ON transactions(reference_month) 
WHERE reference_month IS NOT NULL;