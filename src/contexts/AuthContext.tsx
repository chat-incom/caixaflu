// src/contexts/AuthContext.tsx (VERSÃO SEM CACHE - MAIS SEGURA)

import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

type AuthContextType = {
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const isMounted = useRef(true);
  const isUpdating = useRef(false);

  const fetchUser = useCallback(async () => {
    if (!isMounted.current || isUpdating.current) return;
    
    isUpdating.current = true;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (isMounted.current) {
        setUser(session?.user ?? null);
      }
    } catch (error) {
      console.error('Erro ao buscar sessão:', error);
      if (isMounted.current) {
        setUser(null);
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
      isUpdating.current = false;
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    fetchUser();

    let refreshTimeout: NodeJS.Timeout;
    
    // ✅ Listener de autenticação sem cache
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth event:', event);
      
      // ✅ Ignorar token refresh para não recarregar a página
      if (event === 'TOKEN_REFRESHED') {
        // Não fazer nada - apenas ignorar
        return;
      }
      
      // ✅ Debounce para evitar múltiplas atualizações
      clearTimeout(refreshTimeout);
      refreshTimeout = setTimeout(() => {
        if (isMounted.current) {
          setUser(session?.user ?? null);
        }
      }, 100);
    });

    return () => {
      isMounted.current = false;
      subscription.unsubscribe();
      clearTimeout(refreshTimeout);
    };
  }, [fetchUser]);

  const signUp = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signUp({ email, password });
      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (!error) {
        await fetchUser();
      }
      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
