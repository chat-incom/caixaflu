import { useState } from 'react';
import { useCashFlow } from '../contexts/CashFlowContext';
import { DollarSign } from 'lucide-react';

export function InitialBalanceSetup() {
  const { setInitialBalance } = useCashFlow();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount)) {
      setError('Por favor, insira um valor válido');
      setLoading(false);
      return;
    }

    const { error } = await setInitialBalance(numAmount);

    if (error) {
      setError(error.message);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-sky-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="flex justify-center mb-6">
          <div className="bg-blue-100 p-4 rounded-full">
            <DollarSign size={32} className="text-blue-600" />
          </div>
        </div>

        <h1 className="text-3xl font-bold text-gray-800 mb-2 text-center">
          Configurar Saldo Inicial
        </h1>
        <p className="text-gray-600 text-center mb-8">
          Digite o valor inicial do seu caixa para começar
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
              Saldo Inicial (R$)
            </label>
            <input
              id="amount"
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-lg"
              placeholder="0,00"
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Salvando...' : 'Confirmar Saldo'}
          </button>
        </form>
      </div>
    </div>
  );
}
