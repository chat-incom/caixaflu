# Documentação do Sistema de Fluxo de Caixa

Bem-vindo à documentação completa do Sistema de Fluxo de Caixa!

## Sobre o Sistema

Este é um sistema completo de gestão de fluxo de caixa que permite:

- Configurar um saldo inicial
- Registrar entradas de dinheiro (com diferentes formas de pagamento)
- Registrar saídas de dinheiro (despesas fixas e variáveis)
- Visualizar resumos financeiros
- Filtrar transações por período
- Acompanhar o saldo atual em tempo real

---

## Documentação Disponível

### Para Usuários

📖 **[Como Usar o Sistema](COMO_USAR.md)**
- Guia completo passo a passo
- Como criar conta e fazer login
- Como adicionar e gerenciar transações
- Dicas e boas práticas
- Perguntas frequentes

### Para Desenvolvedores e Administradores

🗄️ **[Documentação do Banco de Dados](BANCO_DE_DADOS.md)**
- Estrutura completa das tabelas
- Explicação de todos os campos
- Políticas de segurança (RLS)
- Índices e otimizações
- Triggers automáticos
- Exemplos de consultas SQL

---

## Início Rápido

### Para Usuários

1. Acesse o sistema
2. Crie uma conta ou faça login
3. Configure seu saldo inicial
4. Comece a adicionar transações
5. Acompanhe seu fluxo de caixa!

### Para Desenvolvedores

1. O banco de dados já está configurado
2. A migration foi aplicada automaticamente
3. Todas as tabelas e políticas RLS estão ativas
4. O sistema está pronto para uso

---

## Tecnologias Utilizadas

- **Frontend**: React + TypeScript + Vite
- **Estilização**: Tailwind CSS
- **Banco de Dados**: Supabase (PostgreSQL)
- **Autenticação**: Supabase Auth
- **Segurança**: Row Level Security (RLS)

---

## Estrutura do Projeto

```
project/
├── src/
│   ├── components/      # Componentes React
│   │   ├── Auth.tsx                    # Tela de login/cadastro
│   │   ├── InitialBalanceSetup.tsx    # Configuração de saldo inicial
│   │   ├── TransactionForm.tsx        # Formulário de transações
│   │   └── Dashboard.tsx              # Dashboard principal
│   ├── contexts/        # Contextos React
│   │   ├── AuthContext.tsx            # Gerenciamento de autenticação
│   │   └── CashFlowContext.tsx        # Gerenciamento de fluxo de caixa
│   ├── lib/            # Bibliotecas e utilitários
│   │   └── supabase.ts                # Cliente Supabase e tipos
│   ├── App.tsx         # Componente principal
│   └── main.tsx        # Ponto de entrada
├── supabase/
│   └── migrations/     # Migrations do banco de dados
│       ├── 20260120192748_create_todos_schema.sql
│       └── 20260121014105_create_cashflow_schema.sql
└── docs/               # Documentação
    ├── README.md                       # Este arquivo
    ├── COMO_USAR.md                   # Guia do usuário
    └── BANCO_DE_DADOS.md              # Documentação técnica
```

---

## Funcionalidades Principais

### ✅ Autenticação
- Login seguro com email e senha
- Cadastro de novos usuários
- Sessão persistente

### ✅ Gestão de Saldo
- Configuração de saldo inicial
- Cálculo automático do saldo atual
- Visualização de totais

### ✅ Transações de Entrada
- Registro de vendas e recebimentos
- 4 formas de pagamento:
  - Dinheiro
  - PIX
  - Cartão de Débito
  - Cartão de Crédito
- Resumo por método de pagamento

### ✅ Transações de Saída
- Registro de despesas
- 2 categorias:
  - Despesas Fixas
  - Despesas Variáveis
- Resumo por categoria

### ✅ Dashboard Completo
- 4 cards informativos
- Gráficos de resumo
- Lista de transações
- Filtros por período (semana, mês, tudo)

### ✅ Segurança
- Row Level Security (RLS) habilitado
- Cada usuário só vê seus próprios dados
- Proteção contra acesso não autorizado

---

## Status do Sistema

✅ **Sistema em produção e funcionando!**

- Banco de dados configurado
- Migration aplicada com sucesso
- Interface em português
- Todos os recursos funcionando

---

## Próximos Passos

Sugestões para futuras melhorias:

1. **Exportação de Dados**
   - Exportar para Excel/CSV
   - Gerar relatórios em PDF

2. **Gráficos e Análises**
   - Gráficos de pizza
   - Gráficos de linha temporal
   - Comparativos mensais

3. **Funcionalidades Adicionais**
   - Recuperação de senha
   - Múltiplos caixas por usuário
   - Categorias personalizadas
   - Tags nas transações
   - Notas e anexos

4. **Integrações**
   - Notificações por email
   - Lembretes de despesas fixas
   - Metas financeiras

---

## Contato e Suporte

Para dúvidas, sugestões ou problemas:

1. Consulte a documentação disponível
2. Entre em contato com o administrador do sistema
3. Abra uma issue no repositório (se aplicável)

---

## Licença

[Especificar licença do projeto]

---

**Última atualização:** Janeiro de 2026

**Versão do Sistema:** 1.0.0
