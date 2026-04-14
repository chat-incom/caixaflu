// ClinicalFinancialForm.tsx
import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Calculator, TrendingUp, TrendingDown } from 'lucide-react';
import { calculateClinicalFinance, getPaymentTaxRates } from '../utils/clinicalCalculations';

const PROCEDURE_TYPES = [
  { value: 'Consulta', label: 'Consulta', doctorPercentage: 20 },
  { value: 'Infiltrações', label: 'Infiltrações', doctorPercentage: 40 },
  { value: 'Onda de Choque', label: 'Onda de Choque', doctorPercentage: 30 },
  { value: 'Cirurgia Particular', label: 'Cirurgia Particular', doctorPercentage: 2 },
  { value: 'Médico Parceiro', label: 'Médico Parceiro', doctorPercentage: 50 }
];

export default function ClinicalFinancialForm({ onSuccess }: { onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    doctorName: '',
    patientName: '',
    procedureType: 'Consulta',
    grossValue: '',
    paymentMethod: 'pix',
    paymentTaxRate: 0,
    invoiceTaxRate: 0,
    medicationCost: '',
    suppliesCost: '',
    otherCosts: '',
    otherCostsDescription: '',
    installments: '1',
    observations: ''
  });

  const [calculation, setCalculation] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const paymentTaxRates = getPaymentTaxRates();

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Auto-update tax rate when payment method changes
    if (field === 'paymentMethod') {
      const rate = paymentTaxRates[value as keyof typeof paymentTaxRates]?.defaultRate || 0;
      setFormData(prev => ({ ...prev, paymentTaxRate: rate }));
    }
  };

  const calculatePreview = () => {
    const procedure = PROCEDURE_TYPES.find(p => p.value === formData.procedureType);
    if (!procedure || !formData.grossValue) return null;

    const grossValueNum = parseFloat(formData.grossValue);
    if (isNaN(grossValueNum)) return null;

    return calculateClinicalFinance(
      grossValueNum,
      procedure.doctorPercentage,
      formData.paymentMethod,
      formData.paymentTaxRate,
      formData.invoiceTaxRate,
      parseFloat(formData.medicationCost) || 0,
      parseFloat(formData.suppliesCost) || 0,
      parseFloat(formData.otherCosts) || 0
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const preview = calculatePreview();
    if (!preview) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      // Inserir movimento financeiro
      const { error: movementError } = await supabase
        .from('clinical_financial_movements')
        .insert({
          user_id: user.id,
          date: formData.date,
          doctor_name: formData.doctorName,
          patient_name: formData.patientName || null,
          procedure_type: formData.procedureType,
          reference_month: formData.date.substring(0, 7),
          gross_value: preview.grossValue,
          doctor_percentage: preview.doctorPercentage,
          doctor_amount: preview.doctorAmount,
          clinic_share_before_costs: preview.clinicShareBeforeCosts,
          payment_method: formData.paymentMethod,
          payment_tax_rate: preview.paymentTaxRate,
          payment_tax_amount: preview.paymentTaxAmount,
          invoice_tax_rate: preview.invoiceTaxRate,
          invoice_tax_amount: preview.invoiceTaxAmount,
          medication_cost: preview.medicationCost,
          supplies_cost: preview.suppliesCost,
          other_costs: preview.otherCosts,
          other_costs_description: formData.otherCostsDescription || null,
          total_deductions: preview.totalDeductions,
          net_clinic_value: preview.netClinicValue,
          installments: parseInt(formData.installments),
          observations: formData.observations || null
        });

      if (movementError) throw movementError;

      // Criar transações no sistema financeiro
      // 1. Receita bruta
      await supabase.from('transactions').insert({
        user_id: user.id,
        type: 'income',
        amount: preview.grossValue,
        description: `Procedimento: ${formData.procedureType} - Dr. ${formData.doctorName}`,
        payment_method: formData.paymentMethod,
        category: 'repasse_medico',
        date: formData.date,
        reference_month: formData.date.substring(0, 7),
        income_category: 'consultorio'
      });

      // 2. Despesa: Repasse médico
      await supabase.from('transactions').insert({
        user_id: user.id,
        type: 'expense',
        amount: preview.doctorAmount,
        description: `Repasse médico - Dr. ${formData.doctorName}`,
        payment_method: formData.paymentMethod,
        category: 'repasse_medico',
        date: formData.date,
        reference_month: formData.date.substring(0, 7),
        subcategory: 'repasse_medico'
      });

      // 3. Despesa: Taxas de cartão
      if (preview.paymentTaxAmount > 0) {
        await supabase.from('transactions').insert({
          user_id: user.id,
          type: 'expense',
          amount: preview.paymentTaxAmount,
          description: `Taxa ${paymentTaxRates[formData.paymentMethod as keyof typeof paymentTaxRates]?.label}`,
          payment_method: formData.paymentMethod,
          category: 'variable',
          date: formData.date,
          reference_month: formData.date.substring(0, 7),
          subcategory: 'taxas'
        });
      }

      // 4. Despesa: Impostos
      if (preview.invoiceTaxAmount > 0) {
        await supabase.from('transactions').insert({
          user_id: user.id,
          type: 'expense',
          amount: preview.invoiceTaxAmount,
          description: 'Impostos (ISS/Nota Fiscal)',
          payment_method: formData.paymentMethod,
          category: 'imposto',
          date: formData.date,
          reference_month: formData.date.substring(0, 7)
        });
      }

      alert('Movimento registrado com sucesso!');
      onSuccess();
      
      // Reset form
      setFormData({
        date: new Date().toISOString().split('T')[0],
        doctorName: '',
        patientName: '',
        procedureType: 'Consulta',
        grossValue: '',
        paymentMethod: 'pix',
        paymentTaxRate: 0,
        invoiceTaxRate: 0,
        medicationCost: '',
        suppliesCost: '',
        otherCosts: '',
        otherCostsDescription: '',
        installments: '1',
        observations: ''
      });
      
    } catch (error) {
      console.error('Erro:', error);
      alert('Erro ao registrar movimento');
    } finally {
      setLoading(false);
    }
  };

  const preview = calculatePreview();

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">
        Registro Financeiro Clínica
      </h2>

      {/* Dados Básicos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Data *
          </label>
          <input
            type="date"
            value={formData.date}
            onChange={(e) => handleInputChange('date', e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Médico *
          </label>
          <input
            type="text"
            value={formData.doctorName}
            onChange={(e) => handleInputChange('doctorName', e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
            required
            placeholder="Nome do médico"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Paciente
          </label>
          <input
            type="text"
            value={formData.patientName}
            onChange={(e) => handleInputChange('patientName', e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
            placeholder="Nome do paciente (opcional)"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Procedimento *
          </label>
          <select
            value={formData.procedureType}
            onChange={(e) => handleInputChange('procedureType', e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
            required
          >
            {PROCEDURE_TYPES.map(p => (
              <option key={p.value} value={p.value}>
                {p.label} ({p.doctorPercentage}% para médico)
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Valor Bruto *
          </label>
          <input
            type="number"
            step="0.01"
            value={formData.grossValue}
            onChange={(e) => handleInputChange('grossValue', e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
            placeholder="0,00"
            required
          />
        </div>
      </div>

      {/* Taxas e Impostos */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-gray-800 mb-3">Taxas e Impostos</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Método de Pagamento *
            </label>
            <select
              value={formData.paymentMethod}
              onChange={(e) => handleInputChange('paymentMethod', e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              required
            >
              {Object.entries(paymentTaxRates).map(([key, value]) => (
                <option key={key} value={key}>{value.label}</option>
              ))}
            </select>
          </div>

          {formData.paymentMethod !== 'cash' && formData.paymentMethod !== 'pix' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Taxa da Operadora (%)
              </label>
              <select
                value={formData.paymentTaxRate}
                onChange={(e) => handleInputChange('paymentTaxRate', parseFloat(e.target.value))}
                className="w-full px-3 py-2 border rounded-md"
              >
                {paymentTaxRates[formData.paymentMethod as keyof typeof paymentTaxRates]?.rates.map(rate => (
                  <option key={rate} value={rate}>{rate}%</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Alíquota de Imposto (ISS, etc) %
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.invoiceTaxRate}
              onChange={(e) => handleInputChange('invoiceTaxRate', parseFloat(e.target.value))}
              className="w-full px-3 py-2 border rounded-md"
              placeholder="Ex: 5%"
            />
          </div>

          {formData.paymentMethod === 'Parcelado' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Número de Parcelas
              </label>
              <select
                value={formData.installments}
                onChange={(e) => handleInputChange('installments', e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map(num => (
                  <option key={num} value={num}>{num}x</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Custos Diretos */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-gray-800 mb-3">Custos Diretos</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Custo com Medicação
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.medicationCost}
              onChange={(e) => handleInputChange('medicationCost', e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              placeholder="0,00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Custo com Insumos
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.suppliesCost}
              onChange={(e) => handleInputChange('suppliesCost', e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              placeholder="0,00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Outros Custos
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.otherCosts}
              onChange={(e) => handleInputChange('otherCosts', e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              placeholder="0,00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descrição Outros Custos
            </label>
            <input
              type="text"
              value={formData.otherCostsDescription}
              onChange={(e) => handleInputChange('otherCostsDescription', e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              placeholder="Ex: Material de consumo"
            />
          </div>
        </div>
      </div>

      {/* Preview do Cálculo */}
      {preview && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 mb-6">
          <h3 className="font-bold text-lg text-gray-800 mb-4 flex items-center gap-2">
            <Calculator className="text-blue-600" />
            Demonstrativo Financeiro
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="text-sm text-gray-600">Valor Bruto</p>
              <p className="text-2xl font-bold text-gray-900">
                R$ {preview.grossValue.toFixed(2)}
              </p>
              
              <div className="border-t pt-2 mt-2">
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <TrendingDown size={16} />
                  Deduções:
                </p>
                <p className="text-sm ml-4">• Repasse Médico ({preview.doctorPercentage}%): -R$ {preview.doctorAmount.toFixed(2)}</p>
                {preview.paymentTaxAmount > 0 && (
                  <p className="text-sm ml-4">• Taxa Cartão ({preview.paymentTaxRate}%): -R$ {preview.paymentTaxAmount.toFixed(2)}</p>
                )}
                {preview.invoiceTaxAmount > 0 && (
                  <p className="text-sm ml-4">• Impostos ({preview.invoiceTaxRate}%): -R$ {preview.invoiceTaxAmount.toFixed(2)}</p>
                )}
                {preview.medicationCost > 0 && (
                  <p className="text-sm ml-4">• Medicação: -R$ {preview.medicationCost.toFixed(2)}</p>
                )}
                {preview.suppliesCost > 0 && (
                  <p className="text-sm ml-4">• Insumos: -R$ {preview.suppliesCost.toFixed(2)}</p>
                )}
                {preview.otherCosts > 0 && (
                  <p className="text-sm ml-4">• Outros: -R$ {preview.otherCosts.toFixed(2)}</p>
                )}
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Total de Deduções</p>
              <p className="text-xl font-bold text-red-600 mb-3">
                -R$ {preview.totalDeductions.toFixed(2)}
              </p>
              
              <div className="border-t pt-3">
                <p className="text-sm text-green-600 flex items-center gap-1 mb-1">
                  <TrendingUp size={16} />
                  Resultado para Clínica:
                </p>
                <p className="text-3xl font-bold text-green-700">
                  R$ {preview.netClinicValue.toFixed(2)}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Percentual efetivo: {preview.effectiveClinicPercentage.toFixed(1)}%
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  Participação clínica antes custos: R$ {preview.clinicShareBeforeCosts.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Observações
        </label>
        <textarea
          value={formData.observations}
          onChange={(e) => handleInputChange('observations', e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border rounded-md"
          placeholder="Observações adicionais..."
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
      >
        {loading ? 'Registrando...' : 'Registrar Movimento'}
      </button>
    </form>
  );
}
