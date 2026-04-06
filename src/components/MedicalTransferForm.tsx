import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus } from 'lucide-react';

interface MedicalTransferFormProps {
  onTransferAdded: () => void;
}

const PROCEDURE_TYPES = [
  { value: 'Consulta', label: 'Consulta', percentage: 20 },
  { value: 'Infiltrações', label: 'Infiltrações', percentage: 40 },
  { value: 'Onda de Choque', label: 'Onda de Choque', percentage: 30 },
  { value: 'Cirurgia Particular', label: 'Cirurgia Particular', percentage: 2 },
  { value: 'Médico Parceiro', label: 'Médico Parceiro', percentage: 50 }
];

const PAYMENT_TYPES = [
  { value: 'À vista', label: 'À vista' },
  { value: 'Parcelado', label: 'Parcelado' }
];

const EXPENSE_CATEGORIES = [
  { value: 'rateio_mensal', label: 'Rateio Mensal' },
  { value: 'medicacao', label: 'Medicação' },
  { value: 'insumo', label: 'Insumo' },
  { value: 'outros', label: 'Outros' }
];

export default function MedicalTransferForm({ onTransferAdded }: MedicalTransferFormProps) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [procedureType, setProcedureType] = useState('Consulta');
  const [description, setDescription] = useState('');
  const [entryAmount, setEntryAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [doctorName, setDoctorName] = useState('');
  const [referenceMonth, setReferenceMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [availableDoctors, setAvailableDoctors] = useState<string[]>([]);
  const [newDoctorName, setNewDoctorName] = useState('');
  const [paymentType, setPaymentType] = useState('À vista');
  const [installments, setInstallments] = useState('1');
  const [expenseCategory, setExpenseCategory] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [observations, setObservations] = useState('');

  useEffect(() => {
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: transfersData } = await supabase
        .from('medical_transfers')
        .select('doctor_name')
        .eq('user_id', user.id)
        .not('doctor_name', 'is', null);

      const doctors = new Set<string>();

      transfersData?.forEach(t => {
        if (t.doctor_name && t.doctor_name.trim()) {
          doctors.add(t.doctor_name.trim());
        }
      });

      setAvailableDoctors(Array.from(doctors).sort());
    } catch (error) {
      console.error('Erro ao buscar médicos:', error);
    }
  };

  const getProcedurePercentage = () => {
    const procedure = PROCEDURE_TYPES.find(p => p.value === procedureType);
    return procedure ? procedure.percentage : 0;
  };

  const calculateRepasse = (amount: number) => {
    const percentage = getProcedurePercentage();
    const discount = (amount * percentage) / 100;
    return amount - discount;
  };

  const calculateIncom = (amount: number) => {
    const percentage = getProcedurePercentage();
    return (amount * percentage) / 100;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const finalDoctorName = doctorName === 'new' ? newDoctorName : doctorName;

    if (!procedureType || !entryAmount || !finalDoctorName || !referenceMonth) {
      alert('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const entryAmountValue = parseFloat(entryAmount);
      const expenseAmountValue = expenseAmount ? parseFloat(expenseAmount) : 0;
      const installmentsValue = parseInt(installments);

      const { error } = await supabase
        .from('medical_transfers')
        .insert([
          {
            user_id: user.id,
            date,
            doctor_name: finalDoctorName,
            reference_month: referenceMonth,
            procedure_type: procedureType,
            description: description || null,
            entry_amount: entryAmountValue,
            payment_type: paymentType,
            installments: installmentsValue,
            expense_category: expenseCategory || null,
            expense_amount: expenseAmountValue,
            observations: observations || null
          }
        ]);

      if (error) throw error;

      setProcedureType('Consulta');
      setDescription('');
      setEntryAmount('');
      setDoctorName('');
      setNewDoctorName('');
      setPaymentType('À vista');
      setInstallments('1');
      setExpenseCategory('');
      setExpenseAmount('');
      setObservations('');
      fetchDoctors();
      onTransferAdded();
    } catch (error) {
      console.error('Erro ao adicionar repasse:', error);
      alert('Erro ao adicionar repasse médico');
    } finally {
      setLoading(false);
    }
  };

  const previewCalculation = () => {
    const amount = parseFloat(entryAmount);
    if (isNaN(amount) || amount <= 0) return null;

    const percentage = getProcedurePercentage();
    const incomAmount = calculateIncom(amount);
    const repasseAmount = calculateRepasse(amount);
    const expenseAmountValue = expenseAmount ? parseFloat(expenseAmount) : 0;
    const finalAmount = repasseAmount - expenseAmountValue;

    return {
      entryAmount: amount,
      percentage,
      incomAmount,
      repasseAmount,
      expenseAmountValue,
      finalAmount
    };
  };

  const preview = previewCalculation();

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h3 className="text-xl font-semibold mb-4 text-gray-800">Novo Repasse Médico</h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Data *
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Mês de Referência *
          </label>
          <input
            type="month"
            value={referenceMonth}
            onChange={(e) => setReferenceMonth(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Médico *
          </label>
          <select
            value={doctorName}
            onChange={(e) => {
              setDoctorName(e.target.value);
              if (e.target.value !== 'new') {
                setNewDoctorName('');
              }
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">Selecione um médico</option>
            {availableDoctors.map((doctor) => (
              <option key={doctor} value={doctor}>
                {doctor}
              </option>
            ))}
            <option value="new">+ Adicionar novo médico</option>
          </select>
        </div>
      </div>

      {doctorName === 'new' && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nome do Novo Médico *
          </label>
          <input
            type="text"
            value={newDoctorName}
            onChange={(e) => setNewDoctorName(e.target.value)}
            placeholder="Digite o nome do médico"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tipo de Procedimento *
          </label>
          <select
            value={procedureType}
            onChange={(e) => setProcedureType(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            {PROCEDURE_TYPES.map((proc) => (
              <option key={proc.value} value={proc.value}>
                {proc.label} ({proc.percentage}%)
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Valor de Entrada *
          </label>
          <input
            type="number"
            step="0.01"
            value={entryAmount}
            onChange={(e) => setEntryAmount(e.target.value)}
            placeholder="0.00"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
        <h4 className="font-semibold text-gray-800 mb-3 text-sm">Método de Entrada (Informativo)</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de Pagamento *
            </label>
            <select
              value={paymentType}
              onChange={(e) => {
                setPaymentType(e.target.value);
                if (e.target.value === 'À vista') {
                  setInstallments('1');
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              {PAYMENT_TYPES.map((pt) => (
                <option key={pt.value} value={pt.value}>
                  {pt.label}
                </option>
              ))}
            </select>
          </div>

          {paymentType === 'Parcelado' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantidade de Parcelas *
              </label>
              <select
                value={installments}
                onChange={(e) => setInstallments(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((num) => (
                  <option key={num} value={num}>
                    {num}x
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
        <h4 className="font-semibold text-gray-800 mb-3 text-sm">Saída (Opcional)</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Categoria de Saída
            </label>
            <select
              value={expenseCategory}
              onChange={(e) => setExpenseCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Nenhuma</option>
              {EXPENSE_CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Valor da Saída
            </label>
            <input
              type="number"
              step="0.01"
              value={expenseAmount}
              onChange={(e) => setExpenseAmount(e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={!expenseCategory}
            />
          </div>
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Descrição
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Informações adicionais..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={2}
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Observações
        </label>
        <textarea
          value={observations}
          onChange={(e) => setObservations(e.target.value)}
          placeholder="Observações adicionais (opcional)..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={2}
        />
      </div>

      {preview && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-4">
          <h4 className="font-semibold text-blue-900 mb-2">Pré-visualização do Cálculo:</h4>
          <div className="space-y-1 text-sm text-blue-800">
            <p>Valor de Entrada: <span className="font-semibold">R$ {preview.entryAmount.toFixed(2)}</span></p>
            <p>INCOM ({preview.percentage}%): <span className="font-semibold text-purple-600">- R$ {preview.incomAmount.toFixed(2)}</span></p>
            <p className="font-medium">Repasse ao Médico: <span className="font-semibold text-green-600">R$ {preview.repasseAmount.toFixed(2)}</span></p>
            {preview.expenseAmountValue > 0 && (
              <>
                <p>Saída ({EXPENSE_CATEGORIES.find(c => c.value === expenseCategory)?.label}): <span className="font-semibold text-orange-600">- R$ {preview.expenseAmountValue.toFixed(2)}</span></p>
                <p className="pt-2 border-t border-blue-300 font-bold">Valor Líquido ao Médico: <span className="font-semibold text-green-700">R$ {preview.finalAmount.toFixed(2)}</span></p>
              </>
            )}
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        <Plus size={20} />
        {loading ? 'Adicionando...' : 'Adicionar Repasse'}
      </button>
    </form>
  );
}
