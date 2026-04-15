// src/components/ClinicalReport.tsx
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Calendar, User, X, Download } from 'lucide-react';
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
  net_clinic_value: number;
  cash_settlement_type: string;
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
  const [generating, setGenerating] = useState(false);

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
        .order('date', { ascending: true });

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

  // Agrupar por médico
  const movementsByDoctor = () => {
    const grouped: { [key: string]: ClinicalMovement[] } = {};
    filteredMovements.forEach(m => {
      if (!grouped[m.doctor_name]) {
        grouped[m.doctor_name] = [];
      }
      grouped[m.doctor_name].push(m);
    });
    return grouped;
  };

  const generatePDF = async () => {
    setGenerating(true);
    
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      let yOffset = 20;

      // Título
      doc.setFontSize(18);
      doc.setTextColor(40, 40, 40);
      doc.text('Relatório de Repasses Médicos', pageWidth / 2, yOffset, { align: 'center' });
      yOffset += 10;

      // Informações dos filtros
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      
      if (selectedMonth !== 'all') {
        doc.text(`Mês de Referência: ${formatMonth(selectedMonth)}`, 14, yOffset);
        yOffset += 6;
      }
      if (selectedDoctor !== 'all') {
        doc.text(`Médico: ${selectedDoctor}`, 14, yOffset);
        yOffset += 6;
      }
      
      doc.text(`Data de emissão: ${new Date().toLocaleDateString('pt-BR')}`, 14, yOffset);
      yOffset += 15;

      const grouped = movementsByDoctor();
      const doctors = Object.keys(grouped).sort();

      for (let i = 0; i < doctors.length; i++) {
        const doctorName = doctors[i];
        const doctorMovements = grouped[doctorName];
        
        // Verificar se precisa de nova página
        if (yOffset > 250) {
          doc.addPage();
          yOffset = 20;
        }

        // Cabeçalho do médico
        doc.setFontSize(14);
        doc.setTextColor(40, 40, 40);
        doc.setFont('helvetica', 'bold');
        doc.text(`Médico: ${doctorName}`, 14, yOffset);
        yOffset += 8;
        
        // Totais do médico
        const totalGross = doctorMovements.reduce((sum, m) => sum + m.gross_value, 0);
        const totalNet = doctorMovements.reduce((sum, m) => sum + m.net_clinic_value, 0);
        
        doc.setFontSize(9);
        doc.setTextColor(80, 80, 80);
        doc.setFont('helvetica', 'normal');
        doc.text(`Total de procedimentos: ${doctorMovements.length}`, 14, yOffset);
        doc.text(`Total bruto: ${formatCurrency(totalGross)}`, 80, yOffset);
        doc.text(`Total líquido clínica: ${formatCurrency(totalNet)}`, 140, yOffset);
        yOffset += 10;

        // Tabela de lançamentos do médico
        const tableData = doctorMovements.map(m => [
          formatDate(m.date),
          m.procedure_type,
          m.patient_name || '-',
          formatCurrency(m.gross_value),
          `${m.doctor_percentage}%`,
          m.cash_settlement_type === 'doctor_took' ? 'Médico levou' : 'Clínica',
          formatCurrency(m.net_clinic_value)
        ]);

        autoTable(doc, {
          startY: yOffset,
          head: [['Data', 'Procedimento', 'Paciente', 'Valor', '% Médico', 'Dinheiro', 'Líquido Clínica']],
          body: tableData,
          theme: 'striped',
          headStyles: { 
            fillColor: [41, 128, 185], 
            textColor: 255, 
            fontSize: 8,
            fontStyle: 'bold'
          },
          bodyStyles: { fontSize: 8 },
          columnStyles: {
            0: { cellWidth: 25 },
            1: { cellWidth: 35 },
            2: { cellWidth: 30 },
            3: { cellWidth: 25, halign: 'right' },
            4: { cellWidth: 20, halign: 'center' },
            5: { cellWidth: 25, halign: 'center' },
            6: { cellWidth: 30, halign: 'right' }
          },
          margin: { left: 14, right: 14 }
        });

        yOffset = (doc as any).lastAutoTable.finalY + 15;

        // Adicionar linha de resumo do médico
        if (yOffset < 270) {
          doc.setDrawColor(200, 200, 200);
          doc.line(14, yOffset - 5, pageWidth - 14, yOffset - 5);
        }
      }

      // Rodapé
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `Relatório gerado em ${new Date().toLocaleString('pt-BR')} - Página ${i} de ${pageCount}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
      }

      // Salvar PDF
      const fileName = `relatorio_repasses_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Erro ao gerar o relatório. Tente novamente.');
    } finally {
      setGenerating(false);
    }
  };

  // Calcular totais para preview
  const totals = {
    totalGross: filteredMovements.reduce((sum, m) => sum + m.gross_value, 0),
    totalNetClinic: filteredMovements.reduce((sum, m) => sum + m.net_clinic_value, 0),
    totalCount: filteredMovements.length
  };

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
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Gerar Relatório de Repasses</h2>
            <p className="text-sm text-gray-500 mt-1">Selecione os filtros e gere o PDF</p>
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
            <h3 className="font-semibold text-gray-800 mb-3">Filtros do Relatório</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                  <Calendar size={16} />
                  Mês de Referência
                </label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
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
                  onChange={(e) => setSelectedDoctor(e.target.value)}
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
          </div>

          {/* Preview dos dados que serão exportados */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-800 mb-3">Resumo dos dados</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-blue-50 rounded-lg p-3 text-center">
                <p className="text-xs text-blue-600">Médicos</p>
                <p className="text-xl font-bold text-blue-700">
                  {selectedDoctor === 'all' ? Object.keys(movementsByDoctor()).length : 1}
                </p>
              </div>
              <div className="bg-green-50 rounded-lg p-3 text-center">
                <p className="text-xs text-green-600">Procedimentos</p>
                <p className="text-xl font-bold text-green-700">{totals.totalCount}</p>
              </div>
              <div className="bg-orange-50 rounded-lg p-3 text-center">
                <p className="text-xs text-orange-600">Total Líquido</p>
                <p className="text-xl font-bold text-orange-700">{formatCurrency(totals.totalNetClinic)}</p>
              </div>
            </div>
          </div>

          {/* Lista de médicos e quantidades */}
          {selectedDoctor === 'all' && (
            <div className="mb-6">
              <h3 className="font-semibold text-gray-800 mb-2">Médicos incluídos:</h3>
              <div className="flex flex-wrap gap-2">
                {Object.keys(movementsByDoctor()).sort().map(doctor => (
                  <span key={doctor} className="px-3 py-1 bg-gray-100 rounded-full text-sm">
                    {doctor} ({movementsByDoctor()[doctor].length})
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Botões */}
          <div className="flex gap-3">
            <button
              onClick={generatePDF}
              disabled={generating || filteredMovements.length === 0}
              className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download size={20} />
              {generating ? 'Gerando PDF...' : 'Gerar Relatório PDF'}
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 transition flex items-center justify-center gap-2 font-semibold"
            >
              Cancelar
            </button>
          </div>

          {filteredMovements.length === 0 && (
            <p className="text-center text-red-500 text-sm mt-4">
              Nenhum movimento encontrado com os filtros selecionados.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
