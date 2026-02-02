/*
  # Criar tabela de Repasses Médicos

  1. Nova Tabela
    - `medical_transfers`
      - `id` (uuid, chave primária)
      - `user_id` (uuid, referência para auth.users)
      - `date` (date, data do repasse)
      - `option_type` (text, tipo da opção: 'option1', 'option2', 'option3')
      - `category` (text, categoria específica dentro da opção)
      - `description` (text, descrição opcional)
      - `amount` (decimal, valor de entrada)
      - `discount_percentage` (decimal, percentual de desconto)
      - `discount_amount` (decimal, valor do desconto calculado)
      - `net_amount` (decimal, valor líquido após desconto)
      - `created_at` (timestamptz, data de criação)
      - `updated_at` (timestamptz, data de atualização)
  
  2. Segurança
    - Habilitar RLS na tabela `medical_transfers`
    - Política para usuários autenticados visualizarem apenas seus próprios repasses
    - Política para usuários autenticados inserirem seus próprios repasses
    - Política para usuários autenticados atualizarem seus próprios repasses
    - Política para usuários autenticados deletarem seus próprios repasses
  
  3. Índices
    - Índice em `user_id` para melhor performance nas consultas
    - Índice em `date` para ordenação e filtragem por data
*/

CREATE TABLE IF NOT EXISTS medical_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  option_type text NOT NULL CHECK (option_type IN ('option1', 'option2', 'option3')),
  category text NOT NULL,
  description text DEFAULT '',
  amount decimal(15, 2) NOT NULL CHECK (amount >= 0),
  discount_percentage decimal(5, 2) NOT NULL CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
  discount_amount decimal(15, 2) NOT NULL CHECK (discount_amount >= 0),
  net_amount decimal(15, 2) NOT NULL CHECK (net_amount >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE medical_transfers ENABLE ROW LEVEL SECURITY;

-- Política para SELECT
CREATE POLICY "Users can view own medical transfers"
  ON medical_transfers FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Política para INSERT
CREATE POLICY "Users can insert own medical transfers"
  ON medical_transfers FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Política para UPDATE
CREATE POLICY "Users can update own medical transfers"
  ON medical_transfers FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Política para DELETE
CREATE POLICY "Users can delete own medical transfers"
  ON medical_transfers FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_medical_transfers_user_id ON medical_transfers(user_id);
CREATE INDEX IF NOT EXISTS idx_medical_transfers_date ON medical_transfers(date);

-- Criar função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_medical_transfers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_medical_transfers_updated_at_trigger ON medical_transfers;
CREATE TRIGGER update_medical_transfers_updated_at_trigger
  BEFORE UPDATE ON medical_transfers
  FOR EACH ROW
  EXECUTE FUNCTION update_medical_transfers_updated_at();