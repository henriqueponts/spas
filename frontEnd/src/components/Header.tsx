"use client"

import React from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"
import { Home, Users, FileText, User, LogOut, ChevronDown, Menu, X } from "lucide-react"

const Header: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()
  const [showUserMenu, setShowUserMenu] = React.useState(false)
  const [showMobileMenu, setShowMobileMenu] = React.useState(false)

  const handleLogout = () => {
    logout()
    navigate("/login")
  }

  // ✅ MODIFICADO: isActiveRoute agora aceita uma string ou um array de strings
  const isActiveRoute = (paths: string | string[]) => {
    const pathArray = Array.isArray(paths) ? paths : [paths]
    return pathArray.some((path) => {
      // Verifica se a rota atual é exatamente o caminho OU começa com o caminho seguido de '/'
      return location.pathname === path || location.pathname.startsWith(path + "/")
    })
  }

  // Função para obter as classes CSS baseadas no estado ativo
  const getNavItemClasses = (paths: string | string[]) => {
    // ✅ MODIFICADO: Aceita string ou array
    const isActive = isActiveRoute(paths)
    return `flex items-center space-x-2 font-medium px-3 py-2 rounded-md transition-colors ${
      isActive
        ? "text-blue-600 bg-blue-50 hover:text-blue-700 hover:bg-blue-100"
        : "text-gray-600 hover:text-gray-700 hover:bg-gray-50"
    }`
  }

  // Função para obter as classes CSS do menu mobile
  const getMobileNavItemClasses = (paths: string | string[]) => {
    // ✅ MODIFICADO: Aceita string ou array
    const isActive = isActiveRoute(paths)
    return `flex items-center space-x-2 font-medium px-3 py-2 rounded-md w-full text-left transition-colors ${
      isActive
        ? "text-blue-600 bg-blue-50 hover:text-blue-700 hover:bg-blue-100"
        : "text-gray-600 hover:text-gray-700 hover:bg-gray-50"
    }`
  }

  if (!user) return null

  return (
    <header className="bg-white shadow-lg border-b border-gray-200">
      {/* Main header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Navigation */}
          <div className="flex items-center space-x-8">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">S</span>
              </div>
              <div className="hidden md:block">
                <h1 className="text-lg font-bold text-gray-900">SPAS</h1>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex space-x-6">
              <button onClick={() => navigate("/home")} className={getNavItemClasses("/home")}>
                <Home size={16} />
                <span>Início</span>
              </button>

              {/* ✅ MODIFICADO: Passando um array para o item "Famílias" */}
              <button onClick={() => navigate("/familias")} className={getNavItemClasses(["/familias", "/familia"])}>
                <Users size={16} />
                <span>Famílias</span>
              </button>

              <button onClick={() => navigate("/beneficios")} className={getNavItemClasses("/beneficios")}>
                <FileText size={16} />
                <span>Benefícios</span>
              </button>

              {(user.cargo_nome === "DIRETOR" || user.cargo_nome === "COORDENADOR") && (
                <button onClick={() => navigate("/usuarios")} className={getNavItemClasses(["/usuarios", "/registro"])}>
                  <User size={16} />
                  <span>Usuários</span>
                </button>
              )}
            </nav>
          </div>

          {/* Right side - User Menu only */}
          <div className="flex items-center space-x-4">
            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-3 p-2 text-gray-600 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <div className="text-left">
                  <p className="text-sm font-medium text-gray-900">{user.nome}</p>
                  <p className="text-xs text-gray-500">{user.cargo_nome}</p>
                </div>
                <ChevronDown size={16} />
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 z-20">
                  <div className="p-4 border-b border-gray-200">
                    <p className="font-medium text-gray-900">{user.nome}</p>
                    <p className="text-sm text-gray-500">{user.cargo_nome}</p>
                    <p className="text-xs text-gray-400">{user.equipamento_nome}</p>
                  </div>
                  <div className="py-2">
                    <button
                      onClick={handleLogout}
                      className="flex items-center space-x-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left"
                    >
                      <LogOut size={16} />
                      <span>Sair do Sistema</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="md:hidden p-2 text-gray-600 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              {showMobileMenu ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {showMobileMenu && (
          <div className="md:hidden border-t border-gray-200 py-4">
            <nav className="space-y-2">
              <button onClick={() => navigate("/home")} className={getMobileNavItemClasses("/home")}>
                <Home size={16} />
                <span>Início</span>
              </button>

              {/* ✅ MODIFICADO: Passando um array para o item "Famílias" no menu mobile */}
              <button
                onClick={() => navigate("/familias")}
                className={getMobileNavItemClasses(["/familias", "/familia"])}
              >
                <Users size={16} />
                <span>Famílias</span>
              </button>

              <button onClick={() => navigate("/beneficios")} className={getMobileNavItemClasses("/beneficios")}>
                <FileText size={16} />
                <span>Benefícios</span>
              </button>

              {(user.cargo_nome === "DIRETOR" || user.cargo_nome === "COORDENADOR") && (
                <button
                  onClick={() => navigate("/usuarios")}
                  className={getMobileNavItemClasses(["/usuarios", "/registro"])}
                >
                  <User size={16} />
                  <span>Usuários</span>
                </button>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}

export default Header
