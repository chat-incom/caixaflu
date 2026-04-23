import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { ClinicalMovement } from '../types/clinical';

export function useClinicalMovements(refreshTrigger: number = 0) {
  const [movements, setMovements] = useState<ClinicalMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMovements = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error: fetchError } = await supabase
        .from('clinical_financial_movements')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (fetchError) throw fetchError;
      setMovements(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar movimentos');
      console.error('Erro ao buscar movimentos:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMovements();
  }, [fetchMovements, refreshTrigger]);

  const deleteMovement = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('clinical_financial_movements')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Erro ao excluir:', error);
      return { success: false, error };
    }
  }, []);

  return { movements, loading, error, refetch: fetchMovements, deleteMovement };
}
