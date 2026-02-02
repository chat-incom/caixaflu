import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Trash2, Edit2, X, Save } from 'lucide-react';

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

export default function MedicalTransfersList({ refreshTrigger }: MedicalTransfersListProps) {
  const [transfers, setTransfers] = useState<MedicalTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<MedicalTransfer>>({});
  const [selectedMonth, setSelectedMonth] = useState<string>('');

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
        .order('date', { ascending: false });

      if (error) throw error;
      setTransfers(data || []);
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
      amount: transfer.amount
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

  const calculateValues = (amountValue: number, optionType: string) => {
    const discountPercentage = getCurrentDiscount(optionType);
    const discountAmount = (amountValue * discountPercentage) / 100;
    const netAmount = amountValue - discountAmount;
    return { discountPercentage, discountAmount, netAmount };
  };

  const saveEdit = async () => {
    if (!editingId || !editForm.amount || !editForm.category) return;

    try {
      const amountValue = editForm.amount;
      const optionType = editForm.option_type || 'option1';
      const { discountPercentage, discountAmount, netAmount } = calculateValues(amountValue, optionType);

      const { error } = await supabase
        .from('medical_transfers')
        .update({
          date: editForm.date,
          option_type: editForm.option_type,
          category: editForm.category,
          description: editForm.description,
          amount: amountValue,
          discount_percentage: discountPercentage,
          discount_amount: discountAmount,
          net_amount: netAmount
        })
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
      default:
        return optionType;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('pt-BR');
  };

  const getMonthlyStats = () => {
    const stats: { [key: string]: { total: number; count: number } } = {};

    transfers.forEach((transfer) => {
      const monthKey = transfer.date.substring(0, 7);
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

  const monthlyStats = getMonthlyStats();

  const filteredTransfers = selectedMonth
    ? transfers.filter((t) => t.date.startsWith(selectedMonth))
    : transfers;

  const totalRepasse = filteredTransfers.reduce((sum, t) => sum + t.net_amount, 0);
  const totalEntrada = filteredTransfers.reduce((sum, t) => sum + t.amount, 0);
  const totalDesconto = filteredTransfers.reduce((sum, t) => sum + t.discount_amount, 0);

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
        <h3 className="text-xl font-semibold mb-4 text-gray-800">Resumo por Mês</h3>

        <div className="mb-4">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos os meses</option>
            {monthlyStats.map((stat) => (
              <option key={stat.month} value={stat.month}>
                {new Date(stat.month + '-01').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-600 font-medium">Total de Entradas</p>
            <p className="text-2xl font-bold text-blue-700">R$ {totalEntrada.toFixed(2)}</p>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <p className="text-sm text-red-600 font-medium">Total de Descontos</p>
            <p className="text-2xl font-bold text-red-700">R$ {totalDesconto.toFixed(2)}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-sm text-green-600 font-medium">Total de Repasses</p>
            <p className="text-2xl font-bold text-green-700">R$ {totalRepasse.toFixed(2)}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600 font-medium">Quantidade</p>
            <p className="text-2xl font-bold text-gray-700">{filteredTransfers.length}</p>
          </div>
        </div>
      </div>

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
                          <select
                            value={editForm.option_type}
                            onChange={(e) => setEditForm({ ...editForm, option_type: e.target.value, category: '' })}
                            className="w-full px-2 py-1 border rounded text-sm"
                          >
                            <option value="option1">Opção 1</option>
                            <option value="option2">Opção 2</option>
                            <option value="option3">Opção 3</option>
                          </select>
                        </td>
                        <td className="py-3 px-2">
                          <select
                            value={editForm.category}
                            onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                            className="w-full px-2 py-1 border rounded text-sm"
                          >
                            <option value="">Selecione</option>
                            {getCurrentCategories(editForm.option_type || 'option1').map((cat) => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                        </td>
                        <td className="py-3 px-2">
                          <input
                            type="text"
                            value={editForm.description}
                            onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                            className="w-full px-2 py-1 border rounded text-sm"
                          />
                        </td>
                        <td className="py-3 px-2">
                          <input
                            type="number"
                            step="0.01"
                            value={editForm.amount}
                            onChange={(e) => setEditForm({ ...editForm, amount: parseFloat(e.target.value) })}
                            className="w-full px-2 py-1 border rounded text-sm text-right"
                          />
                        </td>
                        <td colSpan={2} className="py-3 px-2 text-sm text-gray-500 text-center">
                          Será recalculado
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
                        <td className="py-3 px-2 text-sm text-gray-700">{formatDate(transfer.date)}</td>
                        <td className="py-3 px-2 text-sm text-gray-700">{getOptionLabel(transfer.option_type)}</td>
                        <td className="py-3 px-2 text-sm text-gray-700">{transfer.category}</td>
                        <td className="py-3 px-2 text-sm text-gray-600">{transfer.description || '-'}</td>
                        <td className="py-3 px-2 text-sm text-gray-700 text-right">
                          R$ {transfer.amount.toFixed(2)}
                        </td>
                        <td className="py-3 px-2 text-sm text-red-600 text-right">
                          - R$ {transfer.discount_amount.toFixed(2)} ({transfer.discount_percentage}%)
                        </td>
                        <td className="py-3 px-2 text-sm font-semibold text-green-600 text-right">
                          R$ {transfer.net_amount.toFixed(2)}
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
    </div>
  );
}
