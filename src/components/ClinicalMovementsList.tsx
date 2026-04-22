// src/components/ClinicalMovementsList.tsx (Versão Completa)

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Trash2, Eye, TrendingUp, TrendingDown, X } from 'lucide-react';

interface ClinicalMovement {
  id: string;
  date: string;
  doctor_name: string;
  patient_name: string;
  procedure_type: string;
  gross_value: number;
  doctor_amount: number;
  doctor_percentage: number;
  payment_tax_amount: number;
  invoice_tax_amount: number;
  medication_cost: number;
  supplies_cost: number;
  other_costs: number;
  other_costs_description: string;
  net_clinic_value: number;
  payment_method: string;
  observations: string;
  created_at: string;
}

export default function ClinicalMovementsList({ refreshTrigger, onDelete }: { refreshTrigger: number; onDelete?: () => void }) {
  const [movements, setMovements] = useState<ClinicalMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMovement, setSelectedMovement] = useState<ClinicalMovement | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Função para obter classe CSS baseada no valor
  const getValueColorClass = (value: number): string => {
    if (value < 0) return 'text-red-600';
    if (value === 0) return 'text-gray-500';
    return 'text-green-600';
  };

  // Função para obter classe do fundo da linha
  const getRowBgClass = (value: number): string => {
    if (value < 0) return 'bg-red-50 hover:bg-red-100';
    return 'hover:bg-gray-50';
  };

  // Função para obter ícone baseado no valor
  const getValueIcon = (value: number) => {
    if (value < 0) return <TrendingDown className="text-red-500" size={14} />;
    if (value > 0) return <TrendingUp className="text-green-500" size={14} />;
    return null;
  };

  useEffect(() => {
    fetchMovements();
  }, [refreshTrigger]);

  const fetchMovements = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('clinical_financial_movements')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (error) throw error;
      setMovements(data || []);
    } catch (error) {
      console.error('Erro ao buscar movimentos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este movimento?')) return;
    
    try {
      const { error } = await supabase
        .from('clinical_financial_movements')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      await fetchMovements();
      if (onDelete) onDelete();
      
      alert('Movimento excluído com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir:', error);
      alert('Erro ao excluir movimento');
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(Math.abs(value));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString + 'T00:00:00').toLocaleDateString('pt-BR');
  };

  // Calcular totais
  const totalGross = movements.reduce((sum, m) => sum + m.gross_value, 0);
  const totalDoctorAmount = movements.reduce((sum, m) => sum + m.doctor_amount, 0);
  const totalNetClinic = movements.reduce((sum, m) => sum + m.net_clinic_value, 0);
  const negativeCount = movements.filter(m => m.net_clinic_value < 0).length;

  if (loading) {
    return <div className="text-center py-8">Carregando movimentos...</div>;
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h3 className="text-xl font-semibold text-gray-800">
            Histórico de Movimentos Clínicos
          </h3>
          {negativeCount > 0 && (
            <div className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm">
              ⚠️ {negativeCount} movimento(s) com valor negativo
            </div>
          )}
        </div>

        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-xs text-gray-600">Valor Bruto Total</p>
            <p className="text-lg font-bold text-blue-600">{formatCurrency(totalGross)}</p>
          </div>
          <div className="bg-red-50 rounded-lg p-3">
            <p className="text-xs text-gray-600">Total Repasse Médico</p>
            <p className="text-lg font-bold text-red-600">-{formatCurrency(totalDoctorAmount)}</p>
          </div>
          <div className={`rounded-lg p-3 ${totalNetClinic < 0 ? 'bg-red-100' : 'bg-green-50'}`}>
            <p className="text-xs text-gray-600">Líquido Total Clínica</p>
            <div className="flex items-center gap-1">
              {getValueIcon(totalNetClinic)}
              <p className={`text-lg font-bold ${getValueColorClass(totalNetClinic)}`}>
                {totalNetClinic < 0 && '-'}{formatCurrency(totalNetClinic)}
              </p>
            </div>
          </div>
        </div>

        {movements.length === 0 ? (
          <p className="text-center text-gray-600 py-8">
            Nenhum movimento financeiro registrado ainda
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-2 text-sm font-semibold text-gray-700">Data</th>
                  <th className="text-left py-3 px-2 text-sm font-semibold text-gray-700">Médico</th>
                  <th className="text-left py-3 px-2 text-sm font-semibold text-gray-700">Procedimento</th>
                  <th className="text-right py-3 px-2 text-sm font-semibold text-gray-700">Valor Bruto</th>
                  <th className="text-right py-3 px-2 text-sm font-semibold text-gray-700">Repasse Médico</th>
                  <th className="text-right py-3 px-2 text-sm font-semibold text-gray-700">Custos Totais</th>
                  <th className="text-right py-3 px-2 text-sm font-semibold text-gray-700">Líquido Clínica</th>
                  <th className="text-center py-3 px-2 text-sm font-semibold text-gray-700">Ações</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((mov) => {
                  const totalCosts = (mov.payment_tax_amount || 0) + 
                                    (mov.invoice_tax_amount || 0) + 
                                    (mov.medication_cost || 0) + 
                                    (mov.supplies_cost || 0) + 
                                    (mov.other_costs || 0);
                  
                  return (
                    <tr 
                      key={mov.id} 
                      className={`border-b border-gray-100 transition-colors ${getRowBgClass(mov.net_clinic_value)}`}
                    >
                      <td className="py-3 px-2 text-sm text-gray-700">
                        {formatDate(mov.date)}
                      </td>
                      <td className="py-3 px-2 text-sm font-medium text-gray-800">
                        {mov.doctor_name}
                        {mov.patient_name && (
                          <div className="text-xs text-gray-500">
                            Paciente: {mov.patient_name}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-2 text-sm text-gray-700">
                        {mov.procedure_type}
                      </td>
                      <td className="py-3 px-2 text-sm text-blue-600 text-right">
                        {formatCurrency(mov.gross_value)}
                      </td>
                      <td className="py-3 px-2 text-sm text-red-600 text-right">
                        -{formatCurrency(mov.doctor_amount)}
                      </td>
                      <td className="py-3 px-2 text-sm text-orange-600 text-right">
                        -{formatCurrency(totalCosts)}
                      </td>
                      <td className="py-3 px-2 text-sm font-bold text-right">
                        <div className="flex items-center justify-end gap-1">
                          {getValueIcon(mov.net_clinic_value)}
                          <span className={getValueColorClass(mov.net_clinic_value)}>
                            {mov.net_clinic_value < 0 && '-'}
                            {formatCurrency(mov.net_clinic_value)}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedMovement(mov);
                              setShowModal(true);
                            }}
                            className="text-blue-600 hover:text-blue-800 transition-colors"
                            title="Ver detalhes"
                          >
                            <Eye size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(mov.id)}
                            className="text-red-600 hover:text-red-800 transition-colors"
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
              <tfoot className="border-t-2 border-gray-200 bg-gray-50">
                <tr>
                  <td colSpan={3} className="py-3 px-2 text-right font-bold text-gray-800">
                    Totais:
                  </td>
                  <td className="py-3 px-2 text-right font-bold text-blue-600">
                    {formatCurrency(totalGross)}
                  </td>
                  <td className="py-3 px-2 text-right font-bold text-red-600">
                    -{formatCurrency(totalDoctorAmount)}
                  </td>
                  <td className="py-3 px-2 text-right font-bold text-orange-600">
                    -{formatCurrency(movements.reduce((sum, m) => 
                      sum + (m.payment_tax_amount || 0) + 
                      (m.invoice_tax_amount || 0) + 
                      (m.medication_cost || 0) + 
                      (m.supplies_cost || 0) + 
                      (m.other_costs || 0), 0
                    ))}
                  </td>
                  <td className="py-3 px-2 text-right font-bold">
                    <div className="flex items-center justify-end gap-1">
                      {getValueIcon(totalNetClinic)}
                      <span className={getValueColorClass(totalNetClinic)}>
                        {totalNetClinic < 0 && '-'}{formatCurrency(totalNetClinic)}
                      </span>
                    </div>
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Detalhes */}
      {showModal && selectedMovement && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-xl font-bold text-gray-800">Detalhes do Movimento</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Data</p>
                  <p className="font-medium">{formatDate(selectedMovement.date)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Médico</p>
                  <p className="font-medium">{selectedMovement.doctor_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Paciente</p>
                  <p className="font-medium">{selectedMovement.patient_name || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Procedimento</p>
                  <p className="font-medium">{selectedMovement.procedure_type}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Método de Pagamento</p>
                  <p className="font-medium">{selectedMovement.payment_method?.replace('_', ' ').toUpperCase()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Percentual Médico</p>
                  <p className="font-medium">{selectedMovement.doctor_percentage}%</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold text-gray-800 mb-2">Valores</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-sm text-gray-500">Valor Bruto</p>
                    <p className="text-blue-600 font-bold">{formatCurrency(selectedMovement.gross_value)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Repasse Médico</p>
                    <p className="text-red-600 font-bold">-{formatCurrency(selectedMovement.doctor_amount)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Taxa de Pagamento</p>
                    <p className="text-orange-600">-{formatCurrency(selectedMovement.payment_tax_amount || 0)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Impostos</p>
                    <p className="text-orange-600">-{formatCurrency(selectedMovement.invoice_tax_amount || 0)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Medicação</p>
                    <p className="text-orange-600">-{formatCurrency(selectedMovement.medication_cost || 0)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Insumos</p>
                    <p className="text-orange-600">-{formatCurrency(selectedMovement.supplies_cost || 0)}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-gray-500">Líquido Clínica</p>
                    <p className={`text-xl font-bold ${getValueColorClass(selectedMovement.net_clinic_value)}`}>
                      {selectedMovement.net_clinic_value < 0 && '-'}
                      {formatCurrency(selectedMovement.net_clinic_value)}
                    </p>
                  </div>
                </div>
              </div>

              {selectedMovement.observations && (
                <div className="border-t pt-4">
                  <h4 className="font-semibold text-gray-800 mb-2">Observações</h4>
                  <p className="text-sm text-gray-600">{selectedMovement.observations}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end p-4 border-t bg-gray-50">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
