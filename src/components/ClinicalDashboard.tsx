import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Calendar, 
  User, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  FileText,
  ChevronDown,
  ChevronUp,
  Edit2,
  Trash2,
  PlusCircle,
  X
} from 'lucide-react';
import ClinicalReport from './ClinicalReport';
import EditClinicalMovementModal from './EditClinicalMovementModal';
import ClinicalFinancialForm from './ClinicalFinancialForm';
import ClinicalMovementsList from './ClinicalMovementsList';
import { useClinicalMovements } from '../hooks/useClinicalMovements';
import { formatCurrency, formatMonth, formatDate, getValueColorClass } from '../utils/formatting';
import { calculateTotalDeductions } from '../utils/clinicalCalculations';
import { ClinicalMovement, MonthlySummary, DoctorSummary } from '../types/clinical';

export default function ClinicalDashboard() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedDoctor, setSelectedDoctor] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'monthly' | 'doctor'>('monthly');
  const [expandedDoctor, setExpandedDoctor] = useState<string | null>(null);
  const [editingMovement, setEditingMovement] = useState<ClinicalMovement | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const { movements, loading, refetch } = useClinicalMovements(refreshTrigger);

  const availableMonths = [...new Set(movements.map(m => m.reference_month))].sort().reverse();
  const availableDoctors = [...new Set(movements.map(m => m.doctor_name))].sort();

  const filteredMovements = movements.filter(m => {
    const matchMonth = selectedMonth === 'all' || m.reference_month === selectedMonth;
    const matchDoctor = selectedDoctor === 'all' || m.doctor_name === selectedDoctor;
    return matchMonth && matchDoctor;
  });

  const monthlySummaries: MonthlySummary[] = (selectedDoctor === 'all' ? availableMonths : [selectedMonth])
    .filter(month => month !== 'all')
    .map(month => {
      const monthMovements = movements.filter(m => m.reference_month === month);
      const filtered = selectedDoctor !== 'all' 
        ? monthMovements.filter(m => m.doctor_name === selectedDoctor)
        : monthMovements;
      
      const totalDeductions = filtered.reduce((sum, m) => sum + calculateTotalDeductions(m), 0);
      
      return {
        month,
        totalGross: filtered.reduce((sum, m) => sum + m.gross_value, 0),
        totalDoctorAmount: filtered.reduce((sum, m) => sum + m.doctor_amount, 0),
        totalDeductions: totalDeductions,
        totalNetClinic: filtered.reduce((sum, m) => sum + m.net_clinic_value, 0),
        procedureCount: filtered.length
      };
    });

  const doctorSummaries: DoctorSummary[] = (selectedMonth === 'all' ? availableDoctors : [selectedDoctor])
    .filter(doctor => doctor !== 'all')
    .map(doctor => {
      const doctorMovements = movements.filter(m => m.doctor_name === doctor);
      const filtered = selectedMonth !== 'all' 
        ? doctorMovements.filter(m => m.reference_month === selectedMonth)
        : doctorMovements;
      
      const procedures: { [key: string]: number } = {};
      let hasMedication = false;
      let hasOtherCosts = false;
      let cashTransactions = 0;
      
      filtered.forEach(m => {
        procedures[m.procedure_type] = (procedures[m.procedure_type] || 0) + 1;
        if (m.has_medication || m.medication_cost > 0) hasMedication = true;
        if (m.has_other_costs || m.other_costs > 0) hasOtherCosts = true;
        if (m.payment_method === 'cash') cashTransactions++;
      });
      
      const totalDeductions = filtered.reduce((sum, m) => sum + calculateTotalDeductions(m), 0);

      return {
        doctorName: doctor,
        totalGross: filtered.reduce((sum, m) => sum + m.gross_value, 0),
        totalDoctorAmount: filtered.reduce((sum, m) => sum + m.doctor_amount, 0),
        totalDeductions: totalDeductions,
        totalNetClinic: filtered.reduce((sum, m) => sum + m.net_clinic_value, 0),
        procedureCount: filtered.length,
        procedures,
        hasMedication,
        hasOtherCosts,
        cashTransactions
      };
    });

  const totals = {
    totalGross: filteredMovements.reduce((sum, m) => sum + m.gross_value, 0),
    totalDoctorAmount: filteredMovements.reduce((sum, m) => sum + m.doctor_amount, 0),
    totalDeductions: filteredMovements.reduce((sum, m) => sum + calculateTotalDeductions(m), 0),
    totalNetClinic: filteredMovements.reduce((sum, m) => sum + m.net_clinic_value, 0),
    totalCount: filteredMovements.length
  };

  const effectiveMargin = totals.totalGross > 0 ? (totals.totalNetClinic / totals.totalGross) * 100 : 0;

  const handleEdit = (movement: ClinicalMovement) => {
    setEditingMovement(movement);
    setShowForm(true);
  };

  const handleDelete = async (movement: ClinicalMovement) => {
    if (!confirm(`Tem certeza que deseja excluir o movimento de ${movement.doctor_name}?`)) return;
    
    const { success } = await supabase
      .from('clinical_financial_movements')
      .delete()
      .eq('id', movement.id);
    
    if (success) {
      alert('✅ Movimento excluído com sucesso!');
      setRefreshTrigger(prev => prev + 1);
    } else {
      alert('❌ Erro ao excluir movimento');
    }
  };

  const toggleDoctorDetails = (doctorName: string) => {
    setExpandedDoctor(expandedDoctor === doctorName ? null : doctorName);
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-gray-600 mt-2">Carregando dados...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard Financeiro Clínica</h1>
        <button
          onClick={() => {
            setEditingMovement(null);
            setShowForm(true);
          }}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition flex items-center gap-2"
        >
          <PlusCircle size={20} />
          Novo Lançamento
        </button>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium opacity-90">Faturamento Bruto</span>
            <DollarSign size={20} />
          </div>
          <p className="text-2xl font-bold">{formatCurrency(totals.totalGross)}</p>
          <p className="text-xs opacity-75 mt-1">{totals.totalCount} procedimentos</p>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-4 text-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium opacity-90">Repasses Médicos</span>
            <TrendingDown size={20} />
          </div>
          <p className="text-2xl font-bold">-{formatCurrency(totals.totalDoctorAmount)}</p>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-4 text-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium opacity-90">Deduções Totais</span>
            <TrendingDown size={20} />
          </div>
          <p className="text-2xl font-bold">-{formatCurrency(totals.totalDeductions)}</p>
          <p className="text-xs opacity-75 mt-1">Taxas + Impostos + Custos</p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium opacity-90">Líquido Clínica</span>
            <TrendingUp size={20} />
          </div>
          <p className="text-2xl font-bold">{formatCurrency(totals.totalNetClinic)}</p>
          <p className="text-xs opacity-75 mt-1">Margem: {effectiveMargin.toFixed(1)}%</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
              <Calendar size={16} />
              Mês de Referência
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(e.target.value);
                setExpandedDoctor(null);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todos os meses</option>
              {availableMonths.map(month => (
                <option key={month} value={month}>
                  {formatMonth(month)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
              <User size={16} />
              Médico
            </label>
            <select
              value={selectedDoctor}
              onChange={(e) => {
                setSelectedDoctor(e.target.value);
                setExpandedDoctor(null);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todos os médicos</option>
              {availableDoctors.map(doctor => (
                <option key={doctor} value={doctor}>
                  {doctor}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between gap-3 mt-4">
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('monthly')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-lg font-medium transition ${
                viewMode === 'monthly'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              📅 Por Mês
            </button>
            <button
              onClick={() => setViewMode('doctor')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-lg font-medium transition ${
                viewMode === 'doctor'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              👨‍⚕️ Por Médico
            </button>
          </div>
          
          <button
            onClick={() => setShowReport(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2 font-medium"
          >
            <FileText size={18} />
            Gerar Relatório PDF
          </button>
        </div>
      </div>

      {/* Visualização por Mês */}
      {viewMode === 'monthly' && monthlySummaries.length > 0 && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <h3 className="font-semibold text-gray-800">Resumo Mensal</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Mês</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Procedimentos</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Faturamento</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Repasses</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Deduções</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-green-600">Líquido</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Margem</th>
                </tr>
              </thead>
              <tbody>
                {monthlySummaries.map((summary) => {
                  const margin = summary.totalGross > 0 ? (summary.totalNetClinic / summary.totalGross) * 100 : 0;
                  return (
                    <tr key={summary.month} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm font-medium text-gray-800">
                        {formatMonth(summary.month)}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600 text-right">
                        {summary.procedureCount}
                      </td>
                      <td className="py-3 px-4 text-sm text-blue-600 text-right">
                        {formatCurrency(summary.totalGross)}
                      </td>
                      <td className="py-3 px-4 text-sm text-red-600 text-right">
                        -{formatCurrency(summary.totalDoctorAmount)}
                      </td>
                      <td className="py-3 px-4 text-sm text-orange-600 text-right">
                        -{formatCurrency(summary.totalDeductions)}
                      </td>
                      <td className="py-3 px-4 text-sm text-green-600 font-bold text-right">
                        {formatCurrency(summary.totalNetClinic)}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-700 text-right">
                        {margin.toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Lista de Movimentos */}
      <ClinicalMovementsList 
        refreshTrigger={refreshTrigger}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/* Modal do Formulário */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="relative max-w-4xl w-full">
            <button
              onClick={() => setShowForm(false)}
              className="absolute -top-10 right-0 text-white hover:text-gray-200"
            >
              <X size={24} />
            </button>
            <ClinicalFinancialForm 
              initialData={editingMovement}
              onSuccess={() => {
                setShowForm(false);
                setEditingMovement(null);
                setRefreshTrigger(prev => prev + 1);
              }}
              onCancel={() => {
                setShowForm(false);
                setEditingMovement(null);
              }}
            />
          </div>
        </div>
      )}

      {/* Modal do Relatório */}
      {showReport && (
        <ClinicalReport onClose={() => setShowReport(false)} />
      )}
    </div>
  );
}
