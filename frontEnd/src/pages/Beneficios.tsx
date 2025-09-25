"use client"

import React, { useState, useEffect, useMemo } from 'react'
import api from "../services/api"
import Header from "../components/Header"
import { Search, PlusCircle, List, Info, Loader2 } from 'lucide-react'; // Importando ícones

// Interfaces para os dados (mantidas como estão)
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
  // --- LÓGICA EXISTENTE (sem alterações) ---
  const [activeTab, setActiveTab] = useState<'nova-entrega' | 'historico' | 'detalhes-beneficio'>('nova-entrega');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState('nome');
  const [families, setFamilies] = useState<Familia[]>([]);
  const [selectedFamily, setSelectedFamily] = useState<Familia | null>(null);
  const [historico, setHistorico] = useState<Beneficio[]>([]);
  const [selectedBeneficioForDetails, setSelectedBeneficioForDetails] = useState<Beneficio | null>(null);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');
  const [historySearchTerm, setHistorySearchTerm] = useState('');
  const [historyFilterStatus, setHistoryFilterStatus] = useState('all');
  const [historyFilterType, setHistoryFilterType] = useState('all');
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

  const formatCPF = (cpf: string) => cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  const formatDate = (dateString: string) => dateString ? new Date(dateString).toLocaleDateString('pt-BR') : 'N/A';
  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'concedido': return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case 'entregue': return "bg-green-100 text-green-800 border-green-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'concedido': return 'CONCEDIDO';
      case 'entregue': return 'ENTREGUE';
      default: return status.toUpperCase();
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
        (beneficio.responsavel_id && beneficio.responsavel_id.toLowerCase().includes(lowerCaseSearchTerm))
      );
    }
    if (historyFilterStatus !== 'all') {
      currentHistorico = currentHistorico.filter(beneficio => beneficio.status === historyFilterStatus);
    }
    if (historyFilterType !== 'all') {
      currentHistorico = currentHistorico.filter(beneficio => beneficio.tipo_beneficio === historyFilterType);
    }
    return currentHistorico;
  }, [historico, historySearchTerm, historyFilterStatus, historyFilterType]);

  // --- JSX ATUALIZADO COM O NOVO DESIGN ---
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Gestão de Benefícios</h1>
              <p className="text-gray-600 mt-1">Registre e consulte os benefícios concedidos</p>
            </div>
          </div>
        </div>

        {message && (
          <div className={`p-4 mb-6 rounded-lg text-center font-medium ${messageType === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {message}
          </div>
        )}

        {/* Abas de Navegação */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-6">
            <button
              onClick={() => { setActiveTab('nova-entrega'); setSelectedBeneficioForDetails(null); }}
              className={`flex items-center space-x-2 px-3 py-2 font-medium text-sm rounded-t-md transition-colors ${activeTab === 'nova-entrega' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <PlusCircle size={16} />
              <span>Nova Entrega</span>
            </button>
            <button
              onClick={() => { setActiveTab('historico'); setSelectedBeneficioForDetails(null); }}
              className={`flex items-center space-x-2 px-3 py-2 font-medium text-sm rounded-t-md transition-colors ${activeTab === 'historico' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <List size={16} />
              <span>Histórico</span>
            </button>
            {selectedBeneficioForDetails && (
              <button
                onClick={() => setActiveTab('detalhes-beneficio')}
                className={`flex items-center space-x-2 px-3 py-2 font-medium text-sm rounded-t-md transition-colors ${activeTab === 'detalhes-beneficio' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <Info size={16} />
                <span>Detalhes do Benefício</span>
              </button>
            )}
          </nav>
        </div>

        {/* Conteúdo da Aba: Nova Entrega */}
        {activeTab === 'nova-entrega' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">1. Buscar Família</h2>
              <div className="flex flex-col md:flex-row gap-4">
                <select
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full md:w-64"
                  value={searchType}
                  onChange={(e) => setSearchType(e.target.value)}
                >
                  {searchOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
                <div className="relative flex-1">
                  <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Digite o termo de busca..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyPress={(e) => { if (e.key === 'Enter') handleSearch(); }}
                  />
                </div>
                <button
                  onClick={handleSearch}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center justify-center space-x-2 transition-colors disabled:bg-gray-400"
                  disabled={loading}
                >
                  {loading ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
                  <span>{loading ? 'Buscando...' : 'Buscar'}</span>
                </button>
              </div>
              {families.length > 0 && (
                <div className="mt-6 divide-y divide-gray-200">
                  {families.map(family => (
                    <div key={family.id} className="flex items-center justify-between py-4">
                      <div>
                        <p className="font-semibold text-gray-900">{family.responsavel_nome}</p>
                        <p className="text-sm text-gray-600">CPF: {formatCPF(family.responsavel_cpf)} | Prontuário: {family.prontuario}</p>
                        <p className="text-xs text-gray-500">Equipamento: {family.equipamento_nome}</p>
                      </div>
                      <button
                        onClick={() => handleSelectFamily(family)}
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors"
                      >
                        Selecionar
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">2. Registrar Benefício</h2>
              {selectedFamily ? (
                <div className="mb-6 p-4 bg-blue-50 border-l-4 border-blue-400 text-blue-800 rounded-md">
                  <p className="font-bold">Família Selecionada: {selectedFamily.responsavel_nome} (Prontuário: {selectedFamily.prontuario})</p>
                </div>
              ) : (
                <p className="text-gray-600 mb-6">Nenhuma família selecionada. Por favor, busque e selecione uma família acima.</p>
              )}
              <form onSubmit={(e) => { e.preventDefault(); salvarBeneficio(); }} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="tipo_beneficio" className="block text-sm font-medium text-gray-700 mb-1">Tipo de Benefício *</label>
                  <select id="tipo_beneficio" className="w-full p-2 border border-gray-300 rounded-lg" value={dadosBeneficio.tipo_beneficio} onChange={(e) => setDadosBeneficio({ ...dadosBeneficio, tipo_beneficio: e.target.value })} required>
                    <option value="">Selecione um tipo</option>
                    {tiposBeneficio.map(tipo => <option key={tipo.value} value={tipo.value}>{tipo.label}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="valor" className="block text-sm font-medium text-gray-700 mb-1">Valor (R$) </label>
                  <input type="number" id="valor" className="w-full p-2 border border-gray-300 rounded-lg" value={dadosBeneficio.valor} onChange={(e) => setDadosBeneficio({ ...dadosBeneficio, valor: parseFloat(e.target.value) || 0 })} min="0" step="0.01" required />
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="descricao_beneficio" className="block text-sm font-medium text-gray-700 mb-1">Descrição Detalhada (Opcional)</label>
                  <input type="text" id="descricao_beneficio" className="w-full p-2 border border-gray-300 rounded-lg" value={dadosBeneficio.descricao_beneficio} onChange={(e) => setDadosBeneficio({ ...dadosBeneficio, descricao_beneficio: e.target.value })} />
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="justificativa" className="block text-sm font-medium text-gray-700 mb-1">Justificativa *</label>
                  <textarea id="justificativa" rows={3} className="w-full p-2 border border-gray-300 rounded-lg" value={dadosBeneficio.justificativa} onChange={(e) => setDadosBeneficio({ ...dadosBeneficio, justificativa: e.target.value })} required></textarea>
                </div>
                <div>
                  <label htmlFor="data_concessao" className="block text-sm font-medium text-gray-700 mb-1">Data de Registro *</label>
                  <input type="date" id="data_concessao" className="w-full p-2 border border-gray-300 rounded-lg" value={dadosBeneficio.data_concessao} onChange={(e) => setDadosBeneficio({ ...dadosBeneficio, data_concessao: e.target.value })} required />
                </div>
                <div>
                  <label htmlFor="data_entrega" className="block text-sm font-medium text-gray-700 mb-1">Data Prevista de Entrega</label>
                  <input type="date" id="data_entrega" className="w-full p-2 border border-gray-300 rounded-lg" value={dadosBeneficio.data_entrega} onChange={(e) => setDadosBeneficio({ ...dadosBeneficio, data_entrega: e.target.value })} />
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="observacoes" className="block text-sm font-medium text-gray-700 mb-1">Observações (Opcional)</label>
                  <textarea id="observacoes" rows={2} className="w-full p-2 border border-gray-300 rounded-lg" value={dadosBeneficio.observacoes} onChange={(e) => setDadosBeneficio({ ...dadosBeneficio, observacoes: e.target.value })}></textarea>
                </div>
                <div className="md:col-span-2 text-right">
                  <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:bg-gray-400" disabled={loading || !selectedFamily}>
                    {loading ? 'Registrando...' : 'Registrar Benefício'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Conteúdo da Aba: Histórico */}
        {activeTab === 'historico' && (
          <div className="bg-white rounded-lg shadow-md">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900">Histórico de Benefícios</h2>
              <div className="flex flex-col md:flex-row gap-4 mt-4">
                <div className="relative flex-1">
                  <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input type="text" placeholder="Buscar no histórico..." className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg" value={historySearchTerm} onChange={(e) => setHistorySearchTerm(e.target.value)} />
                </div>
                <select className="border border-gray-300 rounded-lg px-3 py-2" value={historyFilterStatus} onChange={(e) => setHistoryFilterStatus(e.target.value)}>
                  <option value="all">Todos os Status</option>
                  <option value="concedido">Concedido</option>
                  <option value="entregue">Entregue</option>
                </select>
                <select className="border border-gray-300 rounded-lg px-3 py-2" value={historyFilterType} onChange={(e) => setHistoryFilterType(e.target.value)}>
                  <option value="all">Todos os Tipos</option>
                  {tiposBeneficio.map(tipo => <option key={tipo.value} value={tipo.value}>{tipo.label}</option>)}
                </select>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Família</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Benefício</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Concessão</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Registrado Por</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredHistorico.map((b) => (
                    <tr key={b.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{b.responsavel_nome}</div>
                        <div className="text-sm text-gray-500">Prontuário: {b.prontuario}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{tiposBeneficio.find(t => t.value === b.tipo_beneficio)?.label || b.tipo_beneficio}</div>
                        <div className="text-sm text-gray-500">{formatCurrency(b.valor)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusBadge(b.status)}`}>{getStatusLabel(b.status)}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{formatDate(b.data_concessao)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{b.responsavel_id || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-4">
                        {b.status === 'concedido' && (
                          <button onClick={() => marcarComoEntregue(b.id)} disabled={loading} className="text-green-600 hover:text-green-800 disabled:text-gray-400">Entregar</button>
                        )}
                        <button onClick={() => handleViewDetails(b)} className="text-blue-600 hover:text-blue-800">Detalhes</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredHistorico.length === 0 && <p className="text-center text-gray-600 p-6">Nenhum benefício encontrado com os filtros atuais.</p>}
            </div>
          </div>
        )}

        {/* Conteúdo da Aba: Detalhes */}
        {activeTab === 'detalhes-beneficio' && selectedBeneficioForDetails && (
          <div className="bg-white shadow-xl rounded-lg p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Detalhes do Benefício</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                <div className="border-b py-2"><span className="font-semibold text-gray-700">Família:</span> {selectedBeneficioForDetails.responsavel_nome}</div>
                <div className="border-b py-2"><span className="font-semibold text-gray-700">Prontuário:</span> {selectedBeneficioForDetails.prontuario}</div>
                <div className="border-b py-2"><span className="font-semibold text-gray-700">Benefício:</span> {tiposBeneficio.find(t => t.value === selectedBeneficioForDetails.tipo_beneficio)?.label || selectedBeneficioForDetails.tipo_beneficio}</div>
                <div className="border-b py-2"><span className="font-semibold text-gray-700">Valor:</span> {formatCurrency(selectedBeneficioForDetails.valor)}</div>
                <div className="border-b py-2"><span className="font-semibold text-gray-700">Data Concessão:</span> {formatDate(selectedBeneficioForDetails.data_concessao)}</div>
                <div className="border-b py-2"><span className="font-semibold text-gray-700">Data Entrega:</span> {selectedBeneficioForDetails.data_entrega ? formatDate(selectedBeneficioForDetails.data_entrega) : 'Pendente'}</div>
                <div className="border-b py-2"><span className="font-semibold text-gray-700">Registrado por:</span> {selectedBeneficioForDetails.responsavel_id || 'N/A'}</div>
                <div className="border-b py-2"><span className="font-semibold text-gray-700">Status:</span> <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusBadge(selectedBeneficioForDetails.status)}`}>{getStatusLabel(selectedBeneficioForDetails.status)}</span></div>
                {selectedBeneficioForDetails.descricao_beneficio && <div className="md:col-span-2 border-b py-2"><span className="font-semibold text-gray-700">Descrição:</span> {selectedBeneficioForDetails.descricao_beneficio}</div>}
                <div className="md:col-span-2 border-b py-2"><span className="font-semibold text-gray-700">Justificativa:</span> {selectedBeneficioForDetails.justificativa}</div>
                {selectedBeneficioForDetails.observacoes && <div className="md:col-span-2 border-b py-2"><span className="font-semibold text-gray-700">Observações:</span> {selectedBeneficioForDetails.observacoes}</div>}
            </div>
            <div className="mt-8 text-center">
              <button onClick={() => setActiveTab('historico')} className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 font-semibold">
                Voltar ao Histórico
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default BeneficiosPage;

