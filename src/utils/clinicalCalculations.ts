// utils/clinicalCalculations.ts

export interface FinancialCalculation {
  grossValue: number;
  doctorPercentage: number;     // % que vai para o médico
  doctorAmount: number;         // valor que vai para o médico
  clinicShareBeforeCosts: number; // participação da clínica antes dos custos
  paymentTaxRate: number;
  paymentTaxAmount: number;
  invoiceTaxRate: number;
  invoiceTaxAmount: number;
  medicationCost: number;
  suppliesCost: number;
  otherCosts: number;
  totalDeductions: number;
  netClinicValue: number;       // valor líquido final para clínica
  effectiveClinicPercentage: number;
}

// Percentual do MÉDICO (o que ele recebe)
export const PROCEDURE_TYPES = [
  { value: 'Consulta', label: 'Consulta', doctorPercentage: 80 },        // Médico recebe 80%, clínica 20%
  { value: 'Infiltrações', label: 'Infiltrações', doctorPercentage: 60 }, // Médico recebe 60%, clínica 40%
  { value: 'Onda de Choque', label: 'Onda de Choque', doctorPercentage: 70 }, // Médico recebe 70%, clínica 30%
  { value: 'Cirurgia Particular', label: 'Cirurgia Particular', doctorPercentage: 82 }, // Médico recebe 82%, clínica 18%
  { value: 'Médico Parceiro', label: 'Médico Parceiro', doctorPercentage: 50 } // Médico recebe 50%, clínica 50%
];

export const getPaymentTaxRates = () => ({
  credit_card: {
    label: 'Cartão de Crédito',
    defaultRate: 2.99,
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

export const calculateClinicalFinance = (
  grossValue: number,
  doctorPercentage: number,  // Percentual do médico
  paymentMethod: string,
  paymentTaxRate: number,
  invoiceTaxRate: number,
  medicationCost: number = 0,
  suppliesCost: number = 0,
  otherCosts: number = 0
): FinancialCalculation => {
  // 1. Valor que vai para o médico
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
  
  // 5. Total de deduções da clínica
  const totalDeductions = paymentTaxAmount + invoiceTaxAmount + 
                          medicationCost + suppliesCost + otherCosts;
  
  // 6. Valor líquido para clínica
  const netClinicValue = clinicShareBeforeCosts - totalDeductions;
  
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
