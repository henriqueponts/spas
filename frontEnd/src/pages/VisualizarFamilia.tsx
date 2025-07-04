/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

// --- INTERFACES DE DADOS CORRIGIDAS ---
interface Integrante {
  id: number;
  nome_completo: string;
  data_nascimento: string;
  sexo: string;
  cpf: string;
  rg: string;
  orgao_expedidor: string;
  estado_civil: string;
  escolaridade: string;
  naturalidade: string;
  telefone: string;
  telefone_recado: string;
  email: string;
  nis: string;
  titulo_eleitor: string;
  ctps: string;
  tipo_membro: string;
  ocupacao: string;
  renda_mensal: number;
}

interface FamiliaCompleta {
  id: number;
  prontuario: string;
  data_cadastro: string;
  data_atendimento: string;
  situacao: string;
  equipamento: { nome: string; regiao: string; };
  profissional: { nome: string; cargo_nome: string; };
  responsavel: Integrante;
  endereco: { logradouro: string; numero: string; complemento: string; bairro: string; cidade: string; uf: string; cep: string; referencia: string; tempo_moradia: string; };
  integrantes: Integrante[];
  saude: { tem_deficiencia: boolean; deficiencia_qual: string; tem_tratamento_saude: boolean; tratamento_qual: string; usa_medicacao_continua: boolean; medicacao_qual: string; tem_dependente_cuidados: boolean; dependente_quem: string; observacoes: string; };
  habitacao: { qtd_comodos: number; qtd_dormitorios: number; tipo_construcao: string[]; area_conflito: boolean; condicao_domicilio: string[]; energia_eletrica: string; agua: string; esgoto: string; coleta_lixo: boolean; };
  trabalho_renda: { quem_trabalha: string; rendimento_total: number; observacoes: string; }; // Corrigido
  programas_sociais: Array<{ programa_nome: string; programa_codigo: string; valor: number; }>;
  despesas: Array<{ tipo_nome: string; tipo_codigo: string; valor: number; }>;
  situacao_social: { participa_religiao: boolean; religiao_qual: string; participa_acao_social: boolean; acao_social_qual: string; servicos_publicos: string[]; observacoes: string; };
}

interface Evolucao {
  id: number;
  familia_id: number;
  usuario_id: number;
  data_evolucao: string;
  hora_evolucao: string;
  descricao: string;
  created_at: string;
  updated_at: string;
  usuario_nome?: string;
  usuario_cargo?: string;
}

// --- COMPONENTES DE UI REUTILIZÁVEIS (COM TAILWIND) ---
const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
    {children}
  </div>
);
const CardHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => <div className="p-6">{children}</div>;
const CardTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => <h3 className="text-xl font-semibold tracking-tight text-gray-900">{children}</h3>;
const CardDescription: React.FC<{ children: React.ReactNode }> = ({ children }) => <p className="text-sm text-gray-500 mt-1">{children}</p>;
const CardContent: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => <div className={`p-6 pt-0 ${className}`}>{children}</div>;
const InfoItem: React.FC<{ label: string; value?: string | number | null; className?: string }> = ({ label, value, className }) => (
    <div className={className}>
        <dt className="text-gray-500">{label}</dt>
        <dd className="font-medium text-gray-800">{value || 'Não informado'}</dd>
    </div>
);


// --- COMPONENTE PRINCIPAL ---
const VisualizarFamilia: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [familia, setFamilia] = useState<FamiliaCompleta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('identificacao');
  const { user } = useAuth();
  const [evolucoes, setEvolucoes] = useState<Evolucao[]>([]);
  const [novaEvolucao, setNovaEvolucao] = useState('');
  const [mostrarFormEvolucao, setMostrarFormEvolucao] = useState(false);
  const [loadingEvolucao, setLoadingEvolucao] = useState(false);
  const isTecnico = user?.cargo_id === 3;

  // --- LÓGICA DE DADOS E FORMATAÇÃO ---
  useEffect(() => {
    if (id) carregarDadosFamilia();
  }, [id]);

    useEffect(() => {
    if (id && isTecnico) {
      carregarEvolucoes();
    }
  }, [id, isTecnico]);

  const carregarDadosFamilia = async () => {
    try {
      const response = await api.get(`/auth/familias/${id}`);
      setFamilia(response.data);
    } catch (error) {
      console.error('Erro ao carregar família:', error);
      setError('Erro ao carregar dados da família');
    } finally {
      setLoading(false);
    }
  };

    const carregarEvolucoes = async () => {
    try {
      const response = await api.get(`/auth/familias/${id}/evolucoes`);
      setEvolucoes(response.data);
    } catch (error) {
      console.error('Erro ao carregar evoluções:', error);
    }
  };

  const salvarEvolucao = async () => {
    if (!novaEvolucao.trim()) {
      alert('Por favor, escreva uma descrição para a evolução.');
      return;
    }

    setLoadingEvolucao(true);
    try {
      await api.post(`/auth/familias/${id}/evolucoes`, {
        descricao: novaEvolucao
      });
      
      setNovaEvolucao('');
      setMostrarFormEvolucao(false);
      await carregarEvolucoes();
      alert('Evolução registrada com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar evolução:', error);
      alert('Erro ao salvar evolução. Tente novamente.');
    } finally {
      setLoadingEvolucao(false);
    }
  };

  const formatarDataHora = (data: string, hora: string) => {
    if (!data || !hora) return 'Data/Hora inválida';
    const dataObj = new Date(data);
    const [h, m] = hora.split(':');
    dataObj.setUTCHours(parseInt(h), parseInt(m));
    return dataObj.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  };


  const formatarData = (data: string) => data ? new Date(data).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : 'Não informado';
  const garantirNumero = (valor: unknown): number => {
    if (typeof valor === 'number' && !isNaN(valor)) return valor;
    if (typeof valor === 'string') {
      const numero = parseFloat(valor.replace(',', '.'));
      return isNaN(numero) ? 0 : numero;
    }
    return 0;
  };
  const formatarMoeda = (valor: number | string | undefined | null) => {
    const numeroValido = garantirNumero(valor);
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(numeroValido);
  };
  const calcularIdade = (dataNascimento: string) => {
    if (!dataNascimento) return 'N/A';
    const hoje = new Date();
    const nascimento = new Date(dataNascimento);
    let idade = hoje.getFullYear() - nascimento.getFullYear();
    const m = hoje.getMonth() - nascimento.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < nascimento.getDate())) idade--;
    return idade;
  };
  const formatarEscolaridade = (escolaridade: string) => ({ 'nao_alfabetizado': 'Não Alfabetizado', 'fundamental_incompleto': 'Fundamental Incompleto', 'fundamental_completo': 'Fundamental Completo', 'medio_incompleto': 'Médio Incompleto', 'medio_completo': 'Médio Completo', 'superior_incompleto': 'Superior Incompleto', 'superior_completo': 'Superior Completo', 'pos_graduacao': 'Pós-graduação' }[escolaridade] || escolaridade);
  const formatarEstadoCivil = (estadoCivil: string) => ({ 'solteiro': 'Solteiro(a)', 'casado': 'Casado(a)', 'divorciado': 'Divorciado(a)', 'viuvo': 'Viúvo(a)', 'uniao_estavel': 'União Estável', 'separado': 'Separado(a)' }[estadoCivil] || estadoCivil);
  const formatarParentesco = (parentesco: string) => ({ 'responsavel': 'Responsável', 'conjuge': 'Cônjuge', 'filho': 'Filho(a)', 'pai': 'Pai', 'mae': 'Mãe', 'irmao': 'Irmão/Irmã', 'avo': 'Avô/Avó', 'neto': 'Neto(a)', 'sobrinho': 'Sobrinho(a)', 'tio': 'Tio(a)', 'primo': 'Primo(a)', 'outro': 'Outro' }[parentesco] || parentesco);

  // --- ESTADOS DE LOADING E ERRO ---
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando dados da família...</p>
        </div>
      </div>
    );
  }

  if (error || !familia) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>⚠️ Erro ao Carregar</CardTitle>
            <CardDescription>{error || 'Não foi possível encontrar os dados da família.'}</CardDescription>
          </CardHeader>
          <CardContent>
            <button onClick={() => navigate('/familias')} className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium h-10 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700">
              Voltar para a lista
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // --- ESTRUTURA DAS ABAS ---
  const tabs = [
    { id: 'identificacao', label: 'Identificação' },
    { id: 'composicao', label: 'Composição Familiar' },
    { id: 'financeiro', label: 'Trabalho e Renda' },
    { id: 'saude', label: 'Condições de Saúde' },
    { id: 'habitacao', label: 'Condição Habitacional' },
    { id: 'social', label: 'Situação Social' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-10 px-4 sm:px-6 lg:px-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          {/* HEADER */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">Prontuário Familiar</h1>
              <p className="text-gray-500 mt-1">{familia.responsavel.nome_completo} - Prontuário: {familia.prontuario}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => navigate(`/familias/${id}/editar`)} className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium h-10 px-4 py-2 border border-gray-300 bg-white hover:bg-gray-100 text-gray-800">
                ✏️ Editar
              </button>
              <button onClick={() => window.print()} className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium h-10 px-4 py-2 border border-gray-300 bg-white hover:bg-gray-100 text-gray-800">
                🖨️ Imprimir
              </button>
            </div>
          </div>

          {/* NAVEGAÇÃO DAS ABAS */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 overflow-x-auto" aria-label="Tabs">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    ${activeTab === tab.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-800 hover:border-gray-300'
                    }
                    whitespace-nowrap py-4 px-1 border-b-2 font-semibold text-sm transition-colors duration-150 focus:outline-none
                  `}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* CONTEÚDO DAS ABAS */}
          <div className="mt-6">
            {activeTab === 'identificacao' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader><CardTitle>Responsável Familiar</CardTitle></CardHeader>
                  <CardContent>
                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 text-sm">
                      <InfoItem label="Nome Completo" value={familia.responsavel.nome_completo} className="sm:col-span-2" />
                      <InfoItem label="Data de Nascimento" value={`${formatarData(familia.responsavel.data_nascimento)} (${calcularIdade(familia.responsavel.data_nascimento)} anos)`} />
                      <InfoItem label="Naturalidade" value={familia.responsavel.naturalidade} />
                      <InfoItem label="CPF" value={familia.responsavel.cpf} />
                      <InfoItem label="RG" value={`${familia.responsavel.rg || 'N/A'} (${familia.responsavel.orgao_expedidor || 'N/A'})`} />
                      <InfoItem label="Estado Civil" value={formatarEstadoCivil(familia.responsavel.estado_civil)} />
                      <InfoItem label="Escolaridade" value={formatarEscolaridade(familia.responsavel.escolaridade)} />
                      <InfoItem label="Ocupação" value={familia.responsavel.ocupacao} />
                      <InfoItem label="Renda Mensal" value={formatarMoeda(familia.responsavel.renda_mensal)} />
                      <InfoItem label="Telefone" value={familia.responsavel.telefone} />
                      <InfoItem label="Telefone Recado" value={familia.responsavel.telefone_recado} />
                      <InfoItem label="Email" value={familia.responsavel.email} />
                      <InfoItem label="NIS" value={familia.responsavel.nis} />
                      <InfoItem label="Título de Eleitor" value={familia.responsavel.titulo_eleitor} />
                      <InfoItem label="CTPS" value={familia.responsavel.ctps} />
                    </dl>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle>Endereço e Atendimento</CardTitle></CardHeader>
                  <CardContent>
                    <dl className="space-y-3 text-sm">
                      <InfoItem label="Logradouro" value={`${familia.endereco.logradouro}, ${familia.endereco.numero || 'S/N'}`} />
                      <InfoItem label="Complemento" value={familia.endereco.complemento} />
                      <InfoItem label="Bairro" value={familia.endereco.bairro} />
                      <InfoItem label="Cidade/UF" value={`${familia.endereco.cidade}/${familia.endereco.uf}`} />
                      <InfoItem label="CEP" value={familia.endereco.cep} />
                      <InfoItem label="Tempo de Moradia" value={familia.endereco.tempo_moradia} />
                      <InfoItem label="Referência" value={familia.endereco.referencia} />
                      <hr className="my-2"/>
                      <InfoItem label="Data do Atendimento" value={formatarData(familia.data_atendimento)} />
                      <InfoItem label="Profissional Responsável" value={`${familia.profissional.nome} (${familia.profissional.cargo_nome})`} />
                      <InfoItem label="Equipamento" value={`${familia.equipamento.nome} (${familia.equipamento.regiao})`} />
                    </dl>
                  </CardContent>
                </Card>
              </div>
            )}


            {activeTab === 'composicao' && (
              <Card>
                <CardHeader><CardTitle>Composição Familiar</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {familia.integrantes.length > 0 ? (
                    familia.integrantes.map((integrante, index) => (
                      <div key={index} className="bg-gray-50 p-4 rounded-lg border">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-3">
                          <div>
                            <h4 className="font-medium text-gray-900">{integrante.nome_completo}</h4>
                            <p className="text-sm text-gray-500">{calcularIdade(integrante.data_nascimento)} anos - Renda: {formatarMoeda(integrante.renda_mensal)}</p>
                          </div>
                          <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-gray-200 text-gray-800 capitalize self-start md:self-center">{formatarParentesco(integrante.tipo_membro)}</span>
                        </div>
                        <dl className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-2 text-sm">
                            <InfoItem label="CPF" value={integrante.cpf} />
                            <InfoItem label="NIS" value={integrante.nis} />
                            <InfoItem label="Escolaridade" value={formatarEscolaridade(integrante.escolaridade)} />
                            <InfoItem label="Ocupação" value={integrante.ocupacao} />
                        </dl>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-gray-500 py-4">Família composta apenas pelo responsável.</p>
                  )}
                </CardContent>
              </Card>
            )}

            {activeTab === 'financeiro' && (
              <Card>
                <CardHeader><CardTitle>Trabalho e Renda</CardTitle></CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold mb-2 text-gray-800">Fontes de Renda</h4>
                      <div className="bg-gray-50 p-4 rounded-lg border space-y-2">
                        <div className="flex justify-between"><span>Renda do Trabalho:</span> <span className="font-medium">{formatarMoeda(familia.trabalho_renda.rendimento_total)}</span></div>
                        <div className="flex justify-between"><span>Programas Sociais:</span> <span className="font-medium">{formatarMoeda(familia.programas_sociais.reduce((t, p) => t + garantirNumero(p.valor), 0))}</span></div>
                        <div className="flex justify-between border-t pt-2 mt-2"><strong><span>Renda Total:</span></strong> <strong className="font-semibold">{formatarMoeda(garantirNumero(familia.trabalho_renda.rendimento_total) + familia.programas_sociais.reduce((t, p) => t + garantirNumero(p.valor), 0))}</strong></div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2 text-gray-800">Despesas Mensais</h4>
                      <div className="bg-gray-50 p-4 rounded-lg border space-y-2">
                        {familia.despesas.length > 0 ? familia.despesas.map((d, i) => (
                          <div key={i} className="flex justify-between"><span>{d.tipo_nome}:</span> <span className="font-medium">{formatarMoeda(d.valor)}</span></div>
                        )) : <p className="text-gray-500 text-sm">Nenhuma despesa cadastrada.</p>}
                         <div className="flex justify-between border-t pt-2 mt-2"><strong><span>Total Despesas:</span></strong> <strong className="font-semibold">{formatarMoeda(familia.despesas.reduce((t, d) => t + garantirNumero(d.valor), 0))}</strong></div>
                      </div>
                    </div>
                  </div>
                  {familia.trabalho_renda.quem_trabalha && <div className="bg-gray-50 p-4 rounded-lg border"><h4 className="font-medium mb-1">Quem trabalha na casa?</h4><p className="text-sm whitespace-pre-line">{familia.trabalho_renda.quem_trabalha}</p></div>}
                  {familia.trabalho_renda.observacoes && <div className="bg-gray-50 p-4 rounded-lg border"><h4 className="font-medium mb-1">Observações sobre Renda</h4><p className="text-sm whitespace-pre-line">{familia.trabalho_renda.observacoes}</p></div>}
                  {familia.programas_sociais.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2 text-gray-800">Detalhes dos Programas Sociais</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {familia.programas_sociais.map((p, i) => (
                          <div key={i} className="bg-gray-50 p-4 rounded-lg border flex justify-between items-center">
                            <p className="font-medium">{p.programa_nome}</p>
                            <p className="text-green-600 font-semibold">{formatarMoeda(p.valor)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {activeTab === 'saude' && (
              <Card>
                <CardHeader><CardTitle>Condições de Saúde</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-gray-50 p-4 rounded-lg border"><h4 className="font-medium mb-1">Possui integrante com deficiência?</h4><p className="text-sm">{familia.saude.tem_deficiencia ? `Sim (${familia.saude.deficiencia_qual || 'Não especificado'})` : 'Não'}</p></div>
                        <div className="bg-gray-50 p-4 rounded-lg border"><h4 className="font-medium mb-1">Realiza tratamento de saúde?</h4><p className="text-sm">{familia.saude.tem_tratamento_saude ? `Sim (${familia.saude.tratamento_qual || 'Não especificado'})` : 'Não'}</p></div>
                        <div className="bg-gray-50 p-4 rounded-lg border"><h4 className="font-medium mb-1">Usa medicação contínua?</h4><p className="text-sm">{familia.saude.usa_medicacao_continua ? `Sim (${familia.saude.medicacao_qual || 'Não especificado'})` : 'Não'}</p></div>
                        <div className="bg-gray-50 p-4 rounded-lg border"><h4 className="font-medium mb-1">Tem dependente que necessita de cuidados?</h4><p className="text-sm">{familia.saude.tem_dependente_cuidados ? `Sim (${familia.saude.dependente_quem || 'Não especificado'})` : 'Não'}</p></div>
                    </div>
                    {familia.saude.observacoes && <div className="bg-gray-50 p-4 rounded-lg border"><h4 className="font-medium mb-1">Observações</h4><p className="text-sm whitespace-pre-line">{familia.saude.observacoes}</p></div>}
                </CardContent>
              </Card>
            )}

            {activeTab === 'habitacao' && (
              <Card>
                <CardHeader><CardTitle>Condição Habitacional</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="bg-gray-50 p-4 rounded-lg border"><h4 className="font-medium">Cômodos</h4><p>{familia.habitacao.qtd_comodos}</p></div>
                    <div className="bg-gray-50 p-4 rounded-lg border"><h4 className="font-medium">Dormitórios</h4><p>{familia.habitacao.qtd_dormitorios}</p></div>
                    <div className="bg-gray-50 p-4 rounded-lg border"><h4 className="font-medium">Energia</h4><p className="capitalize">{familia.habitacao.energia_eletrica.replace('_', ' ')}</p></div>
                    <div className="bg-gray-50 p-4 rounded-lg border"><h4 className="font-medium">Água</h4><p className="capitalize">{familia.habitacao.agua.replace('_', ' ')}</p></div>
                    <div className="bg-gray-50 p-4 rounded-lg border"><h4 className="font-medium">Esgoto</h4><p className="capitalize">{familia.habitacao.esgoto.replace('_', ' ')}</p></div>
                    <div className="bg-gray-50 p-4 rounded-lg border"><h4 className="font-medium">Coleta de Lixo</h4><p>{familia.habitacao.coleta_lixo ? 'Sim' : 'Não'}</p></div>
                    <div className="bg-gray-50 p-4 rounded-lg border"><h4 className="font-medium">Área de Conflito</h4><p>{familia.habitacao.area_conflito ? 'Sim' : 'Não'}</p></div>
                    <div className="bg-gray-50 p-4 rounded-lg border col-span-2 md:col-span-1"><h4 className="font-medium">Tipo de Construção</h4><p className="capitalize">{familia.habitacao.tipo_construcao.join(', ') || 'N/A'}</p></div>
                    <div className="bg-gray-50 p-4 rounded-lg border col-span-2 md:col-span-1"><h4 className="font-medium">Condição do Domicílio</h4><p className="capitalize">{familia.habitacao.condicao_domicilio.map(c => c.replace(/_/g, ' ')).join(', ') || 'N/A'}</p></div>
                </CardContent>
              </Card>
            )}

            {activeTab === 'social' && (
              <Card>
                <CardHeader><CardTitle>Situação Social</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-gray-50 p-4 rounded-lg border"><h4 className="font-medium mb-1">Participa de grupo religioso?</h4><p className="text-sm">{familia.situacao_social.participa_religiao ? `Sim (${familia.situacao_social.religiao_qual || 'Não especificado'})` : 'Não'}</p></div>
                        <div className="bg-gray-50 p-4 rounded-lg border"><h4 className="font-medium mb-1">Participa de ação social?</h4><p className="text-sm">{familia.situacao_social.participa_acao_social ? `Sim (${familia.situacao_social.acao_social_qual || 'Não especificado'})` : 'Não'}</p></div>
                    </div>
                    {familia.situacao_social.servicos_publicos.length > 0 && (
                        <div className="bg-gray-50 p-4 rounded-lg border">
                            <h4 className="font-medium mb-2">Acesso a Serviços Públicos</h4>
                            <div className="flex flex-wrap gap-2">
                                {familia.situacao_social.servicos_publicos.map((s, i) => <span key={i} className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800 capitalize">{s.replace('_', ' ')}</span>)}
                            </div>
                        </div>
                    )}
                    {familia.situacao_social.observacoes && <div className="bg-gray-50 p-4 rounded-lg border"><h4 className="font-medium mb-1">Observações</h4><p className="text-sm whitespace-pre-line">{familia.situacao_social.observacoes}</p></div>}
                </CardContent>
              </Card>
            )}
          </div>
           {/* SEÇÃO DE EVOLUÇÕES - APENAS PARA TÉCNICOS */}
          {isTecnico && (
            <div className="mt-8">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>📋 Evoluções do Prontuário</CardTitle>
                    <button
                      onClick={() => setMostrarFormEvolucao(!mostrarFormEvolucao)}
                      className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium h-10 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700"
                    >
                      {mostrarFormEvolucao ? '✖ Cancelar' : '➕ Nova Evolução'}
                    </button>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Formulário para nova evolução */}
                  {mostrarFormEvolucao && (
                    <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
                      <h4 className="font-medium mb-3">Registrar Nova Evolução</h4>
                      <textarea
                        value={novaEvolucao}
                        onChange={(e) => setNovaEvolucao(e.target.value)}
                        placeholder="Descreva o atendimento realizado, encaminhamentos, observações..."
                        className="w-full p-3 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={4}
                      />
                      <div className="mt-3 flex justify-end gap-2">
                        <button
                          onClick={() => {
                            setMostrarFormEvolucao(false);
                            setNovaEvolucao('');
                          }}
                          className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100"
                          disabled={loadingEvolucao}
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={salvarEvolucao}
                          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                          disabled={loadingEvolucao}
                        >
                          {loadingEvolucao ? 'Salvando...' : 'Salvar Evolução'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Lista de evoluções */}
                  {evolucoes.length > 0 ? (
                    <div className="space-y-4">
                      {evolucoes.map((evolucao) => (
                        <div key={evolucao.id} className="p-4 bg-gray-50 rounded-lg border">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="font-medium text-gray-900">
                                {evolucao.usuario_nome || 'Técnico'} 
                                {evolucao.usuario_cargo && ` - ${evolucao.usuario_cargo}`}
                              </p>
                              <p className="text-sm text-gray-500">
                                {formatarDataHora(evolucao.data_evolucao, evolucao.hora_evolucao)}
                              </p>
                            </div>
                            <span className="text-xs text-gray-400">ID: {evolucao.id}</span>
                          </div>
                          <div className="mt-2">
                            <p className="text-sm text-gray-700 whitespace-pre-line">
                              {evolucao.descricao}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-gray-500 py-8">
                      Nenhuma evolução registrada para esta família.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VisualizarFamilia;