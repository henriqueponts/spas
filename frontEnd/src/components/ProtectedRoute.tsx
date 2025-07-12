// src/components/ProtectedRoute.tsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Cargo } from '../types'; // Importe o enum Cargo

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: number[]; // Vamos usar o ID do cargo (número)
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  allowedRoles 
}) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Se não há usuário, redireciona para o login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Se a rota tem cargos permitidos e o cargo do usuário não está na lista, nega o acesso
  if (allowedRoles && !allowedRoles.includes(user.cargo_id)) {
    console.log(`[ProtectedRoute] Acesso Negado! Cargo do usuário: ${user.cargo_id}. Cargos permitidos: [${allowedRoles.join(', ')}]`);
    return <Navigate to="/acesso-negado" replace />;
  }

  // Se passou por todas as verificações, permite o acesso
  return <>{children}</>;
};