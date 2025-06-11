// src/App.tsx
import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { CargoRoutes } from './types';

// Importar páginas (você precisará criar estes arquivos)
import Login from './pages/Login';
import DashboardDiretor from './pages/dashboards/DashboardDiretor';
import DashboardCoordenador from './pages/dashboards/DashboardCoordenador';
import DashboardTecnico from './pages/dashboards/DashboardTecnico';
import DashboardAssistente from './pages/dashboards/DashboardAssistente';


// Componente para redirecionar da rota raiz
const RootRedirect: React.FC = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate('/login');
      } else {
        const route = CargoRoutes[user.cargo_id as keyof typeof CargoRoutes];
        navigate(route || '/login');
      }
    }
  }, [user, loading, navigate]);

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-lg">Carregando...</div>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Rota pública */}
          <Route path="/login" element={<Login />} />
          
          {/* Rotas protegidas por cargo */}
          <Route 
            path="/dashboard-diretor" 
            element={
              <ProtectedRoute allowedRoles={['DIRETOR']}>
                <DashboardDiretor />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/dashboard-coordenador" 
            element={
              <ProtectedRoute allowedRoles={['COORDENADOR']}>
                <DashboardCoordenador />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/dashboard-tecnico" 
            element={
              <ProtectedRoute allowedRoles={['TECNICO']}>
                <DashboardTecnico />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/dashboard-assistente" 
            element={
              <ProtectedRoute allowedRoles={['ASSISTENTE']}>
                <DashboardAssistente />
              </ProtectedRoute>
            } 
          />
          
          
          {/* Rota raiz - redireciona baseado no cargo */}
          <Route path="/" element={<RootRedirect />} />
          
          {/* Outras rotas protegidas */}
          <Route 
            path="/familias/buscar" 
            element={
              <ProtectedRoute allowedRoles={['DIRETOR', 'COORDENADOR', 'TECNICO', 'ASSISTENTE']}>
                {/* Importar componente real quando criado */}
                <div className="p-8">
                  <h1 className="text-2xl font-bold">Buscar Famílias</h1>
                  <p>Página em construção...</p>
                </div>
              </ProtectedRoute>
            } 
          />

          {/* Rota para páginas não encontradas */}
          <Route 
            path="*" 
            element={
              <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                  <h1 className="text-4xl font-bold text-gray-800 mb-4">404</h1>
                  <p className="text-gray-600">Página não encontrada</p>
                  <button 
                    onClick={() => window.history.back()}
                    className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    Voltar
                  </button>
                </div>
              </div>
            } 
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;