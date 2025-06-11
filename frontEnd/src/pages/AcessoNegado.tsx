// src/pages/AcessoNegado.tsx

import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { CargoRoutes } from '../types';

const AcessoNegado: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Determina a rota inicial do usuário logado, se houver
  const homeRoute = user ? CargoRoutes[user.cargo_id as keyof typeof CargoRoutes] || '/' : '/login';

  const handleGoBack = () => {
    // Tenta voltar para a página anterior. Se não for possível, vai para a home do usuário.
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate(homeRoute);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center text-center p-4">
      <div className="bg-white p-8 sm:p-12 rounded-lg shadow-xl max-w-md w-full">
        <div className="mx-auto w-24 h-24 flex items-center justify-center bg-red-100 rounded-full mb-6">
          {/* Ícone de "Pare" */}
          <svg
            className="w-16 h-16 text-red-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
            />
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Acesso Negado</h1>
        <p className="text-gray-600 mb-6">
          Você não tem permissão para visualizar esta página.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
<button
            onClick={handleGoBack}
            className="w-full sm:w-auto bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded-md transition duration-150"
          >
            Voltar
          </button>

          {/* Link "Página Inicial" estilizado como um botão */}
          <Link
            to={homeRoute}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-md transition duration-150 flex items-center justify-center"
          >
            Ir para a Página Inicial
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AcessoNegado;