import { X, TrendingUp, TrendingDown, Calendar } from 'lucide-react';
import { useCashFlow } from '../contexts/CashFlowContext';
import { useMemo } from 'react';

type MonthDetailsModalProps = {
  onClose: () => void;
  selectedMonth: string;
  initialBalance: number;
  finalBalance: number;
};

export function MonthDetailsModal({ onClose, selectedMonth, initialBalance, finalBalance }: MonthDetailsModalProps) {
  const { transactions } = useCashFlow();

  const monthTransactions = useMemo(() => {
    return transactions.filter(t => t.reference_month === selectedMonth);
  }, [transactions, selectedMonth]);

  const incomeTransactions = useMemo(() => {
    return monthTransactions.filter(t => t.type === 'income');
  }, [monthTransactions]);

  const expenseTransactions = useMemo(() => {
    return monthTransactions.filter(t => t.type === 'expense');
  }, [monthTransactions]);

  const totals = useMemo(() => {
    const income = incomeTransactions.reduce((acc, t) => acc + t.amount, 0);
    const expense = expenseTransactions.reduce((acc, t) => acc + t.amount, 0);
    return { income, expense, balance: income - expense };
  }, [incomeTransactions, expenseTransactions]);

  const expensesByCategory = useMemo(() => {
    const fixed = expenseTransactions.filter(t => t.category === 'fixed');
    const variable = expenseTransactions.filter(t => t.category === 'variable');
    return {
      fixed: {
        transactions: fixed,
        total: fixed.reduce((acc, t) => acc + t.amount, 0)
      },
      variable: {
        transactions: variable,
        total: variable.reduce((acc, t) => acc + t.amount, 0)
      }
    };
  }, [expenseTransactions]);

  const incomesByPaymentMethod = useMemo(() => {
    const grouped: Record<string, { transactions: any[], total: number }> = {};
    incomeTransactions.forEach(t => {
      const method = t.payment_method || 'outros';
      if (!grouped[method]) {
        grouped[method] = { transactions: [], total: 0 };
      }
      grouped[method].transactions.push(t);
      grouped[method].total += t.amount;
    });
    return grouped;
  }, [incomeTransactions]);

  const fixedSubcategoryTotals = useMemo(() => {
    const fixed = expenseTransactions.filter(t => t.category === 'fixed' && t.fixed_subcategory);
    const grouped: Record<string, number> = {};
    fixed.forEach(t => {
      const sub = t.fixed_subcategory!;
      grouped[sub] = (grouped[sub] || 0) + t.amount;
    });
    return grouped;
  }, [expenseTransactions]);

  const formatMonth = (month: string) => {
    const [year, monthNum] = month.split('-');
    const date = new Date(parseInt(year), parseInt(monthNum) - 1);
    return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (date: string) => {
    return new Date(date + 'T00:00:00').toLocaleDateString('pt-BR');
  };

  const paymentMethodLabels: Record<string, string> = {
    cash: 'Dinheiro',
    pix: 'PIX',
    debit_card: 'Cartão de Débito',
    credit_card: 'Cartão de Crédito',
    outros: 'Outros'
  };

  const subcategoryLabels: Record<string, string> = {
    internet: 'Internet',
    energia: 'Energia',
    condominio: 'Condomínio',
    funcionario: 'Funcionário'
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-6 border-b">
          <div className="flex items-center gap-3">
            <Calendar className="text-blue-600" size={28} />
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Detalhes do Mês</h2>
              <p className="text-gray-600 capitalize">{formatMonth(selectedMonth)}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-50 border border-gray-300 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Saldo Inicial</span>
              </div>
              <p className="text-2xl font-bold text-gray-700">{formatCurrency(initialBalance)}</p>
              <p className="text-xs text-gray-500 mt-1">Início do mês</p>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-green-700">Total de Entradas</span>
                <TrendingUp className="text-green-600" size={20} />
              </div>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(totals.income)}</p>
              <p className="text-xs text-green-600 mt-1">{incomeTransactions.length} transações</p>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-red-700">Total de Saídas</span>
                <TrendingDown className="text-red-600" size={20} />
              </div>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(totals.expense)}</p>
              <p className="text-xs text-red-600 mt-1">{expenseTransactions.length} transações</p>
            </div>

            <div className={`border rounded-lg p-4 ${finalBalance >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-sm font-medium ${finalBalance >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
                  Saldo Final
                </span>
              </div>
              <p className={`text-2xl font-bold ${finalBalance >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                {formatCurrency(finalBalance)}
              </p>
              <p className="text-xs text-gray-500 mt-1">Fim do mês</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <TrendingUp className="text-green-600" size={20} />
                Entradas Detalhadas
              </h3>

              {Object.keys(incomesByPaymentMethod).length > 0 ? (
                <div className="space-y-4">
                  {Object.entries(incomesByPaymentMethod).map(([method, data]) => (
                    <div key={method} className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-semibold text-green-800">
                          {paymentMethodLabels[method] || method}
                        </h4>
                        <span className="text-lg font-bold text-green-600">
                          {formatCurrency(data.total)}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {data.transactions.map((t: any) => (
                          <div key={t.id} className="bg-white rounded p-2 text-sm">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <p className="font-medium text-gray-800">{t.description}</p>
                                <p className="text-xs text-gray-500">{formatDate(t.date)}</p>
                              </div>
                              <span className="font-semibold text-green-600 ml-2">
                                {formatCurrency(t.amount)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                  <p className="text-gray-500">Nenhuma entrada neste mês</p>
                </div>
              )}
            </div>

            <div>
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <TrendingDown className="text-red-600" size={20} />
                Saídas Detalhadas
              </h3>

              <div className="space-y-4">
                {expensesByCategory.fixed.transactions.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-semibold text-red-800">Despesas Fixas</h4>
                      <span className="text-lg font-bold text-red-600">
                        {formatCurrency(expensesByCategory.fixed.total)}
                      </span>
                    </div>

                    {Object.keys(fixedSubcategoryTotals).length > 0 && (
                      <div className="mb-3 bg-white rounded p-2">
                        <p className="text-xs font-medium text-gray-600 mb-2">Por tipo:</p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {Object.entries(fixedSubcategoryTotals).map(([sub, total]) => (
                            <div key={sub} className="flex justify-between">
                              <span className="text-gray-700">{subcategoryLabels[sub]}:</span>
                              <span className="font-semibold text-red-600">{formatCurrency(total)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      {expensesByCategory.fixed.transactions.map((t: any) => (
                        <div key={t.id} className="bg-white rounded p-2 text-sm">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <p className="font-medium text-gray-800">{t.description}</p>
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                <span>{formatDate(t.date)}</span>
                                {t.fixed_subcategory && (
                                  <>
                                    <span>•</span>
                                    <span className="text-red-600 font-medium">
                                      {subcategoryLabels[t.fixed_subcategory]}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                            <span className="font-semibold text-red-600 ml-2">
                              {formatCurrency(t.amount)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {expensesByCategory.variable.transactions.length > 0 && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-semibold text-orange-800">Despesas Variáveis</h4>
                      <span className="text-lg font-bold text-orange-600">
                        {formatCurrency(expensesByCategory.variable.total)}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {expensesByCategory.variable.transactions.map((t: any) => (
                        <div key={t.id} className="bg-white rounded p-2 text-sm">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <p className="font-medium text-gray-800">{t.description}</p>
                              <p className="text-xs text-gray-500">{formatDate(t.date)}</p>
                            </div>
                            <span className="font-semibold text-orange-600 ml-2">
                              {formatCurrency(t.amount)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {expensesByCategory.fixed.transactions.length === 0 &&
                 expensesByCategory.variable.transactions.length === 0 && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                    <p className="text-gray-500">Nenhuma saída neste mês</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="border-t p-4 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
