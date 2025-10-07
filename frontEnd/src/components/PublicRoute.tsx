// src/components/PublicRoute.tsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface PublicRouteProps {
  children: React.ReactNode;
}

export const PublicRoute: React.FC<PublicRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();

  // Enquanto está carregando, mostra um spinner
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Se o usuário está autenticado, redireciona para a rota raiz ("/")
  // Isso permite que o RootRedirect (em App.tsx) use o CargoRoutes
  // e envie o usuário externo (cargo 5) para /beneficios.
  if (user) {
    return <Navigate to="/" replace />; // <--- LINHA CORRIGIDA
  }

  // Se não está autenticado, mostra a página pública (login)
  return <>{children}</>;
};