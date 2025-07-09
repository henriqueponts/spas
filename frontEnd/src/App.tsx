// src/App.tsx
import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
// Contexto e Componentes de Rota
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { PublicRoute } from './components/PublicRoute';
// Tipos para Cargos
import { Cargo, CargoNames, CargoRoutes } from './types';
// Páginas Públicas
import Login from './pages/Login';
import AcessoNegado from './pages/AcessoNegado';
// Páginas Protegidas
import Registro from './pages/Registro';
import Home from './pages/Home';
import Beneficios from './pages/Beneficios'; 
import CadastroFamilia from './pages/CadastroFamilia';
import VisualizarFamilia from './pages/VisualizarFamilia';
import DashboardDiretor from './pages/dashboards/DashboardDiretor';
import DashboardCoordenador from './pages/dashboards/DashboardCoordenador';
import DashboardTecnico from './pages/dashboards/DashboardTecnico';
import DashboardAssistente from './pages/dashboards/DashboardAssistente';
import Familias from './pages/Familias';

// Hook para proteger navegação baseado no cargo
const useCargoRedirect = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Se não há usuário ou está na página de login, não faz nada
    if (!user || location.pathname === '/login') {
      return;
    }

    const allowedRoute = CargoRoutes[user.cargo_id as keyof typeof CargoRoutes];
    
    // Lista de rotas que todos podem acessar
    const publicRoutes = ['/acesso-negado', '/login'];
    const sharedRoutes = ['/beneficios', '/home', '/', '/familias', '/cadastro/familia'];
    
    // Verifica se está em uma rota de família específica
    const isFamiliaRoute = location.pathname.startsWith('/familia/');
    
    // Se não está em uma rota permitida
    if (!publicRoutes.includes(location.pathname) && 
        !sharedRoutes.includes(location.pathname) &&
        !isFamiliaRoute &&
        location.pathname !== allowedRoute) {
      
      // Verifica se é uma rota de dashboard que não pertence ao usuário
      const isDashboardRoute = location.pathname.startsWith('/dashboard-');
      
      if (isDashboardRoute && location.pathname !== allowedRoute) {
        navigate('/acesso-negado', { replace: true });
      }
    }
  }, [user, location.pathname, navigate]);
};

// Componente para redirecionar da rota raiz
const RootRedirect: React.FC = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate('/login', { replace: true });
      } else {
        navigate('/familias', { replace: true });
      }
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return null;
};

// Componente wrapper para aplicar o hook de redirecionamento
const AppContent: React.FC = () => {
  useCargoRedirect();

  return (
    <Routes>
      {/* --- ROTAS PÚBLICAS --- */}
      {/* Login com proteção para usuários já autenticados */}
      <Route 
        path="/login" 
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        } 
      />
      
      {/* Acesso negado é uma rota especial que todos podem ver */}
      <Route path="/acesso-negado" element={<AcessoNegado />} />
      
      {/* --- ROTAS PROTEGIDAS --- */}
      {/* Registro - apenas Diretores */}
      <Route 
        path="/registro" 
        element={
          <ProtectedRoute allowedRoles={[CargoNames[Cargo.DIRETOR]]}>
            <Registro />
          </ProtectedRoute>
        } 
      />

      {/* Rotas de Família */}
      <Route 
        path="/familias" 
        element={
          <ProtectedRoute allowedRoles={[
            CargoNames[Cargo.DIRETOR],
            CargoNames[Cargo.COORDENADOR],
            CargoNames[Cargo.TECNICO],
            CargoNames[Cargo.ASSISTENTE]
          ]}>
            <Familias />
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/familia/:id" 
        element={
          <ProtectedRoute allowedRoles={[
            CargoNames[Cargo.DIRETOR],
            CargoNames[Cargo.COORDENADOR],
            CargoNames[Cargo.TECNICO],
            CargoNames[Cargo.ASSISTENTE]
          ]}>
            <VisualizarFamilia />
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/cadastro/familia" 
        element={
          <ProtectedRoute allowedRoles={[
            CargoNames[Cargo.DIRETOR],
            CargoNames[Cargo.COORDENADOR],
            CargoNames[Cargo.TECNICO],
            CargoNames[Cargo.ASSISTENTE]
          ]}>
            <CadastroFamilia />
          </ProtectedRoute>
        } 
      />
      
      {/* Home - todos os cargos internos (exceto EXTERNO) */}
      <Route 
        path="/home" 
        element={
          <ProtectedRoute allowedRoles={[
            CargoNames[Cargo.ASSISTENTE],
            CargoNames[Cargo.COORDENADOR],
            CargoNames[Cargo.DIRETOR],
            CargoNames[Cargo.TECNICO]
          ]}>
            <Home />
          </ProtectedRoute>
        } 
      />
      
      {/* Benefícios - acessível por qualquer usuário logado */}
      <Route 
        path="/beneficios" 
        element={
          <ProtectedRoute>
            <Beneficios />
          </ProtectedRoute>
        } 
      />
      
      {/* --- DASHBOARDS ESPECÍFICOS --- */}
      <Route 
        path="/dashboard-diretor" 
        element={
          <ProtectedRoute allowedRoles={[CargoNames[Cargo.DIRETOR]]}>
            <DashboardDiretor />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/dashboard-coordenador" 
        element={
          <ProtectedRoute allowedRoles={[CargoNames[Cargo.COORDENADOR]]}>
            <DashboardCoordenador />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/dashboard-tecnico" 
        element={
          <ProtectedRoute allowedRoles={[CargoNames[Cargo.TECNICO]]}>
            <DashboardTecnico />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/dashboard-assistente" 
        element={
          <ProtectedRoute allowedRoles={[CargoNames[Cargo.ASSISTENTE]]}>
            <DashboardAssistente />
          </ProtectedRoute>
        } 
      />
      
      {/* Rota raiz - redireciona baseado no cargo */}
      <Route path="/" element={<RootRedirect />} />
      
      {/* Rota de fallback: página 404 protegida */}
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

function App() {
  return (
    // O AuthProvider envolve toda a aplicação para fornecer o contexto de autenticação
    <AuthProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;