export interface FormData {
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

export const INITIAL_FORM_STATE: FormData = {
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
