// utils/clinicalCalculations.ts

export interface FinancialCalculation {
  grossValue: number;
  clinicPercentage: number;  // % que fica para a clínica
  clinicAmount: number;      // valor que fica para a clínica (antes dos custos)
  doctorAmount: number;      // valor que vai para o médico
  paymentTaxRate: number;
  paymentTaxAmount: number;
  invoiceTaxRate: number;
  invoiceTaxAmount: number;
  medicationCost: number;
  suppliesCost: number;
  otherCosts: number;
  totalDeductions: number;
  netClinicValue: number;    // valor líquido final para clínica
  effectiveClinicPercentage: number;
}

export const PROCEDURE_TYPES = [
  { value: 'Consulta', label: 'Consulta', clinicPercentage: 20 },        // 20% para clínica, 80% médico
  { value: 'Infiltrações', label: 'Infiltrações', clinicPercentage: 40 }, // 40% para clínica, 60% médico
  { value: 'Onda de Choque', label: 'Onda de Choque', clinicPercentage: 30 }, // 30% para clínica, 70% médico
  { value: 'Cirurgia Particular', label: 'Cirurgia Particular', clinicPercentage: 18 }, // 18% para clínica, 82% médico
  { value: 'Médico Parceiro', label: 'Médico Parceiro', clinicPercentage: 50 } // 50% para clínica, 50% médico
];

export const calculateClinicalFinance = (
  grossValue: number,
  clinicPercentage: number,  // Agora é o percentual da clínica
  paymentMethod: string,
  paymentTaxRate: number,
  invoiceTaxRate: number,
  medicationCost: number = 0,
  suppliesCost: number = 0,
  otherCosts: number = 0
): FinancialCalculation => {
  // 1. Valor que fica para a clínica (antes dos custos)
  const clinicAmount = (grossValue * clinicPercentage) / 100;
  
  // 2. Valor que vai para o médico
  const doctorAmount = grossValue - clinicAmount;
  
  // 3. Taxas de pagamento (geralmente sobre o valor bruto)
  let paymentTaxAmount = 0;
  if (paymentMethod !== 'cash' && paymentTaxRate > 0) {
    paymentTaxAmount = (grossValue * paymentTaxRate) / 100;
  }
  
  // 4. Impostos (sobre o valor bruto)
  const invoiceTaxAmount = (grossValue * invoiceTaxRate) / 100;
  
  // 5. Total de deduções da clínica
  const totalDeductions = paymentTaxAmount + invoiceTaxAmount + 
                          medicationCost + suppliesCost + otherCosts;
  
  // 6. Valor líquido para clínica (o que sobra após todos os custos)
  const netClinicValue = clinicAmount - totalDeductions;
  
  // 7. Percentual efetivo para clínica sobre o valor bruto
  const effectiveClinicPercentage = (netClinicValue / grossValue) * 100;
  
  return {
    grossValue,
    clinicPercentage,
    clinicAmount,
    doctorAmount,
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
