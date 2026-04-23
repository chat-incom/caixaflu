import { useMemo } from 'react';
import { FormData } from '../types/clinicalForm';
import { calculateClinicalFinance, findProcedureByValue } from '../utils/clinicalCalculations';

export function usePaymentCalculation(formData: FormData) {
  return useMemo(() => {
    const procedure = findProcedureByValue(formData.procedureType);
    if (!procedure || !formData.grossValue) return null;

    const grossValueNum = parseFloat(formData.grossValue);
    if (isNaN(grossValueNum) || grossValueNum <= 0) return null;

    try {
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
        procedure.clinicPercentage,
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
    } catch (error) {
      console.error('Erro no cálculo financeiro:', error);
      return null;
    }
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
}
