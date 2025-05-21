import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Login: React.FC = () => {
    const [values, setValues] = useState({
        cpf: '',
        senha: ''
    });
    
    // Estado separado para exibir CPF formatado na interface
    const [formattedCpf, setFormattedCpf] = useState('');
    
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    
    const navigate = useNavigate();
    
    useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
        // Se existir um token, redireciona para a página inicial
        navigate('/');
    }
}, [navigate]);

    // Função para formatar o CPF (000.000.000-00)
    const formatCpf = (cpf: string): string => {
        // Remove todos os caracteres não numéricos
        const numbers = cpf.replace(/\D/g, '');
        
        // Aplica a formatação conforme os dígitos são inseridos
        if (numbers.length <= 3) {
            return numbers;
        } else if (numbers.length <= 6) {
            return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
        } else if (numbers.length <= 9) {
            return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
        } else {
            return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9, 11)}`;
        }
    };

    // Remove a formatação e retorna apenas os números
    const removeCpfFormatting = (cpf: string): string => {
        return cpf.replace(/\D/g, '');
    };

    const handleChanges = (e: React.ChangeEvent<HTMLInputElement>): void => {
        const { name, value } = e.target;
        
        if (name === 'cpf') {
            // Para o CPF, armazenamos apenas os números no estado
            const numbersOnly = removeCpfFormatting(value);
            
            // Limitamos a 11 dígitos (tamanho do CPF)
            if (numbersOnly.length <= 11) {
                setValues({ ...values, cpf: numbersOnly });
                setFormattedCpf(formatCpf(value));
            }
        } else {
            // Para outros campos, comportamento normal
            setValues({ ...values, [name]: value });
        }
        
        if (error) setError('');
    }

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
        e.preventDefault();
        setLoading(true);
        
        try {
            const response = await axios.post('http://localhost:3000/auth/login', values);
            
            // Guardar token e dados do usuário
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('usuario', JSON.stringify(response.data.usuario));
            
            // Configurar axios para enviar o token em todas as requisições futuras
            axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
            
            // Redirecionar para a página inicial
            navigate('/');
            
        } catch (error) {
            console.error('Erro no login:', error);
            
            if (axios.isAxiosError(error) && error.response) {
                setError(error.response.data.message || 'Erro ao fazer login. Tente novamente.');
            } else {
                setError('Erro ao fazer login. Tente novamente.');
            }
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
            <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
                <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">
                    Login
                </h2>
                
                {/* Mensagem de erro */}
                {error && (
                    <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                        {error}
                    </div>
                )}
                
                <form onSubmit={handleSubmit}>
                    {/* CPF Field */}
                    <div className="mb-4">
                        <label htmlFor="cpf" className="block text-sm font-medium text-gray-700 mb-1">
                            CPF
                        </label>
                        <input
                            type="text"
                            id="cpf"
                            name="cpf"
                            value={formattedCpf}
                            onChange={handleChanges}
                            placeholder="Digite apenas números"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                        />
                    </div>

                    {/* Password Field */}
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
                            placeholder="Digite sua senha"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                        />
                    </div>

                    {/* Submit Button */}
                    <div>
                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition duration-150 ease-in-out ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                            {loading ? 'Entrando...' : 'Entrar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Login;