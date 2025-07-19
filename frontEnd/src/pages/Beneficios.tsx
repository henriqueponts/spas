/*import React from 'react';

/**
 * MOCKUP: Página de Benefícios
 * 
 * Objetivo: Servir como placeholder para a funcionalidade de benefícios e
 * comunicar a regra de acesso para a equipe de desenvolvimento.
 */
/*const Beneficios: React.FC = () => {
  return (
    // Container que centraliza tudo na tela
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      
      <div className="max-w-2xl w-full text-center">
        
        {/* 1. O Título da Página *//*}
        <h1 className="text-5xl font-bold text-gray-800">
          Benefícios
        </h1>

        {/* 2. A Nota Explicativa sobre o Acesso }
        <div className="mt-8 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-4 rounded-md text-left">
          <p className="font-bold">Nota para a Equipe de Desenvolvimento:</p>
          <p className="mt-2 text-sm">
            Todos os usuários (internos e externos) têm acesso a esta página.
            <br />
            No entanto, para os <strong>colaboradores externos</strong>, esta deve ser a <strong>única página</strong> que eles podem acessar em toda a aplicação. O roteamento e a lógica de autenticação devem garantir essa restrição.
          </p>
        </div>

      </div>

    </div>
  );
};

export default Beneficios;*/


import React, { useState, useEffect } from 'react';
import api from '../services/api';

// Interfaces para os dados
interface Familia {
  id: number;
  responsavel_nome: string;
  responsavel_cpf: string;
  equipamento_nome: string;
  prontuario: string;
}

interface Beneficio {
  id: number;
  familia_id: number;
  responsavel_nome: string;
  tipo_beneficio: string;
  descricao_beneficio: string;
  data_concessao: string;
  valor: number;
  justificativa: string;
  status: string;
  data_entrega: string;
  observacoes: string;
  prontuario: string;
}

interface DadosBeneficio {
  familia_id: number;
  tipo_beneficio: string;
  descricao_beneficio: string;
  data_concessao: string;
  valor: number;
  justificativa: string;
  data_entrega: string;
  observacoes: string;
}

const BeneficiosPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'nova-entrega' | 'historico'>('nova-entrega');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState('nome');
  const [families, setFamilies] = useState<Familia[]>([]);
  const [selectedFamily, setSelectedFamily] = useState<Familia | null>(null);
  const [historico, setHistorico] = useState<Beneficio[]>([]);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');

  // Estado do formulário de benefício
  const [dadosBeneficio, setDadosBeneficio] = useState<DadosBeneficio>({
    familia_id: 0,
    tipo_beneficio: '',
    descricao_beneficio: '',
    data_concessao: new Date().toISOString().split('T')[0],
    valor: 0,
    justificativa: '',
    data_entrega: new Date().toISOString().split('T')[0],
    observacoes: ''
  });

  // Carregar histórico ao montar o componente
  useEffect(() => {
    fetchHistorico();
  }, []);

  const showMessage = (msg: string, type: 'success' | 'error') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => {
      setMessage('');
      setMessageType('');
    }, 5000);
  };

  const fetchHistorico = async () => {
    try {
      const response = await api.get('/auth/beneficios/historico');
      setHistorico(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Erro ao buscar histórico:', error);
      showMessage('Erro ao carregar histórico de benefícios', 'error');
    }
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      showMessage('Digite um termo para buscar', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await api.get(`/auth/familias/buscar?tipo=${searchType}&termo=${encodeURIComponent(searchTerm)}`);
      setFamilies(Array.isArray(response.data) ? response.data : []);
      
      if (response.data.length === 0) {
        showMessage('Nenhuma família encontrada', 'error');
      }
    } catch (error) {
      console.error('Erro na busca:', error);
      showMessage('Erro ao buscar famílias', 'error');
      setFamilies([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectFamily = (family: Familia) => {
    setSelectedFamily(family);
    setDadosBeneficio(prev => ({
      ...prev,
      familia_id: family.id
    }));
    showMessage(`Família ${family.responsavel_nome} selecionada`, 'success');
  };

  const validarFormulario = (): boolean => {
    if (!selectedFamily) {
      showMessage('Selecione uma família primeiro', 'error');
      return false;
    }
    if (!dadosBeneficio.tipo_beneficio) {
      showMessage('Selecione o tipo de benefício', 'error');
      return false;
    }
    if (!dadosBeneficio.justificativa.trim()) {
      showMessage('Justificativa é obrigatória', 'error');
      return false;
    }
    return true;
  };

  const salvarBeneficio = async () => {
    if (!validarFormulario()) return;

    setLoading(true);
    try {
      const response = await api.post('/auth/beneficios', dadosBeneficio);
      
      showMessage('Benefício registrado com sucesso!', 'success');
      
      // Limpar formulário
      setSelectedFamily(null);
      setDadosBeneficio({
        familia_id: 0,
        tipo_beneficio: '',
        descricao_beneficio: '',
        data_concessao: new Date().toISOString().split('T')[0],
        valor: 0,
        justificativa: '',
        data_entrega: new Date().toISOString().split('T')[0],
        observacoes: ''
      });
      setFamilies([]);
      setSearchTerm('');
      
      // Atualizar histórico
      await fetchHistorico();
      
      // Mudar para aba do histórico
      setActiveTab('historico');
    } catch (error: any) {
      console.error('Erro ao salvar benefício:', error);
      let errorMessage = 'Erro desconhecido';
      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      showMessage(`Erro ao registrar benefício: ${errorMessage}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const marcarComoEntregue = async (beneficioId: number) => {
    setLoading(true);
    try {
      await api.put(`/auth/beneficios/${beneficioId}/entregar`);
      showMessage('Benefício marcado como entregue!', 'success');
      await fetchHistorico();
    } catch (error) {
      console.error('Erro ao marcar como entregue:', error);
      showMessage('Erro ao atualizar status do benefício', 'error');
    } finally {
      setLoading(false);
    }
  };

  const formatCPF = (cpf: string) => {
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'concedido': return 'bg-yellow-100 text-yellow-800';
      case 'entregue': return 'bg-green-100 text-green-800';
      case 'cancelado': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'concedido': return 'Concedido';
      case 'entregue': return 'Entregue';
      case 'cancelado': return 'Cancelado';
      default: return status;
    }
  };

  const tiposBeneficio = [
    { value: 'cesta_basica', label: 'Cesta Básica' },
    { value: 'auxilio_funeral', label: 'Auxílio Funeral' },
    { value: 'auxilio_natalidade', label: 'Auxílio Natalidade' },
    { value: 'passagem', label: 'Passagem' },
    { value: 'outro', label: 'Outro' }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => window.history.back()}
            className="text-blue-600 hover:text-blue-800 mb-4 flex items-center"
          >
            ← Voltar para o início
          </button>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Entrega de Benefícios</h1>
              <p className="text-gray-600 mt-2">Registre a entrega de benefícios eventuais às famílias</p>
            </div>
          </div>
        </div>

        {/* Mensagens */}
        {message && (
          <div className={`mb-6 p-4 rounded-md ${
            messageType === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {message}
          </div>
        )}

        {/* Tabs */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('nova-entrega')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'nova-entrega'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Nova Entrega
              </button>
              <button
                onClick={() => setActiveTab('historico')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'historico'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Histórico de Entregas
              </button>
            </nav>
          </div>
        </div>

        {/* Conteúdo das Tabs */}
        {activeTab === 'nova-entrega' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Card de Busca */}
            <div className="bg-white shadow rounded-lg lg:col-span-1">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <div className="bg-blue-100 rounded-full w-8 h-8 flex items-center justify-center mr-3">
                    <span className="text-blue-600 text-lg">🔍</span>
                  </div>
                  Buscar Família
                </h2>
                <p className="text-sm text-gray-600 mt-1">Localize a família para entrega do benefício</p>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Busca
                  </label>
                  <select
                    value={searchType}
                    onChange={(e) => setSearchType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="nome">Nome do Responsável</option>
                    <option value="cpf">CPF</option>
                    <option value="nis">NIS</option>
                    <option value="prontuario">Prontuário</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {searchType === 'nome' && 'Nome do Responsável'}
                    {searchType === 'cpf' && 'CPF'}
                    {searchType === 'nis' && 'NIS'}
                    {searchType === 'prontuario' && 'Prontuário'}
                  </label>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={`Digite o ${searchType === 'nome' ? 'nome' : searchType.toUpperCase()}`}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  />
                </div>
                
                <button
                  onClick={handleSearch}
                  disabled={loading}
                  className={`w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                    loading
                      ? 'bg-blue-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700'
                  } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
                >
                  🔍 {loading ? 'Buscando...' : 'Buscar'}
                </button>

                {/* Resultados da Busca */}
                {families.length > 0 && (
                  <div className="mt-6 space-y-4">
                    <div className="border-t pt-4">
                      <h3 className="font-medium text-sm text-gray-900 mb-3">Resultados da Busca</h3>
                      <div className="space-y-3">
                        {families.map((family) => (
                          <div
                            key={family.id}
                            onClick={() => handleSelectFamily(family)}
                            className={`border rounded-md p-3 cursor-pointer transition-colors ${
                              selectedFamily?.id === family.id
                                ? 'bg-blue-50 border-blue-300'
                                : 'bg-white hover:bg-gray-50 border-gray-200'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-medium text-sm text-gray-900">{family.responsavel_nome}</h4>
                                <p className="text-xs text-gray-500">CPF: {formatCPF(family.responsavel_cpf)}</p>
                                <p className="text-xs text-gray-500">{family.equipamento_nome}</p>
                              </div>
                              <button
                                className={`text-xs px-3 py-1 rounded-md border ${
                                  selectedFamily?.id === family.id
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                }`}
                              >
                                {selectedFamily?.id === family.id ? 'Selecionado' : 'Selecionar'}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Card de Registro */}
            <div className="bg-white shadow rounded-lg lg:col-span-2">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <div className="bg-blue-100 rounded-full w-8 h-8 flex items-center justify-center mr-3">
                    <span className="text-blue-600 text-lg">📦</span>
                  </div>
                  Registrar Entrega de Benefício
                </h2>
                <p className="text-sm text-gray-600 mt-1">Preencha os dados para registrar a entrega</p>
              </div>
              <div className="p-6 space-y-6">
                {/* Família Selecionada */}
                {selectedFamily ? (
                  <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
                    <h3 className="text-lg font-medium mb-4 flex items-center text-gray-900">
                      <span className="bg-blue-100 text-blue-600 w-6 h-6 rounded-full inline-flex items-center justify-center mr-2 text-sm">
                        1
                      </span>
                      Família Selecionada
                    </h3>
                    <div className="flex items-center gap-4 p-4 bg-white rounded-md shadow-sm">
                      <div className="bg-blue-100 rounded-full w-12 h-12 flex items-center justify-center">
                        <span className="text-blue-600 font-medium">
                          {getInitials(selectedFamily.responsavel_nome)}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">{selectedFamily.responsavel_nome}</h4>
                        <p className="text-sm text-gray-600">CPF: {formatCPF(selectedFamily.responsavel_cpf)}</p>
                        <p className="text-sm text-gray-600">{selectedFamily.equipamento_nome}</p>
                      </div>
                      <span className="ml-auto bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                        Selecionado
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <span className="text-yellow-600 mr-2">⚠️</span>
                      <p className="text-sm text-yellow-700">
                        Selecione uma família para continuar com o registro do benefício.
                      </p>
                    </div>
                  </div>
                )}

                {/* Dados do Benefício */}
                <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
                  <h3 className="text-lg font-medium mb-4 flex items-center text-gray-900">
                    <span className="bg-blue-100 text-blue-600 w-6 h-6 rounded-full inline-flex items-center justify-center mr-2 text-sm">
                      2
                    </span>
                    Dados do Benefício
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tipo de Benefício *
                      </label>
                      <select
                        value={dadosBeneficio.tipo_beneficio}
                        onChange={(e) => setDadosBeneficio(prev => ({
                          ...prev,
                          tipo_beneficio: e.target.value
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Selecione o tipo de benefício</option>
                        {tiposBeneficio.map(tipo => (
                          <option key={tipo.value} value={tipo.value}>
                            {tipo.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Valor (R$)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={dadosBeneficio.valor}
                        onChange={(e) => setDadosBeneficio(prev => ({
                          ...prev,
                          valor: parseFloat(e.target.value) || 0
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Data da Concessão *
                      </label>
                      <input
                        type="date"
                        value={dadosBeneficio.data_concessao}
                        onChange={(e) => setDadosBeneficio(prev => ({
                          ...prev,
                          data_concessao: e.target.value
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Data da Entrega
                      </label>
                      <input
                        type="date"
                        value={dadosBeneficio.data_entrega}
                        onChange={(e) => setDadosBeneficio(prev => ({
                          ...prev,
                          data_entrega: e.target.value
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Descrição do Benefício
                      </label>
                      <input
                        type="text"
                        placeholder="Descreva o benefício específico"
                        value={dadosBeneficio.descricao_beneficio}
                        onChange={(e) => setDadosBeneficio(prev => ({
                          ...prev,
                          descricao_beneficio: e.target.value
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Justificativa *
                      </label>
                      <textarea
                        placeholder="Justificativa para a concessão do benefício"
                        value={dadosBeneficio.justificativa}
                        onChange={(e) => setDadosBeneficio(prev => ({
                          ...prev,
                          justificativa: e.target.value
                        }))}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Observações */}
                <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
                  <h3 className="text-lg font-medium mb-4 flex items-center text-gray-900">
                    <span className="bg-blue-100 text-blue-600 w-6 h-6 rounded-full inline-flex items-center justify-center mr-2 text-sm">
                      3
                    </span>
                    Observações
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Observações Adicionais
                      </label>
                      <textarea
                        placeholder="Observações adicionais sobre o benefício"
                        value={dadosBeneficio.observacoes}
                        onChange={(e) => setDadosBeneficio(prev => ({
                          ...prev,
                          observacoes: e.target.value
                        }))}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div className="flex justify-end">
                      <button
                        onClick={salvarBeneficio}
                        disabled={loading || !selectedFamily}
                        className={`flex items-center px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                          loading || !selectedFamily
                            ? 'bg-blue-400 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-700'
                        } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
                      >
                        ✓ {loading ? 'Registrando...' : 'Registrar Benefício'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Histórico de Entregas */}
        {activeTab === 'historico' && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <div className="bg-blue-100 rounded-full w-8 h-8 flex items-center justify-center mr-3">
                  <span className="text-blue-600 text-lg">🕐</span>
                </div>
                Histórico de Entregas
              </h2>
              <p className="text-sm text-gray-600 mt-1">Benefícios registrados no sistema</p>
            </div>
            <div className="p-6">
              {historico.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">Nenhum benefício registrado ainda.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {historico.map((item) => (
                    <div key={item.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <div className="flex items-start gap-4">
                        <div className="bg-blue-100 rounded-full w-10 h-10 flex items-center justify-center mt-1">
                          <span className="text-blue-600 font-medium text-sm">
                            {getInitials(item.responsavel_nome)}
                          </span>
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="font-medium flex items-center gap-2 text-gray-900">
                              👤 {item.responsavel_nome}
                            </div>
                            <div className="text-sm text-gray-500 flex items-center gap-2">
                              📅 {formatDate(item.data_concessao)}
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-gray-700">
                              <span className="font-medium">Benefício:</span> {
                                tiposBeneficio.find(t => t.value === item.tipo_beneficio)?.label || item.tipo_beneficio
                              }
                              {item.descricao_beneficio && ` - ${item.descricao_beneficio}`}
                            </p>
                            <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(item.status)}`}>
                              {getStatusLabel(item.status)}
                            </span>
                          </div>
                          {item.valor > 0 && (
                            <p className="text-sm text-gray-700">
                              <span className="font-medium">Valor:</span> {formatCurrency(item.valor)}
                            </p>
                          )}
                          <p className="text-sm text-gray-700">
                            <span className="font-medium">Justificativa:</span> {item.justificativa}
                          </p>
                          {item.data_entrega && (
                            <p className="text-sm text-gray-700">
                              <span className="font-medium">Data da entrega:</span> {formatDate(item.data_entrega)}
                            </p>
                          )}
                          {item.observacoes && (
                            <p className="text-sm text-gray-700">
                              <span className="font-medium">Observações:</span> {item.observacoes}
                            </p>
                          )}
                          {item.status === 'concedido' && (
                            <div className="flex justify-end mt-2">
                              <button
                                onClick={() => marcarComoEntregue(item.id)}
                                disabled={loading}
                                className="text-xs px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                              >
                                Marcar como Entregue
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BeneficiosPage;
