/*
  # Adicionar campos de médico e mês de referência aos repasses médicos

  1. Alterações na Tabela
    - Adicionar campo `doctor_name` (text) - nome do médico
    - Adicionar campo `reference_month` (text) - mês de referência no formato YYYY-MM
  
  2. Índices
    - Criar índice em `doctor_name` para melhor performance nas consultas
    - Criar índice em `reference_month` para filtros por mês
*/

-- Adicionar campo doctor_name
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'medical_transfers' AND column_name = 'doctor_name'
  ) THEN
    ALTER TABLE medical_transfers ADD COLUMN doctor_name text NOT NULL DEFAULT '';
  END IF;
END $$;

-- Adicionar campo reference_month
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'medical_transfers' AND column_name = 'reference_month'
  ) THEN
    ALTER TABLE medical_transfers ADD COLUMN reference_month text NOT NULL DEFAULT '';
  END IF;
END $$;

-- Criar índice para doctor_name
CREATE INDEX IF NOT EXISTS idx_medical_transfers_doctor_name ON medical_transfers(doctor_name);

-- Criar índice para reference_month
CREATE INDEX IF NOT EXISTS idx_medical_transfers_reference_month ON medical_transfers(reference_month);

-- Adicionar comentários
COMMENT ON COLUMN medical_transfers.doctor_name IS 'Nome do médico responsável pelo repasse';
COMMENT ON COLUMN medical_transfers.reference_month IS 'Mês de referência do repasse no formato YYYY-MM';