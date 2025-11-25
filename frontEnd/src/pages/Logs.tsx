"use client"

import type React from "react"
import { useState, useEffect, useMemo } from "react"
import { useAuth } from "../contexts/AuthContext"
import Header from "../components/Header"
import api from "../services/api"
import {
  Search,
  Filter,
  Calendar,
  User,
  FileText,
  Activity,
  ChevronDown,
  ChevronUp,
  Clock,
  MapPin,
  AlertCircle,
  CheckCircle,
  XCircle,
  LogIn,
  LogOut,
  Edit,
  Plus,
  Trash2,
  Package,
  UserX,
  Loader2,
} from "lucide-react"

interface Log {
  id: number
  tipo_log: string
  entidade: string
  entidade_id: number | null
  descricao: string
  ip_address: string | null
  created_at: string
  usuario_nome: string
  usuario_cpf: string
  cargo_nome: string
  equipamento_nome: string
  familia_prontuario?: string
  familia_responsavel?: string
}

interface Alteracao {
  id: number
  campo: string
  valor_antigo: string | null
  valor_novo: string | null
  created_at: string
}

interface LogDetalhado extends Log {
  alteracoes?: Alteracao[]
}

interface Usuario {
  id: number
  nome: string
  cargo_nome: string
}

const Logs: React.FC = () => {
  const { user } = useAuth()
  const [logs, setLogs] = useState<Log[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [filtroTipo, setFiltroTipo] = useState("todos")
  const [filtroEntidade, setFiltroEntidade] = useState("todos")
  const [filtroUsuario, setFiltroUsuario] = useState("todos")
  const [dataInicio, setDataInicio] = useState("")
  const [dataFim, setDataFim] = useState("")
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [logExpandido, setLogExpandido] = useState<number | null>(null)
  const [detalhesLog, setDetalhesLog] = useState<{ [key: number]: LogDetalhado }>({})
  const [total, setTotal] = useState(0)
  const [limite] = useState(50)
  const [offset, setOffset] = useState(0)

  const hasPermission = useMemo(() => user?.cargo_nome === "DIRETOR" || user?.cargo_nome === "COORDENADOR", [user])

  useEffect(() => {
    if (!hasPermission) {
      setLoading(false)
      return
    }
    carregarDados()
  }, [filtroTipo, filtroEntidade, filtroUsuario, dataInicio, dataFim, offset, hasPermission])

  useEffect(() => {
    if (!hasPermission) {
      return
    }
    carregarUsuarios()
  }, [hasPermission])

  const carregarDados = async () => {
    try {
      setLoading(true)
      setError("")

      const params = new URLSearchParams()
      if (filtroTipo !== "todos") params.append("tipo_log", filtroTipo)
      if (filtroEntidade !== "todos") params.append("entidade", filtroEntidade)
      if (filtroUsuario !== "todos") params.append("usuario_id", filtroUsuario)
      if (dataInicio) params.append("data_inicio", dataInicio)
      if (dataFim) params.append("data_fim", dataFim)
      params.append("limite", limite.toString())
      params.append("offset", offset.toString())

      const response = await api.get(`/auth/logs?${params.toString()}`)
      setLogs(response.data.logs)
      setTotal(response.data.total)
    } catch (err: unknown) {
      console.error("Erro ao carregar logs:", err)
      setError("Não foi possível carregar os logs. Verifique se o servidor está rodando.")
    } finally {
      setLoading(false)
    }
  }

  const carregarUsuarios = async () => {
    try {
      const response = await api.get("/auth/logs/usuarios/lista")
      setUsuarios(response.data)
    } catch (err) {
      console.error("Erro ao carregar usuários:", err)
    }
  }

  const carregarDetalhesLog = async (logId: number) => {
    if (detalhesLog[logId]) {
      setLogExpandido(logExpandido === logId ? null : logId)
      return
    }

    try {
      const response = await api.get(`/auth/logs/${logId}`)
      setDetalhesLog((prev) => ({
        ...prev,
        [logId]: { ...response.data.log, alteracoes: response.data.alteracoes },
      }))
      setLogExpandido(logId)
    } catch (err) {
      console.error("Erro ao carregar detalhes do log:", err)
    }
  }

  const logsFiltrados = logs.filter((log) => {
    if (!searchTerm) return true
    const termo = searchTerm.toLowerCase()
    return (
      log.descricao.toLowerCase().includes(termo) ||
      log.usuario_nome.toLowerCase().includes(termo) ||
      log.equipamento_nome.toLowerCase().includes(termo) ||
      log.tipo_log.toLowerCase().includes(termo) ||
      log.entidade.toLowerCase().includes(termo)
    )
  })

  const getIconeTipo = (tipo: string) => {
    switch (tipo) {
      case "login":
        return <LogIn className="w-5 h-5" />
      case "logout":
        return <LogOut className="w-5 h-5" />
      case "criacao":
        return <Plus className="w-5 h-5" />
      case "atualizacao":
        return <Edit className="w-5 h-5" />
      case "entrega":
        return <Package className="w-5 h-5" />
      case "cancelamento":
        return <XCircle className="w-5 h-5" />
      case "inativacao":
        return <Trash2 className="w-5 h-5" />
      case "ativacao":
        return <CheckCircle className="w-5 h-5" />
      default:
        return <Activity className="w-5 h-5" />
    }
  }

  const getCorTipo = (tipo: string) => {
    switch (tipo) {
      case "login":
        return "bg-green-100 text-green-700 border-green-200"
      case "logout":
        return "bg-gray-100 text-gray-700 border-gray-200"
      case "criacao":
        return "bg-blue-100 text-blue-700 border-blue-200"
      case "atualizacao":
        return "bg-yellow-100 text-yellow-700 border-yellow-200"
      case "entrega":
        return "bg-purple-100 text-purple-700 border-purple-200"
      case "cancelamento":
        return "bg-red-100 text-red-700 border-red-200"
      case "inativacao":
        return "bg-orange-100 text-orange-700 border-orange-200"
      case "ativacao":
        return "bg-teal-100 text-teal-700 border-teal-200"
      default:
        return "bg-gray-100 text-gray-700 border-gray-200"
    }
  }

  const formatarTipo = (tipo: string) => {
    const tipos: { [key: string]: string } = {
      login: "Login",
      logout: "Logout",
      criacao: "Criação",
      atualizacao: "Atualização",
      entrega: "Entrega",
      cancelamento: "Cancelamento",
      inativacao: "Inativação",
      ativacao: "Ativação",
    }
    return tipos[tipo] || tipo
  }

  const formatarEntidade = (entidade: string) => {
    const entidades: { [key: string]: string } = {
      usuario: "Usuário",
      familia: "Família",
      pessoa: "Pessoa",
      beneficio: "Benefício",
      autorizacao_beneficio: "Autorização de Benefício",
      evolucao: "Evolução",
      encaminhamento: "Encaminhamento",
      endereco: "Endereço",
      saude: "Saúde",
      habitacao: "Habitação",
      trabalho_renda: "Trabalho e Renda",
      programa_social: "Programa Social",
      despesa: "Despesa",
      situacao_social: "Situação Social",
      servico_publico: "Serviço Público",
    }
    return entidades[entidade] || entidade
  }

  const formatarDataHora = (data: string) => {
    return new Date(data).toLocaleString("pt-BR")
  }

  const formatarCampo = (campo: string) => {
    return campo
      .split("_")
      .map((palavra) => palavra.charAt(0).toUpperCase() + palavra.slice(1))
      .join(" ")
  }

  const limparFiltros = () => {
    setFiltroTipo("todos")
    setFiltroEntidade("todos")
    setFiltroUsuario("todos")
    setDataInicio("")
    setDataFim("")
    setSearchTerm("")
    setOffset(0)
  }

  const paginaAnterior = () => {
    if (offset > 0) {
      setOffset(offset - limite)
    }
  }

  const proximaPagina = () => {
    if (offset + limite < total) {
      setOffset(offset + limite)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100">
        <Header />
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
        </div>
      </div>
    )
  }

  if (!hasPermission) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100">
        <Header />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <UserX size={64} className="mx-auto text-gray-400 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Acesso Negado</h2>
            <p className="text-gray-600">Você não tem permissão para acessar esta página.</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100">
        <Header />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Ops! Algo deu errado</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={carregarDados}
              className="bg-red-500 text-white px-6 py-3 rounded-lg hover:bg-red-600 transition-colors font-medium"
            >
              Tentar Novamente
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <Header />
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8 border border-gray-100">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
            <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2 py-2">
                Logs do Sistema
              </h1>
              <p className="text-gray-600 text-lg">Visualize todas as atividades e alterações do sistema</p>
            </div>
            <div className="mt-4 lg:mt-0 flex items-center gap-2">
              <div className="bg-blue-50 px-4 py-2 rounded-lg border border-blue-200">
                <p className="text-sm text-gray-600">
                  Total: <span className="font-bold text-blue-600">{total}</span> registros
                </p>
              </div>
            </div>
          </div>

          {/* Filtros */}
          <div className="space-y-4">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por descrição, usuário, equipamento..."
                  className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <select
                  value={filtroTipo}
                  onChange={(e) => {
                    setFiltroTipo(e.target.value)
                    setOffset(0)
                  }}
                  className="w-full pl-10 pr-8 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 hover:bg-white transition-all duration-200 appearance-none cursor-pointer"
                >
                  <option value="todos">Todos os Tipos</option>
                  <option value="login">Login</option>
                  <option value="criacao">Criação</option>
                  <option value="atualizacao">Atualização</option>
                  <option value="entrega">Entrega</option>
                  <option value="cancelamento">Cancelamento</option>
                </select>
              </div>

              <div className="relative">
                <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <select
                  value={filtroEntidade}
                  onChange={(e) => {
                    setFiltroEntidade(e.target.value)
                    setOffset(0)
                  }}
                  className="w-full pl-10 pr-8 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 hover:bg-white transition-all duration-200 appearance-none cursor-pointer"
                >
                  <option value="todos">Todas as Entidades</option>
                  <option value="usuario">Usuário</option>
                  <option value="familia">Família</option>
                  <option value="pessoa">Pessoa</option>
                  <option value="beneficio">Benefício</option>
                </select>
              </div>

              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <select
                  value={filtroUsuario}
                  onChange={(e) => {
                    setFiltroUsuario(e.target.value)
                    setOffset(0)
                  }}
                  className="w-full pl-10 pr-8 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 hover:bg-white transition-all duration-200 appearance-none cursor-pointer"
                >
                  <option value="todos">Todos os Usuários</option>
                  {usuarios.map((usuario) => (
                    <option key={usuario.id} value={usuario.id}>
                      {usuario.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => {
                    setDataInicio(e.target.value)
                    setOffset(0)
                  }}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 hover:bg-white transition-all duration-200"
                  placeholder="Data Início"
                />
              </div>

              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="date"
                  value={dataFim}
                  onChange={(e) => {
                    setDataFim(e.target.value)
                    setOffset(0)
                  }}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 hover:bg-white transition-all duration-200"
                  placeholder="Data Fim"
                />
              </div>
            </div>

            {(filtroTipo !== "todos" ||
              filtroEntidade !== "todos" ||
              filtroUsuario !== "todos" ||
              dataInicio ||
              dataFim ||
              searchTerm) && (
              <div className="flex justify-end">
                <button
                  onClick={limparFiltros}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-2"
                >
                  <XCircle className="w-4 h-4" />
                  Limpar Filtros
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Lista de Logs */}
        {logsFiltrados.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl shadow-lg">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Activity className="w-12 h-12 text-gray-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Nenhum log encontrado</h2>
            <p className="text-gray-600 mb-6">Tente ajustar os filtros de busca</p>
          </div>
        ) : (
          <div className="space-y-4">
            {logsFiltrados.map((log) => (
              <div
                key={log.id}
                className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden transition-all duration-300 hover:shadow-xl"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div
                        className={`w-12 h-12 rounded-lg flex items-center justify-center ${getCorTipo(log.tipo_log)}`}
                      >
                        {getIconeTipo(log.tipo_log)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium border ${getCorTipo(log.tipo_log)}`}
                          >
                            {formatarTipo(log.tipo_log)}
                          </span>
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                            {formatarEntidade(log.entidade)}
                          </span>
                          {log.entidade_id && <span className="text-xs text-gray-500"></span>}
                          {log.entidade === "familia" && (log.familia_responsavel || log.familia_prontuario) && (
                            <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-200">
                              {log.familia_responsavel || `Prontuário: ${log.familia_prontuario}`}
                            </span>
                          )}
                        </div>
                        <p className="text-gray-800 font-medium mb-3">{log.descricao}</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-400" />
                            <span>
                              {log.usuario_nome} ({log.cargo_nome})
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-gray-400" />
                            <span>{log.equipamento_nome}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-gray-400" />
                            <span>{formatarDataHora(log.created_at)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    {["atualizacao", "criacao", "entrega"].includes(log.tipo_log) && (
                      <button
                        onClick={() => carregarDetalhesLog(log.id)}
                        className="ml-4 p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        {logExpandido === log.id ? (
                          <ChevronUp className="w-5 h-5" />
                        ) : (
                          <ChevronDown className="w-5 h-5" />
                        )}
                      </button>
                    )}
                  </div>

                  {/* Detalhes de Alterações */}
                  {logExpandido === log.id && detalhesLog[log.id]?.alteracoes && (
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <h4 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                        <Edit className="w-4 h-4" />
                        Alterações Realizadas
                      </h4>
                      <div className="space-y-3">
                        {detalhesLog[log.id].alteracoes!.map((alteracao) => (
                          <div key={alteracao.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-700 mb-2">
                                  {formatarCampo(alteracao.campo)}
                                </p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <p className="text-xs text-gray-500 mb-1">Valor Anterior:</p>
                                    <p className="text-sm text-red-600 font-medium bg-red-50 px-3 py-2 rounded border border-red-200">
                                      {alteracao.valor_antigo || "(vazio)"}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-500 mb-1">Valor Novo:</p>
                                    <p className="text-sm text-green-600 font-medium bg-green-50 px-3 py-2 rounded border border-green-200">
                                      {alteracao.valor_novo || "(vazio)"}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Paginação */}
        {total > limite && (
          <div className="mt-8 bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <p className="text-sm text-gray-600">
                Mostrando <span className="font-medium text-gray-900">{offset + 1}</span> a{" "}
                <span className="font-medium text-gray-900">{Math.min(offset + limite, total)}</span> de{" "}
                <span className="font-medium text-gray-900">{total}</span> registros
              </p>
              <div className="flex gap-2">
                <button
                  onClick={paginaAnterior}
                  disabled={offset === 0}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  Anterior
                </button>
                <button
                  onClick={proximaPagina}
                  disabled={offset + limite >= total}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  Próxima
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Logs
