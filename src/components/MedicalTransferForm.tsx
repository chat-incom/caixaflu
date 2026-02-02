import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus } from 'lucide-react';

interface MedicalTransferFormProps {
  onTransferAdded: () => void;
}

const OPTION1_CATEGORIES = [
  'Consulta',
  'Onda de choque',
  'Retirada de pontos',
  'Medicação',
  'Coleta de sangue',
  'Outros'
];

const OPTION2_CATEGORIES = [
  'Infiltração',
  'Viscossuplementação',
  'Cirurgia',
  'Outros'
];

const OPTION3_CATEGORIES = [
  'UDI',
  'HSD',
  'Natus Lumine',
  'Dom Hospital',
  'Centro Médico',
  'Outros'
];

const DISCOUNT_OPTION1 = 16.33;
const DISCOUNT_OPTION2 = 10.93;
const DISCOUNT_OPTION3 = 10.93;
const DISCOUNT_DEBIT = 1.7;
const DISCOUNT_CREDIT = 2.5;

const EXPENSE_CATEGORIES = [
  { value: 'rateio_mensal', label: 'Rateio Mensal' },
  { value: 'medicacao', label: 'Medicação' },
  { value: 'insumo', label: 'Insumo' },
  { value: 'outros', label: 'Outros' }
];

export default function MedicalTransferForm({ onTransferAdded }: MedicalTransferFormProps) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [optionType, setOptionType] = useState<'option1' | 'option2' | 'option3'>('option1');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [doctorName, setDoctorName] = useState('');
  const [referenceMonth, setReferenceMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [availableDoctors, setAvailableDoctors] = useState<string[]>([]);
  const [newDoctorName, setNewDoctorName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'debit_card' | 'credit_card' | 'pix'>('pix');
  const [expenseCategory, setExpenseCategory] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');

  useEffect(() => {
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: transactionsData } = await supabase
        .from('transactions')
        .select('subcategory')
        .eq('user_id', user.id)
        .eq('type', 'expense')
        .eq('category', 'repasse_medico')
        .not('subcategory', 'is', null);

      const { data: transfersData } = await supabase
        .from('medical_transfers')
        .select('doctor_name')
        .eq('user_id', user.id)
        .not('doctor_name', 'is', null);

      const doctors = new Set<string>();

      transactionsData?.forEach(t => {
        if (t.subcategory && t.subcategory.trim()) {
          doctors.add(t.subcategory.trim());
        }
      });

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

  const getCurrentCategories = () => {
    switch (optionType) {
      case 'option1':
        return OPTION1_CATEGORIES;
      case 'option2':
        return OPTION2_CATEGORIES;
      case 'option3':
        return OPTION3_CATEGORIES;
      default:
        return [];
    }
  };

  const getCurrentDiscount = () => {
    switch (optionType) {
      case 'option1':
        return DISCOUNT_OPTION1;
      case 'option2':
        return DISCOUNT_OPTION2;
      case 'option3':
        return DISCOUNT_OPTION3;
      default:
        return 0;
    }
  };

  const getPaymentDiscount = () => {
    switch (paymentMethod) {
      case 'debit_card':
        return DISCOUNT_DEBIT;
      case 'credit_card':
        return DISCOUNT_CREDIT;
      default:
        return 0;
    }
  };

  const calculateValues = (amountValue: number) => {
    const discountPercentage = getCurrentDiscount();
    const discountAmount = (amountValue * discountPercentage) / 100;

    const paymentDiscountPercentage = getPaymentDiscount();
    const paymentDiscountAmount = (amountValue * paymentDiscountPercentage) / 100;

    const totalDiscountAmount = discountAmount + paymentDiscountAmount;
    const netAmount = amountValue - totalDiscountAmount;

    return {
      discountPercentage,
      discountAmount,
      paymentDiscountPercentage,
      paymentDiscountAmount,
      totalDiscountAmount,
      netAmount
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const finalDoctorName = doctorName === 'new' ? newDoctorName : doctorName;

    if (!category || !amount || !finalDoctorName || !referenceMonth) {
      alert('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const amountValue = parseFloat(amount);
      const expenseAmountValue = expenseAmount ? parseFloat(expenseAmount) : 0;
      const {
        discountPercentage,
        discountAmount,
        paymentDiscountPercentage,
        paymentDiscountAmount,
        netAmount
      } = calculateValues(amountValue);

      const { error } = await supabase
        .from('medical_transfers')
        .insert([
          {
            user_id: user.id,
            date,
            option_type: optionType,
            category,
            description,
            amount: amountValue,
            discount_percentage: discountPercentage,
            discount_amount: discountAmount,
            net_amount: netAmount,
            doctor_name: finalDoctorName,
            reference_month: referenceMonth,
            payment_method: paymentMethod,
            payment_discount_percentage: paymentDiscountPercentage,
            payment_discount_amount: paymentDiscountAmount,
            expense_category: expenseCategory || null,
            expense_amount: expenseAmountValue
          }
        ]);

      if (error) throw error;

      setCategory('');
      setDescription('');
      setAmount('');
      setDoctorName('');
      setNewDoctorName('');
      setPaymentMethod('pix');
      setExpenseCategory('');
      setExpenseAmount('');
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
    const amountValue = parseFloat(amount);
    if (isNaN(amountValue) || amountValue <= 0) return null;

    const {
      discountPercentage,
      discountAmount,
      paymentDiscountPercentage,
      paymentDiscountAmount,
      totalDiscountAmount,
      netAmount
    } = calculateValues(amountValue);

    const expenseAmountValue = expenseAmount ? parseFloat(expenseAmount) : 0;
    const finalAmount = netAmount - expenseAmountValue;

    return {
      discountPercentage,
      discountAmount,
      paymentDiscountPercentage,
      paymentDiscountAmount,
      totalDiscountAmount,
      netAmount,
      expenseAmountValue,
      finalAmount
    };
  };

  const preview = previewCalculation();

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      cash: 'Dinheiro',
      debit_card: 'Débito',
      credit_card: 'Crédito',
      pix: 'PIX'
    };
    return labels[method] || method;
  };

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
            Tipo de Opção *
          </label>
          <select
            value={optionType}
            onChange={(e) => {
              setOptionType(e.target.value as 'option1' | 'option2' | 'option3');
              setCategory('');
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="option1">Opção 1 - Procedimentos (Desconto: 16,33%)</option>
            <option value="option2">Opção 2 - Procedimentos Especiais (Desconto: 10,93%)</option>
            <option value="option3">Opção 3 - Hospital (Desconto: 10,93%)</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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

        {doctorName === 'new' && (
          <div>
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
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Categoria *
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">Selecione uma categoria</option>
            {getCurrentCategories().map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Método de Entrada *
          </label>
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value as 'cash' | 'debit_card' | 'credit_card' | 'pix')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="pix">PIX</option>
            <option value="cash">Dinheiro</option>
            <option value="debit_card">Débito (Desconto adicional: 1,7%)</option>
            <option value="credit_card">Crédito (Desconto adicional: 2,5%)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Valor de Entrada *
          </label>
          <input
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
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

      {preview && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-4">
          <h4 className="font-semibold text-blue-900 mb-2">Pré-visualização do Cálculo:</h4>
          <div className="space-y-1 text-sm text-blue-800">
            <p>Valor de Entrada: <span className="font-semibold">R$ {parseFloat(amount).toFixed(2)}</span></p>
            <p>Desconto Nota Fiscal ({preview.discountPercentage}%): <span className="font-semibold text-red-600">- R$ {preview.discountAmount.toFixed(2)}</span></p>
            {preview.paymentDiscountPercentage > 0 && (
              <p>Desconto {getPaymentMethodLabel(paymentMethod)} ({preview.paymentDiscountPercentage}%): <span className="font-semibold text-red-600">- R$ {preview.paymentDiscountAmount.toFixed(2)}</span></p>
            )}
            <p className="font-medium">Total de Descontos: <span className="font-semibold text-red-600">- R$ {preview.totalDiscountAmount.toFixed(2)}</span></p>
            <p className="pt-2 border-t border-blue-300">Valor de Repasse Bruto: <span className="font-semibold text-green-600">R$ {preview.netAmount.toFixed(2)}</span></p>
            {preview.expenseAmountValue > 0 && (
              <>
                <p>Saída ({EXPENSE_CATEGORIES.find(c => c.value === expenseCategory)?.label}): <span className="font-semibold text-orange-600">- R$ {preview.expenseAmountValue.toFixed(2)}</span></p>
                <p className="pt-2 border-t border-blue-300 font-bold">Valor de Repasse Líquido: <span className="font-semibold text-green-700">R$ {preview.finalAmount.toFixed(2)}</span></p>
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
