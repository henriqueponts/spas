"use client"

// src/pages/Registro.tsx
import type React from "react"
import { useEffect, useState } from "react"
import api from "../services/api" // Importa a instância configurada do Axios
import Header from "../components/Header" // ✅ ADICIONADO: Import do componente Header

// Interfaces para tipagem
interface Cargo {
  id: number
  nome: string
}
interface Equipamento {
  id: number
  nome: string
}
interface FormErrors {
  cpf?: string
  senha?: string
}

const Registro: React.FC = () => {
  const [values, setValues] = useState({
    nome: "",
    cpf: "",
    cargo: "",
    equipamento: "",
    senha: "",
  })
  const [formattedCPF, setFormattedCPF] = useState("")
  const [errors, setErrors] = useState<FormErrors>({})
  const [cargos, setCargos] = useState<Cargo[]>([])
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([])
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)

  // Buscar cargos e equipamentos ao carregar o componente
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Usa a instância 'api' para que o token seja enviado automaticamente
        const cargoResponse = await api.get("/auth/cargos")
        setCargos(cargoResponse.data)

        const equipamentoResponse = await api.get("/auth/equipamentos")
        setEquipamentos(equipamentoResponse.data)

        setLoading(false)
      } catch (err) {
        console.error("Erro ao buscar dados:", err)
        setError("Não foi possível carregar os dados necessários para o registro.")
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // Função para formatar o CPF enquanto o usuário digita
  const formatCPF = (value: string): string => {
    const cpfNumbers = value.replace(/\D/g, "").slice(0, 11)
    return cpfNumbers
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})/, "$1-$2")
  }

  // Função para validar o CPF completo
  const validateCPF = (cpf: string): boolean => {
    const cpfNumbers = cpf.replace(/\D/g, "")
    if (cpfNumbers.length !== 11 || /^(\d)\1+$/.test(cpfNumbers)) return false
    let sum = 0
    let remainder
    for (let i = 1; i <= 9; i++) sum += Number.parseInt(cpfNumbers.substring(i - 1, i)) * (11 - i)
    remainder = (sum * 10) % 11
    if (remainder === 10 || remainder === 11) remainder = 0
    if (remainder !== Number.parseInt(cpfNumbers.substring(9, 10))) return false
    sum = 0
    for (let i = 1; i <= 10; i++) sum += Number.parseInt(cpfNumbers.substring(i - 1, i)) * (12 - i)
    remainder = (sum * 10) % 11
    if (remainder === 10 || remainder === 11) remainder = 0
    if (remainder !== Number.parseInt(cpfNumbers.substring(10, 11))) return false
    return true
  }

  // Função para validar a senha
  const validatePassword = (password: string): string | undefined => {
    if (password.length < 6) return "A senha deve ter no mínimo 6 caracteres"
    if (/\s/.test(password)) return "A senha não pode conter espaços"
    if (!/\d/.test(password)) return "A senha deve conter pelo menos um número"
    if (!/[a-zA-Z]/.test(password)) return "A senha deve conter pelo menos uma letra"
    return undefined
  }

  const handleChanges = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>): void => {
    const { name, value } = e.target

    if (name === "cpf") {
      const formattedValue = formatCPF(value)
      setFormattedCPF(formattedValue)
      const cpfNumbers = value.replace(/\D/g, "")
      setValues((prev) => ({ ...prev, cpf: cpfNumbers }))
      if (cpfNumbers.length === 11 && !validateCPF(cpfNumbers)) {
        setErrors((prev) => ({ ...prev, cpf: "CPF inválido" }))
      } else {
        setErrors((prev) => ({ ...prev, cpf: undefined }))
      }
    } else if (name === "senha") {
      setValues((prev) => ({ ...prev, [name]: value }))
      setErrors((prev) => ({ ...prev, senha: validatePassword(value) }))
    } else {
      setValues((prev) => ({ ...prev, [name]: value }))
    }

    if (error) setError("")
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault()

    const cpfValid = validateCPF(values.cpf)
    const passwordError = validatePassword(values.senha)

    if (!cpfValid || passwordError) {
      setErrors({
        cpf: !cpfValid ? "CPF inválido" : undefined,
        senha: passwordError,
      })
      return
    }

    try {
      // Usa a instância 'api' para enviar o token na requisição de registro
      await api.post("/auth/registro", values)
      alert("Usuário criado com sucesso!")
      setValues({ nome: "", cpf: "", cargo: "", equipamento: "", senha: "" })
      setFormattedCPF("")
      setErrors({})
    } catch (err) {
      console.error("Erro ao criar usuário:", err)
      if (err instanceof Error && "response" in err && err.response) {
        const axiosError = err as { response: { data: { message?: string } } }
        setError(axiosError.response.data.message || "Erro desconhecido ao criar usuário.")
      } else {
        setError("Não foi possível conectar ao servidor.")
      }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100">
        {" "}
        {/* ✅ MODIFICADO: Removido flex items-center justify-center para permitir que o Header ocupe o topo */}
        <Header /> {/* ✅ ADICIONADO: Header na tela de loading */}
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          {" "}
          {/* Ajustado altura para considerar o Header */}
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando dados...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100">
      <Header /> {/* ✅ ADICIONADO: Header na página principal */}
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)] py-8">
        {" "}
        {/* ✅ MODIFICADO: Ajustado altura e adicionado padding vertical */}
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
          <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">Criar Novo Usuário</h2>

          {error && <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">{error}</div>}

          <form onSubmit={handleSubmit} noValidate>
            <div className="mb-4">
              <label htmlFor="nome" className="block text-sm font-medium text-gray-700 mb-1">
                Nome
              </label>
              <input
                type="text"
                id="nome"
                name="nome"
                value={values.nome}
                onChange={handleChanges}
                placeholder="Nome completo do usuário"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div className="mb-4">
              <label htmlFor="cpf" className="block text-sm font-medium text-gray-700 mb-1">
                CPF
              </label>
              <input
                type="text"
                id="cpf"
                name="cpf"
                value={formattedCPF}
                onChange={handleChanges}
                placeholder="000.000.000-00"
                className={`w-full px-3 py-2 border ${errors.cpf ? "border-red-500" : "border-gray-300"} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
                required
              />
              {errors.cpf && <p className="mt-1 text-sm text-red-600">{errors.cpf}</p>}
            </div>
            <div className="mb-4">
              <label htmlFor="cargo" className="block text-sm font-medium text-gray-700 mb-1">
                Cargo
              </label>
              <select
                id="cargo"
                name="cargo"
                value={values.cargo}
                onChange={handleChanges}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="" disabled>
                  Selecione um cargo
                </option>
                {cargos.map((cargo) => (
                  <option key={cargo.id} value={cargo.id}>
                    {cargo.nome}
                  </option>
                ))}
              </select>
            </div>
            <div className="mb-4">
              <label htmlFor="equipamento" className="block text-sm font-medium text-gray-700 mb-1">
                Equipamento
              </label>
              <select
                id="equipamento"
                name="equipamento"
                value={values.equipamento}
                onChange={handleChanges}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="" disabled>
                  Selecione um equipamento
                </option>
                {equipamentos.map((equipamento) => (
                  <option key={equipamento.id} value={equipamento.id}>
                    {equipamento.nome}
                  </option>
                ))}
              </select>
            </div>
            <div className="mb-6">
              <label htmlFor="senha" className="block text-sm font-medium text-gray-700 mb-1">
                Senha
              </label>
              <input
                type="password"
                id="senha"
                name="senha"
                value={values.senha}
                onChange={handleChanges}
                placeholder="Mínimo 6 caracteres com letras e números"
                className={`w-full px-3 py-2 border ${errors.senha ? "border-red-500" : "border-gray-300"} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
                required
              />
              {errors.senha && <p className="mt-1 text-sm text-red-600">{errors.senha}</p>}
            </div>
            <div>
              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-150"
              >
                Registrar Usuário
              </button>
              <button
                onClick={() => window.history.back()}
                className="w-full bg-gray-400 hover:bg-gray-500 text-white font-bold py-2 px-4 mt-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-150"
              >
                Voltar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default Registro
