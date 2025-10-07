"use client"

/* eslint-disable @typescript-eslint/no-unused-vars */
import type React from "react"
import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import api from "../services/api"
import { useAuth } from "../contexts/AuthContext"

// --- COMPONENTES UI (Seus componentes customizados) ---
// Certifique-se de que os caminhos de importação correspondem à sua estrutura
import { Button } from "../components/ui/Button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/Card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/Tabs"
import { Badge } from "../components/ui/Badge"
import { Separator } from "../components/ui/Separator"

// --- ÍCONES (lucide-react) ---
import {
  ChevronLeft,
  User,
  Home,
  FileText,
  Calendar,
  Clock,
  Users,
  Heart,
  Briefcase,
  Pencil,
  Plus,
  X,
  Building,
  Gift,
} from "lucide-react"
import Header from "../components/Header"
import { gerarReciboAutorizacao } from "../pages/ReciboAutorizacao"

// --- INTERFACES DE DADOS (Mantidas) ---
interface Integrante {
  id: number
  nome_completo: string
  data_nascimento: string
  sexo: string
  cpf: string
  rg: string
  orgao_expedidor: string
  estado_civil: string
  escolaridade: string
  naturalidade: string
  telefone: string
  telefone_recado: string
  email: string
  nis: string
  titulo_eleitor: string
  ctps: string
  tipo_membro: string
  ocupacao: string
  renda_mensal: number
}

interface FamiliaCompleta {
  id: number
  prontuario: string
  data_cadastro: string
  data_atendimento: string
  situacao: string
  equipamento: { nome: string; regiao: string }
  profissional: { nome: string; cargo_nome: string }
  responsavel: Integrante
  endereco: {
    logradouro: string
    numero: string
    complemento: string
    bairro: string
    cidade: string
    uf: string
    cep: string
    referencia: string
    tempo_moradia: string
  }
  integrantes: Integrante[]
  saude: {
    tem_deficiencia: boolean
    deficiencia_qual: string
    tem_tratamento_saude: boolean
    tratamento_qual: string
    usa_medicacao_continua: boolean
    medicacao_qual: string
    tem_dependente_cuidados: boolean
    dependente_quem: string
    observacoes: string
  }
  habitacao: {
    qtd_comodos: number
    qtd_dormitorios: number
    tipo_construcao: string[]
    area_conflito: boolean
    condicao_domicilio: string[]
    energia_eletrica: string
    agua: string
    esgoto: string
    coleta_lixo: boolean
  }
  trabalho_renda: { quem_trabalha: string; rendimento_total: number; observacoes: string }
  programas_sociais: Array<{ programa_nome: string; programa_codigo: string; valor: number }>
  despesas: Array<{ tipo_nome: string; tipo_codigo: string; valor: number }>
  situacao_social: {
    participa_religiao: boolean
    religiao_qual: string
    participa_acao_social: boolean
    acao_social_qual: string
    servicos_publicos: string[]
    observacoes: string
  }
}

interface Evolucao {
  id: number
  familia_id: number
  usuario_id: number
  data_evolucao: string
  hora_evolucao: string
  descricao: string
  created_at: string
  updated_at: string
  usuario_nome?: string
  usuario_cargo?: string
}

interface LocalEncaminhamento {
  id: number
  nome: string
  created_at: string
  updated_at: string
}

interface Encaminhamento {
  id: number
  familia_id: number
  evolucao_id: number | null
  data_encaminhamento: string
  local_nome: string
  responsavel_nome: string
  created_at: string
}

interface AutorizacaoBeneficio {
  id: number
  familia_id: number
  tipo_beneficio: string
  quantidade: number
  validade_meses: number
  data_autorizacao: string
  data_validade: string
  autorizador_id: number
  autorizador_nome: string
  evolucao_id: number | null
  justificativa: string
  observacoes: string
  status: string
}

// --- COMPONENTE DE ITEM DE INFORMAÇÃO (Estilo compatível) ---
const InfoItem: React.FC<{ label: string; value?: string | number | null; children?: React.ReactNode }> = ({
  label,
  value,
  children,
}) => (
  <div>
    <dt className="text-sm text-gray-600">{label}</dt>
    <dd className="text-sm font-medium text-gray-900">{children || value || "Não informado"}</dd>
  </div>
)

// --- COMPONENTE PRINCIPAL ---
const VisualizarFamilia: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [familia, setFamilia] = useState<FamiliaCompleta | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const { user } = useAuth()
  const [evolucoes, setEvolucoes] = useState<Evolucao[]>([])
  const [novaEvolucao, setNovaEvolucao] = useState("")
  const [mostrarFormEvolucao, setMostrarFormEvolucao] = useState(false)
  const [loadingEvolucao, setLoadingEvolucao] = useState(false)

  const isTecnico = user?.cargo_id === 3
  const isCoordenador = user?.cargo_id === 2
  const isDiretor = user?.cargo_id === 1
  const podeVisualizarEvolucao = isTecnico || isCoordenador || isDiretor
  const podeCadastrarEvolucao = isTecnico || isCoordenador
  const podeAutorizar = isTecnico || isCoordenador

  const [locaisEncaminhamento, setLocaisEncaminhamento] = useState<LocalEncaminhamento[]>([])
  const [encaminhamentos, setEncaminhamentos] = useState<Encaminhamento[]>([])
  const [localSelecionado, setLocalSelecionado] = useState<number | "">("")
  const [encaminhamentosSelecionados, setEncaminhamentosSelecionados] = useState<number[]>([])
  const [mostrarFormNovoLocal, setMostrarFormNovoLocal] = useState(false)
  const [nomeNovoLocal, setNomeNovoLocal] = useState("")
  const [loadingNovoLocal, setLoadingNovoLocal] = useState(false)

  const [autorizacoes, setAutorizacoes] = useState<AutorizacaoBeneficio[]>([])
  const [mostrarFormAutorizacao, setMostrarFormAutorizacao] = useState(false)
  const [dadosAutorizacao, setDadosAutorizacao] = useState({
    tipo_beneficio: "",
    quantidade: 1,
    validade_meses: 1,
    justificativa: "",
    observacoes: "",
  })

  // --- LÓGICA DE DADOS E FORMATÇÃO (Mantida) ---
  useEffect(() => {
    if (id) carregarDadosFamilia()
  }, [id])

  useEffect(() => {
    if (id && podeVisualizarEvolucao) {
      carregarEvolucoes()
      carregarLocaisEncaminhamento()
    }
  }, [id, podeVisualizarEvolucao])

  useEffect(() => {
    if (id && podeVisualizarEvolucao) {
      carregarEncaminhamentos()
    }
  }, [id, podeVisualizarEvolucao])

  useEffect(() => {
    if (id) {
      carregarAutorizacoes()
    }
  }, [id])

  const carregarDadosFamilia = async () => {
    setLoading(true)
    try {
      const response = await api.get(`/auth/familias/${id}`)
      setFamilia(response.data)
    } catch (error) {
      console.error("Erro ao carregar família:", error)
      setError(
        "Erro ao carregar dados da família. Verifique se o prontuário existe e se você tem permissão para acessá-lo.",
      )
    } finally {
      setLoading(false)
    }
  }

  const carregarEvolucoes = async () => {
    try {
      const response = await api.get(`/auth/familias/${id}/evolucoes`)
      setEvolucoes(response.data)
    } catch (error) {
      console.error("Erro ao carregar evoluções:", error)
    }
  }

  const carregarLocaisEncaminhamento = async () => {
    try {
      const response = await api.get("/auth/locais-encaminhamento")
      setLocaisEncaminhamento(response.data)
    } catch (error) {
      console.error("Erro ao carregar locais de encaminhamento:", error)
    }
  }

  const carregarEncaminhamentos = async () => {
    try {
      const response = await api.get(`/auth/familias/${id}/encaminhamentos`)
      setEncaminhamentos(response.data)
    } catch (error) {
      console.error("Erro ao carregar encaminhamentos:", error)
    }
  }

  const carregarAutorizacoes = async () => {
    try {
      const response = await api.get(`/auth/familias/${id}/autorizacoes-beneficios`)
      setAutorizacoes(response.data)
    } catch (error) {
      console.error("Erro ao carregar autorizações:", error)
    }
  }

  const salvarEvolucao = async () => {
    if (!novaEvolucao.trim()) {
      alert("Por favor, escreva uma descrição para a evolução.")
      return
    }
    setLoadingEvolucao(true)
    try {
      // Salvar a evolução
      const evolucaoResponse = await api.post(`/auth/familias/${id}/evolucoes`, { descricao: novaEvolucao })
      const evolucaoId = evolucaoResponse.data.id

      // Se houver encaminhamentos selecionados, salvá-los
      if (encaminhamentosSelecionados.length > 0) {
        await api.post(`/auth/familias/${id}/encaminhamentos`, {
          evolucao_id: evolucaoId,
          locais_ids: encaminhamentosSelecionados,
        })
      }

      setNovaEvolucao("")
      setEncaminhamentosSelecionados([])
      setLocalSelecionado("")
      setMostrarFormEvolucao(false)
      await carregarEvolucoes()
      await carregarEncaminhamentos()
      alert("Evolução registrada com sucesso!")
    } catch (error) {
      console.error("Erro ao salvar evolução:", error)
      alert("Erro ao salvar evolução. Tente novamente.")
    } finally {
      setLoadingEvolucao(false)
    }
  }

  const adicionarEncaminhamento = () => {
    if (localSelecionado === "") {
      alert("Por favor, selecione um local de encaminhamento.")
      return
    }

    if (encaminhamentosSelecionados.includes(Number(localSelecionado))) {
      alert("Este local já foi adicionado.")
      return
    }

    setEncaminhamentosSelecionados([...encaminhamentosSelecionados, Number(localSelecionado)])
    setLocalSelecionado("")
  }

  const removerEncaminhamento = (localId: number) => {
    setEncaminhamentosSelecionados(encaminhamentosSelecionados.filter((id) => id !== localId))
  }

  const getNomeLocal = (localId: number) => {
    const local = locaisEncaminhamento.find((l) => l.id === localId)
    return local ? local.nome : "Local não encontrado"
  }

  const cadastrarNovoLocal = async () => {
    if (!nomeNovoLocal.trim()) {
      alert("Por favor, informe o nome do local.")
      return
    }

    setLoadingNovoLocal(true)
    try {
      await api.post("/auth/locais-encaminhamento", { nome: nomeNovoLocal })
      setNomeNovoLocal("")
      setMostrarFormNovoLocal(false)
      await carregarLocaisEncaminhamento()
      alert("Local cadastrado com sucesso!")
    } catch (error: any) {
      console.error("Erro ao cadastrar local:", error)
      alert(error.response?.data?.message || "Erro ao cadastrar local. Tente novamente.")
    } finally {
      setLoadingNovoLocal(false)
    }
  }

  const autorizarBeneficio = async () => {
    if (!dadosAutorizacao.tipo_beneficio) {
      alert("Por favor, selecione o tipo de benefício.")
      return
    }
    if (!dadosAutorizacao.justificativa.trim()) {
      alert("Por favor, informe a justificativa.")
      return
    }

    setLoadingEvolucao(true) // Reutilizando loadingEvolucao para simplificar, pois a lógica é similar
    try {
      const response = await api.post(`/auth/familias/${id}/autorizacoes-beneficios`, dadosAutorizacao)
      const autorizacaoCriada = response.data

      setDadosAutorizacao({
        tipo_beneficio: "",
        quantidade: 1,
        validade_meses: 1,
        justificativa: "",
        observacoes: "",
      })
      setMostrarFormAutorizacao(false)
      await carregarAutorizacoes()
      alert("Benefício autorizado com sucesso!")

      if (familia && user) {
        gerarReciboAutorizacao({
          familia: {
            prontuario: familia.prontuario,
            responsavel_nome: familia.responsavel.nome_completo,
            responsavel_cpf: familia.responsavel.cpf,
            endereco: `${familia.endereco.logradouro}, ${familia.endereco.numero || "S/N"}${familia.endereco.complemento ? ` - ${familia.endereco.complemento}` : ""} - ${familia.endereco.bairro}`,
            cidade: familia.endereco.cidade,
            uf: familia.endereco.uf,
          },
          autorizacao: {
            tipo_beneficio: autorizacaoCriada.tipo_beneficio || dadosAutorizacao.tipo_beneficio,
            quantidade: autorizacaoCriada.quantidade || dadosAutorizacao.quantidade,
            validade_meses: autorizacaoCriada.validade_meses || dadosAutorizacao.validade_meses,
            data_autorizacao: autorizacaoCriada.data_autorizacao || new Date().toISOString(),
            data_validade: autorizacaoCriada.data_validade || new Date().toISOString(),
            justificativa: autorizacaoCriada.justificativa || dadosAutorizacao.justificativa,
            observacoes: autorizacaoCriada.observacoes || dadosAutorizacao.observacoes,
          },
          autorizador: {
            nome: user.nome,
            cargo: user.cargo_nome ?? "",
          },
        })
      }
    } catch (error) {
      console.error("Erro ao autorizar benefício:", error)
      alert("Erro ao autorizar benefício. Tente novamente.")
    } finally {
      setLoadingEvolucao(false)
    }
  }

  const formatarData = (data: string) =>
    data ? new Date(data).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "Não informado"
  const garantirNumero = (valor: unknown): number => {
    if (typeof valor === "number" && !isNaN(valor)) return valor
    if (typeof valor === "string") {
      const numero = Number.parseFloat(valor.replace(",", "."))
      return isNaN(numero) ? 0 : numero
    }
    return 0
  }
  const formatarMoeda = (valor: number | string | undefined | null) => {
    const numeroValido = garantirNumero(valor)
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(numeroValido)
  }
  const calcularIdade = (dataNascimento: string) => {
    if (!dataNascimento) return "N/A"
    const hoje = new Date()
    const nascimento = new Date(dataNascimento)
    let idade = hoje.getFullYear() - nascimento.getFullYear()
    const m = hoje.getMonth() - nascimento.getMonth()
    if (m < 0 || (m === 0 && hoje.getDate() < nascimento.getDate())) idade--
    return idade
  }
  const formatarEscolaridade = (escolaridade: string) =>
    ({
      nao_alfabetizado: "Não Alfabetizado",
      fundamental_incompleto: "Fundamental Incompleto",
      fundamental_completo: "Fundamental Completo",
      medio_incompleto: "Médio Incompleto",
      medio_completo: "Médio Completo",
      superior_incompleto: "Superior Incompleto",
      superior_completo: "Superior Completo",
      pos_graduacao: "Pós-graduação",
    })[escolaridade] || escolaridade
  const formatarEstadoCivil = (estadoCivil: string) =>
    ({
      solteiro: "Solteiro(a)",
      casado: "Casado(a)",
      divorciado: "Divorciado(a)",
      viuvo: "Viúvo(a)",
      uniao_estavel: "União Estável",
      separado: "Separado(a)",
    })[estadoCivil] || estadoCivil
  const formatarParentesco = (parentesco: string) =>
    ({
      responsavel: "Responsável",
      conjuge: "Cônjuge",
      filho: "Filho(a)",
      pai: "Pai",
      mae: "Mãe",
      irmao: "Irmão/Irmã",
      avo: "Avô/Avó",
      neto: "Neto(a)",
      sobrinho: "Sobrinho(a)",
      tio: "Tio(a)",
      primo: "Primo(a)",
      outro: "Outro",
    })[parentesco] || parentesco

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

  const formatarStatusAutorizacao = (status: string) => {
    const statusMap: Record<string, string> = {
      ativa: "Ativa",
      utilizada: "Utilizada",
      expirada: "Expirada",
      cancelada: "Cancelada",
    }
    return statusMap[status] || status
  }

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "ativa":
        return "bg-green-100 text-green-800"
      case "utilizada":
        return "bg-blue-100 text-blue-800"
      case "expirada":
        return "bg-red-100 text-red-800"
      case "cancelada":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  // --- ESTADOS DE LOADING E ERRO ---
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando dados da família...</p>
        </div>
      </div>
    )
  }

  if (error || !familia) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
        <Card className="max-w-md mx-auto text-center">
          <CardHeader>
            <CardTitle className="text-red-600">⚠️ Erro ao Carregar</CardTitle>
            <CardDescription>{error || "Não foi possível encontrar os dados da família."}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/familias")}>
              <ChevronLeft className="mr-2 h-4 w-4" /> Voltar para a lista
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // --- RENDERIZAÇÃO DO COMPONENTE ---
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <Header />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Button variant="default" onClick={() => navigate("/familias")}>
            <ChevronLeft className="mr-1 h-4 w-4" />
            Voltar para a lista de famílias
          </Button>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
              Prontuário Familiar
            </h1>
            <p className="text-gray-600">{familia.responsavel.nome_completo}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="default" onClick={() => navigate(`/familia/${id}/editar`)}>
              <Pencil className="h-4 w-4 mr-2" /> Editar
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2 text-blue-600" />
                Dados do Responsável
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3">
                <InfoItem label="Nome Completo" value={familia.responsavel.nome_completo} />
                <InfoItem label="CPF" value={familia.responsavel.cpf} />
                <InfoItem
                  label="Data de Nascimento"
                  value={`${formatarData(familia.responsavel.data_nascimento)} (${calcularIdade(familia.responsavel.data_nascimento)} anos)`}
                />
                <InfoItem label="Estado Civil" value={formatarEstadoCivil(familia.responsavel.estado_civil)} />
                <InfoItem label="Escolaridade" value={formatarEscolaridade(familia.responsavel.escolaridade)} />
                <InfoItem label="Telefone" value={familia.responsavel.telefone} />
                <InfoItem label="NIS" value={familia.responsavel.nis} />
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Home className="h-5 w-5 mr-2 text-blue-600" />
                Endereço
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3">
                <InfoItem
                  label="Logradouro"
                  value={`${familia.endereco.logradouro}, ${familia.endereco.numero || "S/N"}`}
                />
                <InfoItem label="Bairro" value={familia.endereco.bairro} />
                <InfoItem label="Cidade/UF" value={`${familia.endereco.cidade}/${familia.endereco.uf}`} />
                <InfoItem label="CEP" value={familia.endereco.cep} />
                <InfoItem label="Referência" value={familia.endereco.referencia} />
                <InfoItem label="Tempo de Moradia" value={familia.endereco.tempo_moradia} />
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2 text-blue-600" />
                Informações do Cadastro
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3">
                <InfoItem label="Unidade" value={`${familia.equipamento.nome} (${familia.equipamento.regiao})`} />
                <InfoItem
                  label="Técnico Responsável"
                  value={`${familia.profissional.nome} (${familia.profissional.cargo_nome})`}
                />
                <InfoItem label="Data de Cadastro" value={formatarData(familia.data_cadastro)} />
                <InfoItem label="Último Atendimento" value={formatarData(familia.data_atendimento)} />
                <InfoItem label="Prontuário" value={familia.prontuario} />
                <InfoItem label="Situação">
                  <Badge
                    className={
                      familia.situacao.toLowerCase() === "ativo"
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }
                  >
                    {familia.situacao}
                  </Badge>
                </InfoItem>
              </dl>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue={podeVisualizarEvolucao ? "evolucao" : "composicao"}>
          <TabsList>
            {podeVisualizarEvolucao && <TabsTrigger value="evolucao">Evolução</TabsTrigger>}
            {podeVisualizarEvolucao && <TabsTrigger value="encaminhamentos">Encaminhamentos</TabsTrigger>}
            <TabsTrigger value="composicao">Composição</TabsTrigger>
            <TabsTrigger value="trabalho">Trabalho e Renda</TabsTrigger>
            <TabsTrigger value="beneficios">Benefícios</TabsTrigger>
            <TabsTrigger value="saude">Saúde</TabsTrigger>
            <TabsTrigger value="habitacao">Habitação</TabsTrigger>
            <TabsTrigger value="social">Situação Social</TabsTrigger>
          </TabsList>

          {podeVisualizarEvolucao && (
            <TabsContent value="evolucao">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="flex items-center">
                        <Calendar className="h-5 w-5 mr-2 text-blue-600" />
                        Evolução do Prontuário
                      </CardTitle>
                      <CardDescription>Histórico de atendimentos e evoluções técnicas.</CardDescription>
                    </div>
                    {podeCadastrarEvolucao && (
                      <Button onClick={() => setMostrarFormEvolucao(!mostrarFormEvolucao)}>
                        {mostrarFormEvolucao ? <X className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                        {mostrarFormEvolucao ? "Cancelar" : "Nova Evolução"}
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {mostrarFormEvolucao && podeCadastrarEvolucao && (
                    <div className="p-4 bg-gray-50 rounded-lg border">
                      <h4 className="font-medium mb-3 text-gray-900">Registrar Nova Evolução</h4>
                      <textarea
                        value={novaEvolucao}
                        onChange={(e) => setNovaEvolucao(e.target.value)}
                        placeholder="Descreva o atendimento realizado, encaminhamentos, observações..."
                        className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                        rows={4}
                      />

                      <div className="mt-4 p-3 bg-white rounded-md border border-gray-200">
                        <div className="flex items-center justify-between mb-3">
                          <h5 className="font-medium text-gray-900">Encaminhamentos</h5>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setMostrarFormNovoLocal(true)}
                            disabled={loadingEvolucao}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Cadastrar Local
                          </Button>
                        </div>

                        {/* Modal para cadastrar novo local */}
                        {mostrarFormNovoLocal && (
                          <div className="mb-3 p-3 bg-blue-50 rounded-md border border-blue-200">
                            <h6 className="font-medium text-sm text-gray-900 mb-2">Cadastrar Novo Local</h6>
                            <textarea
                              value={nomeNovoLocal}
                              onChange={(e) => setNomeNovoLocal(e.target.value)}
                              placeholder="Nome do local (ex: CAPS, CRAM, etc.)"
                              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-sm mb-2 resize-y min-h-[40px]"
                              rows={2}
                            />
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setMostrarFormNovoLocal(false)
                                  setNomeNovoLocal("")
                                }}
                                disabled={loadingNovoLocal}
                              >
                                Cancelar
                              </Button>
                              <Button size="sm" onClick={cadastrarNovoLocal} disabled={loadingNovoLocal}>
                                {loadingNovoLocal ? "Salvando..." : "Salvar Local"}
                              </Button>
                            </div>
                          </div>
                        )}

                        <div className="flex gap-2 mb-3">
                          <select
                            value={localSelecionado}
                            onChange={(e) => setLocalSelecionado(e.target.value === "" ? "" : Number(e.target.value))}
                            className="flex-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-sm"
                            disabled={loadingEvolucao}
                          >
                            <option value="">Selecione um local...</option>
                            {locaisEncaminhamento.map((local) => (
                              <option key={local.id} value={local.id}>
                                {local.nome}
                              </option>
                            ))}
                          </select>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={adicionarEncaminhamento}
                            disabled={loadingEvolucao || localSelecionado === ""}
                          >
                            Confirmar
                          </Button>
                        </div>

                        {encaminhamentosSelecionados.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-sm font-medium text-gray-700">Locais selecionados:</p>
                            {encaminhamentosSelecionados.map((localId) => (
                              <div
                                key={localId}
                                className="flex items-center justify-between bg-blue-50 p-2 rounded-md text-sm"
                              >
                                <span className="text-gray-900">{getNomeLocal(localId)}</span>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => removerEncaminhamento(localId)}
                                  disabled={loadingEvolucao}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="mt-3 flex justify-end gap-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setMostrarFormEvolucao(false)
                            setEncaminhamentosSelecionados([])
                            setLocalSelecionado("")
                          }}
                          disabled={loadingEvolucao}
                        >
                          Cancelar
                        </Button>
                        <Button onClick={salvarEvolucao} disabled={loadingEvolucao}>
                          {loadingEvolucao ? "Salvando..." : "Salvar Evolução"}
                        </Button>
                      </div>
                    </div>
                  )}
                  <Separator />
                  {evolucoes.length > 0 ? (
                    <div className="space-y-4">
                      {evolucoes.map((evolucao) => (
                        <div key={evolucao.id} className="bg-gray-100 p-4 rounded-lg">
                          <div className="space-y-2 w-full">
                            <div className="flex items-center justify-between">
                              <div className="font-medium flex items-center gap-2 text-gray-900">
                                <User className="h-4 w-4" />
                                {evolucao.usuario_nome || "Técnico"}
                              </div>
                              <div className="text-sm text-gray-500 flex items-center gap-2">
                                <Calendar className="h-3 w-3" />
                                {formatarData(evolucao.data_evolucao)}
                                <Clock className="h-3 w-3 ml-2" />
                                {evolucao.hora_evolucao.substring(0, 5)}
                              </div>
                            </div>
                            <p className="text-sm text-gray-700 whitespace-pre-line">{evolucao.descricao}</p>

                            {encaminhamentos.filter((enc) => enc.evolucao_id === evolucao.id).length > 0 && (
                              <div className="mt-2 pt-2 border-t border-gray-300">
                                <p className="text-xs font-medium text-gray-600 mb-1">Encaminhamentos:</p>
                                <div className="flex flex-wrap gap-1">
                                  {encaminhamentos
                                    .filter((enc) => enc.evolucao_id === evolucao.id)
                                    .map((enc) => (
                                      <Badge key={enc.id} variant="outline" className="text-xs">
                                        {enc.local_nome}
                                      </Badge>
                                    ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-gray-500 py-8">Nenhuma evolução registrada para esta família.</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {podeVisualizarEvolucao && (
            <TabsContent value="encaminhamentos">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <FileText className="h-5 w-5 mr-2 text-blue-600" />
                    Encaminhamentos da Família
                  </CardTitle>
                  <CardDescription>
                    Histórico de encaminhamentos realizados para serviços e instituições.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {encaminhamentos.length > 0 ? (
                    <div className="space-y-4">
                      {encaminhamentos.map((encaminhamento) => (
                        <div key={encaminhamento.id} className="bg-gray-100 p-4 rounded-lg">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="default" className="text-sm">
                                {encaminhamento.local_nome}
                              </Badge>
                            </div>
                            <div className="text-sm text-gray-500 flex items-center gap-2">
                              <Calendar className="h-3 w-3" />
                              {formatarData(encaminhamento.data_encaminhamento)}
                            </div>
                          </div>
                          <div className="text-sm text-gray-700 space-y-1">
                            <p>
                              <span className="font-medium">Responsável:</span> {encaminhamento.responsavel_nome}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-500">Nenhum encaminhamento registrado para esta família.</p>
                      {isTecnico && (
                        <p className="text-sm text-gray-400 mt-1">
                          Registre encaminhamentos através da aba "Evolução".
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          <TabsContent value="composicao">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="h-5 w-5 mr-2 text-blue-600" />
                  Composição Familiar
                </CardTitle>
                <CardDescription>Membros que compõem o núcleo familiar.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {familia.integrantes.length > 0 ? (
                  familia.integrantes.map((integrante) => (
                    <div key={integrante.id} className="bg-gray-100 p-4 rounded-lg">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                        <div>
                          <h3 className="font-medium text-gray-900">{integrante.nome_completo}</h3>
                          <p className="text-sm text-gray-600">
                            {calcularIdade(integrante.data_nascimento)} anos - Renda:{" "}
                            {formatarMoeda(integrante.renda_mensal)}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            Escolaridade: {formatarEscolaridade(integrante.escolaridade)}
                          </p>
                          <p className="text-sm text-gray-600">Ocupação: {integrante.ocupacao || "Não informado"}</p>
                        </div>
                        <Badge variant="outline" className="self-start md:self-center">
                          {formatarParentesco(integrante.tipo_membro)}
                        </Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-gray-500 py-8">
                    Nenhum outro integrante cadastrado além do responsável.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trabalho">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Briefcase className="h-5 w-5 mr-2 text-blue-600" />
                  Trabalho e Renda
                </CardTitle>
                <CardDescription>Informações sobre as fontes de renda e despesas da família.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-100 p-4 rounded-lg space-y-2">
                    <h4 className="font-semibold mb-2 text-gray-900">Fontes de Renda</h4>
                    <div className="flex justify-between text-sm text-gray-700">
                      <span>Renda do Trabalho:</span>{" "}
                      <span className="font-medium text-gray-900">
                        {formatarMoeda(familia.trabalho_renda.rendimento_total)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-700">
                      <span>Programas Sociais:</span>{" "}
                      <span className="font-medium text-gray-900">
                        {formatarMoeda(familia.programas_sociais.reduce((t, p) => t + garantirNumero(p.valor), 0))}
                      </span>
                    </div>
                    <Separator className="my-2" />
                    <div className="flex justify-between font-bold text-gray-900">
                      <span>Renda Total:</span>{" "}
                      <span>
                        {formatarMoeda(
                          garantirNumero(familia.trabalho_renda.rendimento_total) +
                            familia.programas_sociais.reduce((t, p) => t + garantirNumero(p.valor), 0),
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="bg-gray-100 p-4 rounded-lg space-y-2">
                    <h4 className="font-semibold mb-2 text-gray-900">Despesas Mensais</h4>
                    {familia.despesas.length > 0 ? (
                      familia.despesas.map((d, i) => (
                        <div key={i} className="flex justify-between text-sm text-gray-700">
                          <span>{d.tipo_nome}:</span>{" "}
                          <span className="font-medium text-gray-900">{formatarMoeda(d.valor)}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-sm">Nenhuma despesa cadastrada.</p>
                    )}
                    <Separator className="my-2" />
                    <div className="flex justify-between font-bold text-gray-900">
                      <span>Total Despesas:</span>{" "}
                      <span>{formatarMoeda(familia.despesas.reduce((t, d) => t + garantirNumero(d.valor), 0))}</span>
                    </div>
                  </div>
                </div>
                {familia.trabalho_renda.quem_trabalha && (
                  <div className="bg-gray-100 p-4 rounded-lg">
                    <h4 className="font-medium mb-1 text-gray-900">Quem trabalha na casa?</h4>
                    <p className="text-sm text-gray-700 whitespace-pre-line">{familia.trabalho_renda.quem_trabalha}</p>
                  </div>
                )}
                {familia.trabalho_renda.observacoes && (
                  <div className="bg-gray-100 p-4 rounded-lg">
                    <h4 className="font-medium mb-1 text-gray-900">Observações sobre Renda</h4>
                    <p className="text-sm text-gray-700 whitespace-pre-line">{familia.trabalho_renda.observacoes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="beneficios">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="flex items-center">
                      <Gift className="h-5 w-5 mr-2 text-blue-600" />
                      Benefícios Autorizados
                    </CardTitle>
                    <CardDescription>Autorizações de benefícios para esta família.</CardDescription>
                  </div>
                  {podeAutorizar && (
                    <Button onClick={() => setMostrarFormAutorizacao(!mostrarFormAutorizacao)}>
                      {mostrarFormAutorizacao ? <X className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                      {mostrarFormAutorizacao ? "Cancelar" : "Autorizar Benefício"}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {mostrarFormAutorizacao && podeAutorizar && (
                  <div className="p-4 bg-gray-50 rounded-lg border">
                    <h4 className="font-medium mb-3 text-gray-900">Autorizar Novo Benefício</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Benefício *</label>
                        <select
                          value={dadosAutorizacao.tipo_beneficio}
                          onChange={(e) => setDadosAutorizacao({ ...dadosAutorizacao, tipo_beneficio: e.target.value })}
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                        >
                          <option value="">Selecione...</option>
                          <option value="cesta_basica">Cesta Básica</option>
                          <option value="auxilio_funeral">Auxílio Funeral</option>
                          <option value="auxilio_natalidade">Auxílio Natalidade</option>
                          <option value="passagem">Passagem</option>
                          <option value="outro">Outro</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Quantidade</label>
                        <input
                          type="number"
                          min="1"
                          value={dadosAutorizacao.quantidade}
                          onChange={(e) =>
                            setDadosAutorizacao({
                              ...dadosAutorizacao,
                              quantidade: Number.parseInt(e.target.value) || 1,
                            })
                          }
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Validade (meses)</label>
                        <input
                          type="number"
                          min="1"
                          value={dadosAutorizacao.validade_meses}
                          onChange={(e) =>
                            setDadosAutorizacao({
                              ...dadosAutorizacao,
                              validade_meses: Number.parseInt(e.target.value) || 1,
                            })
                          }
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Justificativa *</label>
                        <textarea
                          value={dadosAutorizacao.justificativa}
                          onChange={(e) => setDadosAutorizacao({ ...dadosAutorizacao, justificativa: e.target.value })}
                          placeholder="Descreva o motivo da autorização do benefício..."
                          className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                          rows={3}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
                        <textarea
                          value={dadosAutorizacao.observacoes}
                          onChange={(e) => setDadosAutorizacao({ ...dadosAutorizacao, observacoes: e.target.value })}
                          placeholder="Observações adicionais (opcional)..."
                          className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                          rows={2}
                        />
                      </div>
                    </div>
                    <div className="mt-3 flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setMostrarFormAutorizacao(false)
                          setDadosAutorizacao({
                            tipo_beneficio: "",
                            quantidade: 1,
                            validade_meses: 1,
                            justificativa: "",
                            observacoes: "",
                          })
                        }}
                        disabled={loadingEvolucao}
                      >
                        Cancelar
                      </Button>
                      <Button onClick={autorizarBeneficio} disabled={loadingEvolucao}>
                        {loadingEvolucao ? "Autorizando..." : "Autorizar Benefício"}
                      </Button>
                    </div>
                  </div>
                )}

                <Separator />

                {autorizacoes.length > 0 ? (
                  <div className="space-y-4">
                    {autorizacoes.map((autorizacao) => (
                      <div key={autorizacao.id} className="bg-gray-100 p-4 rounded-lg">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-semibold text-gray-900">
                              {formatarTipoBeneficio(autorizacao.tipo_beneficio)}
                            </h4>
                            <p className="text-sm text-gray-600">
                              Quantidade: {autorizacao.quantidade} | Validade: {autorizacao.validade_meses}{" "}
                              {autorizacao.validade_meses === 1 ? "mês" : "meses"}
                            </p>
                          </div>
                          <Badge className={getStatusBadgeClass(autorizacao.status)}>
                            {formatarStatusAutorizacao(autorizacao.status)}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-700 space-y-1">
                          <p>
                            <span className="font-medium">Autorizado por:</span> {autorizacao.autorizador_nome}
                          </p>
                          <p>
                            <span className="font-medium">Data:</span> {formatarData(autorizacao.data_autorizacao)}
                          </p>
                          <p>
                            <span className="font-medium">Válido até:</span> {formatarData(autorizacao.data_validade)}
                          </p>
                          <p>
                            <span className="font-medium">Justificativa:</span> {autorizacao.justificativa}
                          </p>
                          {autorizacao.observacoes && (
                            <p>
                              <span className="font-medium">Observações:</span> {autorizacao.observacoes}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Gift className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500">Nenhum benefício autorizado para esta família.</p>
                    {podeAutorizar && (
                      <p className="text-sm text-gray-400 mt-1">
                        Clique em "Autorizar Benefício" para adicionar uma autorização.
                      </p>
                    )}
                  </div>
                )}

                <Separator />

                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-2">Programas Sociais Cadastrados</h4>
                  {familia?.programas_sociais && familia.programas_sociais.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {familia.programas_sociais.map((p, i) => (
                        <div key={i} className="bg-white p-3 rounded-lg flex justify-between items-center">
                          <p className="font-medium text-gray-900">{p.programa_nome}</p>
                          <p className="text-green-600 font-semibold">{formatarMoeda(p.valor)}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-600 text-sm">Nenhum programa social cadastrado.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="saude">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Heart className="h-5 w-5 mr-2 text-blue-600" />
                  Condições de Saúde
                </CardTitle>
                <CardDescription>Informações sobre a saúde dos membros da família.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-100 p-4 rounded-lg">
                    <h4 className="font-medium mb-1 text-gray-900">Possui integrante com deficiência?</h4>
                    <p className="text-sm text-gray-700">
                      {familia.saude.tem_deficiencia
                        ? `Sim (${familia.saude.deficiencia_qual || "Não especificado"})`
                        : "Não"}
                    </p>
                  </div>
                  <div className="bg-gray-100 p-4 rounded-lg">
                    <h4 className="font-medium mb-1 text-gray-900">Realiza tratamento de saúde?</h4>
                    <p className="text-sm text-gray-700">
                      {familia.saude.tem_tratamento_saude
                        ? `Sim (${familia.saude.tratamento_qual || "Não especificado"})`
                        : "Não"}
                    </p>
                  </div>
                  <div className="bg-gray-100 p-4 rounded-lg">
                    <h4 className="font-medium mb-1 text-gray-900">Usa medicação contínua?</h4>
                    <p className="text-sm text-gray-700">
                      {familia.saude.usa_medicacao_continua
                        ? `Sim (${familia.saude.medicacao_qual || "Não especificado"})`
                        : "Não"}
                    </p>
                  </div>
                  <div className="bg-gray-100 p-4 rounded-lg">
                    <h4 className="font-medium mb-1 text-gray-900">Tem dependente que necessita de cuidados?</h4>
                    <p className="text-sm text-gray-700">
                      {familia.saude.tem_dependente_cuidados
                        ? `Sim (${familia.saude.dependente_quem || "Não especificado"})`
                        : "Não"}
                    </p>
                  </div>
                </div>
                {familia.saude.observacoes && (
                  <div className="bg-gray-100 p-4 rounded-lg">
                    <h4 className="font-medium mb-1 text-gray-900">Observações</h4>
                    <p className="text-sm text-gray-700 whitespace-pre-line">{familia.saude.observacoes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="habitacao">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Building className="h-5 w-5 mr-2 text-blue-600" />
                  Condição Habitacional
                </CardTitle>
                <CardDescription>Informações sobre a moradia da família.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-gray-100 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900">Cômodos</h4>
                  <p className="text-gray-700">{familia.habitacao.qtd_comodos}</p>
                </div>
                <div className="bg-gray-100 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900">Dormitórios</h4>
                  <p className="text-gray-700">{familia.habitacao.qtd_dormitorios}</p>
                </div>
                <div className="bg-gray-100 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900">Energia</h4>
                  <p className="capitalize text-gray-700">{familia.habitacao.energia_eletrica.replace("_", " ")}</p>
                </div>
                <div className="bg-gray-100 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900">Água</h4>
                  <p className="capitalize text-gray-700">{familia.habitacao.agua.replace("_", " ")}</p>
                </div>
                <div className="bg-gray-100 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900">Esgoto</h4>
                  <p className="capitalize text-gray-700">{familia.habitacao.esgoto.replace("_", " ")}</p>
                </div>
                <div className="bg-gray-100 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900">Coleta de Lixo</h4>
                  <p className="text-gray-700">{familia.habitacao.coleta_lixo ? "Sim" : "Não"}</p>
                </div>
                <div className="bg-gray-100 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900">Área de Conflito</h4>
                  <p className="text-gray-700">{familia.habitacao.area_conflito ? "Sim" : "Não"}</p>
                </div>
                <div className="bg-gray-100 p-4 rounded-lg col-span-2 md:col-span-1">
                  <h4 className="font-medium text-gray-900">Tipo de Construção</h4>
                  <p className="capitalize text-gray-700">{familia.habitacao.tipo_construcao.join(", ") || "N/A"}</p>
                </div>
                <div className="bg-gray-100 p-4 rounded-lg col-span-2 md:col-span-2">
                  <h4 className="font-medium text-gray-900">Condição do Domicílio</h4>
                  <p className="capitalize text-gray-700">
                    {familia.habitacao.condicao_domicilio.map((c) => c.replace(/_/g, " ")).join(", ") || "N/A"}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="social">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="h-5 w-5 mr-2 text-blue-600" />
                  Situação Social
                </CardTitle>
                <CardDescription>Informações sobre a participação social e comunitária da família.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-100 p-4 rounded-lg">
                    <h4 className="font-medium mb-1 text-gray-900">Participa de grupo religioso?</h4>
                    <p className="text-sm text-gray-700">
                      {familia.situacao_social.participa_religiao
                        ? `Sim (${familia.situacao_social.religiao_qual || "Não especificado"})`
                        : "Não"}
                    </p>
                  </div>
                  <div className="bg-gray-100 p-4 rounded-lg">
                    <h4 className="font-medium mb-1 text-gray-900">Participa de ação social?</h4>
                    <p className="text-sm text-gray-700">
                      {familia.situacao_social.participa_acao_social
                        ? `Sim (${familia.situacao_social.acao_social_qual || "Não especificado"})`
                        : "Não"}
                    </p>
                  </div>
                </div>
                {familia.situacao_social.servicos_publicos.length > 0 && (
                  <div className="bg-gray-100 p-4 rounded-lg">
                    <h4 className="font-medium mb-2 text-gray-900">Acesso a Serviços Públicos</h4>
                    <div className="flex flex-wrap gap-2">
                      {familia.situacao_social.servicos_publicos.map((s, i) => (
                        <Badge key={i} variant="default" className="capitalize">
                          {s.replace(/_/g, " ")}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {familia.situacao_social.observacoes && (
                  <div className="bg-gray-100 p-4 rounded-lg">
                    <h4 className="font-medium mb-1 text-gray-900">Observações</h4>
                    <p className="text-sm text-gray-700 whitespace-pre-line">{familia.situacao_social.observacoes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default VisualizarFamilia
