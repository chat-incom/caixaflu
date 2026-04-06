/*
  # Criar tabela de repasses médicos com nova estrutura

  1. Nova tabela `medical_transfers`
    - `id` (uuid, primary key)
    - `user_id` (uuid, foreign key para auth.users)
    - `date` (date) - data do repasse
    - `doctor_name` (text) - nome do médico
    - `reference_month` (text) - mês de referência (formato: YYYY-MM)
    - `procedure_type` (text) - tipo de procedimento
    - `description` (text) - descrição adicional
    - `entry_amount` (numeric) - valor de entrada
    - `payment_type` (text) - à vista ou parcelado (apenas informativo)
    - `installments` (integer) - quantidade de parcelas (1-12)
    - `expense_category` (text) - categoria de saída (opcional)
    - `expense_amount` (numeric) - valor de saída (opcional)
    - `observations` (text) - observações (opcional)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)
  
  2. Tipos de procedimento com porcentagens
    - Consulta: 16,33%
    - Infiltrações: 40%
    - Onda de Choque: 30%
    - Cirurgia Particular: 2%
    - Médico Parceiro: 50%
  
  3. Segurança
    - RLS habilitado
    - Políticas para usuários autenticados acessarem apenas seus próprios dados
  
  4. Índices
    - Por médico para visualização individualizada
    - Por médico e mês de referência para relatórios
*/

-- Criar tabela
CREATE TABLE IF NOT EXISTS medical_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  doctor_name text NOT NULL,
  reference_month text NOT NULL,
  procedure_type text NOT NULL,
  description text,
  entry_amount numeric(10, 2) NOT NULL CHECK (entry_amount >= 0),
  payment_type text NOT NULL CHECK (payment_type IN ('À vista', 'Parcelado')),
  installments integer NOT NULL DEFAULT 1 CHECK (installments >= 1 AND installments <= 12),
  expense_category text,
  expense_amount numeric(10, 2) DEFAULT 0 CHECK (expense_amount >= 0),
  observations text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE medical_transfers ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view own medical transfers"
  ON medical_transfers FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own medical transfers"
  ON medical_transfers FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own medical transfers"
  ON medical_transfers FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own medical transfers"
  ON medical_transfers FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_medical_transfers_user_id 
ON medical_transfers(user_id);

CREATE INDEX IF NOT EXISTS idx_medical_transfers_doctor 
ON medical_transfers(doctor_name);

CREATE INDEX IF NOT EXISTS idx_medical_transfers_doctor_reference_month 
ON medical_transfers(doctor_name, reference_month);

CREATE INDEX IF NOT EXISTS idx_medical_transfers_reference_month 
ON medical_transfers(reference_month);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_medical_transfers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER medical_transfers_updated_at
  BEFORE UPDATE ON medical_transfers
  FOR EACH ROW
  EXECUTE FUNCTION update_medical_transfers_updated_at();

-- Comentários para documentação
COMMENT ON TABLE medical_transfers IS 'Tabela de repasses médicos individualizados por médico';
COMMENT ON COLUMN medical_transfers.procedure_type IS 'Consulta (16,33%), Infiltrações (40%), Onda de Choque (30%), Cirurgia Particular (2%), Médico Parceiro (50%)';
COMMENT ON COLUMN medical_transfers.payment_type IS 'À vista ou Parcelado - campo informativo apenas';
COMMENT ON COLUMN medical_transfers.installments IS 'Quantidade de parcelas de 1 a 12';
COMMENT ON COLUMN medical_transfers.observations IS 'Campo opcional para observações adicionais';