import React, { useState, useEffect, useMemo } from 'react';
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
  responsavel_nome: string; // Nome do responsável da família
  tipo_beneficio: string;
  descricao_beneficio: string;
  data_concessao: string;
  valor: number;
  justificativa: string;
  status: string;
  data_entrega: string;
  observacoes: string;
  prontuario: string; // Prontuário da família
  responsavel_id: string; // Nome do usuário que registrou o benefício (vindo da rota completa)
  created_at: string; // Data de criação do registro do benefício
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
  const [activeTab, setActiveTab] = useState<'nova-entrega' | 'historico' | 'detalhes-beneficio'>('nova-entrega');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState('nome');
  const [families, setFamilies] = useState<Familia[]>([]);
  const [selectedFamily, setSelectedFamily] = useState<Familia | null>(null);
  const [historico, setHistorico] = useState<Beneficio[]>([]);
  const [selectedBeneficioForDetails, setSelectedBeneficioForDetails] = useState<Beneficio | null>(null); // Novo estado para detalhes
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');

  // Busca e filtro do histórico
  const [historySearchTerm, setHistorySearchTerm] = useState('');
  const [historyFilterStatus, setHistoryFilterStatus] = useState('all');
  const [historyFilterType, setHistoryFilterType] = useState('all');

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
      // Usando a nova rota de histórico completo
      const response = await api.get('/auth/beneficios/historico-completo');
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

  const salvarBeneficio = async (force: boolean = false) => {
    if (!validarFormulario()) return;
    setLoading(true);
    try {
      const dadosParaEnviar = { ...dadosBeneficio, force };
      await api.post('/auth/beneficios', dadosParaEnviar);
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
      await fetchHistorico();
      setActiveTab('historico');
    } catch (error: any) {
      if (error.response?.status === 409 && error.response?.data?.requiresConfirmation) {
        const continuar = window.confirm(
          'ATENÇÃO: Esta família já recebeu um benefício este mês. Deseja registrar a entrega mesmo assim?'
        );
        if (continuar) {
          salvarBeneficio(true);
          return;
        }
      } else {
        console.error('Erro ao salvar benefício:', error);
        let errorMessage = 'Erro desconhecido';
        if (error?.response?.data?.message) {
          errorMessage = error.response.data.message;
        } else if (error instanceof Error) {
          errorMessage = error.message;
        }
        showMessage(`Erro ao registrar benefício: ${errorMessage}`, 'error');
      }
    } finally {
      if (!force) {
        setLoading(false);
      }
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

  const handleViewDetails = (beneficio: Beneficio) => {
    setSelectedBeneficioForDetails(beneficio);
    setActiveTab('detalhes-beneficio');
  };

  const formatCPF = (cpf: string) => {
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'concedido': return 'bg-yellow-100 text-yellow-800';
      case 'entregue': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'concedido': return 'Concedido';
      case 'entregue': return 'Entregue';
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

  const searchOptions = [
    { value: 'nome', label: 'Responsável (Nome)' },
    { value: 'cpf', label: 'Responsável (CPF)' },
    { value: 'prontuario', label: 'Prontuário' },
    { value: 'membro_nome', label: 'Membro da Família (Nome)' },
    { value: 'membro_cpf', label: 'Membro da Família (CPF)' },
    { value: 'membro_nis', label: 'Membro da Família (NIS)' }
  ];

  // Filtragem do histórico
  const filteredHistorico = useMemo(() => {
    let currentHistorico = historico;
    if (historySearchTerm) {
      const lowerCaseSearchTerm = historySearchTerm.toLowerCase();
      currentHistorico = currentHistorico.filter(beneficio =>
        beneficio.responsavel_nome.toLowerCase().includes(lowerCaseSearchTerm) ||
        (beneficio.prontuario && beneficio.prontuario.toLowerCase().includes(lowerCaseSearchTerm)) ||
        beneficio.tipo_beneficio.toLowerCase().includes(lowerCaseSearchTerm) ||
        (beneficio.descricao_beneficio && beneficio.descricao_beneficio.toLowerCase().includes(lowerCaseSearchTerm)) ||
        beneficio.justificativa.toLowerCase().includes(lowerCaseSearchTerm) ||
        (beneficio.observacoes && beneficio.observacoes.toLowerCase().includes(lowerCaseSearchTerm)) ||
        (beneficio.responsavel_id && beneficio.responsavel_id.toLowerCase().includes(lowerCaseSearchTerm)) // Inclui busca pelo nome do usuário
      );
    }
    if (historyFilterStatus !== 'all') {
      currentHistorico = currentHistorico.filter(beneficio => beneficio.status === historyFilterStatus);
    }
    if (historyFilterType !== 'all') {
      // Correção aqui: era benefic..icativa
      currentHistorico = currentHistorico.filter(beneficio => beneficio.tipo_beneficio === historyFilterType);
    }
    return currentHistorico;
  }, [historico, historySearchTerm, historyFilterStatus, historyFilterType]);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-5xl font-bold text-gray-800 text-center mb-10">Gestão de Benefícios</h1>

        {message && (
          <div className={`p-4 mb-6 rounded-md text-center ${messageType === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {message}
          </div>
        )}

        <div className="mb-8 flex justify-center space-x-4">
          <button
            onClick={() => { setActiveTab('nova-entrega'); setSelectedBeneficioForDetails(null); }}
            className={`px-8 py-3 rounded-md text-lg font-semibold transition-colors duration-200 ${activeTab === 'nova-entrega' ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
          >
            Nova Entrega
          </button>
          <button
            onClick={() => { setActiveTab('historico'); setSelectedBeneficioForDetails(null); }}
            className={`px-8 py-3 rounded-md text-lg font-semibold transition-colors duration-200 ${activeTab === 'historico' ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
          >
            Histórico
          </button>
          {selectedBeneficioForDetails && (
            <button
              onClick={() => setActiveTab('detalhes-beneficio')}
              className={`px-8 py-3 rounded-md text-lg font-semibold transition-colors duration-200 ${activeTab === 'detalhes-beneficio' ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
            >
              Detalhes do Benefício
            </button>
          )}
        </div>

        {activeTab === 'nova-entrega' && (
          <div className="bg-white shadow-xl rounded-lg p-8">
            <h2 className="text-3xl font-bold text-gray-800 mb-6">Registrar Nova Entrega de Benefício</h2>

            {/* Seção de Busca de Famílias */}
            <div className="mb-8 p-6 bg-gray-50 rounded-md shadow-inner">
              <h3 className="text-2xl font-semibold text-gray-700 mb-4">1. Buscar Família</h3>
              <div className="flex flex-col sm:flex-row gap-4 mb-4">
                <select
                  className="p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 flex-none w-full sm:w-auto"
                  value={searchType}
                  onChange={(e) => setSearchType(e.target.value)}
                >
                  {searchOptions.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Digite o termo de busca..."
                  className="flex-1 p-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => { if (e.key === 'Enter') handleSearch(); }}
                />
                <button
                  onClick={handleSearch}
                  className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex-none"
                  disabled={loading}
                >
                  {loading ? 'Buscando...' : 'Buscar'}
                </button>
              </div>

              {families.length > 0 && (
                <div className="mt-6 border-t border-gray-200 pt-4">
                  <h4 className="text-lg font-medium text-gray-700 mb-3">Resultados da Busca:</h4>
                  <ul className="space-y-3">
                    {families.map(family => (
                      <li key={family.id} className="flex items-center justify-between bg-white p-4 rounded-md shadow-sm border border-gray-200">
                        <div>
                          <p className="font-semibold text-gray-900">{family.responsavel_nome}</p>
                          <p className="text-sm text-gray-600">CPF: {formatCPF(family.responsavel_cpf)} | Prontuário: {family.prontuario}</p>
                          <p className="text-xs text-gray-500">Equipamento: {family.equipamento_nome}</p>
                        </div>
                        <button
                          onClick={() => handleSelectFamily(family)}
                          className="ml-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 text-sm"
                        >
                          Selecionar
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Seção de Registro de Benefício */}
            <div className="mt-8 p-6 bg-gray-50 rounded-md shadow-inner">
              <h3 className="text-2xl font-semibold text-gray-700 mb-4">2. Registrar Benefício para a Família</h3>
              {selectedFamily ? (
                <div className="mb-6 p-4 bg-blue-50 border-l-4 border-blue-400 text-blue-800 rounded-md">
                  <p className="font-bold">Família Selecionada:</p>
                  <p>{selectedFamily.responsavel_nome} (Prontuário: {selectedFamily.prontuario})</p>
                </div>
              ) : (
                <p className="text-gray-600 mb-6">Nenhuma família selecionada. Por favor, busque e selecione uma família acima.</p>
              )}

              <form onSubmit={(e) => { e.preventDefault(); salvarBeneficio(); }} className="space-y-6">
                <div>
                  <label htmlFor="tipo_beneficio" className="block text-sm font-medium text-gray-700">Tipo de Benefício</label>
                  <select
                    id="tipo_beneficio"
                    className="mt-1 block w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    value={dadosBeneficio.tipo_beneficio}
                    onChange={(e) => setDadosBeneficio({ ...dadosBeneficio, tipo_beneficio: e.target.value })}
                    required
                  >
                    <option value="">Selecione um tipo</option>
                    {tiposBeneficio.map(tipo => (
                      <option key={tipo.value} value={tipo.value}>{tipo.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="descricao_beneficio" className="block text-sm font-medium text-gray-700">Descrição Detalhada (Opcional)</label>
                  <input
                    type="text"
                    id="descricao_beneficio"
                    className="mt-1 block w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    value={dadosBeneficio.descricao_beneficio}
                    onChange={(e) => setDadosBeneficio({ ...dadosBeneficio, descricao_beneficio: e.target.value })}
                  />
                </div>
                <div>
                  <label htmlFor="valor" className="block text-sm font-medium text-gray-700">Valor (R$)</label>
                  <input
                    type="number"
                    id="valor"
                    className="mt-1 block w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    value={dadosBeneficio.valor}
                    onChange={(e) => setDadosBeneficio({ ...dadosBeneficio, valor: parseFloat(e.target.value) || 0 })}
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="justificativa" className="block text-sm font-medium text-gray-700">Justificativa</label>
                  <textarea
                    id="justificativa"
                    rows={3}
                    className="mt-1 block w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    value={dadosBeneficio.justificativa}
                    onChange={(e) => setDadosBeneficio({ ...dadosBeneficio, justificativa: e.target.value })}
                    required
                  ></textarea>
                </div>
                <div>
                  <label htmlFor="data_concessao" className="block text-sm font-medium text-gray-700">Data de Registro</label>
                  <input
                    type="date"
                    id="data_concessao"
                    className="mt-1 block w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    value={dadosBeneficio.data_concessao}
                    onChange={(e) => setDadosBeneficio({ ...dadosBeneficio, data_concessao: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="data_entrega" className="block text-sm font-medium text-gray-700">Data Prevista de Entrega (Opcional)</label>
                  <input
                    type="date"
                    id="data_entrega"
                    className="mt-1 block w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    value={dadosBeneficio.data_entrega}
                    onChange={(e) => setDadosBeneficio({ ...dadosBeneficio, data_entrega: e.target.value })}
                  />
                </div>
                <div>
                  <label htmlFor="observacoes" className="block text-sm font-medium text-gray-700">Observações (Opcional)</label>
                  <textarea
                    id="observacoes"
                    rows={2}
                    className="mt-1 block w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    value={dadosBeneficio.observacoes}
                    onChange={(e) => setDadosBeneficio({ ...dadosBeneficio, observacoes: e.target.value })}
                  ></textarea>
                </div>
                <button
                  type="submit"
                  className="w-full px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 text-lg font-semibold"
                  disabled={loading}
                >
                  {loading ? 'Registrando...' : 'Registrar Benefício'}
                </button>
              </form>
            </div>
          </div>
        )}

        {activeTab === 'historico' && (
          <div className="bg-white shadow-xl rounded-lg p-8">
            <h2 className="text-3xl font-bold text-gray-800 mb-6">Histórico de Benefícios</h2>
            {/* Search and Filter for Historico */}
            <div className="flex flex-wrap gap-4 mb-6">
              <input
                type="text"
                placeholder="Buscar no histórico (nome, prontuário, benefício...)"
                className="flex-1 p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                value={historySearchTerm}
                onChange={(e) => setHistorySearchTerm(e.target.value)}
              />
              <select
                className="p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                value={historyFilterStatus}
                onChange={(e) => setHistoryFilterStatus(e.target.value)}
              >
                <option value="all">Todos os Status</option>
                <option value="concedido">Concedido</option>
                <option value="entregue">Entregue</option>
              </select>
              <select
                className="p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                value={historyFilterType}
                onChange={(e) => setHistoryFilterType(e.target.value)}
              >
                <option value="all">Todos os Tipos de Benefício</option>
                {tiposBeneficio.map(tipo => (
                  <option key={tipo.value} value={tipo.value}>{tipo.label}</option>
                ))}
              </select>
            </div>
            {filteredHistorico.length === 0 ? (
              <p className="text-center text-gray-600 text-lg">Nenhum benefício encontrado no histórico com os critérios de busca/filtro.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white rounded-lg shadow-md">
                  <thead className="bg-gray-100 border-b border-gray-200">
                    <tr>
                      <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Família</th>
                      <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prontuário</th>
                      <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Benefício</th>
                      <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor</th>
                      <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Concessão</th>
                      <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entrega</th>
                      <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Registrado Por</th>
                      <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredHistorico.map((beneficio) => (
                      <tr key={beneficio.id} className="hover:bg-gray-50">
                        <td className="py-4 px-6 whitespace-nowrap text-sm font-medium text-gray-900">
                          {beneficio.responsavel_nome}
                        </td>
                        <td className="py-4 px-6 whitespace-nowrap text-sm text-gray-600">
                          {beneficio.prontuario}
                        </td>
                        <td className="py-4 px-6 whitespace-nowrap text-sm text-gray-600">
                          <span className="font-semibold">{tiposBeneficio.find(t => t.value === beneficio.tipo_beneficio)?.label || beneficio.tipo_beneficio}</span>
                          {beneficio.descricao_beneficio && <p className="text-xs text-gray-500 mt-1">{beneficio.descricao_beneficio}</p>}
                        </td>
                        <td className="py-4 px-6 whitespace-nowrap text-sm text-gray-600">
                          {formatCurrency(beneficio.valor)}
                        </td>
                        <td className="py-4 px-6 whitespace-nowrap text-sm text-gray-600">
                          {formatDate(beneficio.data_concessao)}
                        </td>
                        <td className="py-4 px-6 whitespace-nowrap text-sm text-gray-600">
                          {beneficio.data_entrega ? formatDate(beneficio.data_entrega) : 'Pendente'}
                        </td>
                        <td className="py-4 px-6 whitespace-nowrap text-sm">
                          <span
                            className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(beneficio.status)}`}
                          >
                            {getStatusLabel(beneficio.status)}
                          </span>
                        </td>
                        <td className="py-4 px-6 whitespace-nowrap text-sm text-gray-600">
                          {beneficio.responsavel_id || 'N/A'}
                        </td>
                        <td className="py-4 px-6 whitespace-nowrap text-sm font-medium flex gap-2">
                          {beneficio.status === 'concedido' && (
                            <button
                              onClick={() => marcarComoEntregue(beneficio.id)}
                              className="text-indigo-600 hover:text-indigo-900"
                              disabled={loading}
                            >
                              Marcar como Entregue
                            </button>
                          )}
                          <button
                            onClick={() => handleViewDetails(beneficio)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Ver Detalhes
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'detalhes-beneficio' && selectedBeneficioForDetails && (
          <div className="bg-white shadow-xl rounded-lg p-8">
            <h2 className="text-3xl font-bold text-gray-800 mb-6">Detalhes do Benefício</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-lg">
              <div className="bg-gray-50 p-4 rounded-md shadow-sm">
                <p className="font-semibold text-gray-700">ID do Benefício:</p>
                <p className="text-gray-900">{selectedBeneficioForDetails.id}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-md shadow-sm">
                <p className="font-semibold text-gray-700">Família Responsável:</p>
                <p className="text-gray-900">{selectedBeneficioForDetails.responsavel_nome} </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-md shadow-sm">
                <p className="font-semibold text-gray-700">Prontuário da Família:</p>
                <p className="text-gray-900">{selectedBeneficioForDetails.prontuario}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-md shadow-sm">
                <p className="font-semibold text-gray-700">Tipo de Benefício:</p>
                <p className="text-gray-900">{tiposBeneficio.find(t => t.value === selectedBeneficioForDetails.tipo_beneficio)?.label || selectedBeneficioForDetails.tipo_beneficio}</p>
              </div>
              {selectedBeneficioForDetails.descricao_beneficio && (
                <div className="bg-gray-50 p-4 rounded-md shadow-sm col-span-1 md:col-span-2">
                  <p className="font-semibold text-gray-700">Descrição Detalhada:</p>
                  <p className="text-gray-900">{selectedBeneficioForDetails.descricao_beneficio}</p>
                </div>
              )}
              <div className="bg-gray-50 p-4 rounded-md shadow-sm">
                <p className="font-semibold text-gray-700">Valor:</p>
                <p className="text-gray-900">{formatCurrency(selectedBeneficioForDetails.valor)}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-md shadow-sm">
                <p className="font-semibold text-gray-700">Status:</p>
                <p className={`text-gray-900 ${getStatusColor(selectedBeneficioForDetails.status)} inline-block px-3 py-1 rounded-full text-sm font-semibold`}>
                  {getStatusLabel(selectedBeneficioForDetails.status)}
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-md shadow-sm">
                <p className="font-semibold text-gray-700">Data de Concessão:</p>
                <p className="text-gray-900">{formatDate(selectedBeneficioForDetails.data_concessao)}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-md shadow-sm">
                <p className="font-semibold text-gray-700">Data de Entrega:</p>
                <p className="text-gray-900">{selectedBeneficioForDetails.data_entrega ? formatDate(selectedBeneficioForDetails.data_entrega) : 'Não entregue'}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-md shadow-sm col-span-1 md:col-span-2">
                <p className="font-semibold text-gray-700">Justificativa:</p>
                <p className="text-gray-900">{selectedBeneficioForDetails.justificativa}</p>
              </div>
              {selectedBeneficioForDetails.observacoes && (
                <div className="bg-gray-50 p-4 rounded-md shadow-sm col-span-1 md:col-span-2">
                  <p className="font-semibold text-gray-700">Observações:</p>
                  <p className="text-gray-900">{selectedBeneficioForDetails.observacoes}</p>
                </div>
              )}
              <div className="bg-gray-50 p-4 rounded-md shadow-sm">
                <p className="font-semibold text-gray-700">Registrado Por:</p>
                <p className="text-gray-900">{selectedBeneficioForDetails.responsavel_id || 'N/A'}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-md shadow-sm">
                <p className="font-semibold text-gray-700">Data de Registro no Sistema:</p>
                <p className="text-gray-900">{formatDate(selectedBeneficioForDetails.created_at)}</p>
              </div>
            </div>
            <div className="mt-8 text-center">
              <button
                onClick={() => setActiveTab('historico')}
                className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-lg font-semibold"
              >
                Voltar ao Histórico
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BeneficiosPage;
