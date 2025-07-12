"use client"

import type React from "react"
import { useState, useEffect, useMemo } from "react"
import { useAuth } from "../contexts/AuthContext"
import Header from "../components/Header"
import api from "../services/api"
import {
  UserPlus,
  Search,
  Filter,
  UserX,
  UserCheck,
  BadgeIcon as IdCard,
  MapPin,
  Calendar,
  Eye,
  EyeOff,
  Loader2,
  Key,
  X,
} from "lucide-react"
import { useNavigate } from "react-router-dom" // ✅ ADICIONADO: Importar useNavigate

// Interfaces (mantidas como estão)
interface Usuario {
  id: string
  nome: string
  cpf: string
  email?: string
  cargo_id: number
  cargo_nome: string
  equipamento_id: number
  equipamento_nome: string
  ativo: boolean
  created_at: string
  ultimo_login?: string
}



const Usuarios: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate() // ✅ ADICIONADO: Instanciar useNavigate
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  // const [cargos, setCargos] = useState<Cargo[]>([])
  // const [equipamentos, setEquipamentos] = useState<Equipamento[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [termoBusca, setTermoBusca] = useState("")
  const [filtroStatus, setFiltroStatus] = useState("todos")
  // ❌ REMOVIDO: Estado para controlar a visibilidade do modal de criação
  // const [mostrarModalCriar, setMostrarModalCriar] = useState(false)
  const [mostrarModalSenha, setMostrarModalSenha] = useState(false)
  const [usuarioSelecionado, setUsuarioSelecionado] = useState<Usuario | null>(null)
  const [novaSenha, setNovaSenha] = useState("")
  // const [mostrarSenha, setMostrarSenha] = useState(false)
  const [mostrarNovaSenha, setMostrarNovaSenha] = useState(false)

  // ❌ REMOVIDO: Estado para os dados do novo usuário
  // const [novoUsuario, setNovoUsuario] = useState({
  //   nome: "",
  //   cpf: "",
  //   email: "",
  //   cargo: "",
  //   equipamento: "",
  //   senha: "",
  // })

  // Lógica de permissão mais robusta com useMemo
  const hasPermission = useMemo(() => user?.cargo_nome === "DIRETOR", [user])

  // useEffect para buscar dados
  useEffect(() => {
    if (!hasPermission) {
      setCarregando(false)
      return
    }

    const carregarDados = async () => {
      setCarregando(true)
      setErro(null)
      try {
        console.log("🔍 Carregando dados da página de usuários com Axios...")

        const [usuariosRes] = await Promise.all([
          api.get("/auth/usuarios"),
          api.get("/auth/cargos"),
          api.get("/auth/equipamentos"),
        ])

        console.log("✅ Dados carregados com sucesso!")
        setUsuarios(usuariosRes.data)
        // setCargos(cargosRes.data)
        // setEquipamentos(equipamentosRes.data) // Corrigido para equipamentosRes.data
      } catch (error) {
        console.error("💥 Erro ao carregar dados:", error)
        setErro("Não foi possível carregar os dados. Tente recarregar a página.")
      } finally {
        setCarregando(false)
      }
    }

    carregarDados()
  }, [hasPermission])

  // Lógica de filtragem com useMemo para otimização
  const usuariosFiltrados = useMemo(() => {
    return usuarios.filter((usuario) => {
      const termo = termoBusca.toLowerCase()
      const correspondeTermoBusca =
        usuario.nome.toLowerCase().includes(termo) ||
        usuario.cpf.includes(termo) ||
        usuario.cargo_nome.toLowerCase().includes(termo) ||
        (usuario.email && usuario.email.toLowerCase().includes(termo))

      const correspondeStatus =
        filtroStatus === "todos" ||
        (filtroStatus === "ativo" && usuario.ativo) ||
        (filtroStatus === "inativo" && !usuario.ativo)

      return correspondeTermoBusca && correspondeStatus
    })
  }, [usuarios, termoBusca, filtroStatus])

  // Função para alterar status do usuário
  const alternarStatusUsuario = async (usuarioId: string) => {
    try {
      await api.put(`/auth/usuarios/${usuarioId}/status`)
      setUsuarios(usuarios.map((u) => (u.id === usuarioId ? { ...u, ativo: !u.ativo } : u)))
    } catch (error) {
      console.error("Erro ao alterar status:", error)
      alert("Erro ao alterar status do usuário")
    }
  }

  // Função para abrir modal de trocar senha
  const abrirModalSenha = (usuario: Usuario) => {
    setUsuarioSelecionado(usuario)
    setNovaSenha("")
    setMostrarModalSenha(true)
  }

  // Função para trocar senha
  const trocarSenha = async () => {
    if (!usuarioSelecionado || !novaSenha) return

    try {
      await api.put(`/auth/usuarios/${usuarioSelecionado.id}/senha`, {
        novaSenha: novaSenha,
      })

      setMostrarModalSenha(false)
      setUsuarioSelecionado(null)
      setNovaSenha("")
      alert("Senha alterada com sucesso!")
    } catch (error: unknown) {
      console.error("Erro ao trocar senha:", error)
      if (error && typeof error === "object" && "response" in error && error.response && typeof error.response === "object" && "data" in error.response && error.response.data && typeof error.response.data === "object" && "message" in error.response.data) {
        alert(error.response.data.message)
      } else {
        alert("Erro ao alterar senha")
      }
    }
  }

  // ❌ REMOVIDO: Função para criar usuário (agora a criação será em outra página)
  // const criarUsuario = async () => {
  //   try {
  //     await api.post("/auth/registro", {
  //       nome: novoUsuario.nome,
  //       cpf: novoUsuario.cpf.replace(/\D/g, ""),
  //       email: novoUsuario.email || null,
  //       cargo: Number.parseInt(novoUsuario.cargo),
  //       equipamento: Number.parseInt(novoUsuario.equipamento),
  //       senha: novoUsuario.senha,
  //     })

  //     // Recarregar lista de usuários
  //     const res = await api.get("/auth/usuarios")
  //     setUsuarios(res.data)

  //     setNovoUsuario({ nome: "", cpf: "", email: "", cargo: "", equipamento: "", senha: "" })
  //     setMostrarModalCriar(false)
  //     alert("Usuário criado com sucesso!")
  //   } catch (error: any) {
  //     console.error("Erro ao criar usuário:", error)
  //     alert(error.response?.data?.message || "Erro ao criar usuário")
  //   }
  // }

  // Funções de formatação
  const obterBadgeStatus = (ativo: boolean) => {
    return ativo ? "bg-green-100 text-green-800 border-green-200" : "bg-red-100 text-red-800 border-red-200"
  }
  const formatarCPF = (cpf: string) => {
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
  }
  const formatarData = (data: string) => {
    return new Date(data).toLocaleDateString("pt-BR")
  }
  const formatarDataHora = (data: string) => {
    return data ? new Date(data).toLocaleString("pt-BR") : "Nunca"
  }
  // ❌ REMOVIDO: formatarCPFInput não é mais necessário aqui, pois o formulário de criação foi movido
  // const formatarCPFInput = (value: string) => {
  //   return value
  //     .replace(/\D/g, "")
  //     .replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
  //     .substring(0, 14)
  // }

  // Renderização de Loading
  if (carregando) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100">
        <Header />
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
        </div>
      </div>
    )
  }

  // Renderização de Acesso Negado
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

  // Renderização de Erro
  if (erro) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100">
        <Header />
        <div className="flex items-center justify-center h-96">
          <div className="text-center text-red-600">
            <h2 className="text-xl font-semibold mb-2">Ocorreu um Erro</h2>
            <p>{erro}</p>
          </div>
        </div>
      </div>
    )
  }

  // Renderização Principal
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Seção do Cabeçalho */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Gestão de Usuários</h1>
              <p className="text-gray-600 mt-1">Gerencie usuários do sistema SPAS</p>
            </div>
            <button
              // ✅ MODIFICADO: O botão agora navega para uma nova rota para criar usuário
              onClick={() => navigate("/registro")}
              className="mt-4 md:mt-0 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <UserPlus size={20} />
              <span>Novo Usuário</span>
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por nome, CPF, email ou cargo..."
                  value={termoBusca}
                  onChange={(e) => setTermoBusca(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Filter size={20} className="text-gray-400" />
              <select
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="todos">Todos os Status</option>
                <option value="ativo">Ativos</option>
                <option value="inativo">Inativos</option>
              </select>
            </div>
          </div>
        </div>

        {/* Lista de Usuários */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Usuários ({usuariosFiltrados.length})</h2>
          </div>

          <div className="divide-y divide-gray-200">
            {usuariosFiltrados.map((usuario) => (
              <div key={usuario.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-medium text-lg">
                        {usuario.nome
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .substring(0, 2)}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h3 className="text-lg font-semibold text-gray-900">{usuario.nome}</h3>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium border ${obterBadgeStatus(usuario.ativo)}`}
                        >
                          {usuario.ativo ? "ATIVO" : "INATIVO"}
                        </span>
                      </div>
                      <div className="mt-1 space-y-1">
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <div className="flex items-center space-x-1">
                            <IdCard size={14} />
                            <span>CPF: {formatarCPF(usuario.cpf)}</span>
                          </div>
                          {usuario.email && (
                            <div className="flex items-center space-x-1">
                              <span>Email: {usuario.email}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <div className="flex items-center space-x-1">
                            <MapPin size={14} />
                            <span>{usuario.equipamento_nome}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Calendar size={14} />
                            <span>Cadastrado: {formatarData(usuario.created_at)}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <div className="flex items-center space-x-1">
                            <Calendar size={14} />
                            <span>Último login: {formatarDataHora(usuario.ultimo_login!)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="mt-2">
                        <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-sm font-medium">
                          {usuario.cargo_nome}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Botões de Ação */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => abrirModalSenha(usuario)}
                      className="flex items-center space-x-1 px-3 py-2 text-sm bg-yellow-100 text-yellow-800 hover:bg-yellow-200 rounded-lg transition-colors"
                    >
                      <Key size={16} />
                      <span>Trocar Senha</span>
                    </button>
                    <button
                      onClick={() => alternarStatusUsuario(usuario.id)}
                      className={`flex items-center space-x-1 px-3 py-2 text-sm rounded-lg transition-colors ${
                        usuario.ativo
                          ? "bg-red-100 text-red-800 hover:bg-red-200"
                          : "bg-green-100 text-green-800 hover:bg-green-200"
                      }`}
                    >
                      {usuario.ativo ? <UserX size={16} /> : <UserCheck size={16} />}
                      <span>{usuario.ativo ? "Inativar" : "Ativar"}</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {usuariosFiltrados.length === 0 && (
          <div className="text-center py-12">
            <UserX size={64} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum usuário encontrado</h3>
            <p className="text-gray-600">Tente ajustar os filtros de busca.</p>
          </div>
        )}
      </main>

      {/* ❌ REMOVIDO: O Modal Criar Usuário foi removido completamente */}
      {/* {mostrarModalCriar && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-gray-200 ring-1 ring-gray-900/5">
            <div className="relative p-8 pb-6">
              <button
                onClick={() => setMostrarModalCriar(false)}
                className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <UserPlus size={32} className="text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Criar Novo Usuário</h2>
                <p className="text-gray-600">Preencha os dados para criar um novo usuário no sistema</p>
              </div>
            </div>

            <div className="px-8 pb-8 space-y-6">
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Nome Completo *</label>
                  <input
                    type="text"
                    value={novoUsuario.nome}
                    onChange={(e) => setNovoUsuario({ ...novoUsuario, nome: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="Digite o nome completo"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">CPF *</label>
                  <input
                    type="text"
                    value={novoUsuario.cpf}
                    onChange={(e) => setNovoUsuario({ ...novoUsuario, cpf: formatarCPFInput(e.target.value) })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="000.000.000-00"
                    maxLength={14}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Email (opcional)</label>
                  <input
                    type="email"
                    value={novoUsuario.email}
                    onChange={(e) => setNovoUsuario({ ...novoUsuario, email: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="usuario@exemplo.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Cargo *</label>
                  <select
                    value={novoUsuario.cargo}
                    onChange={(e) => setNovoUsuario({ ...novoUsuario, cargo: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  >
                    <option value="">Selecione o cargo</option>
                    {cargos.map((cargo) => (
                      <option key={cargo.id} value={cargo.id}>
                        {cargo.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Equipamento *</label>
                  <select
                    value={novoUsuario.equipamento}
                    onChange={(e) => setNovoUsuario({ ...novoUsuario, equipamento: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  >
                    <option value="">Selecione o equipamento</option>
                    {equipamentos.map((equipamento) => (
                      <option key={equipamento.id} value={equipamento.id}>
                        {equipamento.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Senha Inicial *</label>
                  <div className="relative">
                    <input
                      type={mostrarSenha ? "text" : "password"}
                      value={novoUsuario.senha}
                      onChange={(e) => setNovoUsuario({ ...novoUsuario, senha: e.target.value })}
                      className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="Digite uma senha inicial"
                    />
                    <button
                      type="button"
                      onClick={() => setMostrarSenha(!mostrarSenha)}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {mostrarSenha ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex space-x-4 pt-4">
                <button
                  onClick={() => setMostrarModalCriar(false)}
                  className="flex-1 px-6 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={criarUsuario}
                  disabled={
                    !novoUsuario.nome ||
                    !novoUsuario.cpf ||
                    !novoUsuario.cargo ||
                    !novoUsuario.equipamento ||
                    !novoUsuario.senha
                  }
                  className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-xl font-medium transition-colors"
                >
                  Criar Usuário
                </button>
              </div>
            </div>
          </div>
        </div>
      )} */}

      {/* Modal Trocar Senha */}
      {mostrarModalSenha && usuarioSelecionado && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-gray-200 ring-1 ring-gray-900/5">
            {/* Header do Modal */}
            <div className="relative p-8 pb-6">
              <button
                onClick={() => setMostrarModalSenha(false)}
                className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
              <div className="text-center">
                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Key size={32} className="text-yellow-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Trocar Senha</h2>
                <p className="text-gray-600">
                  Definir nova senha para <strong>{usuarioSelecionado.nome}</strong>
                </p>
              </div>
            </div>

            {/* Formulário */}
            <div className="px-8 pb-8 space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Nova Senha *</label>
                <div className="relative">
                  <input
                    type={mostrarNovaSenha ? "text" : "password"}
                    value={novaSenha}
                    onChange={(e) => setNovaSenha(e.target.value)}
                    className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors"
                    placeholder="Digite a nova senha"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarNovaSenha(!mostrarNovaSenha)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {mostrarNovaSenha ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {/* Botões */}
              <div className="flex space-x-4 pt-4">
                <button
                  onClick={() => setMostrarModalSenha(false)}
                  className="flex-1 px-6 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={trocarSenha}
                  disabled={!novaSenha}
                  className="flex-1 px-6 py-3 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-300 text-white rounded-xl font-medium transition-colors"
                >
                  Alterar Senha
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Usuarios
