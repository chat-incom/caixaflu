# Documentação do Banco de Dados - Sistema de Fluxo de Caixa

## Visão Geral

Este documento descreve todas as alterações realizadas no banco de dados para transformar o sistema de lista de tarefas em um sistema completo de fluxo de caixa.

---

## Tabelas do Sistema

### 1. `initial_balances` (Saldo Inicial)

Armazena o saldo inicial do caixa de cada usuário.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | uuid | Identificador único (chave primária) |
| `user_id` | uuid | Referência ao usuário (auth.users) |
| `amount` | numeric | Valor do saldo inicial em reais |
| `created_at` | timestamptz | Data de criação do registro |
| `updated_at` | timestamptz | Data da última atualização |

**Regras:**
- Cada usuário pode ter apenas um saldo inicial (constraint UNIQUE)
- O valor padrão é 0 se não especificado
- Se o usuário for deletado, o saldo inicial também será deletado (ON DELETE CASCADE)

---

### 2. `transactions` (Transações)

Armazena todas as transações (entradas e saídas) do fluxo de caixa.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | uuid | Identificador único (chave primária) |
| `user_id` | uuid | Referência ao usuário (auth.users) |
| `type` | text | Tipo: 'income' (entrada) ou 'expense' (saída) |
| `amount` | numeric | Valor da transação (sempre > 0) |
| `description` | text | Descrição da transação |
| `payment_method` | text | Forma de pagamento (apenas para entradas) |
| `category` | text | Categoria (apenas para saídas) |
| `date` | date | Data da transação |
| `created_at` | timestamptz | Data de criação do registro |
| `updated_at` | timestamptz | Data da última atualização |

**Valores Válidos:**

**`type` (Tipo):**
- `income` - Entrada de dinheiro
- `expense` - Saída de dinheiro

**`payment_method` (Forma de Pagamento) - Apenas para entradas:**
- `credit_card` - Cartão de Crédito
- `debit_card` - Cartão de Débito
- `pix` - PIX
- `cash` - Dinheiro

**`category` (Categoria) - Apenas para saídas:**
- `fixed` - Despesa Fixa
- `variable` - Despesa Variável

**Regras:**
- O campo `amount` deve ser sempre maior que zero
- O campo `type` é obrigatório e só aceita 'income' ou 'expense'
- `payment_method` só é usado quando `type` = 'income'
- `category` só é usado quando `type` = 'expense'
- Data padrão é a data atual se não especificada
- Se o usuário for deletado, todas suas transações também serão deletadas (ON DELETE CASCADE)

---

### 3. `profiles` (Perfis)

Tabela mantida do sistema anterior. Armazena informações básicas dos usuários.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | uuid | Identificador único (referencia auth.users) |
| `email` | text | Email do usuário |
| `created_at` | timestamptz | Data de criação |

---

## Índices para Performance

Os seguintes índices foram criados para otimizar as consultas:

1. `idx_transactions_user_id` - Índice em `transactions.user_id`
   - Acelera consultas que filtram transações por usuário

2. `idx_transactions_date` - Índice em `transactions.date`
   - Acelera consultas que filtram transações por período (semana, mês, etc)

3. `idx_transactions_type` - Índice em `transactions.type`
   - Acelera consultas que filtram apenas entradas ou apenas saídas

---

## Segurança (Row Level Security - RLS)

Todas as tabelas possuem RLS habilitado com políticas restritivas.

### Políticas para `initial_balances`:

| Operação | Política | Regra |
|----------|----------|-------|
| SELECT | Users can view own initial balance | Usuários só podem visualizar seu próprio saldo |
| INSERT | Users can insert own initial balance | Usuários só podem inserir seu próprio saldo |
| UPDATE | Users can update own initial balance | Usuários só podem atualizar seu próprio saldo |
| DELETE | Users can delete own initial balance | Usuários só podem deletar seu próprio saldo |

### Políticas para `transactions`:

| Operação | Política | Regra |
|----------|----------|-------|
| SELECT | Users can view own transactions | Usuários só podem visualizar suas próprias transações |
| INSERT | Users can insert own transactions | Usuários só podem inserir suas próprias transações |
| UPDATE | Users can update own transactions | Usuários só podem atualizar suas próprias transações |
| DELETE | Users can delete own transactions | Usuários só podem deletar suas próprias transações |

**Todas as políticas verificam:** `auth.uid() = user_id`

Isso garante que cada usuário só tenha acesso aos seus próprios dados.

---

## Triggers Automáticos

### 1. Atualização Automática de `updated_at`

Ambas as tabelas (`initial_balances` e `transactions`) possuem triggers que atualizam automaticamente o campo `updated_at` sempre que um registro é modificado.

**Função:** `update_updated_at_column()`

**Triggers:**
- `update_initial_balances_updated_at` (na tabela initial_balances)
- `update_transactions_updated_at` (na tabela transactions)

### 2. Criação Automática de Perfil

Quando um novo usuário se registra, um perfil é criado automaticamente.

**Função:** `handle_new_user()`

**Trigger:** `on_auth_user_created` (na tabela auth.users)

---

## Alterações Realizadas

### ✅ Criadas:
- Tabela `initial_balances`
- Tabela `transactions`
- Índices de performance
- Políticas RLS para ambas as tabelas
- Triggers para atualização automática

### ❌ Removidas:
- Tabela `todos` (não é mais necessária)

### ✓ Mantidas:
- Tabela `profiles`
- Trigger de criação automática de perfil

---

## Como Funciona o Sistema

### 1. Primeiro Acesso
Quando um usuário faz login pela primeira vez:
1. O sistema verifica se existe um saldo inicial
2. Se não existir, exibe a tela de configuração
3. O usuário digita o saldo inicial
4. Um registro é criado na tabela `initial_balances`

### 2. Adicionando Transações
O usuário pode adicionar transações de dois tipos:

**Entrada (Income):**
- Deve informar: valor, descrição, data, forma de pagamento
- Forma de pagamento: Cartão de Crédito, Débito, PIX ou Dinheiro

**Saída (Expense):**
- Deve informar: valor, descrição, data, categoria
- Categoria: Despesa Fixa ou Despesa Variável

### 3. Visualizando o Dashboard
O dashboard mostra:
- **Saldo Atual:** Saldo inicial + total de entradas - total de saídas
- **Total de Entradas:** Soma de todas as transações do tipo 'income'
- **Total de Saídas:** Soma de todas as transações do tipo 'expense'
- **Saldo Inicial:** Valor configurado inicialmente

Também exibe resumos:
- Entradas por forma de pagamento
- Saídas por categoria (fixa/variável)
- Lista completa de transações

### 4. Filtros de Período
O usuário pode filtrar as transações por:
- **Última Semana:** Últimos 7 dias
- **Último Mês:** Últimos 30 dias
- **Tudo:** Todas as transações

---

## Exemplo de Consultas

### Buscar saldo inicial do usuário:
```sql
SELECT * FROM initial_balances
WHERE user_id = auth.uid();
```

### Buscar transações do último mês:
```sql
SELECT * FROM transactions
WHERE user_id = auth.uid()
  AND date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY date DESC, created_at DESC;
```

### Total de entradas por forma de pagamento:
```sql
SELECT
  payment_method,
  SUM(amount) as total
FROM transactions
WHERE user_id = auth.uid()
  AND type = 'income'
GROUP BY payment_method;
```

### Total de saídas por categoria:
```sql
SELECT
  category,
  SUM(amount) as total
FROM transactions
WHERE user_id = auth.uid()
  AND type = 'expense'
GROUP BY category;
```

### Calcular saldo atual:
```sql
SELECT
  (SELECT amount FROM initial_balances WHERE user_id = auth.uid()) +
  (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE user_id = auth.uid() AND type = 'income') -
  (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE user_id = auth.uid() AND type = 'expense')
AS saldo_atual;
```

---

## Status da Migration

✅ **Migration aplicada com sucesso!**

A migration `20260121014105_create_cashflow_schema.sql` foi aplicada e o banco de dados está pronto para uso.

Todas as tabelas, índices, políticas RLS e triggers estão funcionando corretamente.

---

## Suporte

Para dúvidas sobre o banco de dados, consulte:
1. Este documento
2. O código da migration em `supabase/migrations/`
3. A documentação do Supabase: https://supabase.com/docs
