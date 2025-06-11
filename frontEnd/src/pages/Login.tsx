// src/pages/Login.tsx
import React, { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { AxiosError } from 'axios';
import type { LoginCredentials, LoginResponse } from '../types';
import { CargoRoutes } from '../types';

const Login: React.FC = () => {
  const [credentials, setCredentials] = useState<LoginCredentials>({
    cpf: '',
    senha: ''
  });
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCredentials(prev => ({ ...prev, [name]: value }));
    
    // Limpar erro ao digitar
    if (error) setError('');
  };

  const formatCPF = (value: string) => {
    // Remove tudo que não é número
    const numbers = value.replace(/\D/g, '');
    
    // Aplica a máscara de CPF
    if (numbers.length <= 11) {
      return numbers
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})/, '$1-$2');
    }
    return value;
  };

  const handleCPFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCPF(e.target.value);
    setCredentials(prev => ({ ...prev, cpf: formatted }));
    if (error) setError('');
  };

 const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Remover formatação do CPF antes de enviar
      const cpfNumbers = credentials.cpf.replace(/\D/g, '');
      
      // 1. Fazer login e obter token E dados do usuário de uma só vez
      const { data: loginData } = await api.post<LoginResponse>('/auth/login', {
        cpf: cpfNumbers,
        senha: credentials.senha
      });

      // Validação: garantir que a API retornou o objeto do usuário
      if (!loginData.usuario) {
        // Isso pode acontecer se a API for alterada e não retornar mais o usuário
        throw new Error('A resposta da API não incluiu os dados do usuário.');
      }

      // 2. Usar os dados do usuário diretamente da resposta do login
      const userData = loginData.usuario;

      // 3. Salvar no contexto
      // O objeto userData já tem o formato correto do tipo User, incluindo cargo_id
      login(userData, loginData.token);

      // 4. Redirecionar baseado no cargo_id do usuário
      const route = CargoRoutes[userData.cargo_id as keyof typeof CargoRoutes] || '/';
      navigate(route);
      
    } catch (err: Error | unknown) {
      if (err instanceof AxiosError) {
        // A mensagem de erro do backend (ex: "Senha incorreta!") será exibida aqui
        setError(err.response?.data?.message || 'Erro ao fazer login. Verifique suas credenciais.');
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Ocorreu um erro inesperado. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-lg shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="mx-auto w-20 h-20 bg-indigo-600 rounded-full flex items-center justify-center mb-4">
              <svg 
                className="w-12 h-12 text-white" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" 
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">
              SPAS - Bebedouro
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Sistema de Proteção e Assistência Social
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Mensagem de erro */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}

            {/* Campo CPF */}
          <div>
            <label htmlFor="cpf" className="block text-sm font-medium text-gray-700 mb-1">
              CPF
            </label>
            <input
              id="cpf"
              name="cpf"
              type="text"
              // Adicione esta linha
              autoComplete="username" 
              required
              maxLength={14}
              value={credentials.cpf}
              onChange={handleCPFChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="000.000.000-00"
            />
          </div>

            {/* Campo Senha */}
            <div>
              <label htmlFor="senha" className="block text-sm font-medium text-gray-700 mb-1">
                Senha
              </label>
            <input
              id="senha"
              name="senha"
              type="password"
              // Adicione esta linha
              autoComplete="current-password"
              required
              value={credentials.senha}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Digite sua senha"
            />
          </div>

            {/* Links auxiliares */}
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-gray-600">Lembrar-me</span>
              </label>
              <a href="#" className="text-indigo-600 hover:text-indigo-500">
                Esqueceu a senha?
              </a>
            </div>

            {/* Botão de submit */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors ${
                loading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {loading ? (
                <>
                  <svg 
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" 
                    xmlns="http://www.w3.org/2000/svg" 
                    fill="none" 
                    viewBox="0 0 24 24"
                  >
                    <circle 
                      className="opacity-25" 
                      cx="12" 
                      cy="12" 
                      r="10" 
                      stroke="currentColor" 
                      strokeWidth="4"
                    />
                    <path 
                      className="opacity-75" 
                      fill="currentColor" 
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Entrando...
                </>
              ) : (
                'Entrar'
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              © 2025 Prefeitura Municipal de Bebedouro
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;