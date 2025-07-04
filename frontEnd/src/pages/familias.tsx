// src/pages/Familias.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

interface Responsavel {
  nome_completo: string;
  cpf: string;
  telefone: string;
}

interface Endereco {
  logradouro: string;
  numero: string;
  bairro: string;
  cidade: string;
  uf: string;
}

interface Integrante {
  nome_completo: string;
  tipo_membro: string;
}

interface TrabalhoRenda {
  rendimento_total: number;
}

interface Familia {
  id: number;
  prontuario: string;
  data_cadastro: string;
  data_atendimento: string;
  situacao: string;
  equipamento_nome: string;
  equipamento_regiao: string;
  profissional_nome: string;
  responsavel: Responsavel;
  endereco: Endereco;
  integrantes: Integrante[];
  trabalho_renda: TrabalhoRenda;
}

const Familias: React.FC = () => {
  const navigate = useNavigate();
  const [familias, setFamilias] = useState<Familia[]>([]);
  const [familiasFiltradas, setFamiliasFiltradas] = useState<Familia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    carregarFamilias();
  }, []);

  useEffect(() => {
    filtrarFamilias();
  }, [searchTerm, familias]);

  const carregarFamilias = async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log('Buscando famílias...');
      const response = await api.get('/auth/familias');
      
      console.log('Resposta:', response.data);
      setFamilias(response.data);
      setFamiliasFiltradas(response.data);
      
    } catch (err: any) {
      console.error('Erro ao carregar famílias:', err);
      setError('Não foi possível carregar as famílias. Verifique se o servidor está rodando.');
    } finally {
      setLoading(false);
    }
  };

  const filtrarFamilias = () => {
    if (!searchTerm) {
      setFamiliasFiltradas(familias);
      return;
    }

    const termo = searchTerm.toLowerCase();
    const filtradas = familias.filter(familia => {
      const cpfLimpo = familia.responsavel.cpf.replace(/[.-]/g, '');
      const termoLimpo = searchTerm.replace(/[.-]/g, '');
      
      return (
        familia.prontuario.toLowerCase().includes(termo) ||
        familia.responsavel.nome_completo.toLowerCase().includes(termo) ||
        cpfLimpo.includes(termoLimpo)
      );
    });
    
    setFamiliasFiltradas(filtradas);
  };

  const verDetalhes = (id: number) => {
    navigate(`/familia/${id}`);
  };

  const formatarEndereco = (endereco: Endereco) => {
    if (!endereco.logradouro || endereco.logradouro === 'Não informado') {
      return 'Endereço não informado';
    }
    return `${endereco.logradouro}, ${endereco.numero} - ${endereco.bairro}`;
  };

  const formatarCPF = (cpf: string) => {
    if (!cpf || cpf === 'Não informado') return cpf;
    return cpf;
  };

  const formatarTelefone = (telefone: string) => {
    if (!telefone || telefone === 'Não informado') return 'Não informado';
    return telefone;
  };

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando famílias...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">Erro ao carregar dados</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={carregarFamilias}
            className="bg-blue-500 text-white px-6 py-2 rounded-md hover:bg-blue-600 transition-colors"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Cabeçalho */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Famílias Cadastradas</h1>
          <p className="text-gray-600 mb-6">Gerencie e acompanhe as famílias do sistema</p>
          
          {/* Barra de busca */}
          <div className="flex gap-2">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por prontuário, CPF ou nome do responsável..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button className="bg-blue-500 text-white px-6 py-2 rounded-md hover:bg-blue-600 transition-colors">
              Buscar
            </button>
          </div>
        </div>

        {/* Lista de famílias */}
        {familiasFiltradas.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4 opacity-30">👨‍👩‍👧‍👦</div>
            <h2 className="text-xl font-semibold text-gray-600 mb-2">
              {searchTerm ? 'Nenhuma família encontrada' : 'Nenhuma família cadastrada'}
            </h2>
            <p className="text-gray-500">
              {searchTerm ? 'Tente ajustar os filtros de busca' : 'Comece cadastrando uma nova família'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {familiasFiltradas.map((familia) => (
              <div
                key={familia.id}
                className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => verDetalhes(familia.id)}
              >
                {/* Cabeçalho do Card */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-800 truncate">
                      {familia.responsavel.nome_completo}
                    </h3>
                    <p className="text-sm text-gray-500">Prontuário: {familia.prontuario}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    familia.situacao === 'ativo' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {familia.situacao === 'ativo' ? 'Ativa' : 'Inativa'}
                  </span>
                </div>
                
                {/* Informações do Card */}
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">CPF:</span>
                    <span className="font-medium">{formatarCPF(familia.responsavel.cpf)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Membros:</span>
                    <span className="font-medium">
                      {familia.integrantes.length + 1} pessoas
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Renda:</span>
                    <span className="font-medium">
                      {formatarMoeda(familia.trabalho_renda.rendimento_total)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Telefone:</span>
                    <span className="font-medium">{formatarTelefone(familia.responsavel.telefone)}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-600">Endereço:</span>
                    <p className="font-medium text-gray-800 truncate">
                      {formatarEndereco(familia.endereco)}
                    </p>
                  </div>
                </div>
                
                {/* Ações */}
                <div className="flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      verDetalhes(familia.id);
                    }}
                    className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors text-sm font-medium"
                  >
                    Ver Detalhes
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      console.log('Evolução:', familia.id);
                    }}
                    className="flex-1 bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition-colors text-sm font-medium"
                  >
                    Evolução
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Familias;