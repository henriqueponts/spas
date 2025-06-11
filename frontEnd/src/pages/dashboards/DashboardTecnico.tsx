// src/pages/dashboards/DashboardTecnico.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const DashboardTecnico: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navbar */}
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold">Dashboard Técnico</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {user?.nome}
              </span>
              <button
                onClick={handleLogout}
                className="text-sm text-red-600 hover:text-red-800 font-medium transition-colors"
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Info Card */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Bem-vindo(a), {user?.nome}
                </h2>
                <div className="space-y-2">
                  <p className="text-gray-600">
                    <span className="font-medium">Cargo:</span> TÉCNICO
                  </p>
                  <p className="text-gray-600">
                    <span className="font-medium">Unidade:</span> {user?.equipamento_nome || 'Não definida'}
                  </p>
                  <p className="text-gray-600">
                    <span className="font-medium">ID do Usuário:</span> {user?.id}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg text-gray-700 mb-2">
                  {formatDate(currentDateTime)}
                </p>
                <p className="text-3xl font-bold text-gray-900">
                  {formatTime(currentDateTime)}
                </p>
              </div>
            </div>
          </div>

          {/* Empty State */}
          <div className="bg-white rounded-lg shadow p-12">
            <div className="text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <h3 className="mt-2 text-lg font-medium text-gray-900">
                Área de Trabalho - Técnico
              </h3>
              <p className="mt-1 text-gray-500">
                Esta é sua área técnica. Em breve, você terá acesso a ferramentas de atendimento, 
                prontuários e registro de evoluções.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DashboardTecnico;