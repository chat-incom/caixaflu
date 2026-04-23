// src/contexts/AuthContext.tsx (VERSÃO OTIMIZADA)

import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, getCachedSession, clearSessionCache } from '../lib/supabase';

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
  const refreshingToken = useRef(false);

  const fetchUser = useCallback(async () => {
    if (!isMounted.current) return;
    
    try {
      // ✅ Usar sessão com cache
      const session = await getCachedSession();
      
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
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    fetchUser();

    // ✅ Listener otimizado
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth event:', event);
      
      // ✅ Ignorar token refresh para evitar recarregamento
      if (event === 'TOKEN_REFRESHED') {
        if (!refreshingToken.current) {
          refreshingToken.current = true;
          // Limpar cache e buscar nova sessão sem recarregar a página
          clearSessionCache();
          await getCachedSession();
          refreshingToken.current = false;
        }
        return;
      }
      
      // ✅ Para outros eventos, atualizar o estado
      if (isMounted.current) {
        setUser(session?.user ?? null);
        
        // Limpar cache em logout
        if (event === 'SIGNED_OUT') {
          clearSessionCache();
        }
      }
    });

    return () => {
      isMounted.current = false;
      subscription.unsubscribe();
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
        clearSessionCache(); // Limpar cache após login
        await fetchUser(); // Buscar usuário atualizado
      }
      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    clearSessionCache(); // Limpar cache antes de sair
    await supabase.auth.signOut();
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
