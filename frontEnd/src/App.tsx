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
    
    // Lista de rotas que todos podem acessar
    const publicRoutes = ['/acesso-negado', '/login'];
    
    // Lista de rotas compartilhadas ou com permissão específica
    const sharedRoutes = [
        '/', 
        '/home', 
        '/beneficios', 
        '/familias', 
        '/familias/cadastro',
        '/usuarios',   // <-- ADICIONE ESTA LINHA
        '/registro'    // <-- ADICIONE ESTA LINHA
    ];
    
    // Verifica se está em uma rota de família específica (ex: /familia/123)
    const isFamiliaRoute = location.pathname.startsWith('/familia/');
    
    // Se não está em uma rota permitida...
    if (!publicRoutes.includes(location.pathname) && 
        !sharedRoutes.includes(location.pathname) &&
        !isFamiliaRoute &&
        location.pathname !== allowedRoute) {
           
      // A lógica de redirecionamento aqui permanece a mesma
      if (location.pathname !== allowedRoute) {
        console.log(`[useCargoRedirect] Redirecionando de ${location.pathname} para /acesso-negado`);
        navigate('/acesso-negado', { replace: true });
      }
    }
  }, [user, location.pathname, navigate]);
};

// Componente para redirecionar da rota raiz (MANTIDO)
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

// Componente wrapper para aplicar o hook de redirecionamento (MANTIDO)
const AppContent: React.FC = () => {
  useCargoRedirect();

  return (
    <Routes>
      {/* --- ROTAS PÚBLICAS --- */}
      <Route 
        path="/login" 
        element={<PublicRoute><Login /></PublicRoute>} 
      />
      <Route path="/acesso-negado" element={<AcessoNegado />} />
      
      {/* --- ROTAS PROTEGIDAS (AGORA USANDO IDs) --- */}
      {/* Registro - apenas Diretores (ID 1) */}
      <Route 
        path="/registro" 
        element={
          <ProtectedRoute allowedRoles={[Cargo.DIRETOR]}>
            <Registro />
          </ProtectedRoute>
        } 
      />

      {/* Usuários - apenas Diretores (ID 1) */}
      <Route 
        path="/usuarios" 
        element={
          <ProtectedRoute allowedRoles={[Cargo.DIRETOR]}>
            <Usuarios />
          </ProtectedRoute>
        } 
      />

      {/* Rotas de Família (IDs 1, 2, 3, 4) */}
      <Route 
        path="/familias" 
        element={
          <ProtectedRoute allowedRoles={[
            Cargo.DIRETOR,
            Cargo.COORDENADOR,
            Cargo.TECNICO,
            Cargo.ASSISTENTE
          ]}>
            <Familias />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/familia/:id" 
        element={
          <ProtectedRoute allowedRoles={[
            Cargo.DIRETOR,
            Cargo.COORDENADOR,
            Cargo.TECNICO,
            Cargo.ASSISTENTE
          ]}>
            <VisualizarFamilia />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/familia/:id/editar" 
        element={
          <ProtectedRoute allowedRoles={[
            Cargo.DIRETOR,
            Cargo.COORDENADOR,
            Cargo.TECNICO,
            Cargo.ASSISTENTE
          ]}>
            <AlterarFamilia />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/familias/cadastro" 
        element={
          <ProtectedRoute allowedRoles={[
            Cargo.DIRETOR,
            Cargo.COORDENADOR,
            Cargo.TECNICO,
            Cargo.ASSISTENTE
          ]}>
            <CadastroFamilia />
          </ProtectedRoute>
        } 
      />
      
      {/* Home - todos os cargos internos (IDs 1, 2, 3, 4) */}
      <Route 
        path="/home" 
        element={
          <ProtectedRoute allowedRoles={[
            Cargo.DIRETOR,
            Cargo.COORDENADOR,
            Cargo.TECNICO,
            Cargo.ASSISTENTE
          ]}>
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

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;