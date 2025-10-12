"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { User, Users, Heart, Home, Briefcase, Globe, Save, ChevronLeft, ChevronRight, Check } from "lucide-react"
import { Button } from "../components/ui/Button"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card"
import { Alert } from "../components/ui/Alert"
import { Separator } from "../components/ui/Separator"
import api from "../services/api"
import Header from "../components/Header"
import {
  formatCPF,
  formatPhone,
  formatCEP,
  formatNumericOnly,
  formatUF,
  formatToUpper,
  cleanExtraSpaces,
  isValidCPF,
  isValidNIS,
  isDateInPast,
  isValidEmail,
  isValidTituloEleitor,
  isValidName,
  isMeaningfulText,
} from "../utils/formUtils"

// Tipos baseados na estrutura do banco
interface Equipamento {
  id: number
  nome: string
  regiao: string
}

interface Usuario {
  id: number
  nome: string
}

interface ProgramaSocial {
  id: number
  codigo: string
  nome: string
  valor_padrao: number
}

interface TipoDespesa {
  id: number
  codigo: string
  nome: string
  obrigatoria: boolean
}

interface IntegranteFamiliar {
  id?: number
  nome_completo: string
  data_nascimento: string
  sexo: "feminino" | "masculino" | "outro"
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

interface DadosFamilia {
  data_atendimento: string
  profissional_id: number
  prontuario: string
  equipamento_id: number
  responsavel: IntegranteFamiliar
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
  integrantes: IntegranteFamiliar[]
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
    tipo_construcao: string // Alterado de string[] para string
    area_conflito: boolean
    condicao_domicilio: string // Alterado de string[] para string
    energia_eletrica: string
    agua: string
    esgoto: string
    coleta_lixo: boolean
  }
  trabalho_renda: {
    quem_trabalha: string
    rendimento_total: number
    observacoes: string
  }
  programas_sociais: Array<{
    programa_id: number
    valor: number
  }>
  despesas: Array<{
    tipo_despesa_id: number
    valor: number
  }>
  situacao_social: {
    participa_religiao: boolean
    religiao_qual: string
    participa_acao_social: boolean
    acao_social_qual: string
    servicos_publicos: string[]
    observacoes: string
  }
}

type FormErrors = {
  profissional_id?: string
  responsavel?: Partial<Record<keyof IntegranteFamiliar, string>>
  endereco?: Partial<Record<keyof DadosFamilia["endereco"], string>>
  integrantes?: Array<Partial<Record<keyof IntegranteFamiliar, string>> | null>
  saude?: Partial<Record<keyof DadosFamilia["saude"], string>>
  habitacao?: Partial<Record<keyof DadosFamilia["habitacao"], string>>
  trabalho_renda?: Partial<Record<keyof DadosFamilia["trabalho_renda"], string>>
  programas_sociais?: Array<{ valor?: string } | null>
  despesas?: Array<{ valor?: string } | null>
  situacao_social?: Partial<Record<keyof DadosFamilia["situacao_social"], string>>
  equipamento_id?: string
}

// Definição das etapas
const ETAPAS = [
  { id: "identificacao", nome: "Identificação", icone: User },
  { id: "familia", nome: "Família", icone: Users },
  { id: "saude", nome: "Saúde", icone: Heart },
  { id: "habitacao", nome: "Habitação", icone: Home },
  { id: "renda", nome: "Renda", icone: Briefcase },
  { id: "social", nome: "Social", icone: Globe },
]

const CadastroFamilia: React.FC = () => {
  const [etapaAtual, setEtapaAtual] = useState(0)
  const [etapasCompletas, setEtapasCompletas] = useState<boolean[]>(new Array(ETAPAS.length).fill(false))
  const [loading, setLoading] = useState(false)
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([])
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [programasSociais, setProgramasSociais] = useState<ProgramaSocial[]>([])
  const [tiposDespesas, setTiposDespesas] = useState<TipoDespesa[]>([])
  const [message, setMessage] = useState("")
  const [messageType, setMessageType] = useState<"success" | "error" | "">("")
  const [errors, setErrors] = useState<FormErrors>({})

  // Estado principal do formulário
  const [dadosFamilia, setDadosFamilia] = useState<DadosFamilia>({
    data_atendimento: new Date().toISOString().split("T")[0],
    profissional_id: 0,
    prontuario: "",
    equipamento_id: 0,
    responsavel: {
      nome_completo: "",
      data_nascimento: "",
      sexo: "feminino",
      cpf: "",
      rg: "",
      orgao_expedidor: "",
      estado_civil: "solteiro",
      escolaridade: "nao_alfabetizado",
      naturalidade: "",
      telefone: "",
      telefone_recado: "",
      email: "",
      nis: "",
      titulo_eleitor: "",
      ctps: "",
      tipo_membro: "responsavel",
      ocupacao: "",
      renda_mensal: 0,
    },
    endereco: {
      logradouro: "",
      numero: "",
      complemento: "",
      bairro: "",
      cidade: "Bebedouro",
      uf: "SP",
      cep: "",
      referencia: "",
      tempo_moradia: "",
    },
    integrantes: [],
    saude: {
      tem_deficiencia: false,
      deficiencia_qual: "",
      tem_tratamento_saude: false,
      tratamento_qual: "",
      usa_medicacao_continua: false,
      medicacao_qual: "",
      tem_dependente_cuidados: false,
      dependente_quem: "",
      observacoes: "",
    },
    habitacao: {
      qtd_comodos: 0,
      qtd_dormitorios: 0,
      tipo_construcao: "alvenaria", // Alterado para valor único
      area_conflito: false,
      condicao_domicilio: "propria_quitada", // Alterado para valor único
      energia_eletrica: "propria",
      agua: "propria",
      esgoto: "rede",
      coleta_lixo: true,
    },
    trabalho_renda: {
      quem_trabalha: "",
      rendimento_total: 0,
      observacoes: "",
    },
    programas_sociais: [],
    despesas: [],
    situacao_social: {
      participa_religiao: false,
      religiao_qual: "",
      participa_acao_social: false,
      acao_social_qual: "",
      servicos_publicos: [],
      observacoes: "",
    },
  })

  // Carregar dados iniciais do backend
  useEffect(() => {
    carregarDadosIniciais()
  }, [])

  const carregarDadosIniciais = useCallback(async () => {
    try {
      const [equipamentosRes, usuariosRes, programasRes, despesasRes] = await Promise.all([
        api.get("/auth/equipamentos"),
        api.get("/auth/usuarios/tecnicos"),
        api.get("/auth/programas-sociais"),
        api.get("/auth/tipos-despesas"),
      ])

      setEquipamentos(Array.isArray(equipamentosRes.data) ? equipamentosRes.data : [])
      setUsuarios(Array.isArray(usuariosRes.data) ? usuariosRes.data : [])
      setProgramasSociais(Array.isArray(programasRes.data) ? programasRes.data : [])
      setTiposDespesas(Array.isArray(despesasRes.data) ? despesasRes.data : [])

      const despesasValidas = Array.isArray(despesasRes.data) ? despesasRes.data : []
      const despesasIniciais = despesasValidas
        .filter((tipo: TipoDespesa) => tipo.obrigatoria)
        .map((tipo: TipoDespesa) => ({ tipo_despesa_id: tipo.id, valor: 0 }))

      setDadosFamilia((prev) => ({
        ...prev,
        despesas: despesasIniciais,
      }))
    } catch (error) {
      console.error("Erro ao carregar dados iniciais:", error)
      showMessage(
        `Erro ao carregar dados iniciais: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
        "error",
      )
      setEquipamentos([])
      setUsuarios([])
      setProgramasSociais([])
      setTiposDespesas([])
    }
  }, [])

  const showMessage = (msg: string, type: "success" | "error") => {
    setMessage(msg)
    setMessageType(type)
    setTimeout(() => {
      setMessage("")
      setMessageType("")
    }, 5000)
  }

  const validarEtapa = (etapa: number): boolean => {
    const newErrors: FormErrors = {}
    const {
      responsavel,
      endereco,
      integrantes,
      saude,
      habitacao,
      trabalho_renda,
      situacao_social,
      programas_sociais,
      despesas,
    } = dadosFamilia

    switch (etapa) {
      case 0: // Identificação
        if (!dadosFamilia.equipamento_id || dadosFamilia.equipamento_id === 0) {
          newErrors.equipamento_id = "Selecione o equipamento."
        }

        if (!dadosFamilia.profissional_id || dadosFamilia.profissional_id === 0) {
          newErrors.profissional_id = "Selecione o profissional responsável."
        }
        if (!responsavel.nome_completo.trim()) {
          newErrors.responsavel = { ...newErrors.responsavel, nome_completo: "Nome completo é obrigatório." }
        } else if (!isValidName(responsavel.nome_completo, true)) {
          newErrors.responsavel = {
            ...newErrors.responsavel,
            nome_completo: "Por favor, insira um nome e sobrenome válidos.",
          }
        }
        if (!responsavel.data_nascimento) {
          if (!newErrors.responsavel) newErrors.responsavel = {}
          newErrors.responsavel.data_nascimento = "Data de nascimento é obrigatória."
        } else if (!isDateInPast(responsavel.data_nascimento)) {
          if (!newErrors.responsavel) newErrors.responsavel = {}
          newErrors.responsavel.data_nascimento = "Data de nascimento não pode ser no futuro."
        } else {
          // Adiciona a verificação de idade
          const hoje = new Date()
          // Adiciona 1 hora para evitar problemas com fuso horário que podem "voltar" o dia
          const dataNascimento = new Date(responsavel.data_nascimento)
          dataNascimento.setHours(dataNascimento.getHours() + 1)

          let idade = hoje.getFullYear() - dataNascimento.getFullYear()
          const m = hoje.getMonth() - dataNascimento.getMonth()
          if (m < 0 || (m === 0 && hoje.getDate() < dataNascimento.getDate())) {
            idade--
          }
          if (idade < 18) {
            if (!newErrors.responsavel) newErrors.responsavel = {}
            newErrors.responsavel.data_nascimento = "O responsável deve ter pelo menos 18 anos."
          }
        }
        if (!responsavel.data_nascimento) {
          if (!newErrors.responsavel) newErrors.responsavel = {}
          newErrors.responsavel.data_nascimento = "Data de nascimento é obrigatória."
        } else if (!isDateInPast(responsavel.data_nascimento)) {
          if (!newErrors.responsavel) newErrors.responsavel = {}
          newErrors.responsavel.data_nascimento = "Data de nascimento não pode ser no futuro."
        }
        if (!responsavel.cpf) {
          if (!newErrors.responsavel) newErrors.responsavel = {}
          newErrors.responsavel.cpf = "CPF é obrigatório."
        } else if (!isValidCPF(responsavel.cpf)) {
          if (!newErrors.responsavel) newErrors.responsavel = {}
          newErrors.responsavel.cpf = "CPF inválido."
        }
        if (responsavel.email && !isValidEmail(responsavel.email)) {
          newErrors.responsavel = { ...newErrors.responsavel, email: "E-mail inválido." }
        }
        if (responsavel.nis && !isValidNIS(responsavel.nis)) {
          newErrors.responsavel = { ...newErrors.responsavel, nis: "NIS inválido." }
        }
        if (responsavel.titulo_eleitor && !isValidTituloEleitor(responsavel.titulo_eleitor)) {
          newErrors.responsavel = { ...newErrors.responsavel, titulo_eleitor: "Título de Eleitor inválido." }
        }
        if (!endereco.logradouro.trim()) {
          newErrors.endereco = { ...newErrors.endereco, logradouro: "Logradouro é obrigatório." }
        } else if (!isMeaningfulText(endereco.logradouro)) {
          newErrors.endereco = { ...newErrors.endereco, logradouro: "Logradouro inválido." }
        }
        if (!endereco.bairro.trim()) {
          newErrors.endereco = { ...newErrors.endereco, bairro: "Bairro é obrigatório." }
        } else if (!isMeaningfulText(endereco.bairro)) {
          newErrors.endereco = { ...newErrors.endereco, bairro: "Bairro inválido." }
        }
        break

      case 1: {
        // Adicionado bloco de escopo
        const integrantesErrors: Array<Partial<Record<keyof IntegranteFamiliar, string>> | null> = []
        integrantes.forEach((integrante, index) => {
          const integranteError: Partial<Record<keyof IntegranteFamiliar, string>> = {}
          if (!integrante.nome_completo.trim()) {
            integranteError.nome_completo = "Nome é obrigatório."
          } else if (!isValidName(integrante.nome_completo)) {
            integranteError.nome_completo = "Nome inválido."
          }
          if (integrante.data_nascimento && !isDateInPast(integrante.data_nascimento)) {
            integranteError.data_nascimento = "Data não pode ser no futuro."
          }
          if (!integrante.cpf) {
            integranteError.cpf = "CPF é obrigatório."
          } else if (!isValidCPF(integrante.cpf)) {
            integranteError.cpf = "CPF inválido."
          }
          if (integrante.cpf && !isValidCPF(integrante.cpf)) {
            integranteError.cpf = "CPF inválido."
          }

          if (!integrante.data_nascimento) {
            integranteError.data_nascimento = "Data de nascimento é obrigatória."
          } else if (!isDateInPast(integrante.data_nascimento)) {
            integranteError.data_nascimento = "Data não pode ser no futuro."
          }

          if (Object.keys(integranteError).length > 0) {
            integrantesErrors[index] = integranteError
          } else {
            integrantesErrors[index] = null
          }
        })
        if (integrantesErrors.some((e) => e !== null)) {
          newErrors.integrantes = integrantesErrors
        }
        break
      }

      case 2: // Saúde
        if (saude.tem_deficiencia && !isMeaningfulText(saude.deficiencia_qual)) {
          newErrors.saude = { ...newErrors.saude, deficiencia_qual: "Descrição inválida." }
        }
        if (saude.tem_tratamento_saude && !isMeaningfulText(saude.tratamento_qual)) {
          newErrors.saude = { ...newErrors.saude, tratamento_qual: "Descrição inválida." }
        }
        if (saude.usa_medicacao_continua && !isMeaningfulText(saude.medicacao_qual)) {
          newErrors.saude = { ...newErrors.saude, medicacao_qual: "Descrição inválida." }
        }
        if (saude.tem_dependente_cuidados && !isMeaningfulText(saude.dependente_quem)) {
          newErrors.saude = { ...newErrors.saude, dependente_quem: "Descrição inválida." }
        }
        break


      case 4: // Trabalho e Renda
        if (trabalho_renda.rendimento_total !== undefined && trabalho_renda.rendimento_total !== null) {
          const rendaNum = Number(trabalho_renda.rendimento_total)
          if (isNaN(rendaNum) || rendaNum < 0) {
            newErrors.trabalho_renda = {
              ...newErrors.trabalho_renda,
              rendimento_total: "Rendimento familiar deve ser um valor válido e não negativo.",
            }
          }
        }
        break

      case 5: // Social
        if (situacao_social.participa_religiao && !isMeaningfulText(situacao_social.religiao_qual)) {
          newErrors.situacao_social = { ...newErrors.situacao_social, religiao_qual: "Descrição inválida." }
        }
        if (situacao_social.participa_acao_social && !isMeaningfulText(situacao_social.acao_social_qual)) {
          newErrors.situacao_social = { ...newErrors.situacao_social, acao_social_qual: "Descrição inválida." }
        }
        break
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const proximaEtapa = () => {
    if (validarEtapa(etapaAtual)) {
      setErrors({})
      const novasEtapasCompletas = [...etapasCompletas]
      novasEtapasCompletas[etapaAtual] = true
      setEtapasCompletas(novasEtapasCompletas)
      if (etapaAtual < ETAPAS.length - 1) {
        setEtapaAtual(etapaAtual + 1)
      }
    } else {
      showMessage("Por favor, corrija os erros indicados antes de continuar.", "error")
    }
  }

  const etapaAnterior = () => {
    setErrors({})
    if (etapaAtual > 0) {
      setEtapaAtual(etapaAtual - 1)
    }
  }

  const adicionarIntegrante = () => {
    const novoIntegrante: IntegranteFamiliar = {
      nome_completo: "",
      data_nascimento: "",
      sexo: "feminino",
      cpf: "",
      rg: "",
      orgao_expedidor: "",
      estado_civil: "solteiro",
      escolaridade: "nao_alfabetizado",
      naturalidade: "",
      telefone: "",
      telefone_recado: "",
      email: "",
      nis: "",
      titulo_eleitor: "",
      ctps: "",
      tipo_membro: "filho",
      ocupacao: "",
      renda_mensal: 0,
    }

    setDadosFamilia((prev) => ({
      ...prev,
      integrantes: [...prev.integrantes, novoIntegrante],
    }))
  }

  const removerIntegrante = (index: number) => {
    setDadosFamilia((prev) => ({
      ...prev,
      integrantes: prev.integrantes.filter((_, i) => i !== index),
    }))
  }

  const atualizarIntegrante = (index: number, campo: keyof IntegranteFamiliar, valor: string | number | boolean) => {
    setDadosFamilia((prev) => ({
      ...prev,
      integrantes: prev.integrantes.map((integrante, i) =>
        i === index ? { ...integrante, [campo]: valor } : integrante,
      ),
    }))
  }

  const handleCheckboxChange = (
    section: "situacao_social",
    field: "servicos_publicos",
    value: string,
    checked: boolean,
  ) => {
    setDadosFamilia((prev) => {
      const currentArray = prev[section][field]

      return {
        ...prev,
        [section]: {
          ...prev[section],
          [field]: checked ? [...currentArray, value] : currentArray.filter((item) => item !== value),
        },
      }
    })
  }

  const validarFormularioCompleto = (): boolean => {
    for (let i = 0; i < ETAPAS.length; i++) {
      if (!validarEtapa(i)) {
        setEtapaAtual(i) // Leva o usuário para a primeira etapa com erro
        showMessage("Existem erros no formulário. Por favor, revise os campos destacados.", "error")
        return false
      }
    }
    return true
  }

  const salvarFamilia = async () => {
    if (!validarFormularioCompleto()) return

    setLoading(true)
    try {
      console.log("📤 Enviando dados:", dadosFamilia)
      await api.post("/auth/familias", dadosFamilia)
      showMessage("Família cadastrada com sucesso!", "success")
      setTimeout(() => {
        window.location.href = "/familias"
      }, 2000)
    } catch (error: unknown) {
      console.error("❌ Erro ao salvar família:", error)

      if (error && typeof error === "object" && "response" in error) {
        const axiosError = error as any

        if (axiosError.response?.status === 400) {
          const errorMessage = axiosError.response?.data?.message || axiosError.response?.data?.error

          // Tratamento específico para CPF duplicado
          if (errorMessage && errorMessage.toLowerCase().includes("cpf")) {
            showMessage("CPF já cadastrado no sistema. Verifique os dados informados.", "error")
          } else if (errorMessage && errorMessage.toLowerCase().includes("equipamento")) {
            showMessage("Equipamento inválido ou não selecionado.", "error")
          } else if (errorMessage && errorMessage.toLowerCase().includes("renda")) {
            showMessage("Valor de renda inválido. Verifique os campos de renda.", "error")
          } else {
            showMessage(errorMessage || "Dados inválidos. Verifique os campos preenchidos.", "error")
          }
        } else if (axiosError.response?.status === 500) {
          showMessage("Erro interno do servidor. Tente novamente em alguns minutos.", "error")
        } else {
          showMessage("Erro ao cadastrar família. Verifique os dados e tente novamente.", "error")
        }
      } else {
        showMessage("Erro de conexão. Verifique sua internet e tente novamente.", "error")
      }
    } finally {
      setLoading(false)
    }
  }

  // Componente do indicador de progresso
  const IndicadorProgresso = () => (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {ETAPAS.map((etapa, index) => {
          const Icone = etapa.icone
          const isAtual = index === etapaAtual
          const isCompleta = etapasCompletas[index]
          const isAcessivel = index <= etapaAtual || isCompleta

          return (
            <div key={etapa.id} className="flex items-center">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all ${isCompleta
                    ? "bg-green-500 border-green-500 text-white"
                    : isAtual
                      ? "bg-blue-500 border-blue-500 text-white"
                      : isAcessivel
                        ? "border-gray-300 text-gray-500"
                        : "border-gray-200 text-gray-300"
                  }`}
              >
                {isCompleta ? <Check className="w-5 h-5" /> : <Icone className="w-5 h-5" />}
              </div>
              <div className="ml-3 hidden sm:block">
                <p
                  className={`text-sm font-medium ${isAtual ? "text-blue-600" : isCompleta ? "text-green-600" : "text-gray-500"
                    }`}
                >
                  {etapa.nome}
                </p>
              </div>
              {index < ETAPAS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-4 ${isCompleta ? "bg-green-500" : "bg-gray-200"}`} />
              )}
            </div>
          )
        })}
      </div>
      <div className="mt-4">
        <div className="bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((etapaAtual + 1) / ETAPAS.length) * 100}%` }}
          />
        </div>
        <p className="text-sm text-gray-600 mt-2">
          Etapa {etapaAtual + 1} de {ETAPAS.length}: {ETAPAS[etapaAtual].nome}
        </p>
      </div>
    </div>
  )

  const renderizarEtapa = () => {
    const getInputClass = (fieldError: string | undefined) =>
      `w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${fieldError ? "border-red-500" : "border-gray-300"
      }`

    const renderError = (fieldError: string | undefined) =>
      fieldError && <p className="text-red-600 text-sm mt-1">{fieldError}</p>

    switch (etapaAtual) {
      case 0: // Identificação
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 mb-1 text-blue-600" />
                Identificação
              </CardTitle>
              <p className="text-sm text-gray-600">Dados de identificação do atendimento e do responsável familiar</p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Dados do Atendimento */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Data do Atendimento</label>
                  <input
                    type="date"
                    value={dadosFamilia.data_atendimento}
                    onChange={(e) => setDadosFamilia((prev) => ({ ...prev, data_atendimento: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Profissional Responsável *</label>
                  <select
                    value={dadosFamilia.profissional_id}
                    onChange={(e) =>
                      setDadosFamilia((prev) => ({ ...prev, profissional_id: Number.parseInt(e.target.value) }))
                    }
                    className={getInputClass(errors.profissional_id)}
                  >
                    <option value={0}>Selecione o profissional</option>
                    {usuarios.map((usuario) => (
                      <option key={usuario.id} value={usuario.id}>
                        {usuario.nome}
                      </option>
                    ))}
                  </select>
                  {renderError(errors.profissional_id)}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Equipamento <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={dadosFamilia.equipamento_id}
                    onChange={(e) =>
                      setDadosFamilia((prev) => ({ ...prev, equipamento_id: Number.parseInt(e.target.value) }))
                    }
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.equipamento_id ? "border-red-500" : "border-gray-300"
                      }`}
                  >
                    <option value={0}>Selecione o equipamento</option>
                    {equipamentos.map((equipamento) => (
                      <option key={equipamento.id} value={equipamento.id}>
                        {equipamento.nome} - {equipamento.regiao}
                      </option>
                    ))}
                  </select>
                  {errors.equipamento_id && <p className="text-red-500 text-sm mt-1">{errors.equipamento_id}</p>}
                </div>
              </div>

              <Separator />

              {/* Dados do Responsável */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Dados do Responsável Familiar</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nome Completo *</label>
                    <input
                      type="text"
                      placeholder="Ex: Maria da Silva"
                      value={dadosFamilia.responsavel.nome_completo}
                      onChange={(e) =>
                        setDadosFamilia((prev) => ({
                          ...prev,
                          responsavel: { ...prev.responsavel, nome_completo: e.target.value },
                        }))
                      }
                      onBlur={(e) =>
                        setDadosFamilia((prev) => ({
                          ...prev,
                          responsavel: { ...prev.responsavel, nome_completo: cleanExtraSpaces(e.target.value) },
                        }))
                      }
                      className={getInputClass(errors.responsavel?.nome_completo)}
                    />
                    {renderError(errors.responsavel?.nome_completo)}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Data de Nascimento *</label>
                    <input
                      type="date"
                      value={dadosFamilia.responsavel.data_nascimento}
                      onChange={(e) =>
                        setDadosFamilia((prev) => ({
                          ...prev,
                          responsavel: { ...prev.responsavel, data_nascimento: e.target.value },
                        }))
                      }
                      className={getInputClass(errors.responsavel?.data_nascimento)}
                    />
                    {renderError(errors.responsavel?.data_nascimento)}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Sexo</label>
                    <select
                      value={dadosFamilia.responsavel.sexo}
                      onChange={(e) =>
                        setDadosFamilia((prev) => ({
                          ...prev,
                          responsavel: {
                            ...prev.responsavel,
                            sexo: e.target.value as "feminino" | "masculino" | "outro",
                          },
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="feminino">Feminino</option>
                      <option value="masculino">Masculino</option>
                      <option value="outro">Outro</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">CPF *</label>
                    <input
                      type="text"
                      maxLength={14}
                      placeholder="000.000.000-00"
                      value={dadosFamilia.responsavel.cpf}
                      onChange={(e) =>
                        setDadosFamilia((prev) => ({
                          ...prev,
                          responsavel: { ...prev.responsavel, cpf: formatCPF(e.target.value) },
                        }))
                      }
                      className={getInputClass(errors.responsavel?.cpf)}
                    />
                    {renderError(errors.responsavel?.cpf)}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">RG</label>
                    <input
                      type="text"
                      placeholder="00.000.000-0"
                      value={dadosFamilia.responsavel.rg}
                      onChange={(e) =>
                        setDadosFamilia((prev) => ({
                          ...prev,
                          responsavel: { ...prev.responsavel, rg: e.target.value },
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Órgão Expedidor</label>
                    <input
                      type="text"
                      placeholder="Ex: SSP/SP"
                      value={dadosFamilia.responsavel.orgao_expedidor}
                      onChange={(e) =>
                        setDadosFamilia((prev) => ({
                          ...prev,
                          responsavel: { ...prev.responsavel, orgao_expedidor: formatToUpper(e.target.value) },
                        }))
                      }
                      className={getInputClass(errors.responsavel?.orgao_expedidor)}
                    />
                    {renderError(errors.responsavel?.orgao_expedidor)}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Estado Civil</label>
                    <select
                      value={dadosFamilia.responsavel.estado_civil}
                      onChange={(e) =>
                        setDadosFamilia((prev) => ({
                          ...prev,
                          responsavel: { ...prev.responsavel, estado_civil: e.target.value },
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="solteiro">Solteiro(a)</option>
                      <option value="casado">Casado(a)</option>
                      <option value="divorciado">Divorciado(a)</option>
                      <option value="viuvo">Viúvo(a)</option>
                      <option value="uniao_estavel">União Estável</option>
                      <option value="separado">Separado(a)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Naturalidade</label>
                    <input
                      type="text"
                      placeholder="Ex: Bebedouro - SP"
                      value={dadosFamilia.responsavel.naturalidade}
                      onChange={(e) =>
                        setDadosFamilia((prev) => ({
                          ...prev,
                          responsavel: { ...prev.responsavel, naturalidade: e.target.value },
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Telefone</label>
                    <input
                      type="text"
                      maxLength={15}
                      placeholder="(17) 99123-4567"
                      value={dadosFamilia.responsavel.telefone}
                      onChange={(e) =>
                        setDadosFamilia((prev) => ({
                          ...prev,
                          responsavel: { ...prev.responsavel, telefone: formatPhone(e.target.value) },
                        }))
                      }
                      className={getInputClass(errors.responsavel?.telefone)}
                    />
                    {renderError(errors.responsavel?.telefone)}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Telefone de Recado</label>
                    <input
                      type="text"
                      placeholder="(17) 98765-4321"
                      maxLength={15}
                      value={dadosFamilia.responsavel.telefone_recado}
                      onChange={(e) =>
                        setDadosFamilia((prev) => ({
                          ...prev,
                          responsavel: { ...prev.responsavel, telefone_recado: formatPhone(e.target.value) },
                        }))
                      }
                      className={getInputClass(undefined)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <input
                      type="email"
                      placeholder="exemplo@email.com"
                      value={dadosFamilia.responsavel.email}
                      onChange={(e) =>
                        setDadosFamilia((prev) => ({
                          ...prev,
                          responsavel: { ...prev.responsavel, email: e.target.value },
                        }))
                      }
                      className={getInputClass(errors.responsavel?.email)}
                    />
                    {renderError(errors.responsavel?.email)}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">NIS</label>
                    <input
                      type="text"
                      maxLength={11}
                      placeholder="00000000000"
                      value={dadosFamilia.responsavel.nis}
                      onChange={(e) =>
                        setDadosFamilia((prev) => ({
                          ...prev,
                          responsavel: { ...prev.responsavel, nis: formatNumericOnly(e.target.value) },
                        }))
                      }
                      className={getInputClass(errors.responsavel?.nis)}
                    />
                    {renderError(errors.responsavel?.nis)}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Título de Eleitor</label>
                    <input
                      type="text"
                      maxLength={12}
                      placeholder="000000000000"
                      value={dadosFamilia.responsavel.titulo_eleitor}
                      onChange={(e) =>
                        setDadosFamilia((prev) => ({
                          ...prev,
                          responsavel: { ...prev.responsavel, titulo_eleitor: formatNumericOnly(e.target.value) },
                        }))
                      }
                      className={getInputClass(errors.responsavel?.titulo_eleitor)}
                    />
                    {renderError(errors.responsavel?.titulo_eleitor)}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">CTPS</label>
                    <input
                      type="text"
                      placeholder="000000 / 0000-SP"
                      value={dadosFamilia.responsavel.ctps}
                      onChange={(e) =>
                        setDadosFamilia((prev) => ({
                          ...prev,
                          responsavel: { ...prev.responsavel, ctps: e.target.value },
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Escolaridade</label>
                    <select
                      value={dadosFamilia.responsavel.escolaridade}
                      onChange={(e) =>
                        setDadosFamilia((prev) => ({
                          ...prev,
                          responsavel: { ...prev.responsavel, escolaridade: e.target.value },
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="nao_alfabetizado">Não Alfabetizado</option>
                      <option value="fundamental_incompleto">Fundamental Incompleto</option>
                      <option value="fundamental_completo">Fundamental Completo</option>
                      <option value="medio_incompleto">Médio Incompleto</option>
                      <option value="medio_completo">Médio Completo</option>
                      <option value="superior_incompleto">Superior Incompleto</option>
                      <option value="superior_completo">Superior Completo</option>
                      <option value="pos_graduacao">Pós-graduação</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Ocupação</label>
                    <input
                      type="text"
                      placeholder="Ex: Dona de casa"
                      value={dadosFamilia.responsavel.ocupacao}
                      onChange={(e) =>
                        setDadosFamilia((prev) => ({
                          ...prev,
                          responsavel: { ...prev.responsavel, ocupacao: e.target.value },
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Renda Mensal Individual</label>
                    <input
                      type="number"
                      placeholder="R$ 0,00"
                      value={dadosFamilia.responsavel.renda_mensal}
                      onChange={(e) =>
                        setDadosFamilia((prev) => ({
                          ...prev,
                          responsavel: { ...prev.responsavel, renda_mensal: Number.parseFloat(e.target.value) || 0 },
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <Separator />

                {/* Endereço */}
                <h3 className="text-lg font-medium text-gray-900">Endereço</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Logradouro *</label>
                    <input
                      type="text"
                      placeholder="Ex: Rua das Flores"
                      value={dadosFamilia.endereco.logradouro}
                      onChange={(e) =>
                        setDadosFamilia((prev) => ({
                          ...prev,
                          endereco: { ...prev.endereco, logradouro: e.target.value },
                        }))
                      }
                      onBlur={(e) =>
                        setDadosFamilia((prev) => ({
                          ...prev,
                          endereco: { ...prev.endereco, logradouro: cleanExtraSpaces(e.target.value) },
                        }))
                      }
                      className={getInputClass(errors.endereco?.logradouro)}
                    />
                    {renderError(errors.endereco?.logradouro)}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Número</label>
                    <input
                      type="text"
                      placeholder="Ex: 123"
                      value={dadosFamilia.endereco.numero}
                      onChange={(e) =>
                        setDadosFamilia((prev) => ({
                          ...prev,
                          endereco: { ...prev.endereco, numero: e.target.value },
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Complemento</label>
                    <input
                      type="text"
                      placeholder="Ex: Apto 101, Bloco B"
                      value={dadosFamilia.endereco.complemento}
                      onChange={(e) =>
                        setDadosFamilia((prev) => ({
                          ...prev,
                          endereco: { ...prev.endereco, complemento: e.target.value },
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Bairro *</label>
                    <input
                      type="text"
                      placeholder="Ex: Centro"
                      value={dadosFamilia.endereco.bairro}
                      onChange={(e) =>
                        setDadosFamilia((prev) => ({ ...prev, endereco: { ...prev.endereco, bairro: e.target.value } }))
                      }
                      onBlur={(e) =>
                        setDadosFamilia((prev) => ({
                          ...prev,
                          endereco: { ...prev.endereco, bairro: cleanExtraSpaces(e.target.value) },
                        }))
                      }
                      className={getInputClass(errors.endereco?.bairro)}
                    />
                    {renderError(errors.endereco?.bairro)}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Cidade</label>
                    <input
                      type="text"
                      placeholder="Ex: Bebedouro"
                      value={dadosFamilia.endereco.cidade}
                      onChange={(e) =>
                        setDadosFamilia((prev) => ({
                          ...prev,
                          endereco: { ...prev.endereco, cidade: e.target.value },
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">UF</label>
                    <input
                      type="text"
                      placeholder="SP"
                      value={dadosFamilia.endereco.uf}
                      onChange={(e) =>
                        setDadosFamilia((prev) => ({
                          ...prev,
                          endereco: { ...prev.endereco, uf: formatUF(e.target.value) },
                        }))
                      }
                      className={getInputClass(errors.endereco?.uf)}
                    />
                    {renderError(errors.endereco?.uf)}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">CEP</label>
                    <input
                      type="text"
                      maxLength={9}
                      placeholder="14700-000"
                      value={dadosFamilia.endereco.cep}
                      onChange={(e) =>
                        setDadosFamilia((prev) => ({
                          ...prev,
                          endereco: { ...prev.endereco, cep: formatCEP(e.target.value) },
                        }))
                      }
                      className={getInputClass(errors.endereco?.cep)}
                    />
                    {renderError(errors.endereco?.cep)}
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Ponto de Referência</label>
                    <input
                      type="text"
                      placeholder="Ex: Ao lado do mercado"
                      value={dadosFamilia.endereco.referencia}
                      onChange={(e) =>
                        setDadosFamilia((prev) => ({
                          ...prev,
                          endereco: { ...prev.endereco, referencia: e.target.value },
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tempo de Moradia</label>
                    <input
                      type="text"
                      placeholder="Ex: 2 anos e 3 meses"
                      value={dadosFamilia.endereco.tempo_moradia}
                      onChange={(e) =>
                        setDadosFamilia((prev) => ({
                          ...prev,
                          endereco: { ...prev.endereco, tempo_moradia: e.target.value },
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )

      case 1: // Família
        return (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 mb-1 text-blue-600" />
                  Núcleo Familiar
                </CardTitle>
                <p className="text-sm text-gray-600">Informações sobre os integrantes da família</p>
              </div>
              <Button onClick={adicionarIntegrante} className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Adicionar Integrante
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              {dadosFamilia.integrantes.map((integrante, index) => (
                <Card key={index} className="border border-gray-200">
                  <CardHeader className="flex flex-row items-center justify-between pb-3">
                    <h4 className="font-medium text-gray-900">Integrante {index + 1}</h4>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => removerIntegrante(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Remover
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Nome Completo</label>
                        <input
                          type="text"
                          placeholder="Nome completo do integrante"
                          value={integrante.nome_completo}
                          onChange={(e) => atualizarIntegrante(index, "nome_completo", e.target.value)}
                          onBlur={(e) => atualizarIntegrante(index, "nome_completo", cleanExtraSpaces(e.target.value))}
                          className={getInputClass(errors.integrantes?.[index]?.nome_completo)}
                        />
                        {renderError(errors.integrantes?.[index]?.nome_completo)}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Data de Nascimento</label>
                        <input
                          type="date"
                          value={integrante.data_nascimento}
                          onChange={(e) => atualizarIntegrante(index, "data_nascimento", e.target.value)}
                          className={getInputClass(errors.integrantes?.[index]?.data_nascimento)}
                        />
                        {renderError(errors.integrantes?.[index]?.data_nascimento)}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Parentesco</label>
                        <select
                          value={integrante.tipo_membro}
                          onChange={(e) => atualizarIntegrante(index, "tipo_membro", e.target.value)}
                          className={getInputClass(errors.integrantes?.[index]?.tipo_membro)}
                        >
                          <option value="conjuge">Cônjuge</option>
                          <option value="filho">Filho(a)</option>
                          <option value="pai">Pai</option>
                          <option value="mae">Mãe</option>
                          <option value="irmao">Irmão/Irmã</option>
                          <option value="avo">Avô/Avó</option>
                          <option value="neto">Neto(a)</option>
                          <option value="outro">Outro</option>
                        </select>
                        {renderError(errors.integrantes?.[index]?.tipo_membro)}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Sexo</label>
                        <select
                          value={integrante.sexo}
                          onChange={(e) =>
                            atualizarIntegrante(index, "sexo", e.target.value as "feminino" | "masculino" | "outro")
                          }
                          className={getInputClass(errors.integrantes?.[index]?.sexo)}
                        >
                          <option value="feminino">Feminino</option>
                          <option value="masculino">Masculino</option>
                          <option value="outro">Outro</option>
                        </select>
                        {renderError(errors.integrantes?.[index]?.sexo)}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">CPF</label>
                        <input
                          type="text"
                          placeholder="000.000.000-00"
                          value={integrante.cpf}
                          maxLength={14}
                          onChange={(e) => atualizarIntegrante(index, "cpf", formatCPF(e.target.value))}
                          className={getInputClass(errors.integrantes?.[index]?.cpf)}
                        />
                        {renderError(errors.integrantes?.[index]?.cpf)}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">NIS</label>
                        <input
                          type="text"
                          placeholder="00000000000"
                          value={integrante.nis}
                          maxLength={11}
                          onChange={(e) => atualizarIntegrante(index, "nis", formatNumericOnly(e.target.value))}
                          className={getInputClass(errors.integrantes?.[index]?.nis)}
                        />
                        {renderError(errors.integrantes?.[index]?.nis)}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Escolaridade</label>
                        <select
                          value={integrante.escolaridade}
                          onChange={(e) => atualizarIntegrante(index, "escolaridade", e.target.value)}
                          className={getInputClass(errors.integrantes?.[index]?.escolaridade)}
                        >
                          <option value="nao_alfabetizado">Não Alfabetizado</option>
                          <option value="fundamental_incompleto">Fundamental Incompleto</option>
                          <option value="fundamental_completo">Fundamental Completo</option>
                          <option value="medio_incompleto">Médio Incompleto</option>
                          <option value="medio_completo">Médio Completo</option>
                          <option value="superior_incompleto">Superior Incompleto</option>
                          <option value="superior_completo">Superior Completo</option>
                          <option value="pos_graduacao">Pós-graduação</option>
                        </select>
                        {renderError(errors.integrantes?.[index]?.escolaridade)}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Ocupação</label>
                        <input
                          type="text"
                          placeholder="Ex: Estudante"
                          value={integrante.ocupacao}
                          onChange={(e) => atualizarIntegrante(index, "ocupacao", e.target.value)}
                          onBlur={(e) => atualizarIntegrante(index, "ocupacao", cleanExtraSpaces(e.target.value))}
                          className={getInputClass(errors.integrantes?.[index]?.ocupacao)}
                        />
                        {renderError(errors.integrantes?.[index]?.ocupacao)}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Renda Mensal Individual</label>
                        <input
                          type="number"
                          placeholder="R$ 0,00"
                          value={integrante.renda_mensal}
                          onChange={(e) =>
                            atualizarIntegrante(index, "renda_mensal", Number.parseFloat(e.target.value) || 0)
                          }
                          className={getInputClass(errors.integrantes?.[index]?.renda_mensal)}
                        />
                        {renderError(errors.integrantes?.[index]?.renda_mensal)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {dadosFamilia.integrantes.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>Nenhum integrante adicionado além do responsável familiar.</p>
                  <p className="text-sm">Clique em "Adicionar Integrante" para incluir outros membros da família.</p>
                </div>
              )}
            </CardContent>
          </Card>
        )

      case 2: // Saúde
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5 mb-1 text-blue-600" />
                Condições de Saúde
              </CardTitle>
              <p className="text-sm text-gray-600">Informações sobre a saúde da família</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Há integrante familiar com deficiência?
                </label>
                <div className="flex gap-6">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="tem_deficiencia"
                      value="true"
                      checked={dadosFamilia.saude.tem_deficiencia === true}
                      onChange={(e) =>
                        setDadosFamilia((prev) => ({
                          ...prev,
                          saude: { ...prev.saude, tem_deficiencia: e.target.value === "true" },
                        }))
                      }
                      className="mr-2"
                    />
                    Sim
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="tem_deficiencia"
                      value="false"
                      checked={dadosFamilia.saude.tem_deficiencia === false}
                      onChange={(e) =>
                        setDadosFamilia((prev) => ({
                          ...prev,
                          saude: { ...prev.saude, tem_deficiencia: e.target.value === "true" },
                        }))
                      }
                      className="mr-2"
                    />
                    Não
                  </label>
                </div>
              </div>
              {dadosFamilia.saude.tem_deficiencia && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Qual deficiência?</label>
                  <input
                    type="text"
                    placeholder="Descreva a(s) deficiência(s)"
                    value={dadosFamilia.saude.deficiencia_qual}
                    onChange={(e) =>
                      setDadosFamilia((prev) => ({
                        ...prev,
                        saude: { ...prev.saude, deficiencia_qual: e.target.value },
                      }))
                    }
                    onBlur={(e) =>
                      setDadosFamilia((prev) => ({
                        ...prev,
                        saude: { ...prev.saude, deficiencia_qual: cleanExtraSpaces(e.target.value) },
                      }))
                    }
                    className={getInputClass(errors.saude?.deficiencia_qual)}
                  />
                  {renderError(errors.saude?.deficiencia_qual)}
                </div>
              )}
              <Separator />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Há integrante familiar realizando tratamento de saúde?
                </label>
                <div className="flex gap-6">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="tem_tratamento"
                      value="true"
                      checked={dadosFamilia.saude.tem_tratamento_saude === true}
                      onChange={(e) =>
                        setDadosFamilia((prev) => ({
                          ...prev,
                          saude: { ...prev.saude, tem_tratamento_saude: e.target.value === "true" },
                        }))
                      }
                      className="mr-2"
                    />
                    Sim
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="tem_tratamento"
                      value="false"
                      checked={dadosFamilia.saude.tem_tratamento_saude === false}
                      onChange={(e) =>
                        setDadosFamilia((prev) => ({
                          ...prev,
                          saude: { ...prev.saude, tem_tratamento_saude: e.target.value === "true" },
                        }))
                      }
                      className="mr-2"
                    />
                    Não
                  </label>
                </div>
              </div>
              {dadosFamilia.saude.tem_tratamento_saude && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Qual tratamento?</label>
                  <input
                    type="text"
                    placeholder="Descreva o(s) tratamento(s)"
                    value={dadosFamilia.saude.tratamento_qual}
                    onChange={(e) =>
                      setDadosFamilia((prev) => ({
                        ...prev,
                        saude: { ...prev.saude, tratamento_qual: e.target.value },
                      }))
                    }
                    onBlur={(e) =>
                      setDadosFamilia((prev) => ({
                        ...prev,
                        saude: { ...prev.saude, tratamento_qual: cleanExtraSpaces(e.target.value) },
                      }))
                    }
                    className={getInputClass(errors.saude?.tratamento_qual)}
                  />
                  {renderError(errors.saude?.tratamento_qual)}
                </div>
              )}
              <Separator />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Usa medicação contínua?</label>
                <div className="flex gap-6">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="usa_medicacao"
                      value="true"
                      checked={dadosFamilia.saude.usa_medicacao_continua === true}
                      onChange={(e) =>
                        setDadosFamilia((prev) => ({
                          ...prev,
                          saude: { ...prev.saude, usa_medicacao_continua: e.target.value === "true" },
                        }))
                      }
                      className="mr-2"
                    />
                    Sim
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="usa_medicacao"
                      value="false"
                      checked={dadosFamilia.saude.usa_medicacao_continua === false}
                      onChange={(e) =>
                        setDadosFamilia((prev) => ({
                          ...prev,
                          saude: { ...prev.saude, usa_medicacao_continua: e.target.value === "true" },
                        }))
                      }
                      className="mr-2"
                    />
                    Não
                  </label>
                </div>
              </div>
              {dadosFamilia.saude.usa_medicacao_continua && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Qual medicação?</label>
                  <input
                    type="text"
                    placeholder="Descreva a(s) medicação(ões)"
                    value={dadosFamilia.saude.medicacao_qual}
                    onChange={(e) =>
                      setDadosFamilia((prev) => ({ ...prev, saude: { ...prev.saude, medicacao_qual: e.target.value } }))
                    }
                    onBlur={(e) =>
                      setDadosFamilia((prev) => ({
                        ...prev,
                        saude: { ...prev.saude, medicacao_qual: cleanExtraSpaces(e.target.value) },
                      }))
                    }
                    className={getInputClass(errors.saude?.medicacao_qual)}
                  />
                  {renderError(errors.saude?.medicacao_qual)}
                </div>
              )}
              <Separator />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Há dependente que necessita de cuidados especiais?
                </label>
                <div className="flex gap-6">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="tem_dependente"
                      value="true"
                      checked={dadosFamilia.saude.tem_dependente_cuidados === true}
                      onChange={(e) =>
                        setDadosFamilia((prev) => ({
                          ...prev,
                          saude: { ...prev.saude, tem_dependente_cuidados: e.target.value === "true" },
                        }))
                      }
                      className="mr-2"
                    />
                    Sim
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="tem_dependente"
                      value="false"
                      checked={dadosFamilia.saude.tem_dependente_cuidados === false}
                      onChange={(e) =>
                        setDadosFamilia((prev) => ({
                          ...prev,
                          saude: { ...prev.saude, tem_dependente_cuidados: e.target.value === "true" },
                        }))
                      }
                      className="mr-2"
                    />
                    Não
                  </label>
                </div>
              </div>
              {dadosFamilia.saude.tem_dependente_cuidados && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Quem é o dependente?</label>
                  <input
                    type="text"
                    placeholder="Nome do dependente e tipo de cuidado"
                    value={dadosFamilia.saude.dependente_quem}
                    onChange={(e) =>
                      setDadosFamilia((prev) => ({
                        ...prev,
                        saude: { ...prev.saude, dependente_quem: e.target.value },
                      }))
                    }
                    onBlur={(e) =>
                      setDadosFamilia((prev) => ({
                        ...prev,
                        saude: { ...prev.saude, dependente_quem: cleanExtraSpaces(e.target.value) },
                      }))
                    }
                    className={getInputClass(errors.saude?.dependente_quem)}
                  />
                  {renderError(errors.saude?.dependente_quem)}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Observações</label>
                <textarea
                  placeholder="Outras informações relevantes sobre a saúde da família"
                  value={dadosFamilia.saude.observacoes}
                  onChange={(e) =>
                    setDadosFamilia((prev) => ({ ...prev, saude: { ...prev.saude, observacoes: e.target.value } }))
                  }
                  onBlur={(e) =>
                    setDadosFamilia((prev) => ({
                      ...prev,
                      saude: { ...prev.saude, observacoes: cleanExtraSpaces(e.target.value) },
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </CardContent>
          </Card>
        )

      case 3: // Habitação
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Home className="h-5 w-5 mb-1 text-blue-600" />
                Condições de Habitação
              </CardTitle>
              <p className="text-sm text-gray-600">Informações sobre as condições de moradia da família</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Quantidade de Cômodos</label>
                  <input
                    type="number"
                    min="0" 
                    placeholder="Ex: 4"
                    value={dadosFamilia.habitacao.qtd_comodos}
                    onChange={(e) =>
                      setDadosFamilia((prev) => ({
                        ...prev,
                        habitacao: {
                          ...prev.habitacao,
                          qtd_comodos: Math.max(0, Number.parseInt(e.target.value) || 0)
                        },
                      }))
                    }
                    className={getInputClass(errors.habitacao?.qtd_comodos)}
                  />
                  {renderError(errors.habitacao?.qtd_comodos)}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Quantidade de Dormitórios</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Ex: 2"
                    value={dadosFamilia.habitacao.qtd_dormitorios}
                    onChange={(e) =>
                      setDadosFamilia((prev) => ({
                        ...prev,
                        habitacao: {
                          ...prev.habitacao,
                          qtd_dormitorios: Math.max(0, Number.parseInt(e.target.value) || 0)
                        },
                      }))
                    }
                    className={getInputClass(errors.habitacao?.qtd_dormitorios)}
                  />
                  {renderError(errors.habitacao?.qtd_dormitorios)}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Tipo de Construção</label>
                <div className="flex flex-col gap-2">
                  {[
                    { value: "alvenaria", label: "Alvenaria" },
                    { value: "madeira", label: "Madeira" },
                    { value: "mista", label: "Mista" },
                    { value: "taipa", label: "Taipa" },
                    { value: "outro", label: "Outro" },
                  ].map((option) => (
                    <label key={option.value} className="flex items-center">
                      <input
                        type="radio"
                        name="tipo_construcao"
                        value={option.value}
                        checked={dadosFamilia.habitacao.tipo_construcao === option.value}
                        onChange={(e) =>
                          setDadosFamilia((prev) => ({
                            ...prev,
                            habitacao: { ...prev.habitacao, tipo_construcao: e.target.value },
                          }))
                        }
                        className="mr-2"
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Condição do Domicílio</label>
                <div className="flex flex-col gap-2">
                  {[
                    { value: "propria_quitada", label: "Própria Quitada" },
                    { value: "propria_financiada", label: "Própria Financiada" },
                    { value: "alugada", label: "Alugada" },
                    { value: "cedida", label: "Cedida" },
                    { value: "ocupada", label: "Ocupada" },
                    { value: "situacao_rua", label: "Situação de Rua" },
                  ].map((option) => (
                    <label key={option.value} className="flex items-center">
                      <input
                        type="radio"
                        name="condicao_domicilio"
                        value={option.value}
                        checked={dadosFamilia.habitacao.condicao_domicilio === option.value}
                        onChange={(e) =>
                          setDadosFamilia((prev) => ({
                            ...prev,
                            habitacao: { ...prev.habitacao, condicao_domicilio: e.target.value },
                          }))
                        }
                        className="mr-2"
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Possui área de conflito?</label>
                <div className="flex gap-6">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="area_conflito"
                      value="true"
                      checked={dadosFamilia.habitacao.area_conflito === true}
                      onChange={(e) =>
                        setDadosFamilia((prev) => ({
                          ...prev,
                          habitacao: { ...prev.habitacao, area_conflito: e.target.value === "true" },
                        }))
                      }
                      className="mr-2"
                    />
                    Sim
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="area_conflito"
                      value="false"
                      checked={dadosFamilia.habitacao.area_conflito === false}
                      onChange={(e) =>
                        setDadosFamilia((prev) => ({
                          ...prev,
                          habitacao: { ...prev.habitacao, area_conflito: e.target.value === "true" },
                        }))
                      }
                      className="mr-2"
                    />
                    Não
                  </label>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Energia Elétrica</label>
                  <select
                    value={dadosFamilia.habitacao.energia_eletrica}
                    onChange={(e) =>
                      setDadosFamilia((prev) => ({
                        ...prev,
                        habitacao: { ...prev.habitacao, energia_eletrica: e.target.value },
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="propria">Própria</option>
                    <option value="compartilhada">Compartilhada</option>
                    <option value="nao_tem">Não Tem</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Abastecimento de Água</label>
                  <select
                    value={dadosFamilia.habitacao.agua}
                    onChange={(e) =>
                      setDadosFamilia((prev) => ({
                        ...prev,
                        habitacao: { ...prev.habitacao, agua: e.target.value },
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="propria">Própria</option>
                    <option value="compartilhada">Compartilhada</option>
                    <option value="rede_publica">Rede Pública</option>
                    <option value="poco">Poço</option>
                    <option value="carro_pipa">Carro Pipa</option>
                    <option value="nao_tem">Não Tem</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Esgotamento Sanitário</label>
                  <select
                    value={dadosFamilia.habitacao.esgoto}
                    onChange={(e) =>
                      setDadosFamilia((prev) => ({
                        ...prev,
                        habitacao: { ...prev.habitacao, esgoto: e.target.value },
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="rede">Rede</option>
                    <option value="fossa_septica">Fossa Séptica</option>
                    <option value="fossa_comum">Fossa Comum</option>
                    <option value="ceu_aberto">Céu Aberto</option>
                    <option value="nao_tem">Não Tem</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Coleta de Lixo</label>
                  <div className="flex gap-6">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="coleta_lixo"
                        value="true"
                        checked={dadosFamilia.habitacao.coleta_lixo === true}
                        onChange={(e) =>
                          setDadosFamilia((prev) => ({
                            ...prev,
                            habitacao: { ...prev.habitacao, coleta_lixo: e.target.value === "true" },
                          }))
                        }
                        className="mr-2"
                      />
                      Sim
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="coleta_lixo"
                        value="false"
                        checked={dadosFamilia.habitacao.coleta_lixo === false}
                        onChange={(e) =>
                          setDadosFamilia((prev) => ({
                            ...prev,
                            habitacao: { ...prev.habitacao, coleta_lixo: e.target.value === "true" },
                          }))
                        }
                        className="mr-2"
                      />
                      Não
                    </label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )

      case 4: // Renda
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 mb-1 text-blue-600" />
                Trabalho e Renda
              </CardTitle>
              <p className="text-sm text-gray-600">Informações sobre a situação de trabalho e renda da família</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Quem trabalha na família?</label>
                <input
                  type="text"
                  placeholder="Ex: João (pedreiro), Maria (diarista)"
                  value={dadosFamilia.trabalho_renda.quem_trabalha}
                  onChange={(e) =>
                    setDadosFamilia((prev) => ({
                      ...prev,
                      trabalho_renda: { ...prev.trabalho_renda, quem_trabalha: e.target.value },
                    }))
                  }
                  onBlur={(e) =>
                    setDadosFamilia((prev) => ({
                      ...prev,
                      trabalho_renda: { ...prev.trabalho_renda, quem_trabalha: cleanExtraSpaces(e.target.value) },
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rendimento Total da Família (mensal)
                </label>
                <input
                  type="number"
                  min="0" // ADICIONADO
                  placeholder="R$ 0,00"
                  value={dadosFamilia.trabalho_renda.rendimento_total}
                  onChange={(e) =>
                    setDadosFamilia((prev) => ({
                      ...prev,
                      trabalho_renda: {
                        ...prev.trabalho_renda,
                        // CORREÇÃO: Garante que o valor não seja negativo
                        rendimento_total: Math.max(0, Number(e.target.value))
                      },
                    }))
                  }
                  className={getInputClass(errors.trabalho_renda?.rendimento_total)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Observações</label>
                <textarea
                  placeholder="Outras informações relevantes sobre trabalho e renda"
                  value={dadosFamilia.trabalho_renda.observacoes}
                  onChange={(e) =>
                    setDadosFamilia((prev) => ({
                      ...prev,
                      trabalho_renda: { ...prev.trabalho_renda, observacoes: e.target.value },
                    }))
                  }
                  onBlur={(e) =>
                    setDadosFamilia((prev) => ({
                      ...prev,
                      trabalho_renda: { ...prev.trabalho_renda, observacoes: cleanExtraSpaces(e.target.value) },
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <Separator />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Programas de transferência de renda recebidos
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {programasSociais.map((programa) => (
                    <div key={programa.id} className="space-y-2">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={dadosFamilia.programas_sociais.some((p) => p.programa_id === programa.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setDadosFamilia((prev) => ({
                                ...prev,
                                programas_sociais: [
                                  ...prev.programas_sociais,
                                  { programa_id: programa.id, valor: programa.valor_padrao },
                                ],
                              }))
                            } else {
                              setDadosFamilia((prev) => ({
                                ...prev,
                                programas_sociais: prev.programas_sociais.filter((p) => p.programa_id !== programa.id),
                              }))
                            }
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm">
                          {programa.nome} ({programa.codigo})
                        </span>
                      </label>
                      {dadosFamilia.programas_sociais.some((p) => p.programa_id === programa.id) && (
                        <input
                          type="number"
                          min="0" // ADICIONADO
                          placeholder="Valor recebido"
                          value={dadosFamilia.programas_sociais.find((p) => p.programa_id === programa.id)?.valor || 0}
                          onChange={(e) => {
                            // CORREÇÃO: Garante que o valor não seja negativo
                            const valor = Math.max(0, Number.parseFloat(e.target.value) || 0);
                            setDadosFamilia((prev) => ({
                              ...prev,
                              programas_sociais: prev.programas_sociais.map((p) =>
                                p.programa_id === programa.id ? { ...p, valor } : p,
                              ),
                            }))
                          }}
                          className="ml-6 max-w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Despesas mensais</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {tiposDespesas.map((tipo) => (
                    <div key={tipo.id}>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {tipo.nome} {tipo.obrigatoria && <span className="text-red-500">*</span>}
                      </label>
                      <input
                        type="number"
                        min="0" // ADICIONADO
                        placeholder="R$ 0,00"
                        value={dadosFamilia.despesas.find((d) => d.tipo_despesa_id === tipo.id)?.valor || ""}
                        onChange={(e) => {
                          // CORREÇÃO: Garante que o valor não seja negativo
                          const valor = Math.max(0, Number.parseFloat(e.target.value) || 0);
                          setDadosFamilia((prev) => {
                            const despesaExiste = prev.despesas.some((d) => d.tipo_despesa_id === tipo.id)
                            let novasDespesas

                            if (despesaExiste) {
                              novasDespesas = prev.despesas.map((d) =>
                                d.tipo_despesa_id === tipo.id ? { ...d, valor } : d,
                              )
                            } else {
                              novasDespesas = [...prev.despesas, { tipo_despesa_id: tipo.id, valor }]
                            }
                            // Filtra para remover despesas com valor 0 que não sejam obrigatórias
                            return {
                              ...prev,
                              despesas: novasDespesas.filter(d => {
                                const tipoDespesa = tiposDespesas.find(t => t.id === d.tipo_despesa_id)
                                return d.valor > 0 || (tipoDespesa && tipoDespesa.obrigatoria)
                              })
                            }
                          })
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )

      case 5: // Social
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5 mb-1 text-blue-600" />
                Situação Social
              </CardTitle>
              <p className="text-sm text-gray-600">
                Informações sobre a participação social e acesso a serviços públicos
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Participa de alguma religião?</label>
                <div className="flex gap-6">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="participa_religiao"
                      value="true"
                      checked={dadosFamilia.situacao_social.participa_religiao === true}
                      onChange={(e) =>
                        setDadosFamilia((prev) => ({
                          ...prev,
                          situacao_social: { ...prev.situacao_social, participa_religiao: e.target.value === "true" },
                        }))
                      }
                      className="mr-2"
                    />
                    Sim
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="participa_religiao"
                      value="false"
                      checked={dadosFamilia.situacao_social.participa_religiao === false}
                      onChange={(e) =>
                        setDadosFamilia((prev) => ({
                          ...prev,
                          situacao_social: { ...prev.situacao_social, participa_religiao: e.target.value === "true" },
                        }))
                      }
                      className="mr-2"
                    />
                    Não
                  </label>
                </div>
              </div>
              {dadosFamilia.situacao_social.participa_religiao && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Qual religião?</label>
                  <input
                    type="text"
                    placeholder="Ex: Católica, Evangélica"
                    value={dadosFamilia.situacao_social.religiao_qual}
                    onChange={(e) =>
                      setDadosFamilia((prev) => ({
                        ...prev,
                        situacao_social: { ...prev.situacao_social, religiao_qual: e.target.value },
                      }))
                    }
                    onBlur={(e) =>
                      setDadosFamilia((prev) => ({
                        ...prev,
                        situacao_social: { ...prev.situacao_social, religiao_qual: cleanExtraSpaces(e.target.value) },
                      }))
                    }
                    className={getInputClass(errors.situacao_social?.religiao_qual)}
                  />
                  {renderError(errors.situacao_social?.religiao_qual)}
                </div>
              )}
              <Separator />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Participa de alguma ação social?</label>
                <div className="flex gap-6">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="participa_acao_social"
                      value="true"
                      checked={dadosFamilia.situacao_social.participa_acao_social === true}
                      onChange={(e) =>
                        setDadosFamilia((prev) => ({
                          ...prev,
                          situacao_social: {
                            ...prev.situacao_social,
                            participa_acao_social: e.target.value === "true",
                          },
                        }))
                      }
                      className="mr-2"
                    />
                    Sim
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="participa_acao_social"
                      value="false"
                      checked={dadosFamilia.situacao_social.participa_acao_social === false}
                      onChange={(e) =>
                        setDadosFamilia((prev) => ({
                          ...prev,
                          situacao_social: {
                            ...prev.situacao_social,
                            participa_acao_social: e.target.value === "true",
                          },
                        }))
                      }
                      className="mr-2"
                    />
                    Não
                  </label>
                </div>
              </div>
              {dadosFamilia.situacao_social.participa_acao_social && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Qual ação social?</label>
                  <input
                    type="text"
                    placeholder="Ex: Grupo de apoio do bairro"
                    value={dadosFamilia.situacao_social.acao_social_qual}
                    onChange={(e) =>
                      setDadosFamilia((prev) => ({
                        ...prev,
                        situacao_social: { ...prev.situacao_social, acao_social_qual: e.target.value },
                      }))
                    }
                    onBlur={(e) =>
                      setDadosFamilia((prev) => ({
                        ...prev,
                        situacao_social: {
                          ...prev.situacao_social,
                          acao_social_qual: cleanExtraSpaces(e.target.value),
                        },
                      }))
                    }
                    className={getInputClass(errors.situacao_social?.acao_social_qual)}
                  />
                  {renderError(errors.situacao_social?.acao_social_qual)}
                </div>
              )}
              <Separator />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Serviços Públicos Utilizados</label>
                <div className="flex flex-col gap-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      value="cras"
                      checked={dadosFamilia.situacao_social.servicos_publicos.includes("cras")}
                      onChange={(e) =>
                        handleCheckboxChange("situacao_social", "servicos_publicos", "cras", e.target.checked)
                      }
                      className="mr-2"
                    />
                    CRAS
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      value="creas"
                      checked={dadosFamilia.situacao_social.servicos_publicos.includes("creas")}
                      onChange={(e) =>
                        handleCheckboxChange("situacao_social", "servicos_publicos", "creas", e.target.checked)
                      }
                      className="mr-2"
                    />
                    CREAS
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      value="saude"
                      checked={dadosFamilia.situacao_social.servicos_publicos.includes("saude")}
                      onChange={(e) =>
                        handleCheckboxChange("situacao_social", "servicos_publicos", "saude", e.target.checked)
                      }
                      className="mr-2"
                    />
                    Saúde (Posto de Saúde, UPA, etc.)
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      value="educacao"
                      checked={dadosFamilia.situacao_social.servicos_publicos.includes("educacao")}
                      onChange={(e) =>
                        handleCheckboxChange("situacao_social", "servicos_publicos", "educacao", e.target.checked)
                      }
                      className="mr-2"
                    />
                    Educação (Escola, Creche, etc.)
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      value="habitacao"
                      checked={dadosFamilia.situacao_social.servicos_publicos.includes("habitacao")}
                      onChange={(e) =>
                        handleCheckboxChange("situacao_social", "servicos_publicos", "habitacao", e.target.checked)
                      }
                      className="mr-2"
                    />
                    Habitação
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      value="assistencia_social"
                      checked={dadosFamilia.situacao_social.servicos_publicos.includes("assistencia_social")}
                      onChange={(e) =>
                        handleCheckboxChange(
                          "situacao_social",
                          "servicos_publicos",
                          "assistencia_social",
                          e.target.checked,
                        )
                      }
                      className="mr-2"
                    />
                    Outros de Assistência Social
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Observações</label>
                <textarea
                  placeholder="Outras informações relevantes sobre a situação social da família"
                  value={dadosFamilia.situacao_social.observacoes}
                  onChange={(e) =>
                    setDadosFamilia((prev) => ({
                      ...prev,
                      situacao_social: { ...prev.situacao_social, observacoes: e.target.value },
                    }))
                  }
                  onBlur={(e) =>
                    setDadosFamilia((prev) => ({
                      ...prev,
                      situacao_social: { ...prev.situacao_social, observacoes: cleanExtraSpaces(e.target.value) },
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </CardContent>
          </Card>
        )

      default:
        return <div>Etapa inválida</div>
    }
  }

  return (
    <div>
      <Header />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-semibold mb-4">Cadastro de Família</h1>

        {message && (
          <Alert
            variant={
              messageType === "error"
                ? "destructive"
                : messageType === "success"
                  ? "default"
                  : undefined
            }
          >
            {message}
          </Alert>
        )}

        <IndicadorProgresso />

        {renderizarEtapa()}

        <div className="mt-6 flex justify-between">
          <Button
            onClick={etapaAnterior}
            disabled={etapaAtual === 0}
            variant="outline"
            className="flex items-center gap-2 bg-transparent"
          >
            <ChevronLeft className="w-4 h-4" />
            Anterior
          </Button>
          {etapaAtual === ETAPAS.length - 1 ? (
            <Button onClick={salvarFamilia} disabled={loading} className="flex items-center gap-2">
              <Save className="w-4 h-4" />
              {loading ? "Salvando..." : "Salvar Família"}
            </Button>
          ) : (
            <Button onClick={proximaEtapa} className="flex items-center gap-2">
              Próxima Etapa
              <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </main>
    </div>
  )
}

export default CadastroFamilia