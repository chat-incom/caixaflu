// src/components/ClinicalReport.tsx
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { FileText, Calendar, User, Printer, X, Download } from 'lucide-react';

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
}

interface ClinicalReportProps {
  onClose: () => void;
}

export default function ClinicalReport({ onClose }: ClinicalReportProps) {
  const [movements, setMovements] = useState<ClinicalMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedDoctor, setSelectedDoctor] = useState<string>('all');
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [availableDoctors, setAvailableDoctors] = useState<string[]>([]);
  const [reportType, setReportType] = useState<'summary' | 'detailed'>('summary');

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

      const months = [...new Set(data?.map(m => m.reference_month) || [])].sort().reverse();
      setAvailableMonths(months);

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

  // Calcular deduções
  const calculateTotalDeductions = (movement: ClinicalMovement) => {
    return (movement.payment_tax_amount || 0) + 
           (movement.invoice_tax_amount || 0) + 
           (movement.medication_cost || 0) + 
           (movement.supplies_cost || 0) + 
           (movement.other_costs || 0);
  };

  // Totais gerais
  const totals = {
    totalGross: filteredMovements.reduce((sum, m) => sum + m.gross_value, 0),
    totalDoctorAmount: filteredMovements.reduce((sum, m) => sum + m.doctor_amount, 0),
    totalDeductions: filteredMovements.reduce((sum, m) => sum + calculateTotalDeductions(m), 0),
    totalNetClinic: filteredMovements.reduce((sum, m) => sum + m.net_clinic_value, 0),
    totalCount: filteredMovements.length
  };

  // Resumo por médico
  const doctorSummary = () => {
    const summary: { [key: string]: any } = {};
    filteredMovements.forEach(m => {
      if (!summary[m.doctor_name]) {
        summary[m.doctor_name] = {
          doctorName: m.doctor_name,
          totalGross: 0,
          totalDoctorAmount: 0,
          totalDeductions: 0,
          totalNetClinic: 0,
          procedureCount: 0,
          procedures: {}
        };
      }
      summary[m.doctor_name].totalGross += m.gross_value;
      summary[m.doctor_name].totalDoctorAmount += m.doctor_amount;
      summary[m.doctor_name].totalDeductions += calculateTotalDeductions(m);
      summary[m.doctor_name].totalNetClinic += m.net_clinic_value;
      summary[m.doctor_name].procedureCount++;
      summary[m.doctor_name].procedures[m.procedure_type] = (summary[m.doctor_name].procedures[m.procedure_type] || 0) + 1;
    });
    return Object.values(summary);
  };

  const handlePrint = () => {
    window.print();
  };

  const margin = totals.totalGross > 0 ? (totals.totalNetClinic / totals.totalGross) * 100 : 0;

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <p className="text-gray-600">Carregando dados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
          <div className="flex items-center gap-3">
            <FileText size={24} className="text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-800">Relatório Financeiro da Clínica</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6">
          {/* Filtros */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6 print:bg-white">
            <h3 className="font-semibold text-gray-800 mb-3">Filtros</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                  <Calendar size={16} />
                  Mês de Referência
                </label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
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
                  onChange={(e) => setSelectedDoctor(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
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

            <div className="flex gap-2">
              <button
                onClick={() => setReportType('summary')}
                className={`flex-1 py-2 rounded-lg font-medium transition ${
                  reportType === 'summary'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Resumo por Médico
              </button>
              <button
                onClick={() => setReportType('detailed')}
                className={`flex-1 py-2 rounded-lg font-medium transition ${
                  reportType === 'detailed'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Lançamentos Detalhados
              </button>
            </div>
          </div>

          {/* Conteúdo do Relatório - Para impressão */}
          <div className="report-content">
            {/* Cabeçalho do Relatório */}
            <div className="text-center mb-6 print:block hidden">
              <h1 className="text-2xl font-bold">Relatório Financeiro da Clínica</h1>
              <p className="text-gray-600">
                {selectedMonth !== 'all' ? `Mês: ${formatMonth(selectedMonth)}` : 'Todos os meses'}
                {selectedDoctor !== 'all' && ` • Médico: ${selectedDoctor}`}
              </p>
              <p className="text-gray-500 text-sm">Data de emissão: {new Date().toLocaleDateString('pt-BR')}</p>
            </div>

            {/* Cards de Resumo */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 print:grid-cols-4">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white">
                <p className="text-sm opacity-90">Procedimentos</p>
                <p className="text-2xl font-bold">{totals.totalCount}</p>
              </div>
              <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white">
                <p className="text-sm opacity-90">Faturamento Bruto</p>
                <p className="text-2xl font-bold">{formatCurrency(totals.totalGross)}</p>
              </div>
              <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-4 text-white">
                <p className="text-sm opacity-90">Deduções</p>
                <p className="text-2xl font-bold">{formatCurrency(totals.totalDeductions)}</p>
              </div>
              <div className="bg-gradient-to-br from-green-700 to-green-800 rounded-xl p-4 text-white">
                <p className="text-sm opacity-90">Líquido Clínica</p>
                <p className="text-2xl font-bold">{formatCurrency(totals.totalNetClinic)}</p>
                <p className="text-xs opacity-75">Margem: {margin.toFixed(1)}%</p>
              </div>
            </div>

            {/* Visualização dos dados */}
            {reportType === 'summary' ? (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-6">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Médico</th>
                        <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Procedimentos</th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Faturamento</th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Repasses</th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Deduções</th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-green-600">Líquido</th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Margem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {doctorSummary().map((doctor: any) => {
                        const marginDoctor = doctor.totalGross > 0 ? (doctor.totalNetClinic / doctor.totalGross) * 100 : 0;
                        return (
                          <tr key={doctor.doctorName} className="border-b border-gray-100">
                            <td className="py-3 px-4 text-sm font-medium text-gray-800">{doctor.doctorName}</td>
                            <td className="py-3 px-4 text-sm text-center text-gray-600">{doctor.procedureCount}</td>
                            <td className="py-3 px-4 text-sm text-blue-600 text-right">{formatCurrency(doctor.totalGross)}</td>
                            <td className="py-3 px-4 text-sm text-red-600 text-right">{formatCurrency(doctor.totalDoctorAmount)}</td>
                            <td className="py-3 px-4 text-sm text-orange-600 text-right">{formatCurrency(doctor.totalDeductions)}</td>
                            <td className="py-3 px-4 text-sm text-green-600 font-bold text-right">{formatCurrency(doctor.totalNetClinic)}</td>
                            <td className="py-3 px-4 text-sm text-gray-700 text-right">{marginDoctor.toFixed(1)}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                      <tr>
                        <td className="py-3 px-4 text-sm font-bold text-gray-800">Total</td>
                        <td className="py-3 px-4 text-sm font-bold text-center text-gray-800">{totals.totalCount}</td>
                        <td className="py-3 px-4 text-sm font-bold text-blue-600 text-right">{formatCurrency(totals.totalGross)}</td>
                        <td className="py-3 px-4 text-sm font-bold text-red-600 text-right">{formatCurrency(totals.totalDoctorAmount)}</td>
                        <td className="py-3 px-4 text-sm font-bold text-orange-600 text-right">{formatCurrency(totals.totalDeductions)}</td>
                        <td className="py-3 px-4 text-sm font-bold text-green-600 text-right">{formatCurrency(totals.totalNetClinic)}</td>
                        <td className="py-3 px-4 text-sm font-bold text-gray-800 text-right">{margin.toFixed(1)}%</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-6">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left py-3 px-3 text-sm font-semibold text-gray-700">Data</th>
                        <th className="text-left py-3 px-3 text-sm font-semibold text-gray-700">Médico</th>
                        <th className="text-left py-3 px-3 text-sm font-semibold text-gray-700">Paciente</th>
                        <th className="text-left py-3 px-3 text-sm font-semibold text-gray-700">Procedimento</th>
                        <th className="text-right py-3 px-3 text-sm font-semibold text-gray-700">Valor</th>
                        <th className="text-center py-3 px-3 text-sm font-semibold text-gray-700">% Médico</th>
                        <th className="text-right py-3 px-3 text-sm font-semibold text-green-600">Líquido</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMovements.map((movement) => (
                        <tr key={movement.id} className="border-b border-gray-100">
                          <td className="py-3 px-3 text-sm text-gray-600">{formatDate(movement.date)}</td>
                          <td className="py-3 px-3 text-sm font-medium text-gray-800">{movement.doctor_name}</td>
                          <td className="py-3 px-3 text-sm text-gray-600">{movement.patient_name || '-'}</td>
                          <td className="py-3 px-3 text-sm text-gray-700">{movement.procedure_type}</td>
                          <td className="py-3 px-3 text-sm text-blue-600 text-right">{formatCurrency(movement.gross_value)}</td>
                          <td className="py-3 px-3 text-sm text-gray-600 text-center">{movement.doctor_percentage}%</td>
                          <td className="py-3 px-3 text-sm text-green-600 font-bold text-right">{formatCurrency(movement.net_clinic_value)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                      <tr>
                        <td colSpan={4} className="py-3 px-3 text-sm font-bold text-gray-800 text-right">Total:</td>
                        <td className="py-3 px-3 text-sm font-bold text-blue-600 text-right">{formatCurrency(totals.totalGross)}</td>
                        <td className="py-3 px-3"></td>
                        <td className="py-3 px-3 text-sm font-bold text-green-600 text-right">{formatCurrency(totals.totalNetClinic)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Botões de ação */}
          <div className="flex gap-3 sticky bottom-0 bg-white pt-4 border-t border-gray-200 print:hidden">
            <button
              onClick={handlePrint}
              className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2 font-semibold"
            >
              <Printer size={20} />
              Imprimir / Salvar como PDF
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 transition flex items-center justify-center gap-2 font-semibold"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          .fixed {
            position: relative !important;
            background: white !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:block {
            display: block !important;
          }
          .print\\:grid-cols-4 {
            display: grid !important;
            grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
          }
          body {
            padding: 20px !important;
          }
        }
      `}</style>
    </div>
  );
}
