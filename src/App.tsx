import { useAuth } from './contexts/AuthContext';
import { useCashFlow } from './contexts/CashFlowContext';
import { Auth } from './components/Auth';
import { InitialBalanceSetup } from './components/InitialBalanceSetup';
import { Dashboard } from './components/Dashboard';

function App() {
  const { user, loading: authLoading } = useAuth();
  const { initialBalance, loading: cashFlowLoading } = useCashFlow();

  if (authLoading || (user && cashFlowLoading)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-sky-100 flex items-center justify-center">
        <div className="text-gray-600 text-lg">Carregando...</div>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  if (!initialBalance) {
    return <InitialBalanceSetup />;
  }

  return <Dashboard />;
}

export default App;
