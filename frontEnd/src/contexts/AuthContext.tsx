// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import api from '../services/api';
import type { User } from '../types';

interface AuthContextData {
  user: User | null;
  loading: boolean;
  login: (userData: User, token: string) => void;
  logout: () => void;
}

// O contexto continua o mesmo
const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true); // Começa como true para validar a sessão

  // Função de logout centralizada e otimizada com useCallback
  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('usuario'); // Limpa também o usuário antigo, por segurança
    delete api.defaults.headers.common['Authorization'];
    
    // Redireciona para o login se não estiver lá
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  }, []);

  // Efeito para validar a sessão na inicialização do app
  useEffect(() => {
    const validateSession = async () => {
      const token = localStorage.getItem('token');

      // Se não há token, não há sessão para validar.
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        // Define o header para a chamada de validação
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        // Tenta buscar os dados do usuário. Se o token for inválido/expirado,
        // a API retornará 401, o interceptor do Axios será acionado e cairá no catch.
        console.log('🔄 Validando sessão existente...');
        const response = await api.get<User>('/auth/home');
        
        // Se a validação for bem-sucedida, atualiza o estado com dados frescos da API
        setUser(response.data);
        console.log('✅ Sessão validada com sucesso!');

      } catch {
        // Se a validação falhar (ex: token expirado), o interceptor do Axios já
        // deve ter iniciado o processo de logout. Aqui garantimos que o estado local seja limpo.
        console.warn('❌ Sessão inválida ou expirada. Fazendo logout.');
        logout();
      } finally {
        // Garante que o loading seja finalizado, permitindo a renderização do app
        setLoading(false);
      }
    };

    validateSession();
  }, [logout]); // A dependência `logout` é segura por causa do `useCallback`

  // Função de login atualizada
  const login = (userData: User, token: string) => {
    localStorage.setItem('token', token);
    // Não é mais estritamente necessário salvar o usuário no localStorage,
    // pois a validação na inicialização é a fonte da verdade.
    // Manter pode ser útil para uma exibição inicial rápida, mas vamos remover para garantir consistência.
    // localStorage.setItem('usuario', JSON.stringify(userData)); 
    
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setUser(userData);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook para usar o contexto (sem alterações)
// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};