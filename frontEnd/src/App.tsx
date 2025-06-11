// src/App.tsx

import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Contexto e Componentes de Rota
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';

// Tipos para Cargos
import { Cargo, CargoNames } from './types';

// Páginas Públicas
import Login from './pages/Login';
import AcessoNegado from './pages/AcessoNegado';


// Páginas Protegidas
import Registro from './pages/Registro';
import Home from './pages/Home'; // Supondo que você tenha uma página Home
import DashboardDiretor from './pages/dashboards/DashboardDiretor';
import DashboardCoordenador from './pages/dashboards/DashboardCoordenador';
import DashboardTecnico from './pages/dashboards/DashboardTecnico';
import DashboardAssistente from './pages/dashboards/DashboardAssistente';


function App() {
  return (
    // O AuthProvider envolve toda a aplicação para fornecer o contexto de autenticação
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* --- ROTAS PÚBLICAS --- */}
          {/* Rotas que não exigem login */}
          <Route path="/login" element={<Login />} />
          <Route path="/acesso-negado" element={<AcessoNegado />} />


          {/* --- ROTAS PROTEGIDAS --- */}
          {/* A página de Registro agora é protegida e só pode ser acessada por Diretores */}
          <Route 
            path="/registro" 
            element={
              <ProtectedRoute allowedRoles={[CargoNames[Cargo.DIRETOR]]}>
                <Registro />
              </ProtectedRoute>
            } 
          />

          {/* Rota principal/home, acessível por qualquer usuário logado */}
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            } 
          />

          {/* Dashboards específicos para cada cargo */}
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


          {/* Rota de fallback: se nenhuma rota corresponder, redireciona para o login */}
          <Route path="*" element={<Login />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;