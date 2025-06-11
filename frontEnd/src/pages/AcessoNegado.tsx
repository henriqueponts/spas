// src/pages/AcessoNegado.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { CargoRoutes } from '../types';

const AcessoNegado: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleVoltar = () => {
    if (user) {
      // Redireciona para o dashboard correto do usuário
      const route = CargoRoutes[user.cargo_id as keyof typeof CargoRoutes];
      navigate(route || '/', { replace: true });
    } else {
      navigate('/login', { replace: true });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center">
          {/* Ícone de Alerta */}
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
            <svg 
              className="h-8 w-8 text-red-600" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
              />
            </svg>
          </div>
          
          {/* Título */}
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Acesso Negado
          </h2>
          
          {/* Mensagem */}
          <p className="text-gray-600 mb-6">
            Você não tem permissão para acessar esta página. 
            Entre em contato com o administrador do sistema se você acredita que deveria ter acesso.
          </p>
          
          {/* Informações do usuário */}
          {user && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
              <p className="text-sm text-gray-600">
                <span className="font-medium">Usuário:</span> {user.nome}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Cargo:</span> {user.cargo_nome || 'Não definido'}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Unidade:</span> {user.equipamento_nome || 'Não definida'}
              </p>
            </div>
          )}
          
          {/* Botão de Voltar */}
          <button
            onClick={handleVoltar}
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <svg 
              className="mr-2 h-5 w-5" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M10 19l-7-7m0 0l7-7m-7 7h18" 
              />
            </svg>
            Voltar para Área Segura
          </button>
        </div>
      </div>
    </div>
  );
};

export default AcessoNegado;