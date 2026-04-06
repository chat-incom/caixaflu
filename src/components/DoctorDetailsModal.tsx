import { X, TrendingUp, TrendingDown, User } from 'lucide-react';
import { useMemo } from 'react';

interface MedicalTransfer {
  id: string;
  date: string;
  doctor_name: string;
  reference_month: string;
  procedure_type: string;
  description: string;
  entry_amount: number;
  payment_type: string;
  installments: number;
  expense_category: string | null;
  expense_amount: number;
  observations: string | null;
}

type DoctorDetailsModalProps = {
  onClose: () => void;
  doctorName: string;
  transfers: MedicalTransfer[];
  selectedMonth?: string;
};

const PROCEDURE_TYPES = [
  { value: 'Consulta', label: 'Consulta', percentage: 16.33 },
  { value: 'Infiltrações', label: 'Infiltrações', percentage: 40 },
  { value: 'Onda de Choque', label: 'Onda de Choque', percentage: 30 },
  { value: 'Cirurgia Particular', label: 'Cirurgia Particular', percentage: 2 },
  { value: 'Médico Parceiro', label: 'Médico Parceiro', percentage: 50 }
];

const EXPENSE_CATEGORIES = [
  { value: 'rateio_mensal', label: 'Rateio Mensal' },
  { value: 'medicacao', label: 'Medicação' },
  { value: 'insumo', label: 'Insumo' },
  { value: 'outros', label: 'Outros' }
];

export function DoctorDetailsModal({ onClose, doctorName, transfers, selectedMonth }: DoctorDetailsModalProps) {
  const getProcedurePercentage = (procedureType: string) => {
    const procedure = PROCEDURE_TYPES.find(p => p.value === procedureType);
    return procedure ? procedure.percentage : 0;
  };

  const calculateRepasse = (entryAmount: number, procedureType: string) => {
    const percentage = getProcedurePercentage(procedureType);
    return (entryAmount * percentage) / 100;
  };

  const filteredTransfers = useMemo(() => {
    let filtered = transfers.filter(t => t.doctor_name === doctorName);

    if (selectedMonth) {
      filtered = filtered.filter(t => t.reference_month === selectedMonth);
    }

    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transfers, doctorName, selectedMonth]);

  const totals = useMemo(() => {
    const totalEntry = filteredTransfers.reduce((sum, t) => sum + t.entry_amount, 0);
    const totalRepasse = filteredTransfers.reduce((sum, t) => {
      return sum + calculateRepasse(t.entry_amount, t.procedure_type);
    }, 0);
    const totalExpense = filteredTransfers.reduce((sum, t) => sum + (t.expense_amount || 0), 0);
    const totalLiquid = totalRepasse - totalExpense;

    return { totalEntry, totalRepasse, totalExpense, totalLiquid };
  }, [filteredTransfers]);

  const monthlyBreakdown = useMemo(() => {
    const months: Record<string, {
      entry: number;
      repasse: number;
      expense: number;
      liquid: number;
      count: number;
    }> = {};

    filteredTransfers.forEach(t => {
      const month = t.reference_month;
      if (!months[month]) {
        months[month] = { entry: 0, repasse: 0, expense: 0, liquid: 0, count: 0 };
      }

      const repasseAmount = calculateRepasse(t.entry_amount, t.procedure_type);
      const expenseAmount = t.expense_amount || 0;

      months[month].entry += t.entry_amount;
      months[month].repasse += repasseAmount;
      months[month].expense += expenseAmount;
      months[month].liquid += (repasseAmount - expenseAmount);
      months[month].count++;
    });

    return Object.entries(months)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([month, data]) => ({ month, ...data }));
  }, [filteredTransfers]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('pt-BR');
  };

  const formatMonth = (month: string) => {
    const [year, monthNum] = month.split('-');
    const date = new Date(parseInt(year), parseInt(monthNum) - 1, 15);
    return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  };

  const formatMonthShort = (month: string) => {
    const [year, monthNum] = month.split('-');
    const date = new Date(parseInt(year), parseInt(monthNum) - 1, 15);
    return date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
  };

  const getExpenseCategoryLabel = (category: string | null) => {
    if (!category) return '-';
    const cat = EXPENSE_CATEGORIES.find(c => c.value === category);
    return cat ? cat.label : category;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-6 border-b">
          <div className="flex items-center gap-3">
            <User className="text-blue-600" size={28} />
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Detalhamento do Médico</h2>
              <p className="text-gray-600">{doctorName}</p>
              {selectedMonth && (
                <p className="text-sm text-gray-500">{formatMonth(selectedMonth)}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition p-2"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-700">Total Entradas</span>
                <TrendingUp className="text-blue-600" size={20} />
              </div>
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(totals.totalEntry)}</p>
              <p className="text-xs text-blue-600 mt-1">{filteredTransfers.length} lançamentos</p>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-green-700">Repasse Bruto</span>
              </div>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(totals.totalRepasse)}</p>
              <p className="text-xs text-green-600 mt-1">Após porcentagens</p>
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-orange-700">Total Saídas</span>
                <TrendingDown className="text-orange-600" size={20} />
              </div>
              <p className="text-2xl font-bold text-orange-600">{formatCurrency(totals.totalExpense)}</p>
            </div>

            <div className={`border rounded-lg p-4 ${totals.totalLiquid >= 0 ? 'bg-teal-50 border-teal-200' : 'bg-red-50 border-red-200'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-sm font-medium ${totals.totalLiquid >= 0 ? 'text-teal-700' : 'text-red-700'}`}>
                  Líquido Final
                </span>
              </div>
              <p className={`text-2xl font-bold ${totals.totalLiquid >= 0 ? 'text-teal-600' : 'text-red-600'}`}>
                {formatCurrency(totals.totalLiquid)}
              </p>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Resumo por Mês</h3>
            {monthlyBreakdown.length > 0 ? (
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">Mês</th>
                      <th className="py-3 px-4 text-right text-sm font-semibold text-gray-700">Entradas</th>
                      <th className="py-3 px-4 text-right text-sm font-semibold text-gray-700">Repasse</th>
                      <th className="py-3 px-4 text-right text-sm font-semibold text-gray-700">Saídas</th>
                      <th className="py-3 px-4 text-right text-sm font-semibold text-gray-700">Líquido</th>
                      <th className="py-3 px-4 text-center text-sm font-semibold text-gray-700">Qtd</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {monthlyBreakdown.map(({ month, entry, repasse, expense, liquid, count }) => (
                      <tr key={month} className="hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <span className="font-medium">{formatMonthShort(month)}</span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="text-blue-600 font-medium">{formatCurrency(entry)}</span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="text-green-600 font-medium">{formatCurrency(repasse)}</span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="text-orange-600 font-medium">{formatCurrency(expense)}</span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className={`font-bold ${liquid >= 0 ? 'text-teal-600' : 'text-red-600'}`}>
                            {formatCurrency(liquid)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center text-gray-700">{count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                <p className="text-gray-500">Nenhum dado disponível</p>
              </div>
            )}
          </div>

          <div>
            <h3 className="text-lg font-bold text-gray-800 mb-4">Detalhamento de Lançamentos</h3>
            {filteredTransfers.length > 0 ? (
              <div className="space-y-4">
                {filteredTransfers.map((t) => {
                  const repasseAmount = calculateRepasse(t.entry_amount, t.procedure_type);
                  const liquidAmount = repasseAmount - (t.expense_amount || 0);
                  const procedure = PROCEDURE_TYPES.find(p => p.value === t.procedure_type);

                  return (
                    <div key={t.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-blue-600">{t.procedure_type}</span>
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                              {procedure?.percentage}%
                            </span>
                            <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">
                              {t.payment_type}
                              {t.payment_type === 'Parcelado' && ` - ${t.installments}x`}
                            </span>
                          </div>
                          <p className="text-gray-800">{t.description || 'Sem descrição'}</p>
                          <p className="text-sm text-gray-500">
                            {formatDate(t.date)} • Mês ref: {formatMonthShort(t.reference_month)}
                          </p>
                          {t.observations && (
                            <p className="text-sm text-gray-600 mt-1 italic">Obs: {t.observations}</p>
                          )}
                        </div>
                        <div className="text-right ml-4">
                          <p className="text-xs text-gray-500">Entrada</p>
                          <p className="text-lg font-medium text-blue-600">{formatCurrency(t.entry_amount)}</p>
                          <p className="text-xs text-gray-500 mt-1">Repasse</p>
                          <p className="text-lg font-bold text-green-600">{formatCurrency(repasseAmount)}</p>
                          {t.expense_amount > 0 && (
                            <>
                              <p className="text-xs text-gray-500 mt-1">Saída</p>
                              <p className="text-sm font-medium text-orange-600">-{formatCurrency(t.expense_amount)}</p>
                            </>
                          )}
                          <p className="text-xs text-gray-500 mt-2 pt-2 border-t">Líquido</p>
                          <p className="text-xl font-bold text-teal-600">{formatCurrency(liquidAmount)}</p>
                        </div>
                      </div>

                      {t.expense_amount > 0 && t.expense_category && (
                        <div className="bg-orange-50 rounded p-3 text-sm mt-3">
                          <p className="text-orange-800">
                            <span className="font-medium">Saída:</span> {getExpenseCategoryLabel(t.expense_category)} - {formatCurrency(t.expense_amount)}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
                <p className="text-gray-500 text-lg">Nenhum lançamento encontrado</p>
              </div>
            )}
          </div>
        </div>

        <div className="border-t p-4 bg-gray-50 flex justify-between items-center">
          <div className="text-sm text-gray-500">
            {filteredTransfers.length} lançamentos
            {selectedMonth && ` • ${formatMonth(selectedMonth)}`}
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
