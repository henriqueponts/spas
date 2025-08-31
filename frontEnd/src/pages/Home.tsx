"use client"

import type React from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"
import Header from "../components/Header"
import { Users, Calendar, UserPlus, Search } from "lucide-react"

const Home: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  const isDirectorOrCoordinator = user.cargo_nome === "DIRETOR" || user.cargo_nome === "COORDENADOR"

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Welcome Section */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Bem-vindo(a), {user.nome.split(" ")[0]}!</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">Escolha uma das opções abaixo para começar</p>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {/* Nova Família */}
          <button
            onClick={() => navigate("/cadastro-familia")}
            className="flex flex-col items-center justify-center p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 group"
          >
            <div className="p-3 bg-blue-100 text-blue-600 rounded-full mb-4 transition-colors duration-300 group-hover:bg-blue-200">
              <UserPlus size={48} strokeWidth={1.5} />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Nova Família</h2>
            <p className="text-sm text-gray-500 text-center">Cadastrar nova família no sistema</p>
          </button>

          {/* Buscar Família */}
          <button
            onClick={() => navigate("/familias")}
            className="flex flex-col items-center justify-center p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 group"
          >
            <div className="p-3 bg-green-100 text-green-600 rounded-full mb-4 transition-colors duration-300 group-hover:bg-green-200">
              <Search size={48} strokeWidth={1.5} />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Buscar Família</h2>
            <p className="text-sm text-gray-500 text-center">Localizar prontuários existentes</p>
          </button>

          {/* Benefícios */}
          <button
            onClick={() => navigate("/beneficios")}
            className="flex flex-col items-center justify-center p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 group"
          >
            <div className="p-3 bg-purple-100 text-purple-600 rounded-full mb-4 transition-colors duration-300 group-hover:bg-purple-200">
              <Calendar size={48} strokeWidth={1.5} />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Benefícios</h2>
            <p className="text-sm text-gray-500 text-center">Gerenciar benefícios eventuais</p>
          </button>

          {/* Gestão de Usuários (Apenas para Diretor ou Coordenador) */}
          {isDirectorOrCoordinator && (
            <button
              onClick={() => navigate("/usuarios")}
              className="flex flex-col items-center justify-center p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 group"
            >
              <div className="p-3 bg-orange-100 text-orange-600 rounded-full mb-4 transition-colors duration-300 group-hover:bg-orange-200">
                <Users size={48} strokeWidth={1.5} />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Gestão de Usuários</h2>
              <p className="text-sm text-gray-500 text-center">Criar/Alterar/Inativar usuários do sistema</p>
            </button>
          )}
        </div>
      </main>
    </div>
  )
}

export default Home
