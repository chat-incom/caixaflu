import { FormData } from '../types/clinicalForm';
import { MAX_GROSS_VALUE } from './constants';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export const validateClinicalMovement = (formData: FormData): ValidationResult => {
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
  if (grossValueNum > MAX_GROSS_VALUE) {
    errors.push(`Valor bruto excede o limite máximo de R$ ${MAX_GROSS_VALUE.toLocaleString()}`);
  }
  
  // Validação de pagamento misto
  if (formData.isSplitPayment && formData.cashAmount) {
    const cashAmountNum = parseFloat(formData.cashAmount);
    
    if (isNaN(cashAmountNum) || cashAmountNum <= 0) {
      errors.push('Valor em dinheiro deve ser maior que zero');
    }
    
    if (cashAmountNum > grossValueNum) {
      errors.push('Valor em dinheiro não pode ser maior que o valor total');
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
