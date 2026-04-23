export interface ClinicalMovement {
  id: string;
  date: string;
  doctor_name: string;
  patient_name: string | null;
  procedure_type: string;
  reference_month: string;
  gross_value: number;
  doctor_percentage: number;
  doctor_amount: number;
  clinic_share_before_costs: number;
  payment_method: string;
  payment_tax_rate: number;
  payment_tax_amount: number;
  invoice_tax_rate: number;
  invoice_tax_amount: number;
  medication_cost: number;
  supplies_cost: number;
  other_costs: number;
  other_costs_description: string | null;
  total_deductions: number;
  net_clinic_value: number;
  cash_settlement_type: string;
  has_medication: boolean;
  has_other_costs: boolean;
  observations: string | null;
  installments: number;
  is_split_payment?: boolean;
  cash_payment_amount?: number | null;
  other_payment_amount?: number | null;
  other_payment_method?: string | null;
  created_at?: string;
  user_id?: string;
}

export interface MonthlySummary {
  month: string;
  totalGross: number;
  totalDoctorAmount: number;
  totalDeductions: number;
  totalNetClinic: number;
  procedureCount: number;
}

export interface DoctorSummary {
  doctorName: string;
  totalGross: number;
  totalDoctorAmount: number;
  totalDeductions: number;
  totalNetClinic: number;
  procedureCount: number;
  procedures: { [key: string]: number };
  hasMedication: boolean;
  hasOtherCosts: boolean;
  cashTransactions: number;
}

export type ClinicalMovementInput = Omit<ClinicalMovement, 'id' | 'created_at'>;
