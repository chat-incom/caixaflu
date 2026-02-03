/*
  # Adicionar tipo 'expense' ao option_type de medical_transfers

  1. Alterações
    - Remover constraint existente de option_type
    - Adicionar novo constraint que inclui 'expense' como opção válida

  2. Tipos permitidos
    - option1: Procedimentos básicos
    - option2: Procedimentos especiais
    - option3: Hospitais
    - expense: Lançamento de saídas
  
  3. Observações
    - Esta migração permite que saídas sejam lançadas como tipo 'expense'
    - Mantém compatibilidade com os tipos existentes
*/

-- Remover constraint existente de option_type
ALTER TABLE medical_transfers 
DROP CONSTRAINT IF EXISTS medical_transfers_option_type_check;

-- Adicionar novo constraint que inclui 'expense'
ALTER TABLE medical_transfers 
ADD CONSTRAINT medical_transfers_option_type_check 
CHECK (option_type IN ('option1', 'option2', 'option3', 'expense'));

-- Adicionar comentário explicativo
COMMENT ON COLUMN medical_transfers.option_type IS 'Tipo da operação: option1 (Procedimentos básicos), option2 (Procedimentos especiais), option3 (Hospitais), expense (Saídas)';