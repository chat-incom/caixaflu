// utils/clinicalCalculations.ts

export interface FinancialCalculation {
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
}

export const calculateClinicalFinance = (
  grossValue: number,
  doctorPercentage: number,
  paymentMethod: string,
  paymentTaxRate: number,
  invoiceTaxRate: number,
  medicationCost: number = 0,
  suppliesCost: number = 0,
  otherCosts: number = 0
): FinancialCalculation => {
  // 1. Valor do médico
  const doctorAmount = (grossValue * doctorPercentage) / 100;
  
  // 2. Participação da clínica antes dos custos
  const clinicShareBeforeCosts = grossValue - doctorAmount;
  
  // 3. Taxas de pagamento
  let paymentTaxAmount = 0;
  if (paymentMethod !== 'cash' && paymentTaxRate > 0) {
    paymentTaxAmount = (grossValue * paymentTaxRate) / 100;
  }
  
  // 4. Impostos
  const invoiceTaxAmount = (grossValue * invoiceTaxRate) / 100;
  
  // 5. Total de deduções
  const totalDeductions = doctorAmount + paymentTaxAmount + invoiceTaxAmount + 
                          medicationCost + suppliesCost + otherCosts;
  
  // 6. Valor líquido para clínica
  const netClinicValue = grossValue - totalDeductions;
  
  // 7. Percentual efetivo para clínica
  const effectiveClinicPercentage = (netClinicValue / grossValue) * 100;
  
  return {
    grossValue,
    doctorPercentage,
    doctorAmount,
    clinicShareBeforeCosts,
    paymentTaxRate,
    paymentTaxAmount,
    invoiceTaxRate,
    invoiceTaxAmount,
    medicationCost,
    suppliesCost,
    otherCosts,
    totalDeductions,
    netClinicValue,
    effectiveClinicPercentage
  };
};

export const getPaymentTaxRates = () => ({
  credit_card: {
    label: 'Cartão de Crédito',
    defaultRate: 2.99, // % padrão
    rates: [1.99, 2.49, 2.99, 3.49, 3.99]
  },
  debit_card: {
    label: 'Cartão de Débito',
    defaultRate: 1.99,
    rates: [0.99, 1.49, 1.99, 2.49]
  },
  pix: {
    label: 'PIX',
    defaultRate: 0,
    rates: [0]
  },
  cash: {
    label: 'Dinheiro',
    defaultRate: 0,
    rates: [0]
  },
  deposito: {
    label: 'Depósito',
    defaultRate: 0,
    rates: [0]
  }
});
