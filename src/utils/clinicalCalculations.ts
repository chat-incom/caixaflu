
// utils/clinicalCalculations.ts

export const PROCEDURE_TYPES = [
  { value: 'Consulta', label: 'Consulta', doctorPercentage: 20 },
  { value: 'Retorno', label: 'Retorno', doctorPercentage: 20 },
  { value: 'Pequena Cirurgia', label: 'Pequena Cirurgia', doctorPercentage: 30 },
  { value: 'Média Cirurgia', label: 'Média Cirurgia', doctorPercentage: 35 },
  { value: 'Grande Cirurgia', label: 'Grande Cirurgia', doctorPercentage: 40 },
  { value: 'Exame', label: 'Exame', doctorPercentage: 15 },
  { value: 'Curativo', label: 'Curativo', doctorPercentage: 10 },
];

export interface PaymentTaxRates {
  [key: string]: {
    label: string;
    defaultRate: number;
    rates: number[];
  };
}

export const getPaymentTaxRates = (): PaymentTaxRates => ({
  credit: { label: 'Cartão de Crédito', defaultRate: 3.5, rates: [2.5, 3.0, 3.5, 4.0, 4.5] },
  debit: { label: 'Cartão de Débito', defaultRate: 1.5, rates: [1.0, 1.5, 2.0, 2.5] },
  pix: { label: 'PIX', defaultRate: 0, rates: [0] },
  cash: { label: 'Dinheiro', defaultRate: 0, rates: [0] },
  deposit: { label: 'Depósito/Transferência', defaultRate: 0, rates: [0] },
});

export interface FinancialPreview {
  grossValue: number;
  doctorPercentage: number;
  doctorAmount: number;
  clinicShareBeforeCosts: number;
  paymentTaxRate: number;
  paymentTaxAmount: number;
  invoiceTaxRate: number;
  invoiceTaxAmount: number;
  medicationCost: number;
  suppliesCost: number;
  otherCosts: number;
  totalDeductions: number;
  netClinicValue: number;
  effectiveClinicPercentage: number;
  doctorImmediateCash: number;
  doctorToReceiveLater: number;
  clinicNetAfterCashAdjustment: number;
  cashAmountUsed: number;
  otherPaymentAmount: number;
}

export function calculateClinicalFinance(
  grossValue: number,
  doctorPercentage: number,
  paymentMethod: string,
  paymentTaxRate: number,
  invoiceTaxRate: number,
  medicationCost: number,
  suppliesCost: number,
  otherCosts: number,
  cashAmount?: number,
  otherPaymentMethod?: string
): FinancialPreview {
  
  // 1. Calcular valores base
  const doctorAmount = (grossValue * doctorPercentage) / 100;
  const clinicShareBeforeCosts = grossValue - doctorAmount;
  
  // 2. Calcular taxas e custos
  let effectiveTaxRate = paymentTaxRate;
  let effectivePaymentMethod = paymentMethod;
  
  // Se for pagamento misto, usa a taxa do outro método (não dinheiro)
  if (cashAmount && cashAmount > 0 && cashAmount < grossValue && otherPaymentMethod) {
    const otherTaxRates = getPaymentTaxRates();
    effectiveTaxRate = otherTaxRates[otherPaymentMethod]?.defaultRate || 0;
    effectivePaymentMethod = otherPaymentMethod;
  }
  
  const paymentTaxAmount = (grossValue * effectiveTaxRate) / 100;
  const invoiceTaxAmount = (grossValue * invoiceTaxRate) / 100;
  
  // 3. Total de deduções da clínica
  const totalDeductions = paymentTaxAmount + invoiceTaxAmount + medicationCost + suppliesCost + otherCosts;
  let netClinicValue = clinicShareBeforeCosts - totalDeductions;
  
  // 4. Lógica para pagamento em dinheiro (parcial ou total)
  let doctorImmediateCash = 0;
  let doctorToReceiveLater = doctorAmount;
  let clinicNetAfterCashAdjustment = netClinicValue;
  let cashAmountUsed = 0;
  let otherPaymentAmount = grossValue;
  
  // Verifica se há pagamento em dinheiro
  const hasCashPayment = paymentMethod === 'cash' || (cashAmount && cashAmount > 0);
  
  if (hasCashPayment) {
    // Determina o valor em dinheiro recebido
    cashAmountUsed = cashAmount && cashAmount > 0 ? cashAmount : grossValue;
    otherPaymentAmount = grossValue - cashAmountUsed;
    
    // O médico levou o dinheiro (consideramos que sim quando é dinheiro)
    doctorImmediateCash = cashAmountUsed;
    
    // Calcula quanto da parte do médico já foi paga com o dinheiro
    const doctorPaidFromCash = Math.min(cashAmountUsed, doctorAmount);
    doctorToReceiveLater = doctorAmount - doctorPaidFromCash;
    
    // Ajusta o valor líquido da clínica baseado no dinheiro recebido
    if (cashAmountUsed > doctorAmount) {
      // Se o dinheiro recebido é MAIOR que a parte do médico, o excedente é da clínica
      const excessCash = cashAmountUsed - doctorAmount;
      clinicNetAfterCashAdjustment = netClinicValue + excessCash;
    } else if (cashAmountUsed < doctorAmount) {
      // Se o dinheiro não cobriu toda a parte do médico, a clínica ainda deve pagar a diferença
      // Mas o dinheiro já está com o médico, então a clínica precisa descontar do seu lucro
      clinicNetAfterCashAdjustment = netClinicValue - (doctorAmount - cashAmountUsed);
    } else {
      // Valores iguais, sem ajuste adicional
      clinicNetAfterCashAdjustment = netClinicValue;
    }
  }
  
  // Garantir que não fique negativo
  clinicNetAfterCashAdjustment = Math.max(0, clinicNetAfterCashAdjustment);
  
  return {
    grossValue,
    doctorPercentage,
    doctorAmount,
    clinicShareBeforeCosts,
    paymentTaxRate: effectiveTaxRate,
    paymentTaxAmount,
    invoiceTaxRate,
    invoiceTaxAmount,
    medicationCost,
    suppliesCost,
    otherCosts,
    totalDeductions,
    netClinicValue,
    effectiveClinicPercentage: (clinicNetAfterCashAdjustment / grossValue) * 100,
    doctorImmediateCash,
    doctorToReceiveLater,
    clinicNetAfterCashAdjustment,
    cashAmountUsed,
    otherPaymentAmount
  };
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}
