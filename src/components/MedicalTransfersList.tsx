import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Trash2, CreditCard as Edit2, X, Save, ChevronDown, ChevronUp, List, User } from 'lucide-react';
import { DoctorDetailsModal } from './DoctorDetailsModal';

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

interface MedicalTransfersListProps {
  refreshTrigger: number;
}

const PROCEDURE_TYPES = [
  { value: 'Consulta', label: 'Consulta', percentage: 20 },
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

export default function MedicalTransfersList({ refreshTrigger }: MedicalTransfersListProps) {
  const [transfers, setTransfers] = useState<MedicalTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedDoctor, setSelectedDoctor] = useState<string>('');
  const [availableDoctors, setAvailableDoctors] = useState<string[]>([]);
  const [doctorDetailsModal, setDoctorDetailsModal] = useState<string | null>(null);
  const [showAllTransfers, setShowAllTransfers] = useState<boolean>(false);
  const [initialDisplayCount] = useState<number>(10);

  useEffect(() => {
    fetchTransfers();
  }, [refreshTrigger]);

  const fetchTransfers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('medical_transfers')
        .select('*')
        .eq('user_id', user.id)
        .order('reference_month', { ascending: false })
        .order('date', { ascending: false });

      if (error) throw error;
      setTransfers(data || []);

      const doctors = new Set<string>();
      data?.forEach(t => {
        if (t.doctor_name) {
          doctors.add(t.doctor_name);
        }
      });
      setAvailableDoctors(Array.from(doctors).sort());
    } catch (error) {
      console.error('Erro ao buscar repasses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este repasse?')) return;

    try {
      const { error } = await supabase
        .from('medical_transfers')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchTransfers();
    } catch (error) {
      console.error('Erro ao excluir repasse:', error);
      alert('Erro ao excluir repasse');
    }
  };

  const getProcedurePercentage = (procedureType: string) => {
    const procedure = PROCEDURE_TYPES.find(p => p.value === procedureType);
    return procedure ? procedure.percentage : 0;
  };

  const calculateRepasse = (entryAmount: number, procedureType: string) => {
    const percentage = getProcedurePercentage(procedureType);
    return (entryAmount * percentage) / 100;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('pt-BR');
  };

  const getExpenseCategoryLabel = (category: string | null) => {
    if (!category) return '-';
    const cat = EXPENSE_CATEGORIES.find(c => c.value === category);
    return cat ? cat.label : category;
  };

  const formatReferenceMonth = (monthString: string) => {
    if (!monthString) return '-';
    const [year, month] = monthString.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 15);
    return date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
  };

  const getMonthlyStats = () => {
    const stats: { [key: string]: { total: number; count: number } } = {};

    transfers.forEach((transfer) => {
      const monthKey = transfer.reference_month;
      if (!stats[monthKey]) {
        stats[monthKey] = { total: 0, count: 0 };
      }
      const repasseAmount = calculateRepasse(transfer.entry_amount, transfer.procedure_type);
      stats[monthKey].total += repasseAmount;
      stats[monthKey].count += 1;
    });

    return Object.entries(stats)
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => b.month.localeCompare(a.month));
  };

  const getDoctorStats = () => {
    const stats: { [key: string]: {
      totalEntry: number;
      totalRepasse: number;
      totalExpense: number;
      totalLiquid: number;
      count: number;
    } } = {};

    const filtered = selectedMonth
      ? transfers.filter((t) => t.reference_month === selectedMonth)
      : transfers;

    filtered.forEach((transfer) => {
      const doctor = transfer.doctor_name || 'Sem médico';
      if (!stats[doctor]) {
        stats[doctor] = {
          totalEntry: 0,
          totalRepasse: 0,
          totalExpense: 0,
          totalLiquid: 0,
          count: 0
        };
      }

      const repasseAmount = calculateRepasse(transfer.entry_amount, transfer.procedure_type);
      const expenseAmount = transfer.expense_amount || 0;

      stats[doctor].totalEntry += transfer.entry_amount;
      stats[doctor].totalRepasse += repasseAmount;
      stats[doctor].totalExpense += expenseAmount;
      stats[doctor].totalLiquid += (repasseAmount - expenseAmount);
      stats[doctor].count += 1;
    });

    return Object.entries(stats)
      .map(([doctor, data]) => ({ doctor, ...data }))
      .sort((a, b) => b.totalLiquid - a.totalLiquid);
  };

  const monthlyStats = getMonthlyStats();
  const doctorStats = getDoctorStats();

  const filteredTransfers = transfers.filter((t) => {
    const matchMonth = selectedMonth
      ? t.reference_month === selectedMonth
      : true;
    const matchDoctor = selectedDoctor
      ? t.doctor_name === selectedDoctor
      : true;
    return matchMonth && matchDoctor;
  });

  const transfersToShow = showAllTransfers
    ? filteredTransfers
    : filteredTransfers.slice(0, initialDisplayCount);

  const hasMoreTransfers = filteredTransfers.length > initialDisplayCount;

  const totalEntry = filteredTransfers.reduce((sum, t) => sum + t.entry_amount, 0);
  const totalRepasse = filteredTransfers.reduce((sum, t) => {
    return sum + calculateRepasse(t.entry_amount, t.procedure_type);
  }, 0);
  const totalExpense = filteredTransfers.reduce((sum, t) => sum + (t.expense_amount || 0), 0);
  const totalLiquid = totalRepasse - totalExpense;

  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Carregando repasses...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h3 className="text-xl font-semibold mb-4 text-gray-800">Filtros e Resumo</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mês de Referência</label>
            <select
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(e.target.value);
                setSelectedDoctor('');
                setShowAllTransfers(false);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos os meses</option>
              {monthlyStats.map((stat) => {
                const [year, month] = stat.month.split('-');
                const date = new Date(parseInt(year), parseInt(month) - 1, 15);
                return (
                  <option key={stat.month} value={stat.month}>
                    {date.toLocaleDateString('pt-BR', {
                      month: 'long',
                      year: 'numeric',
                      timeZone: 'UTC'
                    })}
                  </option>
                );
              })}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Médico</label>
            <select
              value={selectedDoctor}
              onChange={(e) => {
                setSelectedDoctor(e.target.value);
                setShowAllTransfers(false);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos os médicos</option>
              {availableDoctors.map((doctor) => (
                <option key={doctor} value={doctor}>
                  {doctor}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-600 font-medium">Total de Entradas</p>
            <p className="text-2xl font-bold text-blue-700">R$ {totalEntry.toFixed(2)}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-sm text-green-600 font-medium">Repasse Bruto</p>
            <p className="text-2xl font-bold text-green-700">R$ {totalRepasse.toFixed(2)}</p>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg">
            <p className="text-sm text-orange-600 font-medium">Total de Saídas</p>
            <p className="text-2xl font-bold text-orange-700">R$ {totalExpense.toFixed(2)}</p>
          </div>
          <div className="bg-teal-50 p-4 rounded-lg">
            <p className="text-sm text-teal-600 font-medium">Repasse Líquido</p>
            <p className="text-2xl font-bold text-teal-700">R$ {totalLiquid.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {doctorStats.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-xl font-semibold mb-4 text-gray-800">Resumo por Médico</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Médico</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Qtd</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Total Entradas</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Repasse</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Saídas</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Líquido</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Ações</th>
                </tr>
              </thead>
              <tbody>
                {doctorStats.map((stat) => (
                  <tr
                    key={stat.doctor}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td
                      className="py-3 px-4 text-sm font-medium text-gray-800 cursor-pointer"
                      onClick={() => {
                        const newDoctor = stat.doctor === selectedDoctor ? '' : stat.doctor;
                        setSelectedDoctor(newDoctor);
                        setShowAllTransfers(false);
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <User size={16} className="text-gray-500" />
                        {stat.doctor}
                        {selectedDoctor === stat.doctor && (
                          <span className="text-xs text-blue-600">(filtrado)</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-700 text-center">
                      {stat.count}
                    </td>
                    <td className="py-3 px-4 text-sm text-blue-600 text-right">
                      R$ {stat.totalEntry.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-sm text-green-600 font-semibold text-right">
                      R$ {stat.totalRepasse.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-sm text-orange-600 text-right">
                      R$ {stat.totalExpense.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-sm text-teal-700 font-bold text-right">
                      R$ {stat.totalLiquid.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => setDoctorDetailsModal(stat.doctor)}
                        className="text-sm text-green-600 hover:text-green-800 font-medium"
                      >
                        Ver Detalhes
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-gray-800">
            Lista de Repasses
            {filteredTransfers.length > 0 && (
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({filteredTransfers.length} lançamentos)
              </span>
            )}
          </h3>

          {hasMoreTransfers && (
            <button
              onClick={() => setShowAllTransfers(!showAllTransfers)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors"
            >
              <List size={18} />
              <span className="font-medium">
                {showAllTransfers ? 'Mostrar menos' : `Ver todos (${filteredTransfers.length})`}
              </span>
              {showAllTransfers ? (
                <ChevronUp size={18} />
              ) : (
                <ChevronDown size={18} />
              )}
            </button>
          )}
        </div>

        {filteredTransfers.length === 0 ? (
          <p className="text-center text-gray-600 py-8">Nenhum repasse registrado ainda</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-2 text-sm font-semibold text-gray-700">Data</th>
                    <th className="text-left py-3 px-2 text-sm font-semibold text-gray-700">Mês Ref.</th>
                    <th className="text-left py-3 px-2 text-sm font-semibold text-gray-700">Médico</th>
                    <th className="text-left py-3 px-2 text-sm font-semibold text-gray-700">Procedimento</th>
                    <th className="text-left py-3 px-2 text-sm font-semibold text-gray-700">Pagamento</th>
                    <th className="text-right py-3 px-2 text-sm font-semibold text-gray-700">Entrada</th>
                    <th className="text-right py-3 px-2 text-sm font-semibold text-gray-700">Repasse</th>
                    <th className="text-right py-3 px-2 text-sm font-semibold text-gray-700">Saída</th>
                    <th className="text-right py-3 px-2 text-sm font-semibold text-gray-700">Líquido</th>
                    <th className="text-center py-3 px-2 text-sm font-semibold text-gray-700">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {transfersToShow.map((transfer) => {
                    const repasseAmount = calculateRepasse(transfer.entry_amount, transfer.procedure_type);
                    const liquidAmount = repasseAmount - (transfer.expense_amount || 0);
                    const procedure = PROCEDURE_TYPES.find(p => p.value === transfer.procedure_type);

                    return (
                      <tr key={transfer.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-2 text-sm text-gray-700">
                          {formatDate(transfer.date)}
                        </td>
                        <td className="py-3 px-2 text-sm text-gray-700">
                          {formatReferenceMonth(transfer.reference_month)}
                        </td>
                        <td className="py-3 px-2 text-sm font-medium text-gray-800">
                          {transfer.doctor_name || '-'}
                        </td>
                        <td className="py-3 px-2 text-sm text-gray-700">
                          <div>{transfer.procedure_type}</div>
                          <div className="text-xs text-gray-500">
                            {procedure?.percentage}%
                          </div>
                        </td>
                        <td className="py-3 px-2 text-sm text-gray-700">
                          <div>{transfer.payment_type}</div>
                          {transfer.payment_type === 'Parcelado' && (
                            <div className="text-xs text-gray-500">
                              {transfer.installments}x
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-2 text-sm text-blue-600 text-right font-medium">
                          R$ {transfer.entry_amount.toFixed(2)}
                        </td>
                        <td className="py-3 px-2 text-sm text-green-600 font-semibold text-right">
                          R$ {repasseAmount.toFixed(2)}
                        </td>
                        <td className="py-3 px-2 text-sm text-orange-600 text-right">
                          {transfer.expense_amount ? `R$ ${transfer.expense_amount.toFixed(2)}` : '-'}
                          {transfer.expense_category && (
                            <div className="text-xs text-gray-500">
                              {getExpenseCategoryLabel(transfer.expense_category)}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-2 text-sm text-teal-700 font-bold text-right">
                          R$ {liquidAmount.toFixed(2)}
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex gap-1 justify-center">
                            <button
                              onClick={() => handleDelete(transfer.id)}
                              className="p-1 text-red-600 hover:text-red-700"
                              title="Excluir"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center">
              <div className="text-sm text-gray-500">
                Mostrando {transfersToShow.length} de {filteredTransfers.length} lançamentos
              </div>

              {hasMoreTransfers && !showAllTransfers && (
                <button
                  onClick={() => setShowAllTransfers(true)}
                  className="flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium text-sm"
                >
                  <span>Ampliar para ver todos os {filteredTransfers.length} lançamentos</span>
                  <ChevronDown size={16} />
                </button>
              )}

              {showAllTransfers && (
                <button
                  onClick={() => setShowAllTransfers(false)}
                  className="flex items-center gap-1 text-gray-600 hover:text-gray-800 font-medium text-sm"
                >
                  <span>Mostrar apenas os primeiros {initialDisplayCount}</span>
                  <ChevronUp size={16} />
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {doctorDetailsModal && (
        <DoctorDetailsModal
          doctorName={doctorDetailsModal}
          transfers={transfers}
          selectedMonth={selectedMonth}
          onClose={() => setDoctorDetailsModal(null)}
        />
      )}
    </div>
  );
}
