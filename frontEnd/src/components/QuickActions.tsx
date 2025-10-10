"use client"

import type React from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"
import { UserPlus, Search, ClipboardList, UserCog } from "lucide-react"

interface QuickAction {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  color: string
  onClick: () => void
  allowedRoles?: string[]
}

const QuickActions: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuth()

  const actions: QuickAction[] = [
    {
      id: "new-family",
      title: "Nova Família",
      description: "Cadastrar nova família no sistema",
      icon: <UserPlus size={24} />,
      color: "blue",
      onClick: () => navigate("/familias/cadastro"),
    },
    {
      id: "search-family",
      title: "Buscar Família",
      description: "Localizar prontuários existentes",
      icon: <Search size={24} />,
      color: "green",
      onClick: () => navigate("/familias"),
    },
    {
      id: "benefits",
      title: "Benefícios",
      description: "Gerenciar benefícios eventuais",
      icon: <ClipboardList size={24} />,
      color: "purple",
      onClick: () => navigate("/beneficios"),
    },
    {
      id: "user-management",
      title: "Gestão de Usuários",
      description: "Criar/Inativar usuários do sistema",
      icon: <UserCog size={24} />,
      color: "orange",
      onClick: () => navigate("/usuarios"), // <-- Correto
      allowedRoles: ["DIRETOR"],
    },
  ]

  const getColorClasses = (color: string) => {
    const colors = {
      blue: "bg-blue-100 text-blue-600 hover:bg-blue-200",
      green: "bg-green-100 text-green-600 hover:bg-green-200",
      purple: "bg-purple-100 text-purple-600 hover:bg-purple-200",
      orange: "bg-orange-100 text-orange-600 hover:bg-orange-200",
      indigo: "bg-indigo-100 text-indigo-600 hover:bg-indigo-200",
      pink: "bg-pink-100 text-pink-600 hover:bg-pink-200",
      teal: "bg-teal-100 text-teal-600 hover:bg-teal-200",
      red: "bg-red-100 text-red-600 hover:bg-red-200",
      cyan: "bg-cyan-100 text-cyan-600 hover:bg-cyan-200",
    }
    return colors[color as keyof typeof colors] || colors.blue
  }

  // Filtrar ações baseado no cargo do usuário
  const filteredActions = actions.filter((action) => {
    if (!action.allowedRoles) return true
    return action.allowedRoles.includes(user?.cargo_nome || "")
  })

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {filteredActions.map((action) => (
        <div
          key={action.id}
          onClick={action.onClick}
          className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-all duration-200 cursor-pointer group"
        >
          <div className="flex items-start space-x-4">
            <div
              className={`w-12 h-12 rounded-lg flex items-center justify-center transition-colors ${getColorClasses(action.color)}`}
            >
              {action.icon}
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                {action.title}
              </h3>
              <p className="text-sm text-gray-600 mt-1">{action.description}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default QuickActions
