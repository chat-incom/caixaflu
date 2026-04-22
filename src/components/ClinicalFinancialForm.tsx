// src/components/ClinicalFinancialForm.tsx

import { useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Calculator, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Pill, 
  Package, 
  CreditCard, 
  Banknote,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { 
  calculateClinicalFinance, 
  PROCEDURE_TYPES, 
  getPaymentTaxRates,
  formatCurrency 
} from '../utils/clinicalCalculations';

// Mapeamento de métodos de pagamento para o banco
const PAYMENT_METHOD_MAP: Record<string, string> = {
  credit: 'credit_card',
  debit: 'debit_card',
  pix: 'pix',
  cash: 'cash',
  deposit: 'deposito',
  mixed: 'mixed'
};

interface FormData {
  date: string;
  doctorName: string;
  patientName: string;
  procedureType: string;
  grossValue: string;
  paymentMethod: string;
  paymentTaxRate: number;
  invoiceTaxRate: number;
  medicationCost: string;
  suppliesCost: string;
  otherCosts: string;
  otherCostsDescription: string;
  installments: string;
  observations: string;
  cashSettlementType: string;
  isSplitPayment: boolean;
  cashAmount: string;
  otherPaymentMethod: string;
  otherPaymentTaxRate: number;
}

const INITIAL_FORM_STATE: FormData = {
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
  cashSettlementType: 'left_at_clinic',
  isSplitPayment: false,
  cashAmount: '',
  otherPaymentMethod: 'pix',
  otherPaymentTaxRate: 0
};

export default function ClinicalFinancialForm({ onSuccess }: { onSuccess: () => void }) {
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_STATE);
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastPreview, setLastPreview] = useState<any>(null);
  
  const paymentTaxRates = getPaymentTaxRates();

  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Auto ajustar taxas quando método de pagamento mudar
    if (field === 'paymentMethod') {
      const rate = paymentTaxRates[value as keyof typeof paymentTaxRates]?.defaultRate || 0;
      setFormData(prev => ({ ...prev, paymentTaxRate: rate }));
    }
    
    if (field === 'otherPaymentMethod') {
      const rate = paymentTaxRates[value as keyof typeof paymentTaxRates]?.defaultRate || 0;
      setFormData(prev => ({ ...prev, otherPaymentTaxRate: rate }));
    }
  };

  const calculatePreview = useMemo(() => {
    const procedure = PROCEDURE_TYPES.find(p => p.value === formData.procedureType);
    if (!procedure || !formData.grossValue) return null;

    const grossValueNum = parseFloat(formData.grossValue);
    if (isNaN(grossValueNum) || grossValueNum <= 0) return null;

    // Determinar método de pagamento e configurações
    let effectivePaymentMethod = formData.paymentMethod;
    let effectiveTaxRate = formData.paymentTaxRate;
    let cashAmount: number | undefined = undefined;
    let otherMethod: string | undefined = undefined;

    if (formData.isSplitPayment && formData.cashAmount) {
      const cashAmountNum = parseFloat(formData.cashAmount);
      if (!isNaN(cashAmountNum) && cashAmountNum > 0 && cashAmountNum < grossValueNum) {
        cashAmount = cashAmountNum;
        otherMethod = formData.otherPaymentMethod;
        effectivePaymentMethod = 'mixed';
        effectiveTaxRate = formData.otherPaymentTaxRate;
      }
    }

    return calculateClinicalFinance(
      grossValueNum,
      procedure.doctorPercentage,
      effectivePaymentMethod,
      effectiveTaxRate,
      formData.invoiceTaxRate,
      parseFloat(formData.medicationCost) || 0,
      parseFloat(formData.suppliesCost) || 0,
      parseFloat(formData.otherCosts) || 0,
      cashAmount,
      otherMethod
    );
  }, [
    formData.procedureType,
    formData.grossValue,
    formData.paymentMethod,
    formData.paymentTaxRate,
    formData.invoiceTaxRate,
    formData.medicationCost,
    formData.suppliesCost,
    formData.otherCosts,
    formData.isSplitPayment,
    formData.cashAmount,
    formData.otherPaymentMethod,
    formData.otherPaymentTaxRate
  ]);

  const validateFormData = (): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    // Validação do médico
    if (!formData.doctorName.trim()) {
      errors.push('Nome do médico é obrigatório');
    }
    
    // Validação do valor bruto
    const grossValueNum = parseFloat(formData.grossValue);
    if (isNaN(grossValueNum) || grossValueNum <= 0) {
      errors.push('Valor bruto deve ser maior que zero');
    }
    if (grossValueNum > 1000000) {
      errors.push('Valor bruto excede o limite máximo de R$ 1.000.000');
    }
    
    // Validação de pagamento misto
    if (formData.isSplitPayment && formData.cashAmount) {
      const cashAmountNum = parseFloat(formData.cashAmount);
      const otherAmountNum = grossValueNum - cashAmountNum;
      
      if (isNaN(cashAmountNum) || cashAmountNum <= 0) {
        errors.push('Valor em dinheiro deve ser maior que zero');
      }
      
      if (cashAmountNum > grossValueNum) {
        errors.push('Valor em dinheiro não pode ser maior que o valor total');
      }
      
      if (otherAmountNum < 0) {
        errors.push('Valor da outra forma de pagamento não pode ser negativo');
      }
      
      if (cashAmountNum === grossValueNum) {
        errors.push('Para pagamento misto, o valor em dinheiro não pode ser igual ao total. Use pagamento em dinheiro comum.');
      }
    }
    
    // Validação de taxas
    if (formData.paymentMethod !== 'cash' && formData.paymentMethod !== 'pix') {
      if (formData.paymentTaxRate < 0 || formData.paymentTaxRate > 100) {
        errors.push('Taxa de pagamento deve estar entre 0 e 100%');
      }
    }
    
    if (formData.invoiceTaxRate < 0 || formData.invoiceTaxRate > 100) {
      errors.push('Taxa de imposto deve estar entre 0 e 100%');
    }
    
    // Validação de custos
    const totalCosts = (parseFloat(formData.medicationCost) || 0) + 
                      (parseFloat(formData.suppliesCost) || 0) + 
                      (parseFloat(formData.otherCosts) || 0);
    
    if (totalCosts > grossValueNum) {
      errors.push('Total de custos não pode ser maior que o valor bruto');
    }
    
    return { isValid: errors.length === 0, errors };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = validateFormData();
    if (!validation.isValid) {
      alert(`❌ Erros de validação:\n${validation.errors.join('\n')}`);
      return;
    }
    
    if (!calculatePreview) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      const hasMedication = (parseFloat(formData.medicationCost) || 0) > 0;
      const hasOtherCosts = (parseFloat(formData.otherCosts) || 0) > 0;
      
      // Determinar método de pagamento final
      let finalPaymentMethod = formData.paymentMethod;
      let finalTaxRate = formData.paymentTaxRate;
      let isSplitPayment = false;
      
      if (formData.isSplitPayment && formData.cashAmount) {
        const cashAmountNum = parseFloat(formData.cashAmount);
        const grossValueNum = parseFloat(formData.grossValue);
        
        if (cashAmountNum > 0 && cashAmountNum < grossValueNum) {
          finalPaymentMethod = 'mixed';
          finalTaxRate = formData.otherPaymentTaxRate;
          isSplitPayment = true;
        }
      }
      
      const mappedPaymentMethod = PAYMENT_METHOD_MAP[finalPaymentMethod] || finalPaymentMethod;
      
      // Calcular valores detalhados para pagamento misto
      let cashPaymentAmount = null;
      let otherPaymentAmount = null;
      let otherPaymentMethodType = null;
      
      if (isSplitPayment && formData.cashAmount) {
        cashPaymentAmount = parseFloat(formData.cashAmount);
        otherPaymentAmount = parseFloat(formData.grossValue) - cashPaymentAmount;
        otherPaymentMethodType = formData.otherPaymentMethod;
      }

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
          gross_value: calculatePreview.grossValue,
          doctor_percentage: calculatePreview.doctorPercentage,
          doctor_amount: calculatePreview.doctorAmount,
          clinic_share_before_costs: calculatePreview.clinicShareBeforeCosts,
          payment_method: mappedPaymentMethod,
          payment_tax_rate: finalTaxRate,
          payment_tax_amount: calculatePreview.paymentTaxAmount,
          invoice_tax_rate: calculatePreview.invoiceTaxRate,
          invoice_tax_amount: calculatePreview.invoiceTaxAmount,
          medication_cost: calculatePreview.medicationCost,
          supplies_cost: calculatePreview.suppliesCost,
          other_costs: calculatePreview.otherCosts,
          other_costs_description: formData.otherCostsDescription || null,
          total_deductions: calculatePreview.totalDeductions,
          net_clinic_value: calculatePreview.clinicNetAfterCashAdjustment,
          installments: parseInt(formData.installments),
          observations: formData.observations || null,
          cash_settlement_type: (formData.paymentMethod === 'cash' || isSplitPayment) && 
            formData.cashSettlementType === 'doctor_took' ? 'doctor_took' : 'left_at_clinic',
          has_medication: hasMedication,
          has_other_costs: hasOtherCosts,
          is_split_payment: isSplitPayment,
          cash_payment_amount: cashPaymentAmount,
          other_payment_amount: otherPaymentAmount,
          other_payment_method: otherPaymentMethodType
        });

      if (movementError) throw movementError;

      // Salvar preview para o modal de sucesso
      setLastPreview(calculatePreview);
      setShowSuccessModal(true);
      
      onSuccess();
      resetForm();
      
    } catch (error) {
      console.error('Erro detalhado:', error);
      alert(`❌ Erro ao registrar movimento: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData(INITIAL_FORM_STATE);
  };

  const getCashSettlementMessage = () => {
    if (!calculatePreview) return '';
    
    const hasCash = formData.paymentMethod === 'cash' || formData.isSplitPayment;
    if (!hasCash || formData.cashSettlementType !== 'doctor_took') return '';
    
    let message = `💰 Médico levou em dinheiro: ${formatCurrency(calculatePreview.cashAmountUsed)}\n`;
    
    if (calculatePreview.doctorToReceiveLater > 0) {
      message += `📋 Médico receberá depois: ${formatCurrency(calculatePreview.doctorToReceiveLater)}\n`;
    }
    
    if (calculatePreview.cashAmountUsed > calculatePreview.doctorAmount) {
      const excess = calculatePreview.cashAmountUsed - calculatePreview.doctorAmount;
      message += `✨ Excedente para clínica: ${formatCurrency(excess)}\n`;
    }
    
    return message;
  };

  const procedure = PROCEDURE_TYPES.find(p => p.value === formData.procedureType);
  const clinicPercentage = procedure ? 100 - procedure.doctorPercentage : 0;

  return (
    <>
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">
            Registro Financeiro Clínica
          </h2>
          <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
            Registro Gerencial
          </div>
        </div>

        {/* Alerta informativo */}
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <p className="text-sm text-yellow-800 flex items-center gap-2">
            <AlertCircle size={18} />
            Este é um registro GERENCIAL para análise da clínica. 
            Não afeta o fluxo de caixa. Registre as transações financeiras reais na aba "Fluxo de Caixa".
          </p>
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
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="0,00"
              required
            />
          </div>

          {/* Opção de pagamento misto */}
          <div className="col-span-2">
            <label className="flex items-center gap-2 mb-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isSplitPayment}
                onChange={(e) => handleInputChange('isSplitPayment', e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">
                Pagamento dividido (parte em dinheiro + cartão/PIX)
              </span>
            </label>
          </div>

          {!formData.isSplitPayment ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Método de Pagamento *
              </label>
              <select
                value={formData.paymentMethod}
                onChange={(e) => handleInputChange('paymentMethod', e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                {Object.entries(paymentTaxRates).map(([key, value]) => (
                  <option key={key} value={key}>{value.label}</option>
                ))}
              </select>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                  <Banknote size={16} className="text-green-600" />
                  Valor em Dinheiro (médico leva no ato) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.cashAmount}
                  onChange={(e) => handleInputChange('cashAmount', e.target.value)}
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0,00"
                  required={formData.isSplitPayment}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Este valor será considerado como adiantamento ao médico
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                  <CreditCard size={16} className="text-blue-600" />
                  Outro Método (restante) *
                </label>
                <select
                  value={formData.otherPaymentMethod}
                  onChange={(e) => handleInputChange('otherPaymentMethod', e.target.value)}
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required={formData.isSplitPayment}
                >
                  <option value="credit">Cartão de Crédito</option>
                  <option value="debit">Cartão de Débito</option>
                  <option value="pix">PIX</option>
                  <option value="deposit">Depósito/Transferência</option>
                </select>
              </div>

              {formData.otherPaymentMethod !== 'pix' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Taxa do {paymentTaxRates[formData.otherPaymentMethod]?.label} (%)
                  </label>
                  <select
                    value={formData.otherPaymentTaxRate}
                    onChange={(e) => handleInputChange('otherPaymentTaxRate', parseFloat(e.target.value))}
                    className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {paymentTaxRates[formData.otherPaymentMethod as keyof typeof paymentTaxRates]?.rates.map(rate => (
                      <option key={rate} value={rate}>{rate}%</option>
                    ))}
                  </select>
                </div>
              )}
            </>
          )}

          {!formData.isSplitPayment && formData.paymentMethod !== 'cash' && formData.paymentMethod !== 'pix' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Taxa da Operadora (%)
              </label>
              <select
                value={formData.paymentTaxRate}
                onChange={(e) => handleInputChange('paymentTaxRate', parseFloat(e.target.value))}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {paymentTaxRates[formData.paymentMethod as keyof typeof paymentTaxRates]?.rates.map(rate => (
                  <option key={rate} value={rate}>{rate}%</option>
                ))}
              </select>
            </div>
          )}

          {(formData.paymentMethod === 'cash' || formData.isSplitPayment) && (
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                💵 Destino do dinheiro recebido:
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="left_at_clinic"
                    checked={formData.cashSettlementType === 'left_at_clinic'}
                    onChange={(e) => handleInputChange('cashSettlementType', e.target.value)}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span>Médico deixou na clínica (fazer repasse depois)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="doctor_took"
                    checked={formData.cashSettlementType === 'doctor_took'}
                    onChange={(e) => handleInputChange('cashSettlementType', e.target.value)}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span>Médico levou o dinheiro no dia</span>
                </label>
              </div>
              {formData.cashSettlementType === 'doctor_took' && (
                <div className="mt-2 p-2 bg-blue-50 rounded text-xs text-blue-700">
                  ⚠️ O valor em dinheiro será considerado como adiantamento ao médico e abatido do repasse
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Parcelas
            </label>
            <select
              value={formData.installments}
              onChange={(e) => handleInputChange('installments', e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {[1,2,3,4,5,6,7,8,9,10,11,12].map(num => (
                <option key={num} value={num}>{num}x</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Alíquota de Imposto (ISS, etc) %
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.invoiceTaxRate}
              onChange={(e) => handleInputChange('invoiceTaxRate', parseFloat(e.target.value))}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Ex: 5%"
            />
          </div>
        </div>

        {/* Custos Diretos */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <Package size={18} />
            Custos Diretos (Opcional)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                <Pill size={16} className="text-blue-500" />
                Custo com Medicação
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.medicationCost}
                onChange={(e) => handleInputChange('medicationCost', e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Observações adicionais..."
          />
        </div>

        {/* Preview do Cálculo */}
        {calculatePreview && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 mb-6">
            <h3 className="font-bold text-lg text-gray-800 mb-4 flex items-center gap-2">
              <Calculator className="text-blue-600" />
              Demonstrativo Financeiro (Gerencial)
            </h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="border-b border-blue-200 pb-2">
                  <p className="text-sm text-gray-600">Valor Bruto</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(calculatePreview.grossValue)}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-600 mb-2">Distribuição Base:</p>
                  <div className="space-y-1 ml-4">
                    <p className="text-sm">
                      <span className="font-semibold text-blue-700">Médico ({calculatePreview.doctorPercentage}%):</span>{' '}
                      {formatCurrency(calculatePreview.doctorAmount)}
                    </p>
                    <p className="text-sm">
                      <span className="font-semibold
