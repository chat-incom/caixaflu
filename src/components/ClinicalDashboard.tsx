// src/components/ClinicalDashboard.tsx
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Calendar, 
  User, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Pill, 
  Package,
  FileText,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff
} from 'lucide-react';

interface ClinicalMovement {
  id: string;
  date: string;
  doctor_name: string;
  patient_name: string;
  procedure_type: string;
  reference_month: string;
  gross_value: number;
  doctor_percentage: number;
  doctor_amount: number;
  clinic_share_before_costs: number;
  payment_tax_amount: number;
  invoice_tax_amount: number;
  medication_cost: number;
  supplies_cost: number;
  other_costs: number;
  other_costs_description: string;
  total_deductions: number;
  net_clinic_value: number;
  cash_settlement_type: string;
  has_medication: boolean;
  has_other_costs: boolean;
  observations: string;
}

interface MonthlySummary {
  month: string;
  totalGross: number;
  totalDoctorAmount: number;
  totalDeductions: number;
  totalNetClinic: number;
  procedureCount: number;
}

interface DoctorSummary {
  doctorName: string;
  totalGross: number;
  totalDoctorAmount: number;
  totalDeductions: number;
  totalNetClinic: number;
  procedureCount: number;
  procedures: { [key: string]: number };
  hasMedication: boolean;
  hasOtherCosts: boolean;
  cashTransactions: number;
}

export default function ClinicalDashboard() {
  const [movements, setMovements] = useState<ClinicalMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedDoctor, setSelectedDoctor] = useState<string>('all');
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [availableDoctors, setAvailableDoctors] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'monthly' | 'doctor'>('monthly');
  const [expandedDoctor, setExpandedDoctor] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    fetchMovements();
  }, []);

  const fetchMovements = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('clinical_financial_movements')
        .select('*')
        .eq('user_id', user.id)
        .order('reference_month', { ascending: false })
        .order('date', { ascending: false });

      if (error) throw error;

      setMovements(data || []);

      // Extrair meses únicos
      const months = [...new Set(data?.map(m => m.reference_month) || [])].sort().reverse();
      setAvailableMonths(months);

      // Extrair médicos únicos
      const doctors = [...new Set(data?.map(m => m.doctor_name) || [])].sort();
      setAvailableDoctors(doctors);
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

  const formatMonth = (monthString: string) => {
    if (!monthString) return '-';
    const [year, month] = monthString.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 15);
    return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString + 'T00:00:00').toLocaleDateString('pt-BR');
  };

  // Filtrar movimentos
  const filteredMovements = movements.filter(m => {
    const matchMonth = selectedMonth === 'all' || m.reference_month === selectedMonth;
    const matchDoctor = selectedDoctor === 'all' || m.doctor_name === selectedDoctor;
    return matchMonth && matchDoctor;
  });

  // Calcular deduções totais corretamente
  const calculateTotalDeductions = (movement: ClinicalMovement) => {
    return (movement.payment_tax_amount || 0) + 
           (movement.invoice_tax_amount || 0) + 
           (movement.medication_cost || 0) + 
           (movement.supplies_cost || 0) + 
           (movement.other_costs || 0);
  };

  // Resumo mensal
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

  // Resumo por médico
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

  // Totais gerais filtrados
  const totals = {
    totalGross: filteredMovements.reduce((sum, m) => sum + m.gross_value, 0),
    totalDoctorAmount: filteredMovements.reduce((sum, m) => sum + m.doctor_amount, 0),
    totalDeductions: filteredMovements.reduce((sum, m) => sum + calculateTotalDeductions(m), 0),
    totalNetClinic: filteredMovements.reduce((sum, m) => sum + m.net_clinic_value, 0),
    totalCount: filteredMovements.length
  };

  const effectiveMargin = totals.totalGross > 0 ? (totals.totalNetClinic / totals.totalGross) * 100 : 0;

  const toggleDoctorDetails = (doctorName: string) => {
    setExpandedDoctor(expandedDoctor === doctorName ? null : doctorName);
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Carregando dados...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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

        <div className="flex gap-2 mt-4">
          <button
            onClick={() => setViewMode('monthly')}
            className={`flex-1 py-2 rounded-lg font-medium transition ${
              viewMode === 'monthly'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            📅 Por Mês
          </button>
          <button
            onClick={() => setViewMode('doctor')}
            className={`flex-1 py-2 rounded-lg font-medium transition ${
              viewMode === 'doctor'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            👨‍⚕️ Por Médico
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
              <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                <tr>
                  <td className="py-3 px-4 text-sm font-bold text-gray-800">Total</td>
                  <td className="py-3 px-4 text-sm font-bold text-gray-800 text-right">
                    {monthlySummaries.reduce((sum, m) => sum + m.procedureCount, 0)}
                  </td>
                  <td className="py-3 px-4 text-sm font-bold text-blue-600 text-right">
                    {formatCurrency(monthlySummaries.reduce((sum, m) => sum + m.totalGross, 0))}
                  </td>
                  <td className="py-3 px-4 text-sm font-bold text-red-600 text-right">
                    -{formatCurrency(monthlySummaries.reduce((sum, m) => sum + m.totalDoctorAmount, 0))}
                  </td>
                  <td className="py-3 px-4 text-sm font-bold text-orange-600 text-right">
                    -{formatCurrency(monthlySummaries.reduce((sum, m) => sum + m.totalDeductions, 0))}
                  </td>
                  <td className="py-3 px-4 text-sm font-bold text-green-600 text-right">
                    {formatCurrency(monthlySummaries.reduce((sum, m) => sum + m.totalNetClinic, 0))}
                  </td>
                  <td className="py-3 px-4"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Visualização por Médico */}
      {viewMode === 'doctor' && doctorSummaries.length > 0 && (
        <div className="space-y-4">
          {doctorSummaries.map((doctor) => {
            const margin = doctor.totalGross > 0 ? (doctor.totalNetClinic / doctor.totalGross) * 100 : 0;
            const isExpanded = expandedDoctor === doctor.doctorName;
            
            // Filtrar movimentos do médico para detalhes
            const doctorMovements = filteredMovements.filter(m => m.doctor_name === doctor.doctorName);
            
            return (
              <div key={doctor.doctorName} className="bg-white rounded-lg shadow-md overflow-hidden">
                <div 
                  className="p-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white cursor-pointer hover:bg-gray-50 transition"
                  onClick={() => toggleDoctorDetails(doctor.doctorName)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                          <User size={20} className="text-blue-600" />
                          {doctor.doctorName}
                        </h3>
                        {doctor.hasMedication && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full flex items-center gap-1">
                            <Pill size={12} /> Medicação
                          </span>
                        )}
                        {doctor.hasOtherCosts && (
                          <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full flex items-center gap-1">
                            <Package size={12} /> Outros custos
                          </span>
                        )}
                        {doctor.cashTransactions > 0 && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                            💵 {doctor.cashTransactions} pagamento(s) em dinheiro
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {doctor.procedureCount} procedimentos • {Object.keys(doctor.procedures).length} tipos
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Total Líquido para Clínica</p>
                      <p className="text-xl font-bold text-green-600">{formatCurrency(doctor.totalNetClinic)}</p>
                      <p className="text-xs text-gray-500">Margem: {margin.toFixed(1)}%</p>
                    </div>
                    <div className="ml-4">
                      {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="p-4">
                    {/* Estatísticas do médico */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
                      <div className="bg-blue-50 rounded-lg p-3">
                        <p className="text-xs text-blue-600">Faturamento</p>
                        <p className="text-lg font-bold text-blue-700">{formatCurrency(doctor.totalGross)}</p>
                      </div>
                      <div className="bg-red-50 rounded-lg p-3">
                        <p className="text-xs text-red-600">Repasse Médico</p>
                        <p className="text-lg font-bold text-red-700">{formatCurrency(doctor.totalDoctorAmount)}</p>
                      </div>
                      <div className="bg-orange-50 rounded-lg p-3">
                        <p className="text-xs text-orange-600">Deduções</p>
                        <p className="text-lg font-bold text-orange-700">{formatCurrency(doctor.totalDeductions)}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Taxas + Impostos + Custos
                        </p>
                      </div>
                      <div className="bg-green-50 rounded-lg p-3">
                        <p className="text-xs text-green-600">Líquido Clínica</p>
                        <p className="text-lg font-bold text-green-700">{formatCurrency(doctor.totalNetClinic)}</p>
                      </div>
                    </div>

                    {/* Distribuição por procedimento */}
                    <div className="mb-4">
                      <h4 className="font-semibold text-gray-700 mb-2">Distribuição por Procedimento</h4>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(doctor.procedures).map(([proc, count]) => (
                          <span key={proc} className="px-3 py-1 bg-gray-100 rounded-full text-sm">
                            {proc}: {count}x
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Lista de lançamentos do médico */}
                    <div>
                      <h4 className="font-semibold text-gray-700 mb-2">Lançamentos</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="text-left py-2 px-3">Data</th>
                              <th className="text-left py-2 px-3">Procedimento</th>
                              <th className="text-left py-2 px-3">Paciente</th>
                              <th className="text-right py-2 px-3">Valor</th>
                              <th className="text-right py-2 px-3">Repasse</th>
                              <th className="text-center py-2 px-3">💊 Medicação</th>
                              <th className="text-center py-2 px-3">📋 Outros Custos</th>
                              <th className="text-right py-2 px-3 text-green-600">Líquido</th>
                            </tr>
                          </thead>
                          <tbody>
                            {doctorMovements.map((movement) => {
                              const hasMedication = movement.medication_cost > 0;
                              const hasOtherCosts = movement.other_costs > 0;
                              return (
                                <tr key={movement.id} className="border-b border-gray-100 hover:bg-gray-50">
                                  <td className="py-2 px-3 text-gray-600">{formatDate(movement.date)}</td>
                                  <td className="py-2 px-3 font-medium">{movement.procedure_type}</td>
                                  <td className="py-2 px-3 text-gray-600">{movement.patient_name || '-'}</td>
                                  <td className="py-2 px-3 text-blue-600 text-right">{formatCurrency(movement.gross_value)}</td>
                                  <td className="py-2 px-3 text-red-600 text-right">
                                    {movement.cash_settlement_type === 'doctor_took' ? (
                                      <span className="text-green-600 text-xs">(levou no dia)</span>
                                    ) : (
                                      `-${formatCurrency(movement.doctor_amount)}`
                                    )}
                                  </td>
                                  <td className="py-2 px-3 text-center">
                                    {hasMedication ? (
                                      <span className="text-blue-600" title={`R$ ${movement.medication_cost.toFixed(2)}`}>
                                        ✅ R$ {movement.medication_cost.toFixed(2)}
                                      </span>
                                    ) : (
                                      '-'
                                    )}
                                  </td>
                                  <td className="py-2 px-3 text-center">
                                    {hasOtherCosts ? (
                                      <span className="text-orange-600" title={movement.other_costs_description || 'Outros custos'}>
                                        ✅ R$ {movement.other_costs.toFixed(2)}
                                      </span>
                                    ) : (
                                      '-'
                                    )}
                                  </td>
                                  <td className="py-2 px-3 text-green-600 font-bold text-right">
                                    {formatCurrency(movement.net_clinic_value)}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                          <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                            <tr>
                              <td colSpan={3} className="py-2 px-3 text-right font-bold">Totais:</td>
                              <td className="py-2 px-3 text-right font-bold text-blue-600">
                                {formatCurrency(doctor.totalGross)}
                              </td>
                              <td className="py-2 px-3 text-right font-bold text-red-600">
                                -{formatCurrency(doctor.totalDoctorAmount)}
                              </td>
                              <td className="py-2 px-3 text-center font-bold text-blue-600">
                                {doctor.hasMedication ? '✓' : '-'}
                              </td>
                              <td className="py-2 px-3 text-center font-bold text-orange-600">
                                {doctor.hasOtherCosts ? '✓' : '-'}
                              </td>
                              <td className="py-2 px-3 text-right font-bold text-green-600">
                                {formatCurrency(doctor.totalNetClinic)}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Tabela de todos os lançamentos */}
      {filteredMovements.length > 0 && viewMode === 'monthly' && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <FileText size={18} />
              Todos os Lançamentos
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-3 text-sm font-semibold text-gray-700">Data</th>
                  <th className="text-left py-3 px-3 text-sm font-semibold text-gray-700">Mês Ref</th>
                  <th className="text-left py-3 px-3 text-sm font-semibold text-gray-700">Médico</th>
                  <th className="text-left py-3 px-3 text-sm font-semibold text-gray-700">Procedimento</th>
                  <th className="text-left py-3 px-3 text-sm font-semibold text-gray-700">Paciente</th>
                  <th className="text-right py-3 px-3 text-sm font-semibold text-gray-700">Valor</th>
                  <th className="text-right py-3 px-3 text-sm font-semibold text-gray-700">% Médico</th>
                  <th className="text-right py-3 px-3 text-sm font-semibold text-gray-700">Repasse</th>
                  <th className="text-center py-3 px-3 text-sm font-semibold text-gray-700">💊</th>
                  <th className="text-center py-3 px-3 text-sm font-semibold text-gray-700">📋</th>
                  <th className="text-right py-3 px-3 text-sm font-semibold text-green-600">Líquido</th>
                </tr>
              </thead>
              <tbody>
                {filteredMovements.map((movement) => (
                  <tr key={movement.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-3 text-sm text-gray-600">{formatDate(movement.date)}</td>
                    <td className="py-3 px-3 text-sm text-gray-600">{formatMonth(movement.reference_month)}</td>
                    <td className="py-3 px-3 text-sm font-medium text-gray-800">{movement.doctor_name}</td>
                    <td className="py-3 px-3 text-sm text-gray-700">{movement.procedure_type}</td>
                    <td className="py-3 px-3 text-sm text-gray-600">{movement.patient_name || '-'}</td>
                    <td className="py-3 px-3 text-sm text-blue-600 text-right">{formatCurrency(movement.gross_value)}</td>
                    <td className="py-3 px-3 text-sm text-gray-600 text-right">{movement.doctor_percentage}%</td>
                    <td className="py-3 px-3 text-sm text-red-600 text-right">
                      {movement.cash_settlement_type === 'doctor_took' ? (
                        <span className="text-green-600 text-xs">(levou no dia)</span>
                      ) : (
                        `-${formatCurrency(movement.doctor_amount)}`
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {movement.medication_cost > 0 ? (
                        <span className="text-blue-600 text-xs" title={`R$ ${movement.medication_cost}`}>
                          ✅
                        </span>
                      ) : '-'}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {movement.other_costs > 0 ? (
                        <span className="text-orange-600 text-xs" title={movement.other_costs_description || 'Outros custos'}>
                          ✅
                        </span>
                      ) : '-'}
                    </td>
                    <td className="py-3 px-3 text-sm text-green-600 font-bold text-right">
                      {formatCurrency(movement.net_clinic_value)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {filteredMovements.length === 0 && (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <p className="text-gray-500">Nenhum movimento encontrado para os filtros selecionados.</p>
        </div>
      )}
    </div>
  );
}
