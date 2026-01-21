import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase, InitialBalance, Transaction } from '../lib/supabase';
import { useAuth } from './AuthContext';

type CashFlowContextType = {
  initialBalance: InitialBalance | null;
  transactions: Transaction[];
  loading: boolean;
  setInitialBalance: (amount: number) => Promise<{ error: Error | null }>;
  addTransaction: (transaction: Omit<Transaction, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<{ error: Error | null }>;
  updateTransaction: (id: string, transaction: Partial<Transaction>) => Promise<{ error: Error | null }>;
  deleteTransaction: (id: string) => Promise<{ error: Error | null }>;
  refreshData: () => Promise<void>;
};

const CashFlowContext = createContext<CashFlowContextType | undefined>(undefined);

export function CashFlowProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [initialBalance, setInitialBalanceState] = useState<InitialBalance | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      refreshData();
    } else {
      setInitialBalanceState(null);
      setTransactions([]);
      setLoading(false);
    }
  }, [user]);

  const refreshData = async () => {
    if (!user) return;

    setLoading(true);

    const [balanceResult, transactionsResult] = await Promise.all([
      supabase
        .from('initial_balances')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle(),
      supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
    ]);

    if (balanceResult.error) {
      console.error('Error fetching initial balance:', balanceResult.error);
    } else {
      setInitialBalanceState(balanceResult.data);
    }

    if (transactionsResult.error) {
      console.error('Error fetching transactions:', transactionsResult.error);
    } else {
      setTransactions(transactionsResult.data || []);
    }

    setLoading(false);
  };

  const setInitialBalance = async (amount: number) => {
    if (!user) return { error: new Error('User not authenticated') };

    try {
      if (initialBalance) {
        const { error } = await supabase
          .from('initial_balances')
          .update({ amount })
          .eq('id', initialBalance.id);

        if (error) throw error;

        setInitialBalanceState({ ...initialBalance, amount });
      } else {
        const { data, error } = await supabase
          .from('initial_balances')
          .insert([{ user_id: user.id, amount }])
          .select()
          .single();

        if (error) throw error;
        setInitialBalanceState(data);
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const addTransaction = async (transaction: Omit<Transaction, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) return { error: new Error('User not authenticated') };

    try {
      const { data, error } = await supabase
        .from('transactions')
        .insert([{ ...transaction, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;

      setTransactions([data, ...transactions]);
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const updateTransaction = async (id: string, updates: Partial<Transaction>) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      setTransactions(transactions.map(t => t.id === id ? { ...t, ...updates } : t));
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const deleteTransaction = async (id: string) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setTransactions(transactions.filter(t => t.id !== id));
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  return (
    <CashFlowContext.Provider
      value={{
        initialBalance,
        transactions,
        loading,
        setInitialBalance,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        refreshData,
      }}
    >
      {children}
    </CashFlowContext.Provider>
  );
}

export function useCashFlow() {
  const context = useContext(CashFlowContext);
  if (context === undefined) {
    throw new Error('useCashFlow must be used within a CashFlowProvider');
  }
  return context;
}
