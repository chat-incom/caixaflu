import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Calculator, TrendingUp, TrendingDown, DollarSign, Pill, Package } from 'lucide-react';
import { calculateClinicalFinance, PROCEDURE_TYPES, getPaymentTaxRates } from '../utils/clinicalCalculations';

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
    observations: '',
    cashSettlementType: 'left_at_clinic' // 'doctor_took' ou 'left_at_clinic'
  });

  const [loading, setLoading] = useState(false);

  const paymentTaxRates = getPaymentTaxRates();

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
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

      const hasMedication = (parseFloat(formData.medicationCost) || 0) > 0;
      const hasOtherCosts = (parseFloat(formData.otherCosts) || 0) > 0;

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
          observations: formData.observations || null,
          cash_settlement_type: formData.paymentMethod === 'cash' ? formData.cashSettlementType : null,
          has_medication: hasMedication,
          has_other_costs: hasOtherCosts
        });

      if (movementError) throw movementError;

      // Criar transações no sistema financeiro
      // 1. Receita bruta total
      await supabase.from('transactions').insert({
        user_id: user.id,
        type: 'income',
        amount: preview.grossValue,
        description: `📋 ${formData.procedureType} - Dr. ${formData.doctorName}${formData.patientName ? ` (${formData.patientName})` : ''}`,
        payment_method: formData.paymentMethod,
        category: 'repasse_medico',
        date: formData.date,
        reference_month: formData.date.substring(0, 7),
        income_category: 'consultorio'
      });

      // 2. Despesa: Repasse ao médico (apenas se o médico não levou o dinheiro em espécie)
      const shouldRecordDoctorExpense = !(formData.paymentMethod === 'cash' && formData.cashSettlementType === 'doctor_took');
      
      if (preview.doctorAmount > 0 && shouldRecordDoctorExpense) {
        await supabase.from('transactions').insert({
          user_id: user.id,
          type: 'expense',
          amount: preview.doctorAmount,
          description: `👨‍⚕️ Repasse médico - Dr. ${formData.doctorName} (${preview.doctorPercentage}% médico)`,
          payment_method: formData.paymentMethod,
          category: 'repasse_medico',
          date: formData.date,
          reference_month: formData.date.substring(0, 7),
          subcategory: 'repasse_medico'
        });
      }

      // 3. Despesa: Taxas de cartão
      if (preview.paymentTaxAmount > 0) {
        await supabase.from('transactions').insert({
          user_id: user.id,
          type: 'expense',
          amount: preview.paymentTaxAmount,
          description: `💳 Taxa ${paymentTaxRates[formData.paymentMethod as keyof typeof paymentTaxRates]?.label} - ${formData.procedureType}`,
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
          description: `📄 Impostos (ISS/Nota Fiscal) - ${formData.procedureType}`,
          payment_method: formData.paymentMethod,
          category: 'imposto',
          date: formData.date,
          reference_month: formData.date.substring(0, 7)
        });
      }

      const clinicPercentage = 100 - preview.doctorPercentage;
      const settlementMessage = formData.paymentMethod === 'cash' && formData.cashSettlementType === 'doctor_took' 
        ? '\n💰 Médico levou o dinheiro em espécie' 
        : '';

      alert(`✅ Movimento registrado com sucesso!\n\n` +
        `💰 Valor bruto: ${formatCurrency(preview.grossValue)}\n` +
        `🏥 Clínica (${clinicPercentage}%): ${formatCurrency(preview.clinicShareBeforeCosts)}\n` +
        `📉 Deduções: -${formatCurrency(preview.totalDeductions)}\n` +
        `✨ Líquido clínica: ${formatCurrency(preview.netClinicValue)}${settlementMessage}`);
      
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
        observations: '',
        cashSettlementType: 'left_at_clinic'
      });
      
    } catch (error) {
      console.error('Erro detalhado:', error);
      alert('❌ Erro ao registrar movimento. Verifique o console para mais detalhes.');
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

  const preview = calculatePreview();
  const procedure = PROCEDURE_TYPES.find(p => p.value === formData.procedureType);
  const clinicPercentage = procedure ? 100 - procedure.doctorPercentage : 0;

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          Registro Financeiro Clínica
        </h2>
        <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
          Clínica fica com {clinicPercentage}%
        </div>
      </div>

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
                {p.label} - {p.doctorPercentage}% médico / {100 - p.doctorPercentage}% clínica
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Valor Bruto do Procedimento *
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

        {/* Opção para pagamento em dinheiro */}
        {formData.paymentMethod === 'cash' && (
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              💵 O que aconteceu com o dinheiro?
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="left_at_clinic"
                  checked={formData.cashSettlementType === 'left_at_clinic'}
                  onChange={(e) => handleInputChange('cashSettlementType', e.target.value)}
                  className="text-blue-600"
                />
                <span>Médico deixou na clínica (fazer repasse depois)</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="doctor_took"
                  checked={formData.cashSettlementType === 'doctor_took'}
                  onChange={(e) => handleInputChange('cashSettlementType', e.target.value)}
                  className="text-blue-600"
                />
                <span>Médico levou o dinheiro no dia</span>
              </label>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {formData.cashSettlementType === 'doctor_took' 
                ? '✅ O repasse não será registrado como despesa pois o médico já retirou o valor'
                : '💰 O valor será registrado como despesa de repasse médico'}
            </p>
          </div>
        )}

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
      </div>

      {/* Custos Diretos com indicadores visuais */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <Package size={18} />
          Custos Diretos (Opcional)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
              <Pill size={16} className="text-blue-500" />
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
            {parseFloat(formData.medicationCost) > 0 && (
              <span className="absolute right-2 top-8 text-xs text-blue-600">💊</span>
            )}
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

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Observações
        </label>
        <textarea
          value={formData.observations}
          onChange={(e) => handleInputChange('observations', e.target.value)}
          rows={2}
          className="w-full px-3 py-2 border rounded-md"
          placeholder="Observações adicionais..."
        />
      </div>

      {/* Preview do Cálculo */}
      {preview && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 mb-6">
          <h3 className="font-bold text-lg text-gray-800 mb-4 flex items-center gap-2">
            <Calculator className="text-blue-600" />
            Demonstrativo Financeiro
          </h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="border-b border-blue-200 pb-2">
                <p className="text-sm text-gray-600">Valor Bruto</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(preview.grossValue)}
                </p>
              </div>
              
              <div>
                <p className="text-sm text-gray-600 mb-2">Distribuição:</p>
                <div className="space-y-1 ml-4">
                  <p className="text-sm">
                    <span className="font-semibold text-blue-700">Médico ({preview.doctorPercentage}%):</span>{' '}
                    {formatCurrency(preview.doctorAmount)}
                    {formData.paymentMethod === 'cash' && formData.cashSettlementType === 'doctor_took' && (
                      <span className="ml-2 text-xs text-green-600">(✅ levou no dia)</span>
                    )}
                  </p>
                  <p className="text-sm">
                    <span className="font-semibold text-green-700">Clínica ({100 - preview.doctorPercentage}%):</span>{' '}
                    {formatCurrency(preview.clinicShareBeforeCosts)}
                  </p>
                </div>
              </div>

              {(preview.paymentTaxAmount > 0 || preview.invoiceTaxAmount > 0 || 
                preview.medicationCost > 0 || preview.suppliesCost > 0 || preview.otherCosts > 0) && (
                <div>
                  <p className="text-sm text-gray-600 mb-2">Deduções da Clínica:</p>
                  <div className="space-y-1 ml-4">
                    {preview.paymentTaxAmount > 0 && (
                      <p className="text-sm text-red-600">
                        Taxa Cartão: -{formatCurrency(preview.paymentTaxAmount)}
                      </p>
                    )}
                    {preview.invoiceTaxAmount > 0 && (
                      <p className="text-sm text-red-600">
                        Impostos: -{formatCurrency(preview.invoiceTaxAmount)}
                      </p>
                    )}
                    {preview.medicationCost > 0 && (
                      <p className="text-sm text-orange-600">💊 Medicação: -{formatCurrency(preview.medicationCost)}</p>
                    )}
                    {preview.suppliesCost > 0 && (
                      <p className="text-sm text-orange-600">📦 Insumos: -{formatCurrency(preview.suppliesCost)}</p>
                    )}
                    {preview.otherCosts > 0 && (
                      <p className="text-sm text-orange-600">📋 Outros: -{formatCurrency(preview.otherCosts)}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <div className="bg-white rounded-lg p-4 shadow-inner">
              <p className="text-sm text-gray-600 mb-1">Total de Deduções</p>
              <p className="text-xl font-bold text-red-600 mb-3">
                -{formatCurrency(preview.totalDeductions)}
              </p>
              
              <div className="border-t pt-3">
                <p className="text-sm text-green-600 font-semibold mb-1">
                  Resultado LÍQUIDO para Clínica:
                </p>
                <p className="text-3xl font-bold text-green-700">
                  {formatCurrency(preview.netClinicValue)}
                </p>
                <div className="mt-2 p-2 bg-green-50 rounded">
                  <p className="text-xs text-gray-600">
                    Percentual efetivo sobre valor bruto: 
                    <span className="font-bold text-green-700 ml-1">
                      {preview.effectiveClinicPercentage.toFixed(1)}%
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-green-600 text-white py-3 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 font-semibold text-lg"
      >
        {loading ? 'Registrando...' : '💰 Registrar Movimento Financeiro'}
      </button>
    </form>
  );
}
