// src/components/ClinicalReport.tsx
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { FileText, Download, Calendar, User, Printer, X } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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

  // Calcular totais
  const totals = {
    totalGross: filteredMovements.reduce((sum, m) => sum + m.gross_value, 0),
    totalDoctorAmount: filteredMovements.reduce((sum, m) => sum + m.doctor_amount, 0),
    totalDeductions: filteredMovements.reduce((sum, m) => sum + (m.payment_tax_amount + m.invoice_tax_amount + m.medication_cost + m.supplies_cost + m.other_costs), 0),
    totalNetClinic: filteredMovements.reduce((sum, m) => sum + m.net_clinic_value, 0),
    totalCount: filteredMovements.length
  };

  // Agrupar por médico para relatório resumido
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
      summary[m.doctor_name].totalDeductions += (m.payment_tax_amount + m.invoice_tax_amount + m.medication_cost + m.supplies_cost + m.other_costs);
      summary[m.doctor_name].totalNetClinic += m.net_clinic_value;
      summary[m.doctor_name].procedureCount++;
      summary[m.doctor_name].procedures[m.procedure_type] = (summary[m.doctor_name].procedures[m.procedure_type] || 0) + 1;
    });
    return Object.values(summary);
  };

  // Gerar PDF
  const generatePDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Título
    doc.setFontSize(20);
    doc.setTextColor(40, 40, 40);
    doc.text('Relatório Financeiro - Clínica', pageWidth / 2, 20, { align: 'center' });
    
    // Filtros aplicados
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    let yPos = 30;
    
    if (selectedMonth !== 'all') {
      doc.text(`Mês: ${formatMonth(selectedMonth)}`, 14, yPos);
      yPos += 6;
    }
    if (selectedDoctor !== 'all') {
      doc.text(`Médico: ${selectedDoctor}`, 14, yPos);
      yPos += 6;
    }
    
    doc.text(`Data de emissão: ${new Date().toLocaleDateString('pt-BR')}`, 14, yPos);
    yPos += 10;
    
    // Resumo geral
    doc.setFontSize(14);
    doc.setTextColor(40, 40, 40);
    doc.text('Resumo Geral', 14, yPos);
    yPos += 8;
    
    const summaryData = [
      ['Total de Procedimentos', totals.totalCount.toString()],
      ['Faturamento Bruto', formatCurrency(totals.totalGross)],
      ['Repasses aos Médicos', formatCurrency(totals.totalDoctorAmount)],
      ['Deduções Totais', formatCurrency(totals.totalDeductions)],
      ['Resultado Líquido da Clínica', formatCurrency(totals.totalNetClinic)],
      ['Margem Efetiva', `${totals.totalGross > 0 ? ((totals.totalNetClinic / totals.totalGross) * 100).toFixed(1) : 0}%`]
    ];
    
    autoTable(doc, {
      startY: yPos,
      head: [['Indicador', 'Valor']],
      body: summaryData,
      theme: 'striped',
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontSize: 10 },
      bodyStyles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 50 }
      }
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 10;
    
    if (reportType === 'summary') {
      // Relatório por Médico
      doc.setFontSize(14);
      doc.text('Resumo por Médico', 14, yPos);
      yPos += 8;
      
      const doctorData = doctorSummary().map(d => [
        d.doctorName,
        d.procedureCount.toString(),
        formatCurrency(d.totalGross),
        formatCurrency(d.totalDoctorAmount),
        formatCurrency(d.totalNetClinic),
        `${d.totalGross > 0 ? ((d.totalNetClinic / d.totalGross) * 100).toFixed(1) : 0}%`
      ]);
      
      autoTable(doc, {
        startY: yPos,
        head: [['Médico', 'Qtd', 'Faturamento', 'Repasses', 'Líquido Clínica', 'Margem']],
        body: doctorData,
        theme: 'striped',
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontSize: 9 },
        bodyStyles: { fontSize: 8 },
        columnStyles: {
          0: { cellWidth: 40 },
          1: { cellWidth: 20, halign: 'center' },
          2: { cellWidth: 35, halign: 'right' },
          3: { cellWidth: 35, halign: 'right' },
          4: { cellWidth: 35, halign: 'right' },
          5: { cellWidth: 25, halign: 'right' }
        }
      });
    } else {
      // Relatório Detalhado
      doc.setFontSize(14);
      doc.text('Lançamentos Detalhados', 14, yPos);
      yPos += 8;
      
      const detailedData = filteredMovements.map(m => [
        formatDate(m.date),
        m.doctor_name,
        m.patient_name || '-',
        m.procedure_type,
        formatCurrency(m.gross_value),
        `${m.doctor_percentage}%`,
        m.cash_settlement_type === 'doctor_took' ? 'Levou' : 'Clínica',
        formatCurrency(m.net_clinic_value)
      ]);
      
      autoTable(doc, {
        startY: yPos,
        head: [['Data', 'Médico', 'Paciente', 'Procedimento', 'Valor', '% Médico', 'Dinheiro', 'Líquido']],
        body: detailedData,
        theme: 'striped',
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontSize: 8 },
        bodyStyles: { fontSize: 7 },
        columnStyles: {
          0: { cellWidth: 25 },
          1: { cellWidth: 35 },
          2: { cellWidth: 30 },
          3: { cellWidth: 35 },
          4: { cellWidth: 25, halign: 'right' },
          5: { cellWidth: 20, halign: 'center' },
          6: { cellWidth: 20, halign: 'center' },
          7: { cellWidth: 25, halign: 'right' }
        }
      });
    }
    
    // Salvar PDF
    doc.save(`relatorio_clinica_${new Date().toISOString().split('T')[0]}.pdf`);
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
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
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

          {/* Cards de Resumo */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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
                      const margin = doctor.totalGross > 0 ? (doctor.totalNetClinic / doctor.totalGross) * 100 : 0;
                      return (
                        <tr key={doctor.doctorName} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4 text-sm font-medium text-gray-800">{doctor.doctorName}</td>
                          <td className="py-3 px-4 text-sm text-center text-gray-600">{doctor.procedureCount}</td>
                          <td className="py-3 px-4 text-sm text-blue-600 text-right">{formatCurrency(doctor.totalGross)}</td>
                          <td className="py-3 px-4 text-sm text-red-600 text-right">{formatCurrency(doctor.totalDoctorAmount)}</td>
                          <td className="py-3 px-4 text-sm text-orange-600 text-right">{formatCurrency(doctor.totalDeductions)}</td>
                          <td className="py-3 px-4 text-sm text-green-600 font-bold text-right">{formatCurrency(doctor.totalNetClinic)}</td>
                          <td className="py-3 px-4 text-sm text-gray-700 text-right">{margin.toFixed(1)}%</td>
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
                      <th className="text-center py-3 px-3 text-sm font-semibold text-gray-700">Dinheiro</th>
                      <th className="text-center py-3 px-3 text-sm font-semibold text-gray-700">💊</th>
                      <th className="text-center py-3 px-3 text-sm font-semibold text-gray-700">📋</th>
                      <th className="text-right py-3 px-3 text-sm font-semibold text-green-600">Líquido</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMovements.map((movement) => (
                      <tr key={movement.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-3 text-sm text-gray-600">{formatDate(movement.date)}</td>
                        <td className="py-3 px-3 text-sm font-medium text-gray-800">{movement.doctor_name}</td>
                        <td className="py-3 px-3 text-sm text-gray-600">{movement.patient_name || '-'}</td>
                        <td className="py-3 px-3 text-sm text-gray-700">{movement.procedure_type}</td>
                        <td className="py-3 px-3 text-sm text-blue-600 text-right">{formatCurrency(movement.gross_value)}</td>
                        <td className="py-3 px-3 text-sm text-gray-600 text-center">{movement.doctor_percentage}%</td>
                        <td className="py-3 px-3 text-sm text-center">
                          {movement.cash_settlement_type === 'doctor_took' ? 'Levou' : movement.payment_method === 'cash' ? 'Na clínica' : '-'}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {movement.has_medication ? '✅' : '-'}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {movement.has_other_costs ? '✅' : '-'}
                        </td>
                        <td className="py-3 px-3 text-sm text-green-600 font-bold text-right">{formatCurrency(movement.net_clinic_value)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                    <tr>
                      <td colSpan={4} className="py-3 px-3 text-sm font-bold text-gray-800 text-right">Total:</td>
                      <td className="py-3 px-3 text-sm font-bold text-blue-600 text-right">{formatCurrency(totals.totalGross)}</td>
                      <td className="py-3 px-3"></td>
                      <td className="py-3 px-3"></td>
                      <td className="py-3 px-3"></td>
                      <td className="py-3 px-3"></td>
                      <td className="py-3 px-3 text-sm font-bold text-green-600 text-right">{formatCurrency(totals.totalNetClinic)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Botões de ação */}
          <div className="flex gap-3 sticky bottom-0 bg-white pt-4 border-t border-gray-200">
            <button
              onClick={generatePDF}
              className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2 font-semibold"
            >
              <Download size={20} />
              Gerar PDF
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 transition flex items-center justify-center gap-2 font-semibold"
            >
              <Printer size={20} />
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
