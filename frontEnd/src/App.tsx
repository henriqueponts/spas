// src/App.tsx
import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
// Contexto e Componentes de Rota
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { PublicRoute } from './components/PublicRoute';
// Tipos para Cargos
import { Cargo, CargoRoutes } from './types'; // Mantenha Cargo e CargoRoutes
// Páginas Públicas
import Login from './pages/Login';
import AcessoNegado from './pages/AcessoNegado';
// Páginas Protegidas
import Registro from './pages/Registro';
import Home from './pages/Home';
import Beneficios from './pages/Beneficios'; 
import CadastroFamilia from './pages/CadastroFamilia';
import VisualizarFamilia from './pages/VisualizarFamilia';
import Familias from './pages/Familias';
import AlterarFamilia from './pages/AlterarFamilia';
import Usuarios from './pages/Usuarios';

// Hook para proteger navegação baseado no cargo (MANTIDO)

const useCargoRedirect = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!user || location.pathname === '/login') {
      return;
    }

    const allowedRoute = CargoRoutes[user.cargo_id as keyof typeof CargoRoutes];
    if (allowedRoute && location.pathname !== allowedRoute) {
      if (!location.pathname.includes('/acesso-negado')) {
        navigate(allowedRoute);
      }
    }
  }, [user, navigate, location]);
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
};

const AppRoutes: React.FC = () => {
  const { user } = useAuth();
  // Comentado para permitir que o usuário navegue para outras rotas permitidas
  // useCargoRedirect();

  return (
    <Routes>
      {/* Rotas Públicas */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route path="/acesso-negado" element={<AcessoNegado />} />

      {/* Rota de registro (APENAS DIRETOR E COORDENADOR PODEM ACESSAR) */}
      <Route
        path="/registro"
        element={
          <ProtectedRoute allowedRoles={[Cargo.DIRETOR, Cargo.COORDENADOR]}>
            <Registro />
          </ProtectedRoute>
        }
      />

      {/* Rota de listagem de usuários (APENAS DIRETOR E COORDENADOR PODEM ACESSAR) */}
      <Route
        path="/usuarios"
        element={
          <ProtectedRoute allowedRoles={[Cargo.DIRETOR, Cargo.COORDENADOR]}>
            <Usuarios />
          </ProtectedRoute>
        }
      />
      
      {/* Famílias - acessível por qualquer usuário logado (sem allowedRoles) */}
      <Route path="/familias" element={<ProtectedRoute><Familias /></ProtectedRoute>} />
      <Route path="/familias/:id" element={<ProtectedRoute><VisualizarFamilia /></ProtectedRoute>} />
      <Route path="/familias/:id/alterar" element={<ProtectedRoute><AlterarFamilia /></ProtectedRoute>} />
      <Route path="/cadastro-familia" element={<ProtectedRoute><CadastroFamilia /></ProtectedRoute>} />

      {/* Rotas Protegidas */}
      <Route
        path="/home"
        element={
          <ProtectedRoute
            allowedRoles={[
              Cargo.DIRETOR,
              Cargo.COORDENADOR,
              Cargo.TECNICO,
              Cargo.ASSISTENTE
            ]}
          >
            <Home />
          </ProtectedRoute>
        }
      />

      {/* Benefícios - acessível por qualquer usuário logado (sem allowedRoles) */}
      <Route
        path="/beneficios"
        element={<ProtectedRoute><Beneficios /></ProtectedRoute>}
      />

      {/* Rota raiz e fallback (MANTIDAS) */}
      <Route path="/" element={<RootRedirect />} />
      <Route
        path="*"
        element={
          <ProtectedRoute>
            <div className="flex items-center justify-center h-screen">
              <div className="text-center">
                <h1 className="text-4xl font-bold text-gray-800 mb-4">404</h1>
                <p className="text-gray-600 mb-4">Página não encontrada</p>
                <button
                  onClick={() => window.history.back()}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Voltar
                </button>
              </div>
            </div>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
};

// Funções auxiliares...
const RootRedirect: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      const homeRoute = CargoRoutes[user.cargo_id as keyof typeof CargoRoutes];
      if (homeRoute) {
        navigate(homeRoute, { replace: true });
      }
    } else {
      navigate('/login', { replace: true });
    }
  }, [user, navigate]);

  return null;
};

export default App;
