"use client"

import type React from "react"
import { useState, useEffect, useMemo } from "react"
import api from "../services/api"
import Header from "../components/Header"
import { Search, PlusCircle, List, Info, Loader2, History } from "lucide-react"
import { useAuth } from "../contexts/AuthContext"
import { Cargo } from "../types"
import { gerarReciboEntrega } from "./ReciboEntrega"

interface Familia {
  id: number
  responsavel_nome: string
  responsavel_cpf: string
  equipamento_nome: string
  prontuario: string
  endereco: string
  cidade: string
  uf: string
}

interface AutorizacaoDisponivel {
  id: number
  tipo_beneficio: string
  quantidade: number
  quantidade_disponivel: number
  data_autorizacao: string
  data_validade: string
  autorizador_nome: string
  justificativa: string
}

interface Beneficio {
  id: number
  familia_id: number
  responsavel_nome: string // Nome do responsável da família
  tipo_beneficio: string
  descricao_beneficio: string
  data_concessao: string
  valor: number
  justificativa: string
  status: string
  data_entrega: string
  observacoes: string
  prontuario: string // Prontuário da família
  responsavel_id: string // Nome do usuário que registrou o benefício (vindo da rota completa)
  created_at: string // Data de criação do registro do benefício
}

interface DadosBeneficio {
  familia_id: number
  autorizacao_id: number | null
  tipo_beneficio: string
  descricao_beneficio: string
  valor: number
  justificativa: string
  data_entrega: string
  observacoes: string
}

const BeneficiosPage: React.FC = () => {
  const { user } = useAuth()

  const [activeTab, setActiveTab] = useState<"nova-entrega" | "historico" | "detalhes-beneficio">("nova-entrega")
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [searchType, setSearchType] = useState("nome")
  const [families, setFamilies] = useState<Familia[]>([])
  const [selectedFamily, setSelectedFamily] = useState<Familia | null>(null)
  const [autorizacoesDisponiveis, setAutorizacoesDisponiveis] = useState<AutorizacaoDisponivel[]>([])
  const [selectedAutorizacao, setSelectedAutorizacao] = useState<AutorizacaoDisponivel | null>(null)
  const [historico, setHistorico] = useState<Beneficio[]>([])
  const [selectedBeneficioForDetails, setSelectedBeneficioForDetails] = useState<Beneficio | null>(null)
  const [message, setMessage] = useState("")
  const [messageType, setMessageType] = useState<"success" | "error" | "">("")
  const [historySearchTerm, setHistorySearchTerm] = useState("")
  const [historyFilterStatus, setHistoryFilterStatus] = useState("all")
  const [historyFilterType, setHistoryFilterType] = useState("all")
  const [historicoFamiliaId, setHistoricoFamiliaId] = useState<number | null>(null)
  const [historicoFamiliaNome, setHistoricoFamiliaNome] = useState<string>("")

  const [dadosBeneficio, setDadosBeneficio] = useState<DadosBeneficio>({
    familia_id: 0,
    autorizacao_id: null,
    tipo_beneficio: "",
    descricao_beneficio: "",
    valor: 0,
    justificativa: "",
    data_entrega: new Date().toISOString().split("T")[0],
    observacoes: "",
  })

  const podeVerHistoricoGeral = useMemo(() => {
    return user?.cargo_id !== Cargo.EXTERNO
  }, [user])

  useEffect(() => {
    if (podeVerHistoricoGeral) {
      fetchHistorico()
    }
  }, [podeVerHistoricoGeral])

  const showMessage = (msg: string, type: "success" | "error") => {
    setMessage(msg)
    setMessageType(type)
    setTimeout(() => {
      setMessage("")
      setMessageType("")
    }, 5000)
  }

  const fetchHistorico = async () => {
    try {
      const response = await api.get("/auth/beneficios/historico-completo")
      setHistorico(Array.isArray(response.data) ? response.data : [])
    } catch (error) {
      console.error("Erro ao buscar histórico:", error)
      showMessage("Erro ao carregar histórico de benefícios", "error")
    }
  }

  const fetchHistoricoFamilia = async (familiaId: number, familiaNome: string) => {
    try {
      setLoading(true)
      const response = await api.get(`/auth/beneficios/historico/familia/${familiaId}`)
      setHistorico(Array.isArray(response.data) ? response.data : [])
      setHistoricoFamiliaId(familiaId)
      setHistoricoFamiliaNome(familiaNome)
      setActiveTab("historico")
      showMessage(`Histórico da família ${familiaNome} carregado`, "success")
    } catch (error) {
      console.error("Erro ao buscar histórico da família:", error)
      showMessage("Erro ao carregar histórico da família", "error")
    } finally {
      setLoading(false)
    }
  }

  const voltarHistoricoGeral = () => {
    setHistoricoFamiliaId(null)
    setHistoricoFamiliaNome("")
    fetchHistorico()
  }

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      showMessage("Digite um termo para buscar", "error")
      return
    }
    setLoading(true)
    try {
      const response = await api.get(`/auth/familias/buscar?tipo=${searchType}&termo=${encodeURIComponent(searchTerm)}`)
      setFamilies(Array.isArray(response.data) ? response.data : [])
      if (response.data.length === 0) {
        showMessage("Nenhuma família encontrada", "error")
      }
    } catch (error) {
      console.error("Erro na busca:", error)
      showMessage("Erro ao buscar famílias", "error")
      setFamilies([])
    } finally {
      setLoading(false)
    }
  }

  const handleSelectFamily = async (family: Familia) => {
    setSelectedFamily(family)
    setSelectedAutorizacao(null)
    setDadosBeneficio((prev) => ({
      ...prev,
      familia_id: family.id,
      autorizacao_id: null,
      tipo_beneficio: "",
      justificativa: "",
    }))

    try {
      const response = await api.get(`/auth/familias/${family.id}/autorizacoes-beneficios/disponiveis`)
      setAutorizacoesDisponiveis(Array.isArray(response.data) ? response.data : [])
      if (response.data.length === 0) {
        showMessage("Esta família não possui benefícios autorizados no momento", "error")
      } else {
        showMessage(
          `Família ${family.responsavel_nome} selecionada. ${response.data.length} benefício(s) autorizado(s)`,
          "success",
        )
      }
    } catch (error) {
      console.error("Erro ao carregar autorizações:", error)
      showMessage("Erro ao carregar benefícios autorizados", "error")
      setAutorizacoesDisponiveis([])
    }
  }

  const handleSelectAutorizacao = (autorizacao: AutorizacaoDisponivel) => {
    setSelectedAutorizacao(autorizacao)
    setDadosBeneficio((prev) => ({
      ...prev,
      autorizacao_id: autorizacao.id,
      tipo_beneficio: autorizacao.tipo_beneficio,
      justificativa: autorizacao.justificativa,
    }))
    showMessage(`Benefício ${formatarTipoBeneficio(autorizacao.tipo_beneficio)} selecionado`, "success")
  }

  const validarFormulario = (): boolean => {
    if (!selectedFamily) {
      showMessage("Selecione uma família primeiro", "error")
      return false
    }
    if (!selectedAutorizacao) {
      showMessage("Selecione um benefício autorizado", "error")
      return false
    }
    if (!dadosBeneficio.tipo_beneficio) {
      showMessage("Selecione o tipo de benefício", "error")
      return false
    }
    return true
  }

  const salvarBeneficio = async (force = false) => {
    if (!validarFormulario()) return
    setLoading(true)
    try {
      const dadosParaEnviar = { ...dadosBeneficio, force }
      await api.post("/auth/beneficios", dadosParaEnviar)
      showMessage("Benefício entregue com sucesso!", "success")

      if (selectedFamily && selectedAutorizacao) {
        try {
          const familiaCompleta = await api.get(`/auth/familias/${selectedFamily.id}`)
          const dadosFamilia = familiaCompleta.data

          const enderecoCompleto = dadosFamilia.endereco
            ? `${dadosFamilia.endereco.logradouro || ""}, ${dadosFamilia.endereco.numero || "S/N"}${dadosFamilia.endereco.complemento ? ` - ${dadosFamilia.endereco.complemento}` : ""} - ${dadosFamilia.endereco.bairro || ""}`
            : selectedFamily.endereco || ""

          const cidade = dadosFamilia.endereco?.cidade || selectedFamily.cidade || ""
          const uf = dadosFamilia.endereco?.uf || selectedFamily.uf || ""

          gerarReciboEntrega({
            familia: {
              prontuario: selectedFamily.prontuario,
              responsavel_nome: selectedFamily.responsavel_nome,
              responsavel_cpf: selectedFamily.responsavel_cpf,
              endereco: enderecoCompleto,
              cidade: cidade,
              uf: uf,
            },
            beneficio: {
              tipo_beneficio: dadosBeneficio.tipo_beneficio,
              descricao: dadosBeneficio.descricao_beneficio,
              valor: dadosBeneficio.valor,
              data_entrega: dadosBeneficio.data_entrega,
              observacoes: dadosBeneficio.observacoes,
            },
            responsavel_entrega: {
              nome: user?.nome || "",
              cargo: user?.cargo_nome || "",
            },
          })
        } catch (error) {
          console.error("Erro ao buscar dados completos da família:", error)
          gerarReciboEntrega({
            familia: {
              prontuario: selectedFamily.prontuario,
              responsavel_nome: selectedFamily.responsavel_nome,
              responsavel_cpf: selectedFamily.responsavel_cpf,
              endereco: String(selectedFamily.endereco || ""),
              cidade: String(selectedFamily.cidade || ""),
              uf: String(selectedFamily.uf || ""),
            },
            beneficio: {
              tipo_beneficio: dadosBeneficio.tipo_beneficio,
              descricao: dadosBeneficio.descricao_beneficio,
              valor: dadosBeneficio.valor,
              data_entrega: dadosBeneficio.data_entrega,
              observacoes: dadosBeneficio.observacoes,
            },
            responsavel_entrega: {
              nome: user?.nome || "",
              cargo: user?.cargo_nome || "",
            },
          })
        }
      }

      if (selectedFamily) {
        try {
          const response = await api.get(`/auth/familias/${selectedFamily.id}/autorizacoes-beneficios/disponiveis`)
          setAutorizacoesDisponiveis(Array.isArray(response.data) ? response.data : [])

          if (response.data.length === 0) {
            showMessage("Todos os benefícios autorizados foram entregues para esta família", "success")
            setSelectedFamily(null)
            setFamilies([])
            setSearchTerm("")
          }
        } catch (error) {
          console.error("Erro ao recarregar autorizações:", error)
        }
      }

      setSelectedAutorizacao(null)
      setDadosBeneficio({
        familia_id: selectedFamily?.id || 0,
        autorizacao_id: null,
        tipo_beneficio: "",
        descricao_beneficio: "",
        valor: 0,
        justificativa: "",
        data_entrega: new Date().toISOString().split("T")[0],
        observacoes: "",
      })
      await fetchHistorico()
    } catch (error: any) {
      if (error.response?.status === 409 && error.response?.data?.requiresConfirmation) {
        const continuar = window.confirm(
          "ATENÇÃO: Esta família já recebeu um benefício este mês. Deseja registrar a entrega mesmo assim?",
        )
        if (continuar) {
          salvarBeneficio(true)
          return
        }
      } else {
        console.error("Erro ao salvar benefício:", error)
        let errorMessage = "Erro desconhecido"
        if (error?.response?.data?.message) {
          errorMessage = error.response.data.message
        } else if (error instanceof Error) {
          errorMessage = error.message
        }
        showMessage(`Erro ao registrar benefício: ${errorMessage}`, "error")
      }
    } finally {
      if (!force) {
        setLoading(false)
      }
    }
  }

  const handleViewDetails = (beneficio: Beneficio) => {
    setSelectedBeneficioForDetails(beneficio)
    setActiveTab("detalhes-beneficio")
  }

  const formatCPF = (cpf: string) => cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
  const formatDate = (dateString: string) => (dateString ? new Date(dateString).toLocaleDateString("pt-BR") : "N/A")
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)

  const formatarTipoBeneficio = (tipo: string) => {
    const tipos: Record<string, string> = {
      cesta_basica: "Cesta Básica",
      auxilio_funeral: "Auxílio Funeral",
      auxilio_natalidade: "Auxílio Natalidade",
      passagem: "Passagem",
      outro: "Outro",
    }
    return tipos[tipo] || tipo
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "entregue":
        return "bg-green-100 text-green-800 border-green-200"
      case "cancelado":
        return "bg-red-100 text-red-800 border-red-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "entregue":
        return "ENTREGUE"
      case "cancelado":
        return "CANCELADO"
      default:
        return status.toUpperCase()
    }
  }

  const tiposBeneficio = [
    { value: "cesta_basica", label: "Cesta Básica" },
    { value: "auxilio_funeral", label: "Auxílio Funeral" },
    { value: "auxilio_natalidade", label: "Auxílio Natalidade" },
    { value: "passagem", label: "Passagem" },
    { value: "outro", label: "Outro" },
  ]

  const searchOptions = [
    { value: "nome", label: "Responsável (Nome)" },
    { value: "cpf", label: "Responsável (CPF)" },
    { value: "prontuario", label: "Prontuário" },
    { value: "membro_nome", label: "Membro da Família (Nome)" },
    { value: "membro_cpf", label: "Membro da Família (CPF)" },
    { value: "membro_nis", label: "Membro da Família (NIS)" },
  ]

  const filteredHistorico = useMemo(() => {
    let currentHistorico = historico
    if (historySearchTerm) {
      const lowerCaseSearchTerm = historySearchTerm.toLowerCase()
      currentHistorico = currentHistorico.filter(
        (beneficio) =>
          beneficio.responsavel_nome.toLowerCase().includes(lowerCaseSearchTerm) ||
          (beneficio.prontuario && beneficio.prontuario.toLowerCase().includes(lowerCaseSearchTerm)) ||
          beneficio.tipo_beneficio.toLowerCase().includes(lowerCaseSearchTerm) ||
          (beneficio.descricao_beneficio &&
            beneficio.descricao_beneficio.toLowerCase().includes(lowerCaseSearchTerm)) ||
          beneficio.justificativa.toLowerCase().includes(lowerCaseSearchTerm) ||
          (beneficio.observacoes && beneficio.observacoes.toLowerCase().includes(lowerCaseSearchTerm)) ||
          (beneficio.responsavel_id && beneficio.responsavel_id.toLowerCase().includes(lowerCaseSearchTerm)),
      )
    }
    if (historyFilterStatus !== "all") {
      currentHistorico = currentHistorico.filter((beneficio) => beneficio.status === historyFilterStatus)
    }
    if (historyFilterType !== "all") {
      currentHistorico = currentHistorico.filter((beneficio) => beneficio.tipo_beneficio === historyFilterType)
    }
    return currentHistorico
  }, [historico, historySearchTerm, historyFilterStatus, historyFilterType])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Gestão de Benefícios</h1>
              <p className="text-gray-600 mt-1">Registre e consulte os benefícios concedidos</p>
            </div>
          </div>
        </div>

        {message && (
          <div
            className={`p-4 mb-6 rounded-lg text-center font-medium ${messageType === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
          >
            {message}
          </div>
        )}

        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-6">
            <button
              onClick={() => {
                setActiveTab("nova-entrega")
                setSelectedBeneficioForDetails(null)
              }}
              className={`flex items-center space-x-2 px-3 py-2 font-medium text-sm rounded-t-md transition-colors ${activeTab === "nova-entrega" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-500 hover:text-gray-700"}`}
            >
              <PlusCircle size={16} />
              <span>Nova Entrega</span>
            </button>
            {podeVerHistoricoGeral && (
              <button
                onClick={() => {
                  setActiveTab("historico")
                  setSelectedBeneficioForDetails(null)
                  if (historicoFamiliaId) {
                    voltarHistoricoGeral()
                  }
                }}
                className={`flex items-center space-x-2 px-3 py-2 font-medium text-sm rounded-t-md transition-colors ${activeTab === "historico" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-500 hover:text-gray-700"}`}
              >
                <List size={16} />
                <span>Histórico</span>
              </button>
            )}
            {selectedBeneficioForDetails && (
              <button
                onClick={() => setActiveTab("detalhes-beneficio")}
                className={`flex items-center space-x-2 px-3 py-2 font-medium text-sm rounded-t-md transition-colors ${activeTab === "detalhes-beneficio" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-500 hover:text-gray-700"}`}
              >
                <Info size={16} />
                <span>Detalhes do Benefício</span>
              </button>
            )}
          </nav>
        </div>

        {activeTab === "nova-entrega" && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">1. Buscar Família</h2>
              <div className="flex flex-col md:flex-row gap-4">
                <select
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full md:w-64"
                  value={searchType}
                  onChange={(e) => setSearchType(e.target.value)}
                >
                  {searchOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <div className="relative flex-1">
                  <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Digite o termo de busca..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") handleSearch()
                    }}
                  />
                </div>
                <button
                  onClick={handleSearch}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center justify-center space-x-2 transition-colors disabled:bg-gray-400"
                  disabled={loading}
                >
                  {loading ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
                  <span>{loading ? "Buscando..." : "Buscar"}</span>
                </button>
              </div>
              {families.length > 0 && (
                <div className="mt-6 divide-y divide-gray-200">
                  {families.map((family) => (
                    <div key={family.id} className="flex items-center justify-between py-4">
                      <div>
                        <p className="font-semibold text-gray-900">{family.responsavel_nome}</p>
                        <p className="text-sm text-gray-600">
                          CPF: {formatCPF(family.responsavel_cpf)} | Prontuário: {family.prontuario}
                        </p>
                        <p className="text-xs text-gray-500">Equipamento: {family.equipamento_nome}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSelectFamily(family)}
                          className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors"
                        >
                          Selecionar
                        </button>
                        <button
                          onClick={() => fetchHistoricoFamilia(family.id, family.responsavel_nome)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
                          title="Ver histórico desta família"
                        >
                          <History size={16} />
                          Histórico
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {selectedFamily && autorizacoesDisponiveis.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">2. Selecionar Benefício Autorizado</h2>
                <div className="space-y-3">
                  {autorizacoesDisponiveis.map((autorizacao) => (
                    <div
                      key={autorizacao.id}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        selectedAutorizacao?.id === autorizacao.id
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-blue-300"
                      }`}
                      onClick={() => handleSelectAutorizacao(autorizacao)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">
                            {formatarTipoBeneficio(autorizacao.tipo_beneficio)}
                          </h3>
                          <p className="text-sm text-gray-600 mt-1">
                            Quantidade disponível: {autorizacao.quantidade_disponivel}
                          </p>
                          <p className="text-sm text-gray-600">
                            Autorizado por: {autorizacao.autorizador_nome} em {formatDate(autorizacao.data_autorizacao)}
                          </p>
                          <p className="text-sm text-gray-600">Válido até: {formatDate(autorizacao.data_validade)}</p>
                          <p className="text-sm text-gray-700 mt-2">
                            <span className="font-medium">Justificativa:</span> {autorizacao.justificativa}
                          </p>
                        </div>
                        {selectedAutorizacao?.id === autorizacao.id && (
                          <div className="ml-4">
                            <div className="bg-blue-500 text-white rounded-full p-2">
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path
                                  fillRule="evenodd"
                                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {selectedFamily && autorizacoesDisponiveis.length > 0 ? "3" : "2"}. Registrar Entrega do Benefício
              </h2>
              {selectedFamily ? (
                <div className="mb-6 p-4 bg-blue-50 border-l-4 border-blue-400 text-blue-800 rounded-md">
                  <p className="font-bold">
                    Família Selecionada: {selectedFamily.responsavel_nome} (Prontuário: {selectedFamily.prontuario})
                  </p>
                  {selectedAutorizacao && (
                    <p className="mt-1">Benefício: {formatarTipoBeneficio(selectedAutorizacao.tipo_beneficio)}</p>
                  )}
                </div>
              ) : (
                <p className="text-gray-600 mb-6">
                  Nenhuma família selecionada. Por favor, busque e selecione uma família acima.
                </p>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  salvarBeneficio()
                }}
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
              >
                <div>
                  <label htmlFor="tipo_beneficio" className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de Benefício *
                  </label>
                  <input
                    type="text"
                    id="tipo_beneficio"
                    className="w-full p-2 border border-gray-300 rounded-lg bg-gray-100"
                    value={dadosBeneficio.tipo_beneficio ? formatarTipoBeneficio(dadosBeneficio.tipo_beneficio) : ""}
                    disabled
                    readOnly
                  />
                </div>
                <div>
                  <label htmlFor="valor" className="block text-sm font-medium text-gray-700 mb-1">
                    Valor (R$){" "}
                  </label>
                  <input
                    type="number"
                    id="valor"
                    className="w-full p-2 border border-gray-300 rounded-lg"
                    value={dadosBeneficio.valor}
                    onChange={(e) =>
                      setDadosBeneficio({ ...dadosBeneficio, valor: Number.parseFloat(e.target.value) || 0 })
                    }
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="descricao_beneficio" className="block text-sm font-medium text-gray-700 mb-1">
                    Descrição Detalhada (Opcional)
                  </label>
                  <input
                    type="text"
                    id="descricao_beneficio"
                    className="w-full p-2 border border-gray-300 rounded-lg"
                    value={dadosBeneficio.descricao_beneficio}
                    onChange={(e) => setDadosBeneficio({ ...dadosBeneficio, descricao_beneficio: e.target.value })}
                  />
                </div>
                <div>
                  <label htmlFor="data_entrega" className="block text-sm font-medium text-gray-700 mb-1">
                    Data de Entrega *
                  </label>
                  <input
                    type="date"
                    id="data_entrega"
                    className="w-full p-2 border border-gray-300 rounded-lg"
                    value={dadosBeneficio.data_entrega}
                    onChange={(e) => setDadosBeneficio({ ...dadosBeneficio, data_entrega: e.target.value })}
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="observacoes" className="block text-sm font-medium text-gray-700 mb-1">
                    Observações (Opcional)
                  </label>
                  <textarea
                    id="observacoes"
                    rows={2}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                    value={dadosBeneficio.observacoes}
                    onChange={(e) => setDadosBeneficio({ ...dadosBeneficio, observacoes: e.target.value })}
                  ></textarea>
                </div>
                <div className="md:col-span-2 text-right">
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:bg-gray-400"
                    disabled={loading || !selectedFamily || !selectedAutorizacao}
                  >
                    {loading ? "Registrando..." : "Registrar Entrega"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {activeTab === "historico" && (
          <div className="bg-white rounded-lg shadow-md">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {historicoFamiliaId ? `Histórico - ${historicoFamiliaNome}` : "Histórico de Benefícios"}
                  </h2>
                  {historicoFamiliaId && (
                    <p className="text-sm text-gray-600 mt-1">Mostrando apenas benefícios desta família</p>
                  )}
                </div>
                {historicoFamiliaId && podeVerHistoricoGeral && (
                  <button
                    onClick={voltarHistoricoGeral}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    Ver Histórico Geral
                  </button>
                )}
              </div>
              <div className="flex flex-col md:flex-row gap-4 mt-4">
                <div className="relative flex-1">
                  <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar no histórico..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
                    value={historySearchTerm}
                    onChange={(e) => setHistorySearchTerm(e.target.value)}
                  />
                </div>
                <select
                  className="border border-gray-300 rounded-lg px-3 py-2"
                  value={historyFilterStatus}
                  onChange={(e) => setHistoryFilterStatus(e.target.value)}
                >
                  <option value="all">Todos os Status</option>
                  <option value="entregue">Entregue</option>
                  <option value="cancelado">Cancelado</option>
                </select>
                <select
                  className="border border-gray-300 rounded-lg px-3 py-2"
                  value={historyFilterType}
                  onChange={(e) => setHistoryFilterType(e.target.value)}
                >
                  <option value="all">Todos os Tipos</option>
                  {tiposBeneficio.map((tipo) => (
                    <option key={tipo.value} value={tipo.value}>
                      {tipo.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Família</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Benefício</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entrega</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Registrado Por</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredHistorico.map((b) => (
                    <tr key={b.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{b.responsavel_nome}</div>
                        <div className="text-sm text-gray-500">Prontuário: {b.prontuario}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {tiposBeneficio.find((t) => t.value === b.tipo_beneficio)?.label || b.tipo_beneficio}
                        </div>
                        <div className="text-sm text-gray-500">{formatCurrency(b.valor)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusBadge(b.status)}`}
                        >
                          {getStatusLabel(b.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {b.data_entrega ? formatDate(b.data_entrega) : formatDate(b.data_concessao)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{b.responsavel_id || "N/A"}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-4">
                        <button onClick={() => handleViewDetails(b)} className="text-blue-600 hover:text-blue-800">
                          Detalhes
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredHistorico.length === 0 && (
                <p className="text-center text-gray-600 p-6">Nenhum benefício encontrado com os filtros atuais.</p>
              )}
            </div>
          </div>
        )}

        {activeTab === "detalhes-beneficio" && selectedBeneficioForDetails && (
          <div className="bg-white shadow-xl rounded-lg p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Detalhes do Benefício</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
              <div className="border-b py-2">
                <span className="font-semibold text-gray-700">Família:</span>{" "}
                {selectedBeneficioForDetails.responsavel_nome}
              </div>
              <div className="border-b py-2">
                <span className="font-semibold text-gray-700">Prontuário:</span>{" "}
                {selectedBeneficioForDetails.prontuario}
              </div>
              <div className="border-b py-2">
                <span className="font-semibold text-gray-700">Benefício:</span>{" "}
                {tiposBeneficio.find((t) => t.value === selectedBeneficioForDetails.tipo_beneficio)?.label ||
                  selectedBeneficioForDetails.tipo_beneficio}
              </div>
              <div className="border-b py-2">
                <span className="font-semibold text-gray-700">Valor:</span>{" "}
                {formatCurrency(selectedBeneficioForDetails.valor)}
              </div>
              <div className="border-b py-2">
                <span className="font-semibold text-gray-700">Data Entrega:</span>{" "}
                {selectedBeneficioForDetails.data_entrega
                  ? formatDate(selectedBeneficioForDetails.data_entrega)
                  : formatDate(selectedBeneficioForDetails.data_concessao)}
              </div>
              <div className="border-b py-2">
                <span className="font-semibold text-gray-700">Registrado por:</span>{" "}
                {selectedBeneficioForDetails.responsavel_id || "N/A"}
              </div>
              <div className="border-b py-2">
                <span className="font-semibold text-gray-700">Status:</span>{" "}
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusBadge(selectedBeneficioForDetails.status)}`}
                >
                  {getStatusLabel(selectedBeneficioForDetails.status)}
                </span>
              </div>
              {selectedBeneficioForDetails.descricao_beneficio && (
                <div className="md:col-span-2 border-b py-2">
                  <span className="font-semibold text-gray-700">Descrição:</span>{" "}
                  {selectedBeneficioForDetails.descricao_beneficio}
                </div>
              )}
              {selectedBeneficioForDetails.observacoes && (
                <div className="md:col-span-2 border-b py-2">
                  <span className="font-semibold text-gray-700">Observações:</span>{" "}
                  {selectedBeneficioForDetails.observacoes}
                </div>
              )}
            </div>
            <div className="mt-8 text-center">
              <button
                onClick={() => setActiveTab("historico")}
                className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 font-semibold"
              >
                Voltar ao Histórico
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default BeneficiosPage
