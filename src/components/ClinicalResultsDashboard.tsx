import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { TrendingUp, TrendingDown, DollarSign, Percent } from 'lucide-react';

export default function ClinicalResultsDashboard() {
  const [summary, setSummary] = useState({
    totalGross: 0,
    totalDoctorRepasses: 0,
    totalPaymentTaxes: 0,
    totalInvoiceTaxes: 0,
    totalDirectCosts: 0,
    totalNetClinic: 0,
    effectiveMargin: 0
  });

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('clinical_financial_movements')
      .select('*')
      .eq('user_id', user.id);

    if (error) {
      console.error('Erro:', error);
      return;
    }

    const totals = data.reduce((acc, curr) => ({
      totalGross: acc.totalGross + curr.gross_value,
      totalDoctorRepasses: acc.totalDoctorRepasses + curr.doctor_amount,
      totalPaymentTaxes: acc.totalPaymentTaxes + (curr.payment_tax_amount || 0),
      totalInvoiceTaxes: acc.totalInvoiceTaxes + (curr.invoice_tax_amount || 0),
      totalDirectCosts: acc.totalDirectCosts + (curr.medication_cost + curr.supplies_cost + curr.other_costs),
      totalNetClinic: acc.totalNetClinic + curr.net_clinic_value
    }), {
      totalGross: 0,
      totalDoctorRepasses: 0,
      totalPaymentTaxes: 0,
      totalInvoiceTaxes: 0,
      totalDirectCosts: 0,
      totalNetClinic: 0
    });

    const effectiveMargin = totals.totalGross > 0 
      ? (totals.totalNetClinic / totals.totalGross) * 100 
      : 0;

    setSummary({ ...totals, effectiveMargin });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-gray-600">Faturamento Bruto</p>
          <DollarSign className="text-blue-500" size={20} />
        </div>
        <p className="text-2xl font-bold">{formatCurrency(summary.totalGross)}</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-gray-600">Repasses Médicos</p>
          <TrendingDown className="text-red-500" size={20} />
        </div>
        <p className="text-2xl font-bold text-red-600">-{formatCurrency(summary.totalDoctorRepasses)}</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-gray-600">Custos Totais</p>
          <TrendingDown className="text-orange-500" size={20} />
        </div>
        <p className="text-2xl font-bold text-orange-600">
          -{formatCurrency(summary.totalPaymentTaxes + summary.totalInvoiceTaxes + summary.totalDirectCosts)}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Taxas: {formatCurrency(summary.totalPaymentTaxes)} | 
          Impostos: {formatCurrency(summary.totalInvoiceTaxes)} | 
          Custos: {formatCurrency(summary.totalDirectCosts)}
        </p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-gray-600">Resultado Líquido Clínica</p>
          <TrendingUp className="text-green-500" size={20} />
        </div>
        <p className="text-2xl font-bold text-green-600">{formatCurrency(summary.totalNetClinic)}</p>
        <p className="text-sm text-gray-500">Margem: {summary.effectiveMargin.toFixed(1)}%</p>
      </div>
    </div>
  );
}
