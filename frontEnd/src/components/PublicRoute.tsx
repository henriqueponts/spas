// src/components/PublicRoute.tsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { CargoRoutes } from '../types';

interface PublicRouteProps {
  children: React.ReactNode;
}

export const PublicRoute: React.FC<PublicRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Carregando...</div>
      </div>
    );
  }

  // Se o usuário está logado, redireciona para o dashboard apropriado
  if (user) {
    const route = CargoRoutes[user.cargo_id];
    return <Navigate to={route || '/'} replace />;
  }

  // Se não está logado, mostra a página pública (login)
  return <>{children}</>;
};