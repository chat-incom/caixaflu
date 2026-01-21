# Como Usar o Sistema de Fluxo de Caixa

## Guia Completo para Usuários

Este documento explica como usar o sistema de fluxo de caixa passo a passo.

---

## 1. Primeiro Acesso

### Criar uma Conta

1. Acesse o sistema
2. Clique em "Não tem uma conta? Cadastre-se"
3. Digite seu email
4. Digite uma senha (mínimo 6 caracteres)
5. Clique em "Cadastrar"
6. Você verá uma mensagem: "Conta criada com sucesso! Você já pode fazer login."
7. Clique em "Já tem uma conta? Entre"

### Fazer Login

1. Digite seu email
2. Digite sua senha
3. Clique em "Entrar"

---

## 2. Configurar Saldo Inicial

Após fazer login pela primeira vez, você será levado à tela de configuração do saldo inicial.

1. Digite o valor inicial do seu caixa em reais
   - Exemplo: 1000.00 para R$ 1.000,00
2. Clique em "Confirmar Saldo"

**Importante:** Você só precisa fazer isso uma vez. O saldo inicial será usado como base para calcular seu saldo atual.

---

## 3. Dashboard Principal

Após configurar o saldo inicial, você verá o dashboard com:

### Cartões de Resumo

**Saldo Atual** (Azul)
- Mostra o saldo atual do seu caixa
- Cálculo: Saldo Inicial + Total de Entradas - Total de Saídas

**Entradas** (Verde)
- Total de dinheiro que entrou no período selecionado

**Saídas** (Vermelho)
- Total de dinheiro que saiu no período selecionado

**Saldo Inicial** (Âmbar)
- O valor que você configurou inicialmente

### Resumos Detalhados

**Entradas por Método**
- Dinheiro
- PIX
- Cartão de Débito
- Cartão de Crédito

**Saídas por Categoria**
- Despesas Fixas
- Despesas Variáveis

---

## 4. Filtrar por Período

Você pode filtrar as transações por período:

- **Última Semana**: Mostra transações dos últimos 7 dias
- **Último Mês**: Mostra transações dos últimos 30 dias
- **Tudo**: Mostra todas as transações

Os resumos nos cartões e nas tabelas serão atualizados automaticamente conforme o período selecionado.

---

## 5. Adicionar uma Transação

### Para Adicionar uma Entrada (Dinheiro que Entra)

1. Clique no botão "+ Nova Transação"
2. Selecione "Entrada" (botão verde)
3. Digite o valor em reais
   - Exemplo: 250.50
4. Digite uma descrição
   - Exemplo: "Venda de produto"
5. Selecione a data da transação
6. Escolha a forma de pagamento:
   - Dinheiro
   - PIX
   - Cartão de Débito
   - Cartão de Crédito
7. Clique em "Adicionar"

### Para Adicionar uma Saída (Despesa)

1. Clique no botão "+ Nova Transação"
2. Selecione "Saída" (botão vermelho)
3. Digite o valor em reais
   - Exemplo: 150.00
4. Digite uma descrição
   - Exemplo: "Aluguel" ou "Compra de material"
5. Selecione a data da transação
6. Escolha a categoria:
   - **Fixa**: Despesas recorrentes (aluguel, salários, contas fixas)
   - **Variável**: Despesas que variam (compras, manutenção)
7. Clique em "Adicionar"

---

## 6. Visualizar Transações

A lista de transações mostra:

- **Ícone**: Verde para entradas, vermelho para saídas
- **Descrição**: O que você digitou ao criar a transação
- **Data**: Quando a transação ocorreu
- **Informação Extra**:
  - Para entradas: forma de pagamento
  - Para saídas: categoria (Fixa ou Variável)
- **Valor**:
  - Entradas aparecem em verde com sinal "+"
  - Saídas aparecem em vermelho com sinal "-"

---

## 7. Excluir uma Transação

1. Passe o mouse sobre a transação que deseja excluir
2. Um ícone de lixeira aparecerá à direita
3. Clique no ícone de lixeira
4. Confirme a exclusão na mensagem que aparecer
5. A transação será removida e os totais atualizados automaticamente

**Atenção:** Esta ação não pode ser desfeita!

---

## 8. Sair do Sistema

1. Clique no botão "Sair" no canto superior direito
2. Você será desconectado e levado de volta à tela de login

---

## Dicas e Boas Práticas

### Organização

1. **Use descrições claras**: Em vez de "Compra", use "Compra de material de limpeza"
2. **Registre imediatamente**: Adicione transações assim que elas acontecem
3. **Revise regularmente**: Verifique seus resumos semanalmente

### Categorização

**Despesas Fixas** - Use para:
- Aluguel
- Salários
- Contas mensais (água, luz, internet)
- Seguros
- Prestações fixas

**Despesas Variáveis** - Use para:
- Compras de mercadorias
- Manutenção
- Combustível
- Materiais de escritório
- Compras ocasionais

### Formas de Pagamento

Registre corretamente as formas de pagamento das entradas para:
- Saber quanto dinheiro você tem em cada meio
- Controlar vendas por método de pagamento
- Reconciliar com extratos bancários

---

## Perguntas Frequentes

### Posso alterar o saldo inicial?

Sim, mas o sistema não tem uma interface específica para isso. Se precisar alterar, entre em contato com o suporte.

### E se eu excluir uma transação por engano?

Infelizmente, não é possível recuperar transações excluídas. Você precisará adicioná-la novamente.

### Posso exportar meus dados?

No momento, o sistema não possui funcionalidade de exportação. Esta funcionalidade pode ser adicionada no futuro.

### Como faço backup dos meus dados?

Seus dados estão armazenados de forma segura no banco de dados Supabase. O sistema faz backups automáticos.

### Posso ter múltiplos caixas?

No momento, cada usuário pode ter apenas um caixa. Se você precisa gerenciar múltiplos caixas, pode criar múltiplas contas.

### O que acontece se eu perder minha senha?

Atualmente, não há funcionalidade de recuperação de senha implementada. Entre em contato com o suporte.

---

## Segurança

- Todos os seus dados são privados e só você pode vê-los
- Use uma senha forte com pelo menos 6 caracteres
- Não compartilhe sua senha com ninguém
- Sempre clique em "Sair" quando terminar de usar o sistema
- O sistema utiliza criptografia e segurança em nível de banco de dados (RLS)

---

## Suporte

Para dúvidas ou problemas:
1. Consulte este guia
2. Verifique a documentação técnica em `docs/BANCO_DE_DADOS.md`
3. Entre em contato com o administrador do sistema
