import { X, TrendingUp, TrendingDown, User } from 'lucide-react';
import { useMemo } from 'react';

interface MedicalTransfer {
  id: string;
  date: string;
  option_type: string;
  category: string;
  description: string;
  amount: number;
  discount_percentage: number;
  discount_amount: number;
  net_amount: number;
  doctor_name: string;
  reference_month: string;
  payment_method: string;
  payment_discount_percentage: number;
  payment_discount_amount: number;
  expense_category: string | null;
  expense_amount: number;
}

type DoctorDetailsModalProps = {
  onClose: () => void;
  doctorName: string;
  transfers: MedicalTransfer[];
  selectedMonth?: string;
};

export function DoctorDetailsModal({ onClose, doctorName, transfers, selectedMonth }: DoctorDetailsModalProps) {
  const doctorTransfers = useMemo(() => {
    console.log('=== FILTRO INICIAL ===');
    console.log('Doctor Name:', doctorName);
    console.log('Selected Month:', selectedMonth);
    console.log('All Transfers:', transfers);

    let filtered = transfers.filter(t => t.doctor_name === doctorName);
    console.log('Transfers do médico (antes do filtro de mês):', filtered);

    if (selectedMonth) {
      filtered = filtered.filter(t => t.reference_month === selectedMonth);
      console.log('Transfers do médico (depois do filtro de mês):', filtered);
    }

    return filtered;
  }, [transfers, doctorName, selectedMonth]);

  const incomeTransfers = useMemo(() => {
    const filtered = doctorTransfers.filter(t => t.option_type !== 'expense');
    console.log('=== ENTRADAS ===');
    console.log('Income Transfers:', filtered);
    return filtered;
  }, [doctorTransfers]);

  const expenseTransfers = useMemo(() => {
    console.log('=== SAÍDAS ===');
    console.log('Doctor Transfers (todos):', doctorTransfers);
    console.log('Option types:', doctorTransfers.map(t => ({ id: t.id, option_type: t.option_type, expense_amount: t.expense_amount })));

    const filtered = doctorTransfers.filter(t => {
      const isExpense = t.option_type === 'expense';
      console.log(`Transfer ${t.id}: option_type="${t.option_type}", isExpense=${isExpense}`);
      return isExpense;
    });

    console.log('Expense Transfers (filtrados):', filtered);
    console.log('Expense details:', filtered.map(t => ({
      id: t.id,
      desc: t.description,
      amount: t.expense_amount,
      category: t.expense_category,
      option_type: t.option_type
    })));

    return filtered;
  }, [doctorTransfers]);

  const totals = useMemo(() => {
    const income = incomeTransfers.reduce((acc, t) => acc + t.net_amount, 0);
    const expense = expenseTransfers.reduce((acc, t) => acc + t.expense_amount, 0);
    return { income, expense, balance: income - expense };
  }, [incomeTransfers, expenseTransfers]);

  const incomesByType = useMemo(() => {
    const grouped: Record<string, { transactions: MedicalTransfer[], total: number, totalGross: number, totalDiscounts: number }> = {};

    incomeTransfers.forEach(t => {
      const type = t.option_type;
      if (!grouped[type]) {
        grouped[type] = { transactions: [], total: 0, totalGross: 0, totalDiscounts: 0 };
      }
      grouped[type].transactions.push(t);
      grouped[type].total += t.net_amount;
      grouped[type].totalGross += t.amount;
      grouped[type].totalDiscounts += t.discount_amount + t.payment_discount_amount;
    });

    return grouped;
  }, [incomeTransfers]);

  const expensesByCategory = useMemo(() => {
    const grouped: Record<string, { transactions: MedicalTransfer[], total: number }> = {};

    expenseTransfers.forEach(t => {
      const category = t.expense_category || 'outros';
      if (!grouped[category]) {
        grouped[category] = { transactions: [], total: 0 };
      }
      grouped[category].transactions.push(t);
      grouped[category].total += t.expense_amount;
    });

    console.log('Expenses By Category:', grouped);
    console.log('Number of categories:', Object.keys(grouped).length);
    return grouped;
  }, [expenseTransfers]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (date: string) => {
    return new Date(date + 'T00:00:00').toLocaleDateString('pt-BR');
  };

  const formatMonth = (month: string) => {
    const [year, monthNum] = month.split('-');
    const date = new Date(parseInt(year), parseInt(monthNum) - 1);
    return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  };

  const optionTypeLabels: Record<string, string> = {
    option1: 'Procedimentos Básicos',
    option2: 'Procedimentos Especiais',
    option3: 'Hospitais'
  };

  const expenseCategoryLabels: Record<string, string> = {
    rateio_mensal: 'Rateio Mensal',
    medicacao: 'Medicação',
    insumo: 'Insumo',
    outros: 'Outros'
  };

  const paymentMethodLabels: Record<string, string> = {
    cash: 'Dinheiro',
    pix: 'PIX',
    debit_card: 'Cartão de Débito',
    credit_card: 'Cartão de Crédito'
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-6 border-b">
          <div className="flex items-center gap-3">
            <User className="text-blue-600" size={28} />
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Detalhes do Médico</h2>
              <p className="text-gray-600">{doctorName}</p>
              {selectedMonth && (
                <p className="text-sm text-gray-500 capitalize">{formatMonth(selectedMonth)}</p>
              )}
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-green-700">Total de Entradas</span>
                <TrendingUp className="text-green-600" size={20} />
              </div>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(totals.income)}</p>
              <p className="text-xs text-green-600 mt-1">{incomeTransfers.length} transações</p>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-red-700">Total de Saídas</span>
                <TrendingDown className="text-red-600" size={20} />
              </div>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(totals.expense)}</p>
              <p className="text-xs text-red-600 mt-1">{expenseTransfers.length} transações</p>
            </div>

            <div className={`border rounded-lg p-4 ${totals.balance >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-sm font-medium ${totals.balance >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
                  Saldo
                </span>
              </div>
              <p className={`text-2xl font-bold ${totals.balance >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                {formatCurrency(totals.balance)}
              </p>
              <p className="text-xs text-gray-500 mt-1">Líquido</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <TrendingUp className="text-green-600" size={20} />
                Entradas Detalhadas
              </h3>

              {Object.keys(incomesByType).length > 0 ? (
                <div className="space-y-4">
                  {Object.entries(incomesByType).map(([type, data]) => (
                    <div key={type} className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="mb-3">
                        <div className="flex justify-between items-center mb-1">
                          <h4 className="font-semibold text-green-800">
                            {optionTypeLabels[type] || type}
                          </h4>
                          <span className="text-lg font-bold text-green-600">
                            {formatCurrency(data.total)}
                          </span>
                        </div>
                        <div className="bg-white rounded p-2 text-xs space-y-1">
                          <div className="flex justify-between text-gray-600">
                            <span>Valor Bruto:</span>
                            <span className="font-medium">{formatCurrency(data.totalGross)}</span>
                          </div>
                          <div className="flex justify-between text-red-600">
                            <span>Descontos Totais:</span>
                            <span className="font-medium">-{formatCurrency(data.totalDiscounts)}</span>
                          </div>
                          <div className="flex justify-between text-green-700 font-semibold border-t pt-1">
                            <span>Valor Líquido:</span>
                            <span>{formatCurrency(data.total)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {data.transactions.map((t) => (
                          <div key={t.id} className="bg-white rounded p-3 text-sm border border-gray-200">
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex-1">
                                <p className="font-medium text-gray-800">{t.description}</p>
                                <p className="text-xs text-gray-500">{formatDate(t.date)}</p>
                                <p className="text-xs text-blue-600 mt-1">
                                  {t.category} • {paymentMethodLabels[t.payment_method] || t.payment_method}
                                </p>
                              </div>
                            </div>
                            <div className="bg-gray-50 rounded p-2 space-y-1 text-xs">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Valor Base:</span>
                                <span className="font-medium">{formatCurrency(t.amount)}</span>
                              </div>
                              {t.discount_percentage > 0 && (
                                <div className="flex justify-between text-red-600">
                                  <span>Desconto Operação ({t.discount_percentage}%):</span>
                                  <span>-{formatCurrency(t.discount_amount)}</span>
                                </div>
                              )}
                              {t.payment_discount_percentage > 0 && (
                                <div className="flex justify-between text-red-600">
                                  <span>Desconto Pagamento ({t.payment_discount_percentage}%):</span>
                                  <span>-{formatCurrency(t.payment_discount_amount)}</span>
                                </div>
                              )}
                              <div className="flex justify-between text-green-700 font-semibold border-t pt-1">
                                <span>Valor Líquido:</span>
                                <span>{formatCurrency(t.net_amount)}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                  <p className="text-gray-500">Nenhuma entrada registrada</p>
                </div>
              )}
            </div>

            <div>
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <TrendingDown className="text-red-600" size={20} />
                Saídas Detalhadas
              </h3>

              {Object.keys(expensesByCategory).length > 0 ? (
                <div className="space-y-4">
                  {Object.entries(expensesByCategory).map(([category, data]) => (
                    <div key={category} className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-semibold text-red-800">
                          {expenseCategoryLabels[category] || category}
                        </h4>
                        <span className="text-lg font-bold text-red-600">
                          {formatCurrency(data.total)}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {data.transactions.map((t) => (
                          <div key={t.id} className="bg-white rounded p-2 text-sm">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <p className="font-medium text-gray-800">{t.description}</p>
                                <p className="text-xs text-gray-500">{formatDate(t.date)}</p>
                              </div>
                              <span className="font-semibold text-red-600 ml-2">
                                {formatCurrency(t.expense_amount)}
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
                  <p className="text-gray-500">Nenhuma saída registrada</p>
                </div>
              )}
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
