import { useClinicalMovements } from '../hooks/useClinicalMovements';
import { formatCurrency, formatDate, getValueColorClass } from '../utils/formatting';
import { calculateTotalDeductions } from '../utils/clinicalCalculations';
import { ClinicalMovement } from '../types/clinical';
import { Edit2, Trash2, Eye, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';

interface ClinicalMovementsListProps {
  refreshTrigger: number;
  onEdit?: (movement: ClinicalMovement) => void;
  onDelete?: (movement: ClinicalMovement) => void;
  onView?: (movement: ClinicalMovement) => void;
}

export default function ClinicalMovementsList({ 
  refreshTrigger, 
  onEdit, 
  onDelete,
  onView 
}: ClinicalMovementsListProps) {
  const { movements, loading, error } = useClinicalMovements(refreshTrigger);

  const getRowBgClass = (value: number): string => 
    value < 0 ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-gray-50';

  const getValueIcon = (value: number) => {
    if (value < 0) return <TrendingDown className="text-red-500" size={14} />;
    if (value > 0) return <TrendingUp className="text-green-500" size={14} />;
    return null;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-2">Carregando movimentos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8">
        <div className="text-center text-red-600">
          <AlertCircle className="mx-auto mb-2" size={32} />
          <p>Erro ao carregar dados: {error}</p>
        </div>
      </div>
    );
  }

  const totalGross = movements.reduce((sum, m) => sum + m.gross_value, 0);
  const totalDoctorAmount = movements.reduce((sum, m) => sum + m.doctor_amount, 0);
  const totalNetClinic = movements.reduce((sum, m) => sum + m.net_clinic_value, 0);
  const totalCosts = movements.reduce((sum, m) => sum + calculateTotalDeductions(m), 0);
  const negativeCount = movements.filter(m => m.net_clinic_value < 0).length;

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <h3 className="text-xl font-semibold text-gray-800">
            Histórico de Movimentos Clínicos
          </h3>
          {negativeCount > 0 && (
            <div className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm flex items-center gap-1">
              <AlertCircle size={14} />
              {negativeCount} movimento(s) com valor negativo
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-xs text-gray-600">Valor Bruto Total</p>
            <p className="text-lg font-bold text-blue-600">{formatCurrency(totalGross)}</p>
          </div>
          <div className="bg-red-50 rounded-lg p-3">
            <p className="text-xs text-gray-600">Total Repasse Médico</p>
            <p className="text-lg font-bold text-red-600">-{formatCurrency(totalDoctorAmount)}</p>
          </div>
          <div className="bg-orange-50 rounded-lg p-3">
            <p className="text-xs text-gray-600">Custos Totais</p>
            <p className="text-lg font-bold text-orange-600">-{formatCurrency(totalCosts)}</p>
          </div>
          <div className={`rounded-lg p-3 ${totalNetClinic < 0 ? 'bg-red-100' : 'bg-green-50'}`}>
            <p className="text-xs text-gray-600">Líquido Total Clínica</p>
            <div className="flex items-center gap-1">
              {getValueIcon(totalNetClinic)}
              <p className={`text-lg font-bold ${getValueColorClass(totalNetClinic)}`}>
                {totalNetClinic < 0 && '-'}{formatCurrency(Math.abs(totalNetClinic))}
              </p>
            </div>
          </div>
        </div>
      </div>

      {movements.length === 0 ? (
        <div className="p-8 text-center text-gray-500">
          Nenhum movimento financeiro registrado ainda
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Data</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Médico</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Procedimento</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Valor Bruto</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Repasse</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Custos</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Líquido</th>
                {(onEdit || onDelete || onView) && (
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Ações</th>
                )}
              </tr>
            </thead>
            <tbody>
              {movements.map((mov) => {
                const totalCosts = calculateTotalDeductions(mov);
                
                return (
                  <tr 
                    key={mov.id} 
                    className={`border-b border-gray-100 transition-colors ${getRowBgClass(mov.net_clinic_value)}`}
                  >
                    <td className="py-3 px-4 text-sm text-gray-700">{formatDate(mov.date)}</td>
                    <td className="py-3 px-4">
                      <div className="text-sm font-medium text-gray-800">{mov.doctor_name}</div>
                      {mov.patient_name && (
                        <div className="text-xs text-gray-500">Paciente: {mov.patient_name}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-700">{mov.procedure_type}</td>
                    <td className="py-3 px-4 text-sm text-blue-600 text-right font-medium">
                      {formatCurrency(mov.gross_value)}
                    </td>
                    <td className="py-3 px-4 text-sm text-red-600 text-right">
                      -{formatCurrency(mov.doctor_amount)}
                    </td>
                    <td className="py-3 px-4 text-sm text-orange-600 text-right">
                      -{formatCurrency(totalCosts)}
                    </td>
                    <td className="py-3 px-4 text-sm font-bold text-right">
                      <div className="flex items-center justify-end gap-1">
                        {getValueIcon(mov.net_clinic_value)}
                        <span className={getValueColorClass(mov.net_clinic_value)}>
                          {mov.net_clinic_value < 0 && '-'}
                          {formatCurrency(Math.abs(mov.net_clinic_value))}
                        </span>
                      </div>
                    </td>
                    {(onEdit || onDelete || onView) && (
                      <td className="py-3 px-4 text-center">
                        <div className="flex gap-2 justify-center">
                          {onView && (
                            <button
                              onClick={() => onView(mov)}
                              className="text-gray-600 hover:text-blue-600 transition"
                              title="Visualizar"
                            >
                              <Eye size={16} />
                            </button>
                          )}
                          {onEdit && (
                            <button
                              onClick={() => onEdit(mov)}
                              className="text-blue-600 hover:text-blue-800 transition"
                              title="Editar"
                            >
                              <Edit2 size={16} />
                            </button>
                          )}
                          {onDelete && (
                            <button
                              onClick={() => onDelete(mov)}
                              className="text-red-600 hover:text-red-800 transition"
                              title="Excluir"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="border-t-2 border-gray-200 bg-gray-50">
              <tr>
                <td colSpan={3} className="py-3 px-4 text-right font-bold text-gray-800">
                  Totais:
                </td>
                <td className="py-3 px-4 text-right font-bold text-blue-600">
                  {formatCurrency(totalGross)}
                </td>
                <td className="py-3 px-4 text-right font-bold text-red-600">
                  -{formatCurrency(totalDoctorAmount)}
                </td>
                <td className="py-3 px-4 text-right font-bold text-orange-600">
                  -{formatCurrency(totalCosts)}
                </td>
                <td className="py-3 px-4 text-right font-bold">
                  <div className="flex items-center justify-end gap-1">
                    {getValueIcon(totalNetClinic)}
                    <span className={getValueColorClass(totalNetClinic)}>
                      {totalNetClinic < 0 && '-'}{formatCurrency(Math.abs(totalNetClinic))}
                    </span>
                  </div>
                </td>
                {(onEdit || onDelete || onView) && <td></td>}
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
