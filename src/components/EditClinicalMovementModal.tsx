// src/components/EditClinicalMovementModal.tsx
import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { X, Save, Trash2 } from 'lucide-react';
import { calculateClinicalFinance, PROCEDURE_TYPES, getPaymentTaxRates } from '../utils/clinicalCalculations';

interface EditClinicalMovementModalProps {
  movement: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditClinicalMovementModal({ movement, onClose, onSuccess }: EditClinicalMovementModalProps) {
  const [formData, setFormData] = useState({
    date: movement.date,
    doctorName: movement.doctor_name,
    patientName: movement.patient_name || '',
    procedureType: movement.procedure_type,
    grossValue: movement.gross_value.toString(),
    paymentMethod: movement.payment_method || 'pix',
    paymentTaxRate: movement.payment_tax_rate || 0,
    invoiceTaxRate: movement.invoice_tax_rate || 0,
    medicationCost: movement.medication_cost?.toString() || '',
    suppliesCost: movement.supplies_cost?.toString() || '',
    otherCosts: movement.other_costs?.toString() || '',
    otherCostsDescription: movement.other_costs_description || '',
    installments: movement.installments?.toString() || '1',
    observations: movement.observations || '',
    cashSettlementType: movement.cash_settlement_type || 'left_at_clinic'
  });

  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const paymentTaxRates = getPaymentTaxRates();

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    if (field === 'paymentMethod') {
      const rate = paymentTaxRates[value as keyof typeof paymentTaxRates]?.defaultRate || 0;
      setFormData(prev => ({ ...prev, paymentTaxRate: rate }));
    }
  };

  const calculatePreview = () => {
    const procedure = PROCEDURE_TYPES.find(p => p.value === formData.procedureType);
    if (!procedure || !formData.grossValue) return null;

    const grossValueNum = parseFloat(formData.grossValue);
    if (isNaN(grossValueNum)) return null;

    return calculateClinicalFinance(
      grossValueNum,
      procedure.doctorPercentage,
      formData.paymentMethod,
      formData.paymentTaxRate,
      formData.invoiceTaxRate,
      parseFloat(formData.medicationCost) || 0,
      parseFloat(formData.suppliesCost) || 0,
      parseFloat(formData.otherCosts) || 0
    );
  };

  const handleDelete = async () => {
    if (!confirm('Tem certeza que deseja excluir este movimento?')) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from('clinical_financial_movements')
        .delete()
        .eq('id', movement.id);

      if (error) throw error;

      alert('✅ Movimento excluído com sucesso!');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Erro ao excluir:', error);
      alert('❌ Erro ao excluir movimento');
    } finally {
      setDeleting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const preview = calculatePreview();
    if (!preview) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      const hasMedication = (parseFloat(formData.medicationCost) || 0) > 0;
      const hasOtherCosts = (parseFloat(formData.otherCosts) || 0) > 0;

      // Atualizar movimento
      const { error: updateError } = await supabase
        .from('clinical_financial_movements')
        .update({
          date: formData.date,
          doctor_name: formData.doctorName,
          patient_name: formData.patientName || null,
          procedure_type: formData.procedureType,
          reference_month: formData.date.substring(0, 7),
          gross_value: preview.grossValue,
          doctor_percentage: preview.doctorPercentage,
          doctor_amount: preview.doctorAmount,
          clinic_share_before_costs: preview.clinicShareBeforeCosts,
          payment_method: formData.paymentMethod,
          payment_tax_rate: preview.paymentTaxRate,
          payment_tax_amount: preview.paymentTaxAmount,
          invoice_tax_rate: preview.invoiceTaxRate,
          invoice_tax_amount: preview.invoiceTaxAmount,
          medication_cost: preview.medicationCost,
          supplies_cost: preview.suppliesCost,
          other_costs: preview.otherCosts,
          other_costs_description: formData.otherCostsDescription || null,
          total_deductions: preview.totalDeductions,
          net_clinic_value: preview.netClinicValue,
          installments: parseInt(formData.installments),
          observations: formData.observations || null,
          cash_settlement_type: formData.paymentMethod === 'cash' ? formData.cashSettlementType : null,
          has_medication: hasMedication,
          has_other_costs: hasOtherCosts,
          updated_at: new Date().toISOString()
        })
        .eq('id', movement.id);

      if (updateError) throw updateError;

      alert('✅ Movimento atualizado com sucesso!');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Erro ao atualizar:', error);
      alert('❌ Erro ao atualizar movimento');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const preview = calculatePreview();
  const procedure = PROCEDURE_TYPES.find(p => p.value === formData.procedureType);
  const clinicPercentage = procedure ? 100 - procedure.doctorPercentage : 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
          <h2 className="text-2xl font-bold text-gray-800">Editar Movimento Financeiro</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {/* Dados Básicos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data *</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => handleInputChange('date', e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Médico *</label>
              <input
                type="text"
                value={formData.doctorName}
                onChange={(e) => handleInputChange('doctorName', e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Paciente</label>
              <input
                type="text"
                value={formData.patientName}
                onChange={(e) => handleInputChange('patientName', e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Procedimento *</label>
              <select
                value={formData.procedureType}
                onChange={(e) => handleInputChange('procedureType', e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                required
              >
                {PROCEDURE_TYPES.map(p => (
                  <option key={p.value} value={p.value}>
                    {p.label} - {p.doctorPercentage}% médico / {100 - p.doctorPercentage}% clínica
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valor Bruto *</label>
              <input
                type="number"
                step="0.01"
                value={formData.grossValue}
                onChange={(e) => handleInputChange('grossValue', e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Método de Pagamento *</label>
              <select
                value={formData.paymentMethod}
                onChange={(e) => handleInputChange('paymentMethod', e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                required
              >
                {Object.entries(paymentTaxRates).map(([key, value]) => (
                  <option key={key} value={key}>{value.label}</option>
                ))}
              </select>
            </div>

            {formData.paymentMethod === 'cash' && (
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  💵 O que aconteceu com o dinheiro?
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      value="left_at_clinic"
                      checked={formData.cashSettlementType === 'left_at_clinic'}
                      onChange={(e) => handleInputChange('cashSettlementType', e.target.value)}
                    />
                    <span>Médico deixou na clínica</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      value="doctor_took"
                      checked={formData.cashSettlementType === 'doctor_took'}
                      onChange={(e) => handleInputChange('cashSettlementType', e.target.value)}
                    />
                    <span>Médico levou o dinheiro</span>
                  </label>
                </div>
              </div>
            )}

            {formData.paymentMethod !== 'cash' && formData.paymentMethod !== 'pix' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Taxa da Operadora (%)</label>
                <select
                  value={formData.paymentTaxRate}
                  onChange={(e) => handleInputChange('paymentTaxRate', parseFloat(e.target.value))}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  {paymentTaxRates[formData.paymentMethod as keyof typeof paymentTaxRates]?.rates.map(rate => (
                    <option key={rate} value={rate}>{rate}%</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Alíquota de Imposto (%)</label>
              <input
                type="number"
                step="0.01"
                value={formData.invoiceTaxRate}
                onChange={(e) => handleInputChange('invoiceTaxRate', parseFloat(e.target.value))}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="Ex: 5%"
              />
            </div>
          </div>

          {/* Custos */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-gray-800 mb-3">Custos Diretos</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Medicação</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.medicationCost}
                  onChange={(e) => handleInputChange('medicationCost', e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="0,00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Insumos</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.suppliesCost}
                  onChange={(e) => handleInputChange('suppliesCost', e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="0,00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Outros Custos</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.otherCosts}
                  onChange={(e) => handleInputChange('otherCosts', e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="0,00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição Outros Custos</label>
                <input
                  type="text"
                  value={formData.otherCostsDescription}
                  onChange={(e) => handleInputChange('otherCostsDescription', e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="Ex: Material de consumo"
                />
              </div>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
            <textarea
              value={formData.observations}
              onChange={(e) => handleInputChange('observations', e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>

          {/* Preview */}
          {preview && (
            <div className="bg-blue-50 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-blue-900 mb-2">Pré-visualização:</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>Valor Bruto:</div>
                <div className="font-bold">{formatCurrency(preview.grossValue)}</div>
                <div>Clínica ({clinicPercentage}%):</div>
                <div className="text-green-600 font-bold">{formatCurrency(preview.clinicShareBeforeCosts)}</div>
                <div>Deduções:</div>
                <div className="text-red-600">-{formatCurrency(preview.totalDeductions)}</div>
                <div className="border-t pt-1">Líquido Clínica:</div>
                <div className="border-t pt-1 text-green-700 font-bold">{formatCurrency(preview.netClinicValue)}</div>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="flex-1 bg-red-600 text-white py-2 rounded-md hover:bg-red-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Trash2 size={18} />
              {deleting ? 'Excluindo...' : 'Excluir'}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Save size={18} />
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
