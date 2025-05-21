import axios from 'axios';
import React, { useEffect, useState } from 'react';

// Interfaces para tipagem
interface Cargo {
  id: number;
  nome: string;
}

interface Equipamento {
  id: number;
  nome: string;
}

interface FormErrors {
  cpf?: string;
  senha?: string;
}

const Registro: React.FC = () => {
    const [values, setValues] = useState({
        nome: '',
        cpf: '',
        cargo: '',
        equipamento: '',
        senha: ''
    });

    const [formattedCPF, setFormattedCPF] = useState('');
    const [errors, setErrors] = useState<FormErrors>({});
    const [cargos, setCargos] = useState<Cargo[]>([]);
    const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);

    // Buscar cargos e equipamentos ao carregar o componente
    useEffect(() => {
        const fetchData = async () => {
            try {
                // Buscar cargos
                const cargoResponse = await axios.get('http://localhost:3000/auth/cargos');
                setCargos(cargoResponse.data);
                
                // Buscar equipamentos
                const equipamentoResponse = await axios.get('http://localhost:3000/auth/equipamentos');
                setEquipamentos(equipamentoResponse.data);
                
                setLoading(false);
            } catch (error) {
                console.error('Erro ao buscar dados:', error);
                setError('Não foi possível carregar os dados necessários.');
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // Função para formatar o CPF enquanto o usuário digita
    const formatCPF = (value: string): string => {
        // Remove todos os caracteres não numéricos
        const cpfNumbers = value.replace(/\D/g, '');
        
        // Limita a 11 dígitos
        const cpfLimited = cpfNumbers.slice(0, 11);
        
        // Aplica a formatação: 000.000.000-00
        let formattedValue = '';
        
        if (cpfLimited.length > 0) {
            formattedValue = cpfLimited.slice(0, 3);
            
            if (cpfLimited.length > 3) {
                formattedValue += '.' + cpfLimited.slice(3, 6);
                
                if (cpfLimited.length > 6) {
                    formattedValue += '.' + cpfLimited.slice(6, 9);
                    
                    if (cpfLimited.length > 9) {
                        formattedValue += '-' + cpfLimited.slice(9, 11);
                    }
                }
            }
        }
        
        return formattedValue;
    };

    // Função para validar o CPF completo
    const validateCPF = (cpf: string): boolean => {
        const cpfNumbers = cpf.replace(/\D/g, '');
        
        // Verifica se tem 11 dígitos
        if (cpfNumbers.length !== 11) {
            return false;
        }
        
        // Verifica se todos os dígitos são iguais
        if (/^(\d)\1+$/.test(cpfNumbers)) {
            return false;
        }
        
        // Validação do primeiro dígito verificador
        let sum = 0;
        for (let i = 0; i < 9; i++) {
            sum += parseInt(cpfNumbers.charAt(i)) * (10 - i);
        }
        
        let remainder = 11 - (sum % 11);
        const digit1 = remainder > 9 ? 0 : remainder;
        
        if (parseInt(cpfNumbers.charAt(9)) !== digit1) {
            return false;
        }
        
        // Validação do segundo dígito verificador
        sum = 0;
        for (let i = 0; i < 10; i++) {
            sum += parseInt(cpfNumbers.charAt(i)) * (11 - i);
        }
        
        remainder = 11 - (sum % 11);
        const digit2 = remainder > 9 ? 0 : remainder;
        
        return parseInt(cpfNumbers.charAt(10)) === digit2;
    };

    // Função para validar a senha
    const validatePassword = (password: string): string | undefined => {
        if (password.length < 6) {
            return 'A senha deve ter no mínimo 6 caracteres';
        }
        
        if (!/\d/.test(password)) {
            return 'A senha deve conter pelo menos um número';
        }
        
        if (!/[a-zA-Z]/.test(password)) {
            return 'A senha deve conter pelo menos uma letra';
        }
        
        return undefined;
    };

    const handleChanges = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>): void => {
        const { name, value } = e.target;
        
        // Tratamento específico para CPF
        if (name === 'cpf') {
            const formattedValue = formatCPF(value);
            setFormattedCPF(formattedValue);
            
            // Armazena apenas os números no state values
            const cpfNumbers = value.replace(/\D/g, '');
            setValues(prev => ({...prev, cpf: cpfNumbers}));
            
            // Valida CPF
            if (cpfNumbers.length > 0) {
                if (cpfNumbers.length !== 11) {
                    setErrors(prev => ({...prev, cpf: 'CPF deve conter 11 dígitos'}));
                } else if (!validateCPF(cpfNumbers)) {
                    setErrors(prev => ({...prev, cpf: 'CPF inválido'}));
                } else {
                    setErrors(prev => ({...prev, cpf: undefined}));
                }
            } else {
                setErrors(prev => ({...prev, cpf: undefined}));
            }
        } 
        // Tratamento específico para senha
        else if (name === 'senha') {
            setValues(prev => ({...prev, [name]: value}));
            
            // Valida senha
            const passwordError = validatePassword(value);
            setErrors(prev => ({...prev, senha: passwordError}));
        } 
        // Outros campos
        else {
            setValues(prev => ({...prev, [name]: value}));
        }
        
        if (error) setError('');
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
        e.preventDefault();
        
        // Validação antes de enviar
        const cpfValid = validateCPF(values.cpf);
        const passwordError = validatePassword(values.senha);
        
        if (!cpfValid || passwordError) {
            const newErrors: FormErrors = {};
            
            if (!cpfValid) {
                newErrors.cpf = 'CPF inválido';
            }
            
            if (passwordError) {
                newErrors.senha = passwordError;
            }
            
            setErrors(newErrors);
            return;
        }
        
        try {
            const response = await axios.post('http://localhost:3000/auth/registro', values);
            console.log(response);
            alert('Usuário criado com sucesso!');
            // Limpar o formulário após envio bem-sucedido
            setValues({
                nome: '',
                cpf: '',
                cargo: '',
                equipamento: '',
                senha: ''
            });
            setFormattedCPF('');
            setErrors({});
        } catch (error) {
            console.error('Erro ao criar usuário:', error);
            
            // Verificar se o erro contém resposta do servidor
            if (axios.isAxiosError(error) && error.response) {
                // Exibir a mensagem de erro que veio do servidor
                setError(error.response.data.message || 'Erro ao criar usuário. Tente novamente.');
            } else {
                setError('Erro ao criar usuário. Tente novamente.');
            }
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-gray-600">Carregando dados...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
            <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
                <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">
                    Criar Usuário
                </h2>
                
                {/* Mensagem de erro global */}
                {error && (
                    <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                        {error}
                    </div>
                )}
                
                <form onSubmit={handleSubmit}>
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
                            placeholder="Digite seu nome completo"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                        />
                    </div>

                    {/* CPF Field - Com formatação automática */}
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
                            placeholder="Digite apenas os números"
                            className={`w-full px-3 py-2 border ${errors.cpf ? 'border-red-500' : 'border-gray-300'} rounded-md placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                            required
                        />
                        {errors.cpf && (
                            <p className="mt-1 text-sm text-red-600">{errors.cpf}</p>
                        )}
                    </div>

                    {/* Cargo Field */}
                    <div className="mb-4">
                        <label htmlFor="cargo" className="block text-sm font-medium text-gray-700 mb-1">
                            Cargo
                        </label>
                        <select
                            id="cargo"
                            name="cargo"
                            value={values.cargo}
                            onChange={handleChanges}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                        >
                            <option value="" disabled>Selecione um cargo</option>
                            {cargos.map(cargo => (
                                <option key={cargo.id} value={cargo.id}>{cargo.nome}</option>
                            ))}
                        </select>
                    </div>

                    {/* Equipamento Field */}
                    <div className="mb-4">
                        <label htmlFor="equipamento" className="block text-sm font-medium text-gray-700 mb-1">
                            Equipamento
                        </label>
                        <select
                            id="equipamento"
                            name="equipamento"
                            value={values.equipamento}
                            onChange={handleChanges}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                        >
                            <option value="" disabled>Selecione um equipamento</option>
                            {equipamentos.map(equipamento => (
                                <option key={equipamento.id} value={equipamento.id}>{equipamento.nome}</option>
                            ))}
                        </select>
                    </div>

                    {/* Password Field - Com validação */}
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
                            className={`w-full px-3 py-2 border ${errors.senha ? 'border-red-500' : 'border-gray-300'} rounded-md placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                            required
                        />
                        {errors.senha && (
                            <p className="mt-1 text-sm text-red-600">{errors.senha}</p>
                        )}
                    </div>

                    {/* Submit Button */}
                    <div>
                        <button
                            type="submit"
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition duration-150 ease-in-out"
                        >
                            Registrar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Registro;