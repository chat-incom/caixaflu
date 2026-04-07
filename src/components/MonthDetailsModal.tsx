import { X, TrendingUp, TrendingDown, Calendar, Printer } from 'lucide-react';
import { useCashFlow } from '../contexts/CashFlowContext';
import { useMemo, useRef } from 'react';

type MonthDetailsModalProps = {
  onClose: () => void;
  selectedMonth: string;
  initialBalance: number;
  finalBalance: number;
};

export function MonthDetailsModal({ onClose, selectedMonth, initialBalance, finalBalance }: MonthDetailsModalProps) {
  const { transactions } = useCashFlow();
  const modalContentRef = useRef<HTMLDivElement>(null);

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
    const grouped: Record<string, { transactions: any[], total: number }> = {};

    expenseTransactions.forEach(t => {
      const cat = t.category || 'outros';
      if (!grouped[cat]) {
        grouped[cat] = { transactions: [], total: 0 };
      }
      grouped[cat].transactions.push(t);
      grouped[cat].total += t.amount;
    });

    return grouped;
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
    deposito: 'Depósito',
    outros: 'Outros'
  };

  const categoryLabels: Record<string, string> = {
    fixed: 'Despesas Fixas',
    variable: 'Despesas Variáveis',
    repasse_medico: 'Repasse Médico',
    imposto: 'Impostos',
    adiantamento: 'Adiantamentos',
    fatura: 'Faturas',
    investimentos: 'Investimentos',
    outros: 'Outros'
  };

  const categoryColors: Record<string, { bg: string, border: string, text: string }> = {
    fixed: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-600' },
    variable: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-600' },
    repasse_medico: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-600' },
    imposto: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-600' },
    adiantamento: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-600' },
    fatura: { bg: 'bg-pink-50', border: 'border-pink-200', text: 'text-pink-600' },
    investimentos: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-600' },
    outros: { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-600' }
  };

  const subcategoryLabels: Record<string, string> = {
    internet: 'Internet',
    energia: 'Energia',
    condominio: 'Condomínio',
    funcionario: 'Funcionário',
    contabilidade: 'Contabilidade',
    sistema: 'Sistema',
    impressora: 'Impressora',
    supermercado: 'Supermercado',
    insumo: 'Insumo'
  };

  const handlePrint = () => {
    const printContent = modalContentRef.current;
    if (!printContent) return;

    const originalTitle = document.title;
    document.title = `Relatório Financeiro - ${formatMonth(selectedMonth)}`;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Por favor, permita pop-ups para imprimir');
      return;
    }

    const styles = document.querySelectorAll('style, link[rel="stylesheet"]');
    let stylesHTML = '';
    styles.forEach((style) => {
      if (style.tagName === 'STYLE') {
        stylesHTML += style.outerHTML;
      } else if (style.tagName === 'LINK') {
        stylesHTML += style.outerHTML;
      }
    });

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Relatório Financeiro - ${formatMonth(selectedMonth)}</title>
          <meta charset="UTF-8">
          <script src="https://cdn.tailwindcss.com"></script>
          ${stylesHTML}
          <style>
            @media print {
              body {
                padding: 20px;
                background: white;
              }
              .no-print {
                display: none !important;
              }
              button {
                display: none !important;
              }
              .print-container {
                margin: 0;
                padding: 0;
              }
              @page {
                size: A4;
                margin: 2cm;
              }
            }
            body {
              font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
            }
          </style>
        </head>
        <body>
          <div class="print-container">
            ${printContent.outerHTML}
          </div>
          <script>
            window.onload = () => {
              window.print();
              window.onafterprint = () => window.close();
            };
          <\/script>
        </body>
      </html>
    `);

    printWindow.document.close();
    document.title = originalTitle;
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
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="text-gray-400 hover:text-gray-600 transition p-2 hover:bg-gray-100 rounded-lg"
              title="Imprimir"
            >
              <Printer size={24} />
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        <div ref={modalContentRef} className="p-6 overflow-y-auto flex-1">
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
                {Object.keys(expensesByCategory).length > 0 ? (
                  Object.entries(expensesByCategory).map(([category, data]) => {
                    const colors = categoryColors[category] || categoryColors.outros;
                    const isFixed = category === 'fixed';

                    return (
                      <div key={category} className={`${colors.bg} border ${colors.border} rounded-lg p-4`}>
                        <div className="flex justify-between items-center mb-3">
                          <h4 className={`font-semibold ${colors.text.replace('text-', 'text-')}`}>
                            {categoryLabels[category] || category}
                          </h4>
                          <span className={`text-lg font-bold ${colors.text}`}>
                            {formatCurrency(data.total)}
                          </span>
                        </div>

                        {isFixed && Object.keys(fixedSubcategoryTotals).length > 0 && (
                          <div className="mb-3 bg-white rounded p-2">
                            <p className="text-xs font-medium text-gray-600 mb-2">Por tipo:</p>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              {Object.entries(fixedSubcategoryTotals).map(([sub, total]) => (
                                <div key={sub} className="flex justify-between">
                                  <span className="text-gray-700">{subcategoryLabels[sub]}:</span>
                                  <span className={`font-semibold ${colors.text}`}>{formatCurrency(total)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="space-y-2">
                          {data.transactions.map((t: any) => (
                            <div key={t.id} className="bg-white rounded p-2 text-sm">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <p className="font-medium text-gray-800">{t.description}</p>
                                  <div className="flex items-center gap-2 text-xs text-gray-500">
                                    <span>{formatDate(t.date)}</span>
                                    {t.fixed_subcategory && (
                                      <>
                                        <span>•</span>
                                        <span className={`${colors.text} font-medium`}>
                                          {subcategoryLabels[t.fixed_subcategory]}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>
                                <span className={`font-semibold ${colors.text} ml-2`}>
                                  {formatCurrency(t.amount)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })
                ) : (
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
