"use client"

import type React from "react"
import { useMemo } from "react"
import { useAuth } from "../contexts/AuthContext"
import { useNavigate } from "react-router-dom"
import { Users, UserPlus, BarChart3, Settings, File as Family, Search } from "lucide-react"

interface ActionCard {
  title: string
  description: string
  icon: React.ReactNode
  path: string
  color: string
  hoverColor: string
}

const QuickActions: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()

  const availableActions = useMemo((): ActionCard[] => {
    const actions: ActionCard[] = []

    // Actions available for all users
    actions.push({
      title: "Consultar Famílias",
      description: "Visualizar e pesquisar famílias cadastradas",
      icon: <Search size={24} />,
      path: "/familias",
      color: "bg-blue-50 text-blue-700",
      hoverColor: "hover:bg-blue-100",
    })

    // Actions for ASSISTENTE and TECNICO only (not DIRETOR)
    if (user?.cargo_nome === "ASSISTENTE" || user?.cargo_nome === "TECNICO") {
      actions.push({
        title: "Cadastrar Família",
        description: "Registrar nova família no sistema",
        icon: <Family size={24} />,
        path: "/cadastro-familia",
        color: "bg-green-50 text-green-700",
        hoverColor: "hover:bg-green-100",
      })
    }

    // Actions for DIRETOR and COORDENADOR
    if (user?.cargo_nome === "DIRETOR" || user?.cargo_nome === "COORDENADOR") {
      actions.push({
        title: "Gestão de Usuários",
        description: "Gerenciar usuários do sistema",
        icon: <Users size={24} />,
        path: "/usuarios",
        color: "bg-purple-50 text-purple-700",
        hoverColor: "hover:bg-purple-100",
      })

      actions.push({
        title: "Criar Usuário",
        description: "Cadastrar novo usuário no sistema",
        icon: <UserPlus size={24} />,
        path: "/registro",
        color: "bg-indigo-50 text-indigo-700",
        hoverColor: "hover:bg-indigo-100",
      })
    }

    // Actions only for DIRETOR
    if (user?.cargo_nome === "DIRETOR") {
      actions.push({
        title: "Relatórios Gerenciais",
        description: "Visualizar relatórios e estatísticas",
        icon: <BarChart3 size={24} />,
        path: "/relatorios",
        color: "bg-orange-50 text-orange-700",
        hoverColor: "hover:bg-orange-100",
      })

      actions.push({
        title: "Configurações",
        description: "Configurações gerais do sistema",
        icon: <Settings size={24} />,
        path: "/configuracoes",
        color: "bg-gray-50 text-gray-700",
        hoverColor: "hover:bg-gray-100",
      })
    }

    return actions
  }, [user?.cargo_nome])

  const handleActionClick = (path: string) => {
    navigate(path)
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {availableActions.map((action) => (
        <div
          key={action.title}
          onClick={() => handleActionClick(action.path)}
          className={`
            ${action.color} ${action.hoverColor}
            p-6 rounded-xl border border-gray-200 cursor-pointer 
            transition-all duration-200 transform hover:scale-105 hover:shadow-lg
            group
          `}
        >
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <div className="p-3 rounded-lg bg-white/50 group-hover:bg-white/80 transition-colors">{action.icon}</div>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold mb-2 group-hover:text-opacity-90">{action.title}</h3>
              <p className="text-sm opacity-80 group-hover:opacity-90">{action.description}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default QuickActions
