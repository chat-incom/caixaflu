import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Trash2, Edit2, X, Save } from 'lucide-react';
import { DoctorDetailsModal } from './DoctorDetailsModal';

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

interface MedicalTransfersListProps {
  refreshTrigger: number;
}

const OPTION1_CATEGORIES = [
  'Consulta',
  'Onda de choque',
  'Retirada de pontos',
  'Medicação',
  'Coleta de sangue',
  'Outros'
];

const OPTION2_CATEGORIES = [
  'Infiltração',
  'Viscossuplementação',
  'Cirurgia',
  'Outros'
];

const OPTION3_CATEGORIES = [
  'UDI',
  'HSD',
  'Natus Lumine',
  'Dom Hospital',
  'Centro Médico',
  'Outros'
];

const DISCOUNT_OPTION1 = 16.33;
const DISCOUNT_OPTION2 = 10.93;
const DISCOUNT_OPTION3 = 10.93;
const DISCOUNT_DEBIT = 1.7;
const DISCOUNT_CREDIT = 2.5;

const EXPENSE_CATEGORIES = [
  { value: 'rateio_mensal', label: 'Rateio Mensal' },
  { value: 'medicacao', label: 'Medicação' },
  { value: 'insumo', label: 'Insumo' },
  { value: 'outros', label: 'Outros' }
];

export default function MedicalTransfersList({ refreshTrigger }: MedicalTransfersListProps) {
  const [transfers, setTransfers] = useState<MedicalTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<MedicalTransfer>>({});
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedDoctor, setSelectedDoctor] = useState<string>('');
  const [availableDoctors, setAvailableDoctors] = useState<string[]>([]);
  const [expandedDoctors, setExpandedDoctors] = useState<Set<string>>(new Set());
  const [expenseForm, setExpenseForm] = useState<{[key: string]: {
    description: string;
    amount: number;
    category: string;
  }}>({});
  const [doctorDetailsModal, setDoctorDetailsModal] = useState<string | null>(null);

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

  const startEdit = (transfer: MedicalTransfer) => {
    setEditingId(transfer.id);
    setEditForm({
      date: transfer.date,
      option_type: transfer.option_type,
      category: transfer.category,
      description: transfer.description,
      amount: transfer.amount,
      doctor_name: transfer.doctor_name,
      reference_month: transfer.reference_month,
      payment_method: transfer.payment_method,
      expense_category: transfer.expense_category,
      expense_amount: transfer.expense_amount
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const getCurrentCategories = (optionType: string) => {
    switch (optionType) {
      case 'option1':
        return OPTION1_CATEGORIES;
      case 'option2':
        return OPTION2_CATEGORIES;
      case 'option3':
        return OPTION3_CATEGORIES;
      default:
        return [];
    }
  };

  const getCurrentDiscount = (optionType: string) => {
    switch (optionType) {
      case 'option1':
        return DISCOUNT_OPTION1;
      case 'option2':
        return DISCOUNT_OPTION2;
      case 'option3':
        return DISCOUNT_OPTION3;
      default:
        return 0;
    }
  };

  const getPaymentDiscount = (paymentMethod: string) => {
    switch (paymentMethod) {
      case 'debit_card':
        return DISCOUNT_DEBIT;
      case 'credit_card':
        return DISCOUNT_CREDIT;
      default:
        return 0;
    }
  };

  const calculateValues = (amountValue: number, optionType: string, paymentMethod: string) => {
    const discountPercentage = getCurrentDiscount(optionType);
    const discountAmount = (amountValue * discountPercentage) / 100;

    const paymentDiscountPercentage = getPaymentDiscount(paymentMethod);
    const paymentDiscountAmount = (amountValue * paymentDiscountPercentage) / 100;

    const netAmount = amountValue - discountAmount - paymentDiscountAmount;

    return {
      discountPercentage,
      discountAmount,
      paymentDiscountPercentage,
      paymentDiscountAmount,
      netAmount
    };
  };

  const saveEdit = async () => {
    const isExpense = editForm.option_type === 'expense';

    if (!editingId || !editForm.doctor_name || !editForm.reference_month) {
      alert('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    if (isExpense) {
      if (!editForm.expense_category || !editForm.expense_amount || editForm.expense_amount <= 0) {
        alert('Por favor, preencha a categoria e o valor da saída');
        return;
      }
    } else {
      if (!editForm.amount || !editForm.category || !editForm.payment_method) {
        alert('Por favor, preencha todos os campos obrigatórios');
        return;
      }
    }

    try {
      let updateData;

      if (isExpense) {
        updateData = {
          date: editForm.date,
          option_type: 'expense',
          category: 'Saída',
          description: editForm.description,
          amount: 0,
          discount_percentage: 0,
          discount_amount: 0,
          net_amount: 0,
          doctor_name: editForm.doctor_name,
          reference_month: editForm.reference_month,
          payment_method: 'cash',
          payment_discount_percentage: 0,
          payment_discount_amount: 0,
          expense_category: editForm.expense_category,
          expense_amount: editForm.expense_amount
        };
      } else {
        const amountValue = editForm.amount || 0;
        const optionType = editForm.option_type || 'option1';
        const paymentMethod = editForm.payment_method || 'pix';
        const expenseAmountValue = editForm.expense_amount || 0;

        const {
          discountPercentage,
          discountAmount,
          paymentDiscountPercentage,
          paymentDiscountAmount,
          netAmount
        } = calculateValues(amountValue, optionType, paymentMethod);

        updateData = {
          date: editForm.date,
          option_type: editForm.option_type,
          category: editForm.category,
          description: editForm.description,
          amount: amountValue,
          discount_percentage: discountPercentage,
          discount_amount: discountAmount,
          net_amount: netAmount,
          doctor_name: editForm.doctor_name,
          reference_month: editForm.reference_month,
          payment_method: paymentMethod,
          payment_discount_percentage: paymentDiscountPercentage,
          payment_discount_amount: paymentDiscountAmount,
          expense_category: editForm.expense_category || null,
          expense_amount: expenseAmountValue
        };
      }

      const { error } = await supabase
        .from('medical_transfers')
        .update(updateData)
        .eq('id', editingId);

      if (error) throw error;

      setEditingId(null);
      setEditForm({});
      fetchTransfers();
    } catch (error) {
      console.error('Erro ao atualizar repasse:', error);
      alert('Erro ao atualizar repasse');
    }
  };

  const getOptionLabel = (optionType: string) => {
    switch (optionType) {
      case 'option1':
        return 'Opção 1 - Procedimentos';
      case 'option2':
        return 'Opção 2 - Proc. Especiais';
      case 'option3':
        return 'Opção 3 - Hospital';
      case 'expense':
        return 'Saída';
      default:
        return optionType;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('pt-BR');
  };

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      cash: 'Dinheiro',
      debit_card: 'Débito',
      credit_card: 'Crédito',
      pix: 'PIX'
    };
    return labels[method] || method;
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

  const toggleDoctorExpansion = (doctorName: string) => {
    const newExpanded = new Set(expandedDoctors);
    if (newExpanded.has(doctorName)) {
      newExpanded.delete(doctorName);
    } else {
      newExpanded.add(doctorName);
      setExpenseForm(prev => {
        if (!prev[doctorName]) {
          return {
            ...prev,
            [doctorName]: {
              description: '',
              amount: 0,
              category: 'rateio_mensal'
            }
          };
        }
        return prev;
      });
    }
    setExpandedDoctors(newExpanded);
  };

  const handleAddExpense = async (doctorName: string) => {
    const form = expenseForm[doctorName];
    if (!form || !form.description || form.amount <= 0) {
      alert('Por favor, preencha todos os campos da saída');
      return;
    }

    const referenceMonth = selectedMonth || new Date().toISOString().slice(0, 7);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('medical_transfers')
        .insert([{
          user_id: user.id,
          date: new Date().toISOString().split('T')[0],
          doctor_name: doctorName,
          option_type: 'expense',
          category: 'Saída',
          description: form.description,
          amount: 0,
          discount_percentage: 0,
          discount_amount: 0,
          net_amount: 0,
          reference_month: referenceMonth,
          payment_method: 'cash',
          payment_discount_percentage: 0,
          payment_discount_amount: 0,
          expense_category: form.category,
          expense_amount: form.amount
        }]);

      if (error) throw error;

      setExpenseForm(prev => ({
        ...prev,
        [doctorName]: {
          description: '',
          amount: 0,
          category: 'rateio_mensal'
        }
      }));

      fetchTransfers();
      alert('Saída lançada com sucesso!');
    } catch (error) {
      console.error('Erro ao adicionar saída:', error);
      alert('Erro ao adicionar saída');
    }
  };

  const getMonthlyStats = () => {
    const stats: { [key: string]: { total: number; count: number } } = {};

    transfers.forEach((transfer) => {
      const monthKey = transfer.reference_month || transfer.date.substring(0, 7);
      if (!stats[monthKey]) {
        stats[monthKey] = { total: 0, count: 0 };
      }
      stats[monthKey].total += transfer.net_amount;
      stats[monthKey].count += 1;
    });

    return Object.entries(stats)
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => b.month.localeCompare(a.month));
  };

  const getDoctorStats = () => {
    const stats: { [key: string]: { total: number; count: number } } = {};

    const filtered = selectedMonth
      ? transfers.filter((t) => (t.reference_month || t.date.substring(0, 7)) === selectedMonth)
      : transfers;

    filtered.forEach((transfer) => {
      const doctor = transfer.doctor_name || 'Sem médico';
      if (!stats[doctor]) {
        stats[doctor] = { total: 0, count: 0 };
      }
      // Para saídas puras (option_type === 'expense'), não somar no total
      // Para entradas, somar o net_amount
      if (transfer.option_type !== 'expense') {
        stats[doctor].total += transfer.net_amount;
      }
      stats[doctor].count += 1;
    });

    return Object.entries(stats)
      .map(([doctor, data]) => ({ doctor, ...data }))
      .sort((a, b) => b.total - a.total);
  };

  const monthlyStats = getMonthlyStats();
  const doctorStats = getDoctorStats();

  const filteredTransfers = transfers.filter((t) => {
    const matchMonth = selectedMonth
      ? (t.reference_month || t.date.substring(0, 7)) === selectedMonth
      : true;
    const matchDoctor = selectedDoctor
      ? t.doctor_name === selectedDoctor
      : true;
    return matchMonth && matchDoctor;
  });

  const totalRepasse = filteredTransfers.reduce((sum, t) => sum + t.net_amount, 0);
  const totalEntrada = filteredTransfers.reduce((sum, t) => sum + t.amount, 0);
  const totalDesconto = filteredTransfers.reduce((sum, t) => sum + t.discount_amount + (t.payment_discount_amount || 0), 0);
  const totalSaida = filteredTransfers.reduce((sum, t) => sum + (t.expense_amount || 0), 0);
  const totalLiquido = totalRepasse - totalSaida;

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
  }}
  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
>
  <option value="">Todos os meses</option>
  {monthlyStats.map((stat) => {
    const [year, month] = stat.month.split('-');
    // Usar o dia 15 para evitar problemas com início/fim do mês
    const date = new Date(parseInt(year), parseInt(month) - 1, 15);
    return (
      <option key={stat.month} value={stat.month}>
        {date.toLocaleDateString('pt-BR', { 
          month: 'long', 
          year: 'numeric',
          timeZone: 'UTC' // Forçar UTC para evitar fuso horário
        })}
      </option>
    );
  })}
</select>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Médico</label>
            <select
              value={selectedDoctor}
              onChange={(e) => setSelectedDoctor(e.target.value)}
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

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-600 font-medium">Total de Entradas</p>
            <p className="text-2xl font-bold text-blue-700">R$ {totalEntrada.toFixed(2)}</p>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <p className="text-sm text-red-600 font-medium">Total de Descontos</p>
            <p className="text-2xl font-bold text-red-700">R$ {totalDesconto.toFixed(2)}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-sm text-green-600 font-medium">Repasse Bruto</p>
            <p className="text-2xl font-bold text-green-700">R$ {totalRepasse.toFixed(2)}</p>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg">
            <p className="text-sm text-orange-600 font-medium">Total de Saídas</p>
            <p className="text-2xl font-bold text-orange-700">R$ {totalSaida.toFixed(2)}</p>
          </div>
          <div className="bg-teal-50 p-4 rounded-lg">
            <p className="text-sm text-teal-600 font-medium">Repasse Líquido</p>
            <p className="text-2xl font-bold text-teal-700">R$ {totalLiquido.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {doctorStats.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-xl font-semibold mb-4 text-gray-800">Detalhamento por Médico</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Médico</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Quantidade</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Total de Repasse</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Ações</th>
                </tr>
              </thead>
              <tbody>
                {doctorStats.map((stat) => (
                  <>
                    <tr
                      key={stat.doctor}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td
                        className="py-3 px-4 text-sm font-medium text-gray-800 cursor-pointer"
                        onClick={() => setSelectedDoctor(stat.doctor === selectedDoctor ? '' : stat.doctor)}
                      >
                        {stat.doctor}
                        {selectedDoctor === stat.doctor && (
                          <span className="ml-2 text-xs text-blue-600">(filtrado)</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-700 text-center">
                        {stat.count} {stat.count === 1 ? 'repasse' : 'repasses'}
                      </td>
                      <td className="py-3 px-4 text-sm font-semibold text-green-600 text-right">
                        R$ {stat.total.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={() => setDoctorDetailsModal(stat.doctor)}
                            className="text-sm text-green-600 hover:text-green-800 font-medium"
                          >
                            Detalhes
                          </button>
                          <button
                            onClick={() => toggleDoctorExpansion(stat.doctor)}
                            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                          >
                            {expandedDoctors.has(stat.doctor) ? 'Fechar' : 'Ver mais'}
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedDoctors.has(stat.doctor) && (
                      <tr key={`${stat.doctor}-expense`} className="bg-blue-50">
                        <td colSpan={4} className="py-4 px-4">
                          <div className="bg-white rounded-lg p-4 border border-blue-200">
                            <h4 className="text-sm font-semibold text-gray-700 mb-3">Lançar Saída para {stat.doctor}</h4>
                            {!selectedMonth && (
                              <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded-md">
                                <p className="text-xs text-blue-700">
                                  A saída será registrada no mês atual ({new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })})
                                </p>
                              </div>
                            )}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Categoria</label>
                                <select
                                  value={expenseForm[stat.doctor]?.category || 'rateio_mensal'}
                                  onChange={(e) => {
                                    const currentForm = expenseForm[stat.doctor] || { description: '', amount: 0, category: 'rateio_mensal' };
                                    setExpenseForm(prev => ({
                                      ...prev,
                                      [stat.doctor]: {
                                        ...currentForm,
                                        category: e.target.value
                                      }
                                    }));
                                  }}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                  {EXPENSE_CATEGORIES.map(cat => (
                                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                                  ))}
                                </select>
                              </div>
                              <div className="md:col-span-2">
                                <label className="block text-xs font-medium text-gray-700 mb-1">Descrição</label>
                                <input
                                  type="text"
                                  value={expenseForm[stat.doctor]?.description || ''}
                                  onChange={(e) => {
                                    const currentForm = expenseForm[stat.doctor] || { description: '', amount: 0, category: 'rateio_mensal' };
                                    setExpenseForm(prev => ({
                                      ...prev,
                                      [stat.doctor]: {
                                        ...currentForm,
                                        description: e.target.value
                                      }
                                    }));
                                  }}
                                  placeholder="Descrição da saída"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Valor</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={expenseForm[stat.doctor]?.amount || ''}
                                  onChange={(e) => {
                                    const currentForm = expenseForm[stat.doctor] || { description: '', amount: 0, category: 'rateio_mensal' };
                                    setExpenseForm(prev => ({
                                      ...prev,
                                      [stat.doctor]: {
                                        ...currentForm,
                                        amount: parseFloat(e.target.value) || 0
                                      }
                                    }));
                                  }}
                                  placeholder="0.00"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                            </div>
                            <div className="mt-3 flex justify-end">
                              <button
                                onClick={() => handleAddExpense(stat.doctor)}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
                              >
                                Adicionar Saída
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-semibold mb-4 text-gray-800">Lista de Repasses</h3>

        {filteredTransfers.length === 0 ? (
          <p className="text-center text-gray-600 py-8">Nenhum repasse registrado ainda</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-2 text-sm font-semibold text-gray-700">Data</th>
                  <th className="text-left py-3 px-2 text-sm font-semibold text-gray-700">Mês Ref.</th>
                  <th className="text-left py-3 px-2 text-sm font-semibold text-gray-700">Médico</th>
                  <th className="text-left py-3 px-2 text-sm font-semibold text-gray-700">Opção</th>
                  <th className="text-left py-3 px-2 text-sm font-semibold text-gray-700">Categoria</th>
                  <th className="text-left py-3 px-2 text-sm font-semibold text-gray-700">Descrição</th>
                  <th className="text-right py-3 px-2 text-sm font-semibold text-gray-700">Entrada</th>
                  <th className="text-right py-3 px-2 text-sm font-semibold text-gray-700">Desconto</th>
                  <th className="text-right py-3 px-2 text-sm font-semibold text-gray-700">Repasse</th>
                  <th className="text-center py-3 px-2 text-sm font-semibold text-gray-700">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransfers.map((transfer) => (
                  <tr key={transfer.id} className="border-b border-gray-100 hover:bg-gray-50">
                    {editingId === transfer.id ? (
                      <>
                        <td className="py-3 px-2">
                          <input
                            type="date"
                            value={editForm.date}
                            onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                            className="w-full px-2 py-1 border rounded text-sm"
                          />
                        </td>
                        <td className="py-3 px-2">
                          <input
                            type="month"
                            value={editForm.reference_month}
                            onChange={(e) => setEditForm({ ...editForm, reference_month: e.target.value })}
                            className="w-full px-2 py-1 border rounded text-sm"
                          />
                        </td>
                        <td className="py-3 px-2">
                          <select
                            value={editForm.doctor_name}
                            onChange={(e) => setEditForm({ ...editForm, doctor_name: e.target.value })}
                            className="w-full px-2 py-1 border rounded text-sm"
                          >
                            <option value="">Selecione</option>
                            {availableDoctors.map((doctor) => (
                              <option key={doctor} value={doctor}>{doctor}</option>
                            ))}
                          </select>
                        </td>
                        <td className="py-3 px-2">
                          <select
                            value={editForm.option_type}
                            onChange={(e) => setEditForm({ ...editForm, option_type: e.target.value, category: e.target.value === 'expense' ? 'Saída' : '' })}
                            className="w-full px-2 py-1 border rounded text-sm"
                          >
                            <option value="option1">Opção 1</option>
                            <option value="option2">Opção 2</option>
                            <option value="option3">Opção 3</option>
                            <option value="expense">Saída</option>
                          </select>
                        </td>
                        <td className="py-3 px-2">
                          {editForm.option_type === 'expense' ? (
                            <select
                              value={editForm.expense_category || ''}
                              onChange={(e) => setEditForm({ ...editForm, expense_category: e.target.value || null })}
                              className="w-full px-2 py-1 border rounded text-sm"
                            >
                              <option value="">Selecione</option>
                              {EXPENSE_CATEGORIES.map((cat) => (
                                <option key={cat.value} value={cat.value}>{cat.label}</option>
                              ))}
                            </select>
                          ) : (
                            <>
                              <select
                                value={editForm.category}
                                onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                                className="w-full px-2 py-1 border rounded text-sm mb-1"
                              >
                                <option value="">Selecione</option>
                                {getCurrentCategories(editForm.option_type || 'option1').map((cat) => (
                                  <option key={cat} value={cat}>{cat}</option>
                                ))}
                              </select>
                              <select
                                value={editForm.payment_method}
                                onChange={(e) => setEditForm({ ...editForm, payment_method: e.target.value })}
                                className="w-full px-2 py-1 border rounded text-sm"
                              >
                                <option value="pix">PIX</option>
                                <option value="cash">Dinheiro</option>
                                <option value="debit_card">Débito</option>
                                <option value="credit_card">Crédito</option>
                              </select>
                            </>
                          )}
                        </td>
                        <td className="py-3 px-2">
                          <input
                            type="text"
                            value={editForm.description}
                            onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                            className="w-full px-2 py-1 border rounded text-sm"
                            placeholder="Descrição"
                          />
                        </td>
                        <td className="py-3 px-2">
                          {editForm.option_type === 'expense' ? (
                            <span className="text-sm text-gray-500">-</span>
                          ) : (
                            <input
                              type="number"
                              step="0.01"
                              value={editForm.amount}
                              onChange={(e) => setEditForm({ ...editForm, amount: parseFloat(e.target.value) })}
                              className="w-full px-2 py-1 border rounded text-sm text-right"
                            />
                          )}
                        </td>
                        <td className="py-3 px-2 text-sm text-gray-500 text-center">
                          {editForm.option_type === 'expense' ? '-' : 'Recalculado'}
                        </td>
                        <td className="py-3 px-2">
                          {editForm.option_type === 'expense' ? (
                            <input
                              type="number"
                              step="0.01"
                              value={editForm.expense_amount || 0}
                              onChange={(e) => setEditForm({ ...editForm, expense_amount: parseFloat(e.target.value) || 0 })}
                              className="w-full px-2 py-1 border rounded text-sm text-right"
                              placeholder="0.00"
                            />
                          ) : (
                            <span className="text-sm text-gray-500">Recalculado</span>
                          )}
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex gap-1 justify-center">
                            <button
                              onClick={saveEdit}
                              className="p-1 text-green-600 hover:text-green-700"
                              title="Salvar"
                            >
                              <Save size={18} />
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="p-1 text-gray-600 hover:text-gray-700"
                              title="Cancelar"
                            >
                              <X size={18} />
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className={`py-3 px-2 text-sm ${transfer.option_type === 'expense' ? 'text-gray-500' : 'text-gray-700'}`}>
                          {formatDate(transfer.date)}
                        </td>
                        <td className={`py-3 px-2 text-sm ${transfer.option_type === 'expense' ? 'text-gray-500' : 'text-gray-700'}`}>
                          {formatReferenceMonth(transfer.reference_month)}
                        </td>
                        <td className={`py-3 px-2 text-sm font-medium ${transfer.option_type === 'expense' ? 'text-gray-600' : 'text-gray-800'}`}>
                          {transfer.doctor_name || '-'}
                        </td>
                        <td className={`py-3 px-2 text-sm ${transfer.option_type === 'expense' ? 'text-orange-600 font-semibold' : 'text-gray-700'}`}>
                          {getOptionLabel(transfer.option_type)}
                        </td>
                        <td className="py-3 px-2 text-sm text-gray-700">
                          {transfer.option_type === 'expense' ? (
                            <span className="text-orange-600 font-medium">
                              {getExpenseCategoryLabel(transfer.expense_category)}
                            </span>
                          ) : (
                            <>
                              {transfer.category}
                              <div className="text-xs text-gray-500 mt-0.5">
                                {getPaymentMethodLabel(transfer.payment_method || 'pix')}
                              </div>
                            </>
                          )}
                        </td>
                        <td className="py-3 px-2 text-sm text-gray-600">
                          {transfer.description || '-'}
                        </td>
                        <td className={`py-3 px-2 text-sm text-right ${transfer.option_type === 'expense' ? 'text-gray-400' : 'text-gray-700'}`}>
                          {transfer.option_type === 'expense' ? '-' : `R$ ${transfer.amount.toFixed(2)}`}
                        </td>
                        <td className={`py-3 px-2 text-sm text-right ${transfer.option_type === 'expense' ? 'text-gray-400' : 'text-red-600'}`}>
                          {transfer.option_type === 'expense' ? (
                            '-'
                          ) : (
                            <>
                              - R$ {(transfer.discount_amount + (transfer.payment_discount_amount || 0)).toFixed(2)}
                              <div className="text-xs text-gray-500 mt-0.5">
                                ({transfer.discount_percentage}%{(transfer.payment_discount_percentage || 0) > 0 ? ` + ${transfer.payment_discount_percentage}%` : ''})
                              </div>
                            </>
                          )}
                        </td>
                        <td className={`py-3 px-2 text-sm font-semibold text-right ${transfer.option_type === 'expense' ? 'text-orange-600' : 'text-green-600'}`}>
                          {transfer.option_type === 'expense' ? (
                            <>
                              - R$ {transfer.expense_amount.toFixed(2)}
                            </>
                          ) : (
                            <>
                              R$ {transfer.net_amount.toFixed(2)}
                              {(transfer.expense_amount || 0) > 0 && (
                                <>
                                  <div className="text-xs text-orange-600 mt-0.5">
                                    - R$ {transfer.expense_amount.toFixed(2)}
                                  </div>
                                  <div className="text-xs font-bold text-teal-600 mt-0.5">
                                    = R$ {(transfer.net_amount - transfer.expense_amount).toFixed(2)}
                                  </div>
                                </>
                              )}
                            </>
                          )}
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex gap-1 justify-center">
                            <button
                              onClick={() => startEdit(transfer)}
                              className="p-1 text-blue-600 hover:text-blue-700"
                              title="Editar"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button
                              onClick={() => handleDelete(transfer.id)}
                              className="p-1 text-red-600 hover:text-red-700"
                              title="Excluir"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
