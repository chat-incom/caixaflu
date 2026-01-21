import { useState, useMemo } from 'react';
import { useCashFlow } from '../contexts/CashFlowContext';
import { useAuth } from '../contexts/AuthContext';
import { TransactionForm } from './TransactionForm';
import { MonthDetailsModal } from './MonthDetailsModal';
import { EditInitialBalanceModal } from './EditInitialBalanceModal';
import {
  Plus,
  LogOut,
  TrendingUp,
  TrendingDown,
  Wallet,
  DollarSign,
  Trash2,
  Calendar,
  FileText,
  Edit3,
} from 'lucide-react';

export function Dashboard() {
  const { user, signOut } = useAuth();
  const { initialBalance, transactions, loading, deleteTransaction } = useCashFlow();
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [showMonthDetails, setShowMonthDetails] = useState(false);
  const [showEditBalance, setShowEditBalance] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [periodFilter, setPeriodFilter] = useState<'all' | 'month' | 'week'>('month');

  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    transactions.forEach(t => {
      if (t.reference_month) {
        months.add(t.reference_month);
      }
    });
    return Array.from(months).sort().reverse();
  }, [transactions]);

  const getMonthBalance = useMemo(() => {
    const sortedMonths = Array.from(availableMonths).sort();
    const balanceMap = new Map<string, { initial: number; final: number; income: number; expense: number }>();

    let currentBalance = initialBalance?.amount || 0;

    sortedMonths.forEach(month => {
      const monthTransactions = transactions.filter(t => t.reference_month === month);
      const income = monthTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
      const expense = monthTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

      const initialBalance = currentBalance;
      const finalBalance = currentBalance + income - expense;

      balanceMap.set(month, {
        initial: initialBalance,
        final: finalBalance,
        income,
        expense
      });

      currentBalance = finalBalance;
    });

    return balanceMap;
  }, [availableMonths, transactions, initialBalance]);

  const filteredTransactions = useMemo(() => {
    if (periodFilter === 'all') return transactions;

    const now = new Date();
    const startDate = new Date();

    if (periodFilter === 'month') {
      startDate.setMonth(now.getMonth() - 1);
    } else if (periodFilter === 'week') {
      startDate.setDate(now.getDate() - 7);
    }

    return transactions.filter(t => new Date(t.date) >= startDate);
  }, [transactions, periodFilter]);

  const summary = useMemo(() => {
    const income = filteredTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const expenses = filteredTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const fixedExpenses = filteredTransactions
      .filter(t => t.type === 'expense' && t.category === 'fixed')
      .reduce((sum, t) => sum + t.amount, 0);

    const variableExpenses = filteredTransactions
      .filter(t => t.type === 'expense' && t.category === 'variable')
      .reduce((sum, t) => sum + t.amount, 0);

    const currentBalance = (initialBalance?.amount || 0) + income - expenses;

    const incomeByMethod = {
      cash: 0,
      pix: 0,
      debit_card: 0,
      credit_card: 0,
    };

    filteredTransactions
      .filter(t => t.type === 'income' && t.payment_method)
      .forEach(t => {
        incomeByMethod[t.payment_method!] += t.amount;
      });

    return {
      income,
      expenses,
      fixedExpenses,
      variableExpenses,
      currentBalance,
      incomeByMethod,
    };
  }, [filteredTransactions, initialBalance]);

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta transação?')) {
      await deleteTransaction(id);
    }
  };

  const handleOpenMonthDetails = (month: string) => {
    setSelectedMonth(month);
    setShowMonthDetails(true);
  };

  const formatMonthLabel = (month: string) => {
    const [year, monthNum] = month.split('-');
    const date = new Date(parseInt(year), parseInt(monthNum) - 1);
    return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  };

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      cash: 'Dinheiro',
      pix: 'PIX',
      debit_card: 'Débito',
      credit_card: 'Crédito',
    };
    return labels[method] || method;
  };

  const getCategoryLabel = (category: string) => {
    return category === 'fixed' ? 'Fixa' : 'Variável';
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString + 'T00:00:00').toLocaleDateString('pt-BR');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-sky-100 flex items-center justify-center">
        <div className="text-gray-600 text-lg">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-sky-100">
      <div className="max-w-6xl mx-auto p-4 py-8">
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Fluxo de Caixa</h1>
              <p className="text-gray-600 mt-1">{user?.email}</p>
            </div>
            <button
              onClick={signOut}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition"
            >
              <LogOut size={20} />
              <span>Sair</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium opacity-90">Saldo Atual</span>
                <Wallet size={20} />
              </div>
              <p className="text-2xl font-bold">{formatCurrency(summary.currentBalance)}</p>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium opacity-90">Entradas</span>
                <TrendingUp size={20} />
              </div>
              <p className="text-2xl font-bold">{formatCurrency(summary.income)}</p>
            </div>

            <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-4 text-white">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium opacity-90">Saídas</span>
                <TrendingDown size={20} />
              </div>
              <p className="text-2xl font-bold">{formatCurrency(summary.expenses)}</p>
            </div>

            <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-4 text-white relative group">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium opacity-90">Saldo Inicial</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowEditBalance(true)}
                    className="opacity-0 group-hover:opacity-100 transition bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg p-1.5"
                    title="Editar saldo inicial"
                  >
                    <Edit3 size={16} />
                  </button>
                  <DollarSign size={20} />
                </div>
              </div>
              <p className="text-2xl font-bold">{formatCurrency(initialBalance?.amount || 0)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-50 rounded-xl p-4">
              <h3 className="font-semibold text-gray-800 mb-3">Entradas por Método</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Dinheiro:</span>
                  <span className="font-semibold text-gray-800">
                    {formatCurrency(summary.incomeByMethod.cash)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">PIX:</span>
                  <span className="font-semibold text-gray-800">
                    {formatCurrency(summary.incomeByMethod.pix)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Débito:</span>
                  <span className="font-semibold text-gray-800">
                    {formatCurrency(summary.incomeByMethod.debit_card)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Crédito:</span>
                  <span className="font-semibold text-gray-800">
                    {formatCurrency(summary.incomeByMethod.credit_card)}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4">
              <h3 className="font-semibold text-gray-800 mb-3">Saídas por Categoria</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Despesas Fixas:</span>
                  <span className="font-semibold text-gray-800">
                    {formatCurrency(summary.fixedExpenses)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Despesas Variáveis:</span>
                  <span className="font-semibold text-gray-800">
                    {formatCurrency(summary.variableExpenses)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setPeriodFilter('week')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  periodFilter === 'week'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Última Semana
              </button>
              <button
                onClick={() => setPeriodFilter('month')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  periodFilter === 'month'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Último Mês
              </button>
              <button
                onClick={() => setPeriodFilter('all')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  periodFilter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Tudo
              </button>
            </div>

            <button
              onClick={() => setShowTransactionForm(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition"
            >
              <Plus size={20} />
              Nova Transação
            </button>
          </div>
        </div>

        {availableMonths.length > 0 && (
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <FileText size={24} />
              Ver Detalhes por Mês
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {availableMonths.map(month => {
                const monthData = getMonthBalance.get(month);
                if (!monthData) return null;

                return (
                  <button
                    key={month}
                    onClick={() => handleOpenMonthDetails(month)}
                    className="bg-gradient-to-br from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 border-2 border-blue-200 rounded-xl p-4 text-left transition group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-blue-800 capitalize">
                        {formatMonthLabel(month)}
                      </span>
                      <Calendar size={16} className="text-blue-600" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">Saldo Inicial:</span>
                        <span className="font-semibold text-gray-700">{formatCurrency(monthData.initial)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">Entradas:</span>
                        <span className="font-semibold text-green-600">{formatCurrency(monthData.income)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">Saídas:</span>
                        <span className="font-semibold text-red-600">{formatCurrency(monthData.expense)}</span>
                      </div>
                      <div className="flex justify-between text-xs pt-1 border-t border-blue-200">
                        <span className="text-gray-700 font-medium">Saldo Final:</span>
                        <span className={`font-bold ${monthData.final >= 0 ? 'text-blue-700' : 'text-orange-600'}`}>
                          {formatCurrency(monthData.final)}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-xl p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Transações</h2>

          {filteredTransactions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">Nenhuma transação encontrada.</p>
              <p className="text-gray-400 mt-2">Adicione sua primeira transação para começar!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center gap-4 p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition group"
                >
                  <div
                    className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                      transaction.type === 'income'
                        ? 'bg-green-100 text-green-600'
                        : 'bg-red-100 text-red-600'
                    }`}
                  >
                    {transaction.type === 'income' ? (
                      <TrendingUp size={20} />
                    ) : (
                      <TrendingDown size={20} />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800">{transaction.description}</p>
                    <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                      <Calendar size={14} />
                      <span>{formatDate(transaction.date)}</span>
                      <span>•</span>
                      {transaction.type === 'income' && transaction.payment_method && (
                        <span>{getPaymentMethodLabel(transaction.payment_method)}</span>
                      )}
                      {transaction.type === 'expense' && transaction.category && (
                        <span>{getCategoryLabel(transaction.category)}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex-shrink-0 text-right">
                    <p
                      className={`text-lg font-bold ${
                        transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {transaction.type === 'income' ? '+' : '-'} {formatCurrency(transaction.amount)}
                    </p>
                  </div>

                  <button
                    onClick={() => handleDelete(transaction.id)}
                    className="flex-shrink-0 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showTransactionForm && (
        <TransactionForm onClose={() => setShowTransactionForm(false)} />
      )}

      {showMonthDetails && selectedMonth && (
        <MonthDetailsModal
          selectedMonth={selectedMonth}
          initialBalance={getMonthBalance.get(selectedMonth)?.initial || 0}
          finalBalance={getMonthBalance.get(selectedMonth)?.final || 0}
          onClose={() => setShowMonthDetails(false)}
        />
      )}

      {showEditBalance && (
        <EditInitialBalanceModal
          currentBalance={initialBalance?.amount || 0}
          onClose={() => setShowEditBalance(false)}
        />
      )}
    </div>
  );
}
