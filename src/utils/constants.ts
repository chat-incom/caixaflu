export const PROCEDURE_TYPES = [
  { value: 'Consulta', label: 'Consulta', clinicPercentage: 20, doctorPercentage: 80 },
  { value: 'Onda de Choque', label: 'Onda de Choque', clinicPercentage: 30, doctorPercentage: 70 },
  { value: 'Infiltração', label: 'Infiltração', clinicPercentage: 40, doctorPercentage: 60 },
  { value: 'Cirurgias', label: 'Cirurgias', clinicPercentage: 20, doctorPercentage: 80 },
  { value: 'Médicos Terceiros', label: 'Médicos Terceiros', clinicPercentage: 50, doctorPercentage: 50 },
];

export const MAX_GROSS_VALUE = 1_000_000;
export const MAX_INSTALLMENTS = 12;

export const PAYMENT_METHOD_MAP: Record<string, string> = {
  credit: 'credit_card',
  debit: 'debit_card',
  pix: 'pix',
  cash: 'cash',
  deposit: 'deposito',
  mixed: 'mixed'
};

export const getPaymentTaxRates = () => ({
  credit: { label: 'Cartão de Crédito', defaultRate: 3.5, rates: [2.5, 3.0, 3.5, 4.0, 4.5] },
  debit: { label: 'Cartão de Débito', defaultRate: 1.5, rates: [1.0, 1.5, 2.0, 2.5] },
  pix: { label: 'PIX', defaultRate: 0, rates: [0] },
  cash: { label: 'Dinheiro', defaultRate: 0, rates: [0] },
  deposit: { label: 'Depósito/Transferência', defaultRate: 0, rates: [0] },
});
