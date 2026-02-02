/*
  # Adicionar campos de método de pagamento e categoria de saída aos repasses médicos

  1. Alterações na Tabela
    - Adicionar campo `payment_method` (text) - método de entrada: cash, debit_card, credit_card, pix
    - Adicionar campo `payment_discount_percentage` (decimal) - desconto adicional do método de pagamento
    - Adicionar campo `payment_discount_amount` (decimal) - valor do desconto do método de pagamento
    - Adicionar campo `expense_category` (text) - categoria de saída: rateio_mensal, medicacao, insumo, outros
    - Adicionar campo `expense_amount` (decimal) - valor da saída
  
  2. Índices
    - Criar índice em `payment_method` para melhor performance nas consultas
    - Criar índice em `expense_category` para filtros por categoria
  
  3. Observações
    - Os campos são opcionais
    - payment_method aplica desconto adicional: débito 1.7%, crédito 2.5%
*/

-- Adicionar campo payment_method
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'medical_transfers' AND column_name = 'payment_method'
  ) THEN
    ALTER TABLE medical_transfers ADD COLUMN payment_method text CHECK (payment_method IN ('cash', 'debit_card', 'credit_card', 'pix'));
  END IF;
END $$;

-- Adicionar campo payment_discount_percentage
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'medical_transfers' AND column_name = 'payment_discount_percentage'
  ) THEN
    ALTER TABLE medical_transfers ADD COLUMN payment_discount_percentage decimal(5, 2) DEFAULT 0 CHECK (payment_discount_percentage >= 0 AND payment_discount_percentage <= 100);
  END IF;
END $$;

-- Adicionar campo payment_discount_amount
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'medical_transfers' AND column_name = 'payment_discount_amount'
  ) THEN
    ALTER TABLE medical_transfers ADD COLUMN payment_discount_amount decimal(15, 2) DEFAULT 0 CHECK (payment_discount_amount >= 0);
  END IF;
END $$;

-- Adicionar campo expense_category
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'medical_transfers' AND column_name = 'expense_category'
  ) THEN
    ALTER TABLE medical_transfers ADD COLUMN expense_category text CHECK (expense_category IN ('rateio_mensal', 'medicacao', 'insumo', 'outros'));
  END IF;
END $$;

-- Adicionar campo expense_amount
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'medical_transfers' AND column_name = 'expense_amount'
  ) THEN
    ALTER TABLE medical_transfers ADD COLUMN expense_amount decimal(15, 2) DEFAULT 0 CHECK (expense_amount >= 0);
  END IF;
END $$;

-- Criar índice para payment_method
CREATE INDEX IF NOT EXISTS idx_medical_transfers_payment_method ON medical_transfers(payment_method);

-- Criar índice para expense_category
CREATE INDEX IF NOT EXISTS idx_medical_transfers_expense_category ON medical_transfers(expense_category);

-- Adicionar comentários
COMMENT ON COLUMN medical_transfers.payment_method IS 'Método de entrada: cash (Dinheiro), debit_card (Débito), credit_card (Crédito), pix (PIX)';
COMMENT ON COLUMN medical_transfers.payment_discount_percentage IS 'Percentual de desconto adicional do método de pagamento';
COMMENT ON COLUMN medical_transfers.payment_discount_amount IS 'Valor do desconto adicional do método de pagamento';
COMMENT ON COLUMN medical_transfers.expense_category IS 'Categoria de saída: rateio_mensal, medicacao, insumo, outros';
COMMENT ON COLUMN medical_transfers.expense_amount IS 'Valor da saída';