import { PROCEDURE_TYPES, getPaymentTaxRates } from './constants';

export interface FinancialPreview {
  grossValue: number;
  clinicPercentage: number;
  doctorPercentage: number;
  clinicAmount: number;
  doctorAmount: number;
  paymentTaxRate: number;
  paymentTaxAmount: number;
  invoiceTaxRate: number;
  invoiceTaxAmount: number;
  medicationCost: number;
  suppliesCost: number;
  otherCosts: number;
  totalDeductions: number;
  netClinicValue: number;
  cashTakenByDoctor: number;
  doctorBalanceToReceive: number;
  clinicCashAdjustment: number;
  clinicNetAfterCashAdjustment: number;
  originalClinicPercentage: number;
  adjustedClinicPercentage: number;
}

export function calculateClinicalFinance(
  grossValue: number,
  clinicPercentage: number,
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
  
  // Validações
  if (grossValue <= 0) {
    throw new Error('Valor bruto deve ser maior que zero');
  }
  if (clinicPercentage + doctorPercentage !== 100) {
    throw new Error('Percentuais da clínica e médico devem somar 100%');
  }
  if (paymentTaxRate < 0 || paymentTaxRate > 100) {
    throw new Error('Taxa de pagamento deve estar entre 0 e 100%');
  }
  if (invoiceTaxRate < 0 || invoiceTaxRate > 100) {
    throw new Error('Taxa de imposto deve estar entre 0 e 100%');
  }
  
  // 1. Distribuição base
  const clinicAmount = (grossValue * clinicPercentage) / 100;
  const doctorAmount = (grossValue * doctorPercentage) / 100;
  
  // 2. Taxas e custos
  let effectiveTaxRate = paymentTaxRate;
  const hasSplitPayment = cashAmount && cashAmount > 0 && cashAmount < grossValue;
  
  if (hasSplitPayment && otherPaymentMethod && paymentTaxRate === 0) {
    const otherTaxRates = getPaymentTaxRates();
    effectiveTaxRate = otherTaxRates[otherPaymentMethod]?.defaultRate || 0;
  }
  
  const paymentTaxAmount = (grossValue * effectiveTaxRate) / 100;
  const invoiceTaxAmount = (grossValue * invoiceTaxRate) / 100;
  
  // 3. Total de deduções e resultado líquido inicial
  const totalDeductions = paymentTaxAmount + invoiceTaxAmount + medicationCost + suppliesCost + otherCosts;
  const netClinicValue = clinicAmount - totalDeductions;
  
  // 4. Ajustes para pagamento em dinheiro
  let cashTakenByDoctor = 0;
  let doctorBalanceToReceive = doctorAmount;
  let clinicCashAdjustment = 0;
  let clinicNetAfterCashAdjustment = netClinicValue;
  
  const hasCashPayment = paymentMethod === 'cash' || (cashAmount && cashAmount > 0);
  
  if (hasCashPayment) {
    const cashAmountUsed = cashAmount && cashAmount > 0 ? cashAmount : grossValue;
    cashTakenByDoctor = cashAmountUsed;
    
    const doctorPaidFromCash = Math.min(cashAmountUsed, doctorAmount);
    doctorBalanceToReceive = doctorAmount - doctorPaidFromCash;
    
    if (cashAmountUsed > doctorAmount) {
      clinicCashAdjustment = cashAmountUsed - doctorAmount;
      clinicNetAfterCashAdjustment = netClinicValue + clinicCashAdjustment;
    } else if (cashAmountUsed < doctorAmount) {
      clinicCashAdjustment = -(doctorAmount - cashAmountUsed);
      clinicNetAfterCashAdjustment = netClinicValue + clinicCashAdjustment;
    }
  }
  
  // 5. Percentuais efetivos
  const originalClinicPercentage = grossValue > 0 ? (netClinicValue / grossValue) * 100 : 0;
  const adjustedClinicPercentage = grossValue > 0 ? (clinicNetAfterCashAdjustment / grossValue) * 100 : 0;
  
  return {
    grossValue,
    clinicPercentage,
    doctorPercentage,
    clinicAmount,
    doctorAmount,
    paymentTaxRate: effectiveTaxRate,
    paymentTaxAmount,
    invoiceTaxRate,
    invoiceTaxAmount,
    medicationCost,
    suppliesCost,
    otherCosts,
    totalDeductions,
    netClinicValue,
    cashTakenByDoctor,
    doctorBalanceToReceive,
    clinicCashAdjustment,
    clinicNetAfterCashAdjustment,
    originalClinicPercentage,
    adjustedClinicPercentage
  };
}

export const calculateTotalDeductions = (movement: any): number => {
  return (movement.payment_tax_amount || 0) + 
         (movement.invoice_tax_amount || 0) + 
         (movement.medication_cost || 0) + 
         (movement.supplies_cost || 0) + 
         (movement.other_costs || 0);
};

export const findProcedureByValue = (value: string) => {
  return PROCEDURE_TYPES.find(p => p.value === value);
};
