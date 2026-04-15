// src/components/ClinicalReport.tsx
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Calendar, User, X, Printer } from 'lucide-react';

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
  const reportRef = useRef<HTMLDivElement>(null);

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

  const handlePrint = () => {
    const printContent = reportRef.current?.innerHTML;
    const originalTitle = document.title;
    
    if (printContent) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Relatório de Repasses Médicos</title>
              <meta charset="utf-8">
              <style>
                body {
                  font-family: Arial, sans-serif;
                  margin: 40px;
                  padding: 0;
                  font-size: 12px;
                }
                .header {
                  text-align: center;
                  margin-bottom: 30px;
                }
                .header h1 {
                  font-size: 18px;
                  margin-bottom: 10px;
                }
                .header p {
                  margin: 5px 0;
                  color: #666;
                }
                .doctor-section {
                  margin-bottom: 30px;
                  page-break-inside: avoid;
                }
                .doctor-title {
                  font-size: 14px;
                  font-weight: bold;
                  margin-bottom: 10px;
                  padding-bottom: 5px;
                  border-bottom: 2px solid #333;
                }
                .doctor-summary {
                  margin-bottom: 10px;
                  font-size: 11px;
                  color: #555;
                }
                table {
                  width: 100%;
                  border-collapse: collapse;
                  margin-bottom: 20px;
                }
                th {
                  background-color: #2c3e50;
                  color: white;
                  padding: 8px;
                  text-align: left;
                  font-size: 11px;
                }
                td {
                  padding: 6px 8px;
                  border-bottom: 1px solid #ddd;
                  font-size: 10px;
                }
                .text-right {
                  text-align: right;
                }
                .text-center {
                  text-align: center;
                }
                .footer {
                  text-align: center;
                  margin-top: 40px;
                  padding-top: 20px;
                  border-top: 1px solid #ccc;
                  font-size: 9px;
                  color: #999;
                }
                @media print {
                  body {
                    margin: 20px;
                  }
                  .no-print {
                    display: none;
                  }
                }
              </style>
            </head>
            <body>
              ${printContent}
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
        printWindow.close();
      }
    }
  };

  const grouped = movementsByDoctor();
  const doctors = Object.keys(grouped).sort();
  
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
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Relatório de Repasses Médicos</h2>
            <p className="text-sm text-gray-500 mt-1">Selecione os filtros e gere o relatório</p>
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

          {/* Conteúdo do Relatório */}
          <div ref={reportRef} className="report-content">
            {/* Cabeçalho */}
            <div className="header text-center mb-6">
              <h1 className="text-xl font-bold">RELATÓRIO DE REPASSES MÉDICOS</h1>
              <p className="text-gray-600">
                {selectedMonth !== 'all' ? `Mês: ${formatMonth(selectedMonth)}` : 'Período: Todos os meses'}
              </p>
              <p className="text-gray-600">
                {selectedDoctor !== 'all' ? `Médico: ${selectedDoctor}` : 'Todos os médicos'}
              </p>
              <p className="text-gray-500 text-sm">
                Data de emissão: {new Date().toLocaleDateString('pt-BR')}
              </p>
            </div>

            {/* Resumo Geral */}
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <h3 className="font-semibold text-gray-800 mb-2">Resumo Geral</h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-sm text-gray-600">Médicos</p>
                  <p className="text-xl font-bold text-blue-600">{doctors.length}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Procedimentos</p>
                  <p className="text-xl font-bold text-green-600">{totals.totalCount}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Líquido</p>
                  <p className="text-xl font-bold text-orange-600">{formatCurrency(totals.totalNetClinic)}</p>
                </div>
              </div>
            </div>

            {/* Detalhes por Médico */}
            {doctors.map(doctorName => {
              const doctorMovements = grouped[doctorName];
              const totalGross = doctorMovements.reduce((sum, m) => sum + m.gross_value, 0);
              const totalNet = doctorMovements.reduce((sum, m) => sum + m.net_clinic_value, 0);
              
              return (
                <div key={doctorName} className="doctor-section mb-6">
                  <div className="doctor-title">
                    <h3 className="font-bold text-gray-800">Médico: {doctorName}</h3>
                  </div>
                  <div className="doctor-summary flex gap-4 text-sm text-gray-600 mb-3">
                    <span>Procedimentos: {doctorMovements.length}</span>
                    <span>Total Bruto: {formatCurrency(totalGross)}</span>
                    <span>Total Líquido: {formatCurrency(totalNet)}</span>
                  </div>
                  
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th className="text-left">Data</th>
                        <th className="text-left">Procedimento</th>
                        <th className="text-left">Paciente</th>
                        <th className="text-right">Valor</th>
                        <th className="text-center">% Médico</th>
                        <th className="text-center">Dinheiro</th>
                        <th className="text-right">Líquido Clínica</th>
                      </tr>
                    </thead>
                    <tbody>
                      {doctorMovements.map(m => (
                        <tr key={m.id}>
                          <td>{formatDate(m.date)}</td>
                          <td>{m.procedure_type}</td>
                          <td>{m.patient_name || '-'}</td>
                          <td className="text-right">{formatCurrency(m.gross_value)}</td>
                          <td className="text-center">{m.doctor_percentage}%</td>
                          <td className="text-center">
                            {m.cash_settlement_type === 'doctor_took' ? 'Médico levou' : 'Clínica'}
                          </td>
                          <td className="text-right font-bold text-green-600">
                            {formatCurrency(m.net_clinic_value)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>

          {/* Botões */}
          <div className="flex gap-3 mt-6 pt-4 border-t border-gray-200">
            <button
              onClick={handlePrint}
              disabled={filteredMovements.length === 0}
              className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Printer size={20} />
              Imprimir / Salvar PDF
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 transition flex items-center justify-center gap-2 font-semibold"
            >
              Fechar
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
