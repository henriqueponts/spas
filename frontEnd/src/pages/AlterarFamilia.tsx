"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { useParams, useNavigate } from "react-router-dom"
import {
  ArrowLeft,
  User,
  Users,
  Heart,
  Home,
  Briefcase,
  Globe,
  Save,
  FileText,
  ChevronLeft,
  ChevronRight,
  Check,
  Loader2,
} from "lucide-react"
import { Button } from "../components/ui/Button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "../components/ui/Card"
import { Alert } from "../components/ui/Alert"
import { Separator } from "../components/ui/Separator"
import api from "../services/api"
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
  id?: number
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
    tipo_construcao: string
    area_conflito: boolean
    condicao_domicilio: string
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

const AlterarFamilia: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [etapaAtual, setEtapaAtual] = useState(0)
  const [etapasCompletas, setEtapasCompletas] = useState<boolean[]>(new Array(ETAPAS.length).fill(false))
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([])
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [programasSociais, setProgramasSociais] = useState<ProgramaSocial[]>([])
  const [tiposDespesas, setTiposDespesas] = useState<TipoDespesa[]>([])
  const [message, setMessage] = useState("")
  const [messageType, setMessageType] = useState<"success" | "error" | "">("")

  // NOVO: Estado de erros tipado
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
      tipo_construcao: "alvenaria", // <-- CORRIGIDO
      area_conflito: false,
      condicao_domicilio: "propria_quitada", // <-- CORRIGIDO
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

  // Carregar dados iniciais e dados da família
  useEffect(() => {
    if (id) {
      console.log("🔍 ID da família obtido da URL:", id)
      carregarDados()
    } else {
      console.error("❌ ID da família não encontrado na URL")
      showMessage("ID da família não encontrado na URL", "error")
      navigate("/familias")
    }
  }, [id, navigate])

  // NOVO: Função de carregamento envolvida em useCallback
  const carregarDados = useCallback(async () => {
    if (!id) return
    try {
      setLoadingData(true)
      console.log("📋 Iniciando carregamento de dados...")

      // Carregar dados auxiliares
      console.log("🔄 Carregando dados auxiliares...")
      const [equipamentosRes, usuariosRes, programasRes, despesasRes] = await Promise.all([
        api.get("/auth/equipamentos"),
        api.get("/auth/usuarios/tecnicos"),
        api.get("/auth/programas-sociais"),
        api.get("/auth/tipos-despesas"),
      ])

      const loadedProgramas = Array.isArray(programasRes.data) ? programasRes.data : []
      const loadedDespesas = Array.isArray(despesasRes.data) ? despesasRes.data : []

      console.log("✅ Dados auxiliares carregados")
      setEquipamentos(Array.isArray(equipamentosRes.data) ? equipamentosRes.data : [])
      setUsuarios(Array.isArray(usuariosRes.data) ? usuariosRes.data : [])
      setProgramasSociais(loadedProgramas)
      setTiposDespesas(loadedDespesas)

      // Carregar dados da família (APENAS UMA VEZ)
      console.log("👨‍👩‍👧‍👦 Carregando dados da família ID:", id)
      const familiaRes = await api.get(`/auth/familias/${id}`)
      const familiaData = familiaRes.data

      console.log("📋 Dados da família carregados:", familiaData)

      // Converter dados da API para o formato do formulário
      // A sua lógica de conversão aqui está perfeita e pode ser mantida como está.
      const dadosConvertidos: DadosFamilia = {
        id: familiaData.id,
        data_atendimento: familiaData.data_atendimento
          ? familiaData.data_atendimento.split("T")[0]
          : new Date().toISOString().split("T")[0],
        profissional_id: familiaData.profissional_id || 0,
        prontuario: familiaData.prontuario || "",
        equipamento_id: familiaData.equipamento_id || 0,
        responsavel: {
          ...familiaData.responsavel,
          tipo_membro: "responsavel",
          data_nascimento: familiaData.responsavel?.data_nascimento
            ? familiaData.responsavel.data_nascimento.split("T")[0]
            : "",
          sexo: familiaData.responsavel?.sexo || "feminino",
          estado_civil: familiaData.responsavel?.estado_civil || "solteiro",
          escolaridade: familiaData.responsavel?.escolaridade || "nao_alfabetizado",
          nome_completo: familiaData.responsavel?.nome_completo || "",
          cpf: familiaData.responsavel?.cpf || "",
          rg: familiaData.responsavel?.rg || "",
          orgao_expedidor: familiaData.responsavel?.orgao_expedidor || "",
          naturalidade: familiaData.responsavel?.naturalidade || "",
          telefone: familiaData.responsavel?.telefone || "",
          telefone_recado: familiaData.responsavel?.telefone_recado || "",
          email: familiaData.responsavel?.email || "",
          nis: familiaData.responsavel?.nis || "",
          titulo_eleitor: familiaData.responsavel?.titulo_eleitor || "",
          ctps: familiaData.responsavel?.ctps || "",
          ocupacao: familiaData.responsavel?.ocupacao || "",
          renda_mensal: familiaData.responsavel?.renda_mensal || 0,
        },
        endereco: {
          logradouro: familiaData.endereco?.logradouro || "",
          numero: familiaData.endereco?.numero || "",
          complemento: familiaData.endereco?.complemento || "",
          bairro: familiaData.endereco?.bairro || "",
          cidade: familiaData.endereco?.cidade || "Bebedouro",
          uf: familiaData.endereco?.uf || "SP",
          cep: familiaData.endereco?.cep || "",
          referencia: familiaData.endereco?.referencia || "",
          tempo_moradia: familiaData.endereco?.tempo_moradia || "",
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        integrantes: (familiaData.integrantes || []).map((integrante: any) => ({
          ...integrante,
          data_nascimento: integrante.data_nascimento ? integrante.data_nascimento.split("T")[0] : "",
          sexo: integrante.sexo || "feminino",
          estado_civil: integrante.estado_civil || "solteiro",
          escolaridade: integrante.escolaridade || "nao_alfabetizado",
          nome_completo: integrante.nome_completo || "",
          cpf: integrante.cpf || "",
          rg: integrante.rg || "",
          orgao_expedidor: integrante.orgao_expedidor || "",
          naturalidade: integrante.naturalidade || "",
          telefone: integrante.telefone || "",
          telefone_recado: integrante.telefone_recado || "",
          email: integrante.email || "",
          nis: integrante.nis || "",
          titulo_eleitor: integrante.titulo_eleitor || "",
          ctps: integrante.ctps || "",
          tipo_membro: integrante.tipo_membro || "filho",
          ocupacao: integrante.ocupacao || "",
          renda_mensal: integrante.renda_mensal || 0,
        })),
        saude: {
          tem_deficiencia: !!familiaData.saude?.tem_deficiencia,
          deficiencia_qual: familiaData.saude?.deficiencia_qual || "",
          tem_tratamento_saude: !!familiaData.saude?.tem_tratamento_saude,
          tratamento_qual: familiaData.saude?.tratamento_qual || "",
          usa_medicacao_continua: !!familiaData.saude?.usa_medicacao_continua,
          medicacao_qual: familiaData.saude?.medicacao_qual || "",
          tem_dependente_cuidados: !!familiaData.saude?.tem_dependente_cuidados,
          dependente_quem: familiaData.saude?.dependente_quem || "",
          observacoes: familiaData.saude?.observacoes || "",
        },
        habitacao: {
          qtd_comodos: familiaData.habitacao?.qtd_comodos || 0,
          qtd_dormitorios: familiaData.habitacao?.qtd_dormitorios || 0,
          tipo_construcao: familiaData.habitacao?.tipo_construcao || [],
          area_conflito: !!familiaData.habitacao?.area_conflito,
          condicao_domicilio: familiaData.habitacao?.condicao_domicilio || [],
          energia_eletrica: familiaData.habitacao?.energia_eletrica || "propria",
          agua: familiaData.habitacao?.agua || "propria",
          esgoto: familiaData.habitacao?.esgoto || "rede",
          coleta_lixo: familiaData.habitacao?.coleta_lixo !== undefined ? familiaData.habitacao.coleta_lixo : true,
        },
        trabalho_renda: {
          quem_trabalha: familiaData.trabalho_renda?.quem_trabalha || "",
          rendimento_total: familiaData.trabalho_renda?.rendimento_total || 0,
          observacoes: familiaData.trabalho_renda?.observacoes || "",
        },
        programas_sociais: (familiaData.programas_sociais || []).map(
          (programa: { programa_id: number; valor: number }) => ({
            programa_id: programa.programa_id,
            valor: programa.valor,
          }),
        ),
        despesas: (familiaData.despesas || []).map((despesa: { tipo_despesa_id: number; valor: number }) => ({
          tipo_despesa_id: despesa.tipo_despesa_id,
          valor: despesa.valor,
        })),
        situacao_social: {
          participa_religiao: !!familiaData.situacao_social?.participa_religiao,
          religiao_qual: familiaData.situacao_social?.religiao_qual || "",
          participa_acao_social: !!familiaData.situacao_social?.participa_acao_social,
          acao_social_qual: familiaData.situacao_social?.acao_social_qual || "",
          servicos_publicos: familiaData.situacao_social?.servicos_publicos || [],
          observacoes: familiaData.situacao_social?.observacoes || "",
        },
      }

      console.log("✅ Dados convertidos:", dadosConvertidos)
      setDadosFamilia(dadosConvertidos)

      // Marcar todas as etapas como completas já que os dados existem
      setEtapasCompletas(new Array(ETAPAS.length).fill(true))

      console.log("🎉 Carregamento concluído com sucesso!")
    } catch (error) {
      console.error("❌ Erro ao carregar dados:", error)
      showMessage(`Erro ao carregar dados: ${error instanceof Error ? error.message : "Erro desconhecido"}`, "error")
    } finally {
      setLoadingData(false)
    }
  }, [id])

  useEffect(() => {
    if (id) {
      carregarDados()
    } else {
      showMessage("ID da família não encontrado na URL", "error")
      navigate("/familias")
    }
  }, [id, navigate, carregarDados])

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
    const { responsavel, endereco, integrantes } = dadosFamilia

    switch (etapa) {
      case 0: {
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
          newErrors.responsavel = { ...newErrors.responsavel, data_nascimento: "Data de nascimento é obrigatória." }
        } else if (!isDateInPast(responsavel.data_nascimento)) {
          newErrors.responsavel = {
            ...newErrors.responsavel,
            data_nascimento: "Data de nascimento não pode ser no futuro.",
          }
        }
        if (!responsavel.cpf) {
          newErrors.responsavel = { ...newErrors.responsavel, cpf: "CPF é obrigatório." }
        } else if (!isValidCPF(responsavel.cpf)) {
          newErrors.responsavel = { ...newErrors.responsavel, cpf: "CPF inválido." }
        }
        if (!responsavel.rg.trim()) {
          if (!newErrors.responsavel) newErrors.responsavel = {}
          newErrors.responsavel.rg = "RG é obrigatório."
        } else if (responsavel.rg.length > 20) {
          if (!newErrors.responsavel) newErrors.responsavel = {}
          newErrors.responsavel.rg = "RG precisa ter 20 dígitos ou menos."
        }
        if (!endereco.logradouro.trim()) {
          newErrors.endereco = { ...newErrors.endereco, logradouro: "Logradouro é obrigatório." }
        }
        if (!endereco.bairro.trim()) {
          newErrors.endereco = { ...newErrors.endereco, bairro: "Bairro é obrigatório." }
        }
        if (responsavel.nis && !isValidNIS(responsavel.nis)) {
          if (!newErrors.responsavel) newErrors.responsavel = {}
          newErrors.responsavel.nis = "NIS inválido."
        }
        if (responsavel.email && !isValidEmail(responsavel.email)) {
          if (!newErrors.responsavel) newErrors.responsavel = {}
          newErrors.responsavel.email = "E-mail inválido."
        }
        if (responsavel.titulo_eleitor && !isValidTituloEleitor(responsavel.titulo_eleitor)) {
          if (!newErrors.responsavel) newErrors.responsavel = {}
          newErrors.responsavel.titulo_eleitor = "Título de Eleitor inválido."
        }

        if (!endereco.logradouro.trim()) {
          if (!newErrors.endereco) newErrors.endereco = {}
          newErrors.endereco.logradouro = "Logradouro é obrigatório."
        } else if (!isMeaningfulText(endereco.logradouro)) {
          // ADICIONADO
          if (!newErrors.endereco) newErrors.endereco = {}
          newErrors.endereco.logradouro = "Logradouro inválido."
        }

        if (!endereco.bairro.trim()) {
          if (!newErrors.endereco) newErrors.endereco = {}
          newErrors.endereco.bairro = "Bairro é obrigatório."
        } else if (!isMeaningfulText(endereco.bairro)) {
          // ADICIONADO
          if (!newErrors.endereco) newErrors.endereco = {}
          newErrors.endereco.bairro = "Bairro inválido."
        }
        break
      }
      case 1: {
        const integrantesErrors: Array<Partial<Record<keyof IntegranteFamiliar, string>> | null> = []
        integrantes.forEach((integrante, index) => {
          const integranteError: Partial<Record<keyof IntegranteFamiliar, string>> = {}
          if (!integrante.nome_completo.trim()) {
            integranteError.nome_completo = "Nome é obrigatório."
          }
          if (!integrante.data_nascimento) {
            integranteError.data_nascimento = "Data de nascimento é obrigatória."
          }
          if (!integrante.cpf) {
            integranteError.cpf = "CPF é obrigatório."
          } else if (!isValidCPF(integrante.cpf)) {
            integranteError.cpf = "CPF inválido."
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
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const proximaEtapa = () => {
    if (validarEtapa(etapaAtual)) {
      setErrors({})
      if (etapaAtual < ETAPAS.length - 1) {
        setEtapaAtual(etapaAtual + 1)
      }
    } else {
      showMessage("Por favor, corrija os erros indicados antes de continuar", "error")
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

  type HabitacaoFields = "tipo_construcao" | "condicao_domicilio"
  type SituacaoSocialFields = "servicos_publicos"

  const handleCheckboxChange = (
    section: "situacao_social", // Apenas 'situacao_social' usa checkboxes agora
    field: "servicos_publicos",
    value: string,
    checked: boolean,
  ) => {
    setDadosFamilia((prev) => {
      // Garantimos que currentArray seja sempre o array de strings de servicos_publicos
      const currentArray = prev.situacao_social.servicos_publicos

      return {
        ...prev,
        // O TS/JS agora sabe que prev.situacao_social.servicos_publicos é um array de strings,
        // então .filter() e o spread operator funcionam corretamente.
        situacao_social: {
          ...prev.situacao_social,
          [field]: checked ? [...currentArray, value] : currentArray.filter((item) => item !== value),
        },
      }
    })
  }

  const validarFormularioCompleto = (): boolean => {
    for (let i = 0; i < ETAPAS.length; i++) {
      if (!validarEtapa(i)) {
        setEtapaAtual(i)
        showMessage("Existem erros no formulário. Por favor, revise os campos destacados.", "error")
        return false
      }
    }
    return true
  }

  const salvarAlteracoes = async () => {
    if (!validarFormularioCompleto()) return

    setLoading(true)
    try {
      console.log("📤 Enviando alterações:", dadosFamilia)
      await api.put(`/auth/familias/${id}`, dadosFamilia)
      showMessage("Alterações salvas com sucesso!", "success")
      setTimeout(() => {
        navigate(`/familia/${id}`)
      }, 2000)
    } catch (error: unknown) {
      console.error("❌ Erro completo:", error)
      let errorMessage = "Erro desconhecido"
      if (
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        // @ts-expect-error: dynamic error shape from axios
        error.response?.data?.message
      ) {
        // @ts-expect-error: dynamic error shape from axios
        errorMessage = error.response.data.message
      } else if (error instanceof Error) {
        errorMessage = error.message
      }
      showMessage(`Erro ao salvar alterações: ${errorMessage}`, "error")
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
                className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all ${
                  isCompleta
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
                  className={`text-sm font-medium ${
                    isAtual ? "text-blue-600" : isCompleta ? "text-green-600" : "text-gray-500"
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
    // Funções auxiliares para renderizar erros
    const getInputClass = (fieldError: string | undefined) =>
      `w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
        fieldError ? "border-red-500" : "border-gray-300"
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Equipamento</label>
                  <select
                    value={dadosFamilia.equipamento_id}
                    onChange={(e) =>
                      setDadosFamilia((prev) => ({ ...prev, equipamento_id: Number.parseInt(e.target.value) }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={0}>Selecione o equipamento</option>
                    {equipamentos.map((equipamento) => (
                      <option key={equipamento.id} value={equipamento.id}>
                        {equipamento.nome} - {equipamento.regiao}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <Separator />

              {/* Dados do Responsável */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Dados do Responsável Familiar</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Linha 1 */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nome Completo *</label>
                    <input
                      type="text"
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
                      className={getInputClass(undefined)}
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">RG *</label>
                    <input
                      type="text"
                      value={dadosFamilia.responsavel.rg}
                      onChange={(e) =>
                        setDadosFamilia((prev) => ({
                          ...prev,
                          responsavel: { ...prev.responsavel, rg: formatNumericOnly(e.target.value) },
                        }))
                      }
                      className={getInputClass(errors.responsavel?.rg)}
                    />
                    {errors.responsavel?.rg && <p className="text-red-500 text-sm mt-1">{errors.responsavel.rg}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Órgão Expedidor</label>
                    <input
                      type="text"
                      placeholder="SSP/SP"
                      value={dadosFamilia.responsavel.orgao_expedidor}
                      onChange={(e) =>
                        setDadosFamilia((prev) => ({
                          ...prev,
                          responsavel: { ...prev.responsavel, orgao_expedidor: formatToUpper(e.target.value) },
                        }))
                      }
                      className={getInputClass(undefined)}
                    />
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
                      placeholder="Cidade - UF"
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
                      value={dadosFamilia.responsavel.telefone}
                      onChange={(e) =>
                        setDadosFamilia((prev) => ({
                          ...prev,
                          responsavel: { ...prev.responsavel, telefone: formatPhone(e.target.value) },
                        }))
                      }
                      className={getInputClass(undefined)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Telefone de Recado</label>
                    <input
                      type="text"
                      placeholder="(00) 00000-0000"
                      maxLength={15}
                      value={dadosFamilia.responsavel.telefone_recado}
                      // APLIQUE A FORMATAÇÃO AQUI
                      onChange={(e) =>
                        setDadosFamilia((prev) => ({
                          ...prev,
                          responsavel: { ...prev.responsavel, telefone_recado: formatPhone(e.target.value) },
                        }))
                      }
                      className={getInputClass(undefined)} // Não há validação obrigatória, então não precisa de erro
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <input
                      type="email"
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
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">NIS</label>
                  <input
                    type="text"
                    maxLength={11}
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
                    placeholder="Número do Título"
                    value={dadosFamilia.responsavel.titulo_eleitor}
                    onChange={(e) =>
                      setDadosFamilia((prev) => ({
                        ...prev,
                        responsavel: { ...prev.responsavel, titulo_eleitor: e.target.value },
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">CTPS</label>
                  <input
                    type="text"
                    placeholder="Número da CTPS"
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
                    placeholder="Profissão/Ocupação"
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
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Logradouro *</label>
                    <input
                      type="text"
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
                      value={dadosFamilia.endereco.numero}
                      onChange={(e) =>
                        setDadosFamilia((prev) => ({ ...prev, endereco: { ...prev.endereco, numero: e.target.value } }))
                      }
                      className={getInputClass(undefined)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Complemento</label>
                    <input
                      type="text"
                      placeholder="Apto, Bloco, Casa"
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
                      placeholder="Cidade"
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
                      maxLength={2}
                      value={dadosFamilia.endereco.uf}
                      onChange={(e) =>
                        setDadosFamilia((prev) => ({
                          ...prev,
                          endereco: { ...prev.endereco, uf: formatUF(e.target.value) },
                        }))
                      }
                      className={getInputClass(undefined)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">CEP</label>
                    <input
                      type="text"
                      maxLength={9}
                      value={dadosFamilia.endereco.cep}
                      onChange={(e) =>
                        setDadosFamilia((prev) => ({
                          ...prev,
                          endereco: { ...prev.endereco, cep: formatCEP(e.target.value) },
                        }))
                      }
                      className={getInputClass(undefined)}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Ponto de Referência</label>
                    <input
                      type="text"
                      placeholder="Próximo a..."
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
                <Card key={integrante.id || index} className="border border-gray-200">
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
                        <label className="block text-sm font-medium text-gray-700 mb-2">Nome Completo *</label>
                        <input
                          type="text"
                          value={integrante.nome_completo}
                          onChange={(e) => atualizarIntegrante(index, "nome_completo", e.target.value)}
                          onBlur={(e) => atualizarIntegrante(index, "nome_completo", cleanExtraSpaces(e.target.value))}
                          className={getInputClass(errors.integrantes?.[index]?.nome_completo)}
                        />
                        {renderError(errors.integrantes?.[index]?.nome_completo)}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Data de Nascimento *</label>
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
                          className={getInputClass(undefined)}
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
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Sexo</label>
                        <select
                          value={integrante.sexo}
                          onChange={(e) =>
                            atualizarIntegrante(index, "sexo", e.target.value as "feminino" | "masculino" | "outro")
                          }
                          className={getInputClass(undefined)}
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
                          value={integrante.cpf}
                          onChange={(e) => atualizarIntegrante(index, "cpf", formatCPF(e.target.value))}
                          className={getInputClass(errors.integrantes?.[index]?.cpf)}
                        />
                        {renderError(errors.integrantes?.[index]?.cpf)}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">NIS</label>
                        <input
                          type="text"
                          placeholder="Número do NIS"
                          value={integrante.nis}
                          onChange={(e) => atualizarIntegrante(index, "nis", e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Escolaridade</label>
                        <select
                          value={integrante.escolaridade}
                          onChange={(e) => atualizarIntegrante(index, "escolaridade", e.target.value)}
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
                          placeholder="Profissão/Ocupação"
                          value={integrante.ocupacao}
                          onChange={(e) => atualizarIntegrante(index, "ocupacao", e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
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
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
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
                    placeholder="Descreva a deficiência"
                    value={dadosFamilia.saude.deficiencia_qual}
                    onChange={(e) =>
                      setDadosFamilia((prev) => ({
                        ...prev,
                        saude: { ...prev.saude, deficiencia_qual: e.target.value },
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
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
                    placeholder="Descreva o tratamento"
                    value={dadosFamilia.saude.tratamento_qual}
                    onChange={(e) =>
                      setDadosFamilia((prev) => ({
                        ...prev,
                        saude: { ...prev.saude, tratamento_qual: e.target.value },
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
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
                    placeholder="Descreva a medicação"
                    value={dadosFamilia.saude.medicacao_qual}
                    onChange={(e) =>
                      setDadosFamilia((prev) => ({
                        ...prev,
                        saude: { ...prev.saude, medicacao_qual: e.target.value },
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              <Separator />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Observações sobre saúde</label>
                <textarea
                  placeholder="Observações adicionais sobre a saúde da família"
                  rows={3}
                  value={dadosFamilia.saude.observacoes}
                  onChange={(e) =>
                    setDadosFamilia((prev) => ({
                      ...prev,
                      saude: { ...prev.saude, observacoes: e.target.value },
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
                          qtd_comodos: Math.max(0, Number.parseInt(e.target.value) || 0),
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
                          qtd_dormitorios: Math.max(0, Number.parseInt(e.target.value) || 0),
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
                Condições de Trabalho / Renda Familiar
              </CardTitle>
              <p className="text-sm text-gray-600">Informações sobre trabalho e renda da família</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Quem trabalha na casa?</label>
                <textarea
                  placeholder="Nome, renda e local de trabalho de cada pessoa"
                  rows={4}
                  value={dadosFamilia.trabalho_renda.quem_trabalha}
                  onChange={(e) =>
                    setDadosFamilia((prev) => ({
                      ...prev,
                      trabalho_renda: { ...prev.trabalho_renda, quem_trabalha: e.target.value },
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Rendimento familiar total</label>
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
                        rendimento_total: Math.max(0, Number.parseFloat(e.target.value) || 0),
                      },
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Observações sobre Trabalho e Renda
                </label>
                <textarea
                  placeholder="Observações adicionais"
                  rows={3}
                  value={dadosFamilia.trabalho_renda.observacoes}
                  onChange={(e) =>
                    setDadosFamilia((prev) => ({
                      ...prev,
                      trabalho_renda: { ...prev.trabalho_renda, observacoes: e.target.value },
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
                            const valor = Math.max(0, Number.parseFloat(e.target.value) || 0)
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
                        value={dadosFamilia.despesas.find((d) => d.tipo_despesa_id === tipo.id)?.valor || 0}
                        onChange={(e) => {
                          // CORREÇÃO: Garante que o valor não seja negativo
                          const valor = Math.max(0, Number.parseFloat(e.target.value) || 0)
                          setDadosFamilia((prev) => ({
                            ...prev,
                            despesas: prev.despesas
                              .map((d) => (d.tipo_despesa_id === tipo.id ? { ...d, valor } : d))
                              .concat(
                                prev.despesas.some((d) => d.tipo_despesa_id === tipo.id)
                                  ? []
                                  : [{ tipo_despesa_id: tipo.id, valor }],
                              ),
                          }))
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
              <p className="text-sm text-gray-600">Informações sobre participação social da família</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Participa de grupo/comunidade religiosa?
                </label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Qual comunidade religiosa?</label>
                  <input
                    type="text"
                    placeholder="Nome da comunidade religiosa"
                    value={dadosFamilia.situacao_social.religiao_qual}
                    onChange={(e) =>
                      setDadosFamilia((prev) => ({
                        ...prev,
                        situacao_social: { ...prev.situacao_social, religiao_qual: e.target.value },
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              <Separator />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Participa de ação social / grupo comunitário?
                </label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Qual ação/grupo?</label>
                  <input
                    type="text"
                    placeholder="Nome da ação social ou grupo"
                    value={dadosFamilia.situacao_social.acao_social_qual}
                    onChange={(e) =>
                      setDadosFamilia((prev) => ({
                        ...prev,
                        situacao_social: { ...prev.situacao_social, acao_social_qual: e.target.value },
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
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
        return null
    }
  }

  if (loadingData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
              <p className="text-gray-600">Carregando dados da família...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Button variant="default" onClick={() => navigate("/familias")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2 mt-4">
            Editar Dados da Família
          </h1>
          <p className="text-gray-600 mt-2">
            Prontuário: {dadosFamilia.prontuario} - {dadosFamilia.responsavel.nome_completo}
          </p>
        </div>

        {/* Indicador de Progresso */}
        <IndicadorProgresso />

        {/* Conteúdo da Etapa Atual */}
        {renderizarEtapa()}

        {/* Mensagens - Movido para antes dos botões */}
        {message && (
          <div className="mt-6">
            <Alert
              className={`mb-0 ${
                messageType === "success" ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
              }`}
            >
              <div className={messageType === "success" ? "text-green-800" : "text-red-800"}>{message}</div>
            </Alert>
          </div>
        )}

        {/* Botões de Navegação */}
        <Card className="mt-4">
          <CardFooter className="flex justify-between items-center p-6">
            <div className="flex gap-4">
              <Button variant="outline" onClick={() => navigate("/familias")}>
                Cancelar
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  localStorage.setItem("rascunho_familia_edicao", JSON.stringify(dadosFamilia))
                  showMessage("Rascunho salvo com sucesso!", "success")
                }}
                className="flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Salvar Rascunho
              </Button>
            </div>

            <div className="flex gap-4">
              {etapaAtual > 0 && (
                <Button variant="outline" onClick={etapaAnterior} className="flex items-center gap-2 bg-transparent">
                  <ChevronLeft className="w-4 h-4" />
                  Anterior
                </Button>
              )}
              {etapaAtual < ETAPAS.length - 1 ? (
                <Button onClick={proximaEtapa} className="flex items-center gap-2">
                  Próximo
                  <ChevronRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button onClick={salvarAlteracoes} disabled={loading} className="flex items-center gap-2">
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4" />
                      Salvar Alterações
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}

export default AlterarFamilia
