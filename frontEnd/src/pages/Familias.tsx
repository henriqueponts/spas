"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Search, Filter, Plus, Users, MapPin, Phone, DollarSign, Calendar, FileText, Heart } from "lucide-react"
import api from "../services/api"
import Header from "../components/Header"

interface Responsavel {
  nome_completo: string
  cpf: string
  telefone: string
}

interface Endereco {
  logradouro: string
  numero: string
  bairro: string
  cidade: string
  uf: string
}

interface Integrante {
  nome_completo: string
  tipo_membro: string
}

interface TrabalhoRenda {
  rendimento_total: number
}

interface Familia {
  id: number
  prontuario: string
  data_cadastro: string
  data_atendimento: string
  situacao: string
  equipamento_nome: string
  equipamento_regiao: string
  profissional_nome: string
  responsavel: Responsavel
  endereco: Endereco
  integrantes: Integrante[]
  trabalho_renda: TrabalhoRenda
}

const Familias: React.FC = () => {
  const navigate = useNavigate()
  const [familias, setFamilias] = useState<Familia[]>([])
  const [familiasFiltradas, setFamiliasFiltradas] = useState<Familia[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [filtroSituacao, setFiltroSituacao] = useState("todos")

  useEffect(() => {
    carregarFamilias()
  }, [])

  useEffect(() => {
    filtrarFamilias()
  }, [searchTerm, filtroSituacao, familias])

  const carregarFamilias = async () => {
    try {
      setLoading(true)
      setError("")

      console.log("Buscando famílias...")
      const response = await api.get("/auth/familias")

      console.log("Resposta:", response.data)
      setFamilias(response.data)
      setFamiliasFiltradas(response.data)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error("Erro ao carregar famílias:", err)
      setError("Não foi possível carregar as famílias. Verifique se o servidor está rodando.")
    } finally {
      setLoading(false)
    }
  }

  const filtrarFamilias = () => {
    let filtradas = familias

    // Filtro por situação
    if (filtroSituacao !== "todos") {
      filtradas = filtradas.filter((familia) => familia.situacao === filtroSituacao)
    }

    // Filtro por termo de busca
    if (searchTerm) {
      const termo = searchTerm.toLowerCase()
      filtradas = filtradas.filter((familia) => {
        const cpfLimpo = familia.responsavel.cpf.replace(/[.-]/g, "")
        const termoLimpo = searchTerm.replace(/[.-]/g, "")

        return (
          familia.prontuario.toLowerCase().includes(termo) ||
          familia.responsavel.nome_completo.toLowerCase().includes(termo) ||
          cpfLimpo.includes(termoLimpo) ||
          familia.endereco.bairro.toLowerCase().includes(termo)
        )
      })
    }

    setFamiliasFiltradas(filtradas)
  }

  const verDetalhes = (id: number) => {
    navigate(`/familia/${id}`)
  }

  const formatarEndereco = (endereco: Endereco) => {
    if (!endereco.logradouro || endereco.logradouro === "Não informado") {
      return "Endereço não informado"
    }
    return `${endereco.logradouro}, ${endereco.numero} - ${endereco.bairro}`
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const formatarCPF = (cpf: string) => {
    if (!cpf || cpf === "Não informado") return cpf
    return cpf
  }

  const formatarTelefone = (telefone: string) => {
    if (!telefone || telefone === "Não informado") return "Não informado"
    return telefone
  }

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(valor)
  }

  const formatarData = (data: string) => {
    return new Date(data).toLocaleDateString("pt-BR")
  }


  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-2xl shadow-lg">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Carregando famílias...</h3>
          <p className="text-gray-600">Aguarde um momento</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-2xl shadow-lg max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Heart className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Ops! Algo deu errado</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={carregarFamilias}
            className="bg-red-500 text-white px-6 py-3 rounded-lg hover:bg-red-600 transition-colors font-medium"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    )
  }

  return (                                                                                                                                                                                                                                                                                                            
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <Header />
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header Moderno */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8 border border-gray-100">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
                Famílias Cadastradas
              </h1>
              <p className="text-gray-600 text-lg">Gerencie e acompanhe as famílias do sistema</p>
            </div>
            <button
              onClick={() => navigate("/familias/cadastro")}
              className="mt-4 lg:mt-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 flex items-center gap-2 font-medium shadow-lg hover:shadow-xl"
            >
              <Plus className="w-5 h-5" />
              Nova Família
            </button>
          </div>

          {/* Filtros e Busca */}
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por prontuário, CPF, nome ou bairro..."
                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white"
              />
            </div>
            <div className="flex gap-3">
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <select
                  value={filtroSituacao}
                  onChange={(e) => setFiltroSituacao(e.target.value)}
                  className="pl-10 pr-8 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 hover:bg-white transition-all duration-200 appearance-none cursor-pointer"
                >
                  <option value="todos">Todas</option>
                  <option value="ativo">Ativas</option>
                  <option value="inativo">Inativas</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Lista de famílias */}
        {familiasFiltradas.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl shadow-lg">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Users className="w-12 h-12 text-gray-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              {searchTerm || filtroSituacao !== "todos" ? "Nenhuma família encontrada" : "Nenhuma família cadastrada"}
            </h2>
            <p className="text-gray-600 mb-6">
              {searchTerm || filtroSituacao !== "todos"
                ? "Tente ajustar os filtros de busca"
                : "Comece cadastrando uma nova família"}
            </p>
            {!searchTerm && filtroSituacao === "todos" && (
              <button
                onClick={() => navigate("/familias/novo")}
                className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors font-medium"
              >
                Cadastrar Primeira Família
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {familiasFiltradas.map((familia) => (
              <div
                key={familia.id}
                className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden group cursor-pointer transform hover:-translate-y-1"
                onClick={() => verDetalhes(familia.id)}
              >
                {/* Header do Card */}
                <div className="p-6 pb-4 border-b border-gray-100">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-800 truncate mb-1">
                        {familia.responsavel.nome_completo}
                      </h3>
                      <p className="text-gray-500 text-sm">Prontuário: {familia.prontuario}</p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        familia.situacao === "ativo" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                      }`}
                    >
                      {familia.situacao === "ativo" ? "Ativa" : "Inativa"}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {formatarData(familia.data_cadastro)}
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {familia.integrantes.length + 1} pessoas
                    </div>
                  </div>
                </div>

                {/* Conteúdo do Card */}
                <div className="p-6 pt-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Phone className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Telefone</p>
                        <p className="font-medium text-gray-800 text-sm">
                          {formatarTelefone(familia.responsavel.telefone)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <DollarSign className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Renda</p>
                        <p className="font-medium text-gray-800 text-sm">
                          {formatarMoeda(familia.trabalho_renda.rendimento_total)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                      <MapPin className="w-5 h-5 text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Endereço</p>
                      <p className="font-medium text-gray-800 text-sm leading-relaxed">
                        {formatarEndereco(familia.endereco)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {familia.equipamento_nome} - {familia.equipamento_regiao}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Footer do Card */}
                <div className="px-6 pb-6">
                  <div className="flex gap-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        verDetalhes(familia.id)
                      }}
                      className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-xl hover:bg-blue-700 transition-colors text-sm font-medium flex items-center justify-center gap-2 group"
                    >
                      <FileText className="w-4 h-4 group-hover:scale-110 transition-transform" />
                      Prontuário
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate(`/beneficios`)
                      }}
                      className="flex-1 bg-gray-100 text-gray-700 px-4 py-3 rounded-xl hover:bg-gray-200 transition-colors text-sm font-medium flex items-center justify-center gap-2 group"
                    >
                      <FileText className="w-4 h-4 group-hover:scale-110 transition-transform" />
                      Benefícios
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Rodapé com informações */}
        {familiasFiltradas.length > 0 && (
          <div className="mt-8 bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between text-sm text-gray-600">
              <p>
                Mostrando <span className="font-medium text-gray-900">{familiasFiltradas.length}</span> de{" "}
                <span className="font-medium text-gray-900">{familias.length}</span> famílias
              </p>
              <p className="mt-2 lg:mt-0">Última atualização: {new Date().toLocaleString("pt-BR")}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Familias
