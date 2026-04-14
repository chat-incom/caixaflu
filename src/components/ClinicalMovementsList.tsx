import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Trash2, Eye } from 'lucide-react';

interface ClinicalMovement {
  id: string;
  date: string;
  doctor_name: string;
  patient_name: string;
  procedure_type: string;
  gross_value: number;
  doctor_amount: number;
  payment_tax_amount: number;
  invoice_tax_amount: number;
  medication_cost: number;
  supplies_cost: number;
  other_costs: number;
  net_clinic_value: number;
}

export default function ClinicalMovementsList({ refreshTrigger }: { refreshTrigger: number }) {
  const [movements, setMovements] = useState<ClinicalMovement[]>([]);
  const [loading, setLoading] = useState(true);

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
    return <div className="text-center py-8">Carregando movimentos...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-xl font-semibold mb-4 text-gray-800">
        Histórico de Movimentos Clínicos
      </h3>

      {movements.length === 0 ? (
        <p className="text-center text-gray-600 py-8">
          Nenhum movimento financeiro registrado ainda
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-2 text-sm font-semibold text-gray-700">Data</th>
                <th className="text-left py-3 px-2 text-sm font-semibold text-gray-700">Médico</th>
                <th className="text-left py-3 px-2 text-sm font-semibold text-gray-700">Procedimento</th>
                <th className="text-right py-3 px-2 text-sm font-semibold text-gray-700">Valor Bruto</th>
                <th className="text-right py-3 px-2 text-sm font-semibold text-gray-700">Repasse Médico</th>
                <th className="text-right py-3 px-2 text-sm font-semibold text-gray-700">Custos Totais</th>
                <th className="text-right py-3 px-2 text-sm font-semibold text-gray-700 text-green-600">Líquido Clínica</th>
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
                  <tr key={mov.id} className="border-b border-gray-100 hover:bg-gray-50">
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
                    <td className="py-3 px-2 text-sm text-green-600 font-bold text-right">
                      {formatCurrency(mov.net_clinic_value)}
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
                  {formatCurrency(movements.reduce((sum, m) => sum + m.gross_value, 0))}
                </td>
                <td className="py-3 px-2 text-right font-bold text-red-600">
                  -{formatCurrency(movements.reduce((sum, m) => sum + m.doctor_amount, 0))}
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
                <td className="py-3 px-2 text-right font-bold text-green-600">
                  {formatCurrency(movements.reduce((sum, m) => sum + m.net_clinic_value, 0))}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
