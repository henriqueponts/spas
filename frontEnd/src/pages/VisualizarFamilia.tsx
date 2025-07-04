/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

// --- INTERFACE DE DADOS ---
interface FamiliaCompleta {
  id: number;
  prontuario: string;
  data_cadastro: string;
  data_atendimento: string;
  situacao: string;
  equipamento: { nome: string; regiao: string; };
  profissional: { nome: string; cargo_nome: string; };
  responsavel: { nome_completo: string; data_nascimento: string; sexo: string; cpf: string; rg: string; estado_civil: string; escolaridade: string; naturalidade: string; telefone: string; telefone_recado: string; email: string; nis: string; titulo_eleitor: string; ctps: string; ocupacao: string; renda_mensal: number; };
  endereco: { logradouro: string; numero: string; complemento: string; bairro: string; cidade: string; uf: string; cep: string; referencia: string; tempo_moradia: string; };
  integrantes: Array<{ nome_completo: string; data_nascimento: string; sexo: string; cpf: string; tipo_membro: string; ocupacao: string; renda_mensal: number; }>;
  saude: { tem_deficiencia: boolean; deficiencia_qual: string; tem_tratamento_saude: boolean; tratamento_qual: string; usa_medicacao_continua: boolean; medicacao_qual: string; tem_dependente_cuidados: boolean; dependente_quem: string; observacoes: string; };
  habitacao: { qtd_comodos: number; qtd_dormitorios: number; tipo_construcao: string[]; area_conflito: boolean; condicao_domicilio: string[]; energia_eletrica: string; agua: string; esgoto: string; coleta_lixo: boolean; };
  trabalho_renda: { quem_trabalha: string; rendimento_total: number; };
  programas_sociais: Array<{ programa_nome: string; programa_codigo: string; valor: number; }>;
  despesas: Array<{ tipo_nome: string; valor: number; }>;
  situacao_social: { participa_religiao: boolean; religiao_qual: string; participa_acao_social: boolean; acao_social_qual: string; servicos_publicos: string[]; observacoes: string; };
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


// --- COMPONENTE PRINCIPAL ---
const VisualizarFamilia: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [familia, setFamilia] = useState<FamiliaCompleta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('identificacao');

  // --- LÓGICA DE DADOS E FORMATAÇÃO ---
  useEffect(() => {
    if (id) carregarDadosFamilia();
  }, [id]);

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

  const formatarData = (data: string) => new Date(data).toLocaleDateString('pt-BR');
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
    const hoje = new Date();
    const nascimento = new Date(dataNascimento);
    let idade = hoje.getFullYear() - nascimento.getFullYear();
    const m = hoje.getMonth() - nascimento.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < nascimento.getDate())) idade--;
    return idade;
  };
  const formatarEscolaridade = (escolaridade: string) => ({ 'nao_alfabetizado': 'Não Alfabetizado', 'fundamental_incompleto': 'Fundamental Incompleto', 'fundamental_completo': 'Fundamental Completo', 'medio_incompleto': 'Médio Incompleto', 'medio_completo': 'Médio Completo', 'superior_incompleto': 'Superior Incompleto', 'superior_completo': 'Superior Completo', 'pos_graduacao': 'Pós-graduação' }[escolaridade] || escolaridade);
  const formatarEstadoCivil = (estadoCivil: string) => ({ 'solteiro': 'Solteiro(a)', 'casado': 'Casado(a)', 'divorciado': 'Divorciado(a)', 'viuvo': 'Viúvo(a)', 'uniao_estavel': 'União Estável', 'separado': 'Separado(a)' }[estadoCivil] || estadoCivil);

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
                    <dl className="space-y-3 text-sm">
                      <div><dt className="text-gray-500">Nome Completo</dt><dd className="font-medium text-gray-800">{familia.responsavel.nome_completo}</dd></div>
                      <div><dt className="text-gray-500">Idade</dt><dd className="text-gray-800">{calcularIdade(familia.responsavel.data_nascimento)} anos</dd></div>
                      <div><dt className="text-gray-500">CPF</dt><dd className="text-gray-800">{familia.responsavel.cpf}</dd></div>
                      <div><dt className="text-gray-500">Estado Civil</dt><dd className="text-gray-800">{formatarEstadoCivil(familia.responsavel.estado_civil)}</dd></div>
                      <div><dt className="text-gray-500">Escolaridade</dt><dd className="text-gray-800">{formatarEscolaridade(familia.responsavel.escolaridade)}</dd></div>
                      <div><dt className="text-gray-500">Ocupação</dt><dd className="text-gray-800">{familia.responsavel.ocupacao || 'Não informada'}</dd></div>
                    </dl>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle>Endereço</CardTitle></CardHeader>
                  <CardContent>
                    <dl className="space-y-3 text-sm">
                      <div><dt className="text-gray-500">Logradouro</dt><dd className="font-medium text-gray-800">{familia.endereco.logradouro}, {familia.endereco.numero || 'S/N'}</dd></div>
                      <div><dt className="text-gray-500">Bairro</dt><dd className="text-gray-800">{familia.endereco.bairro}</dd></div>
                      <div><dt className="text-gray-500">Cidade/UF</dt><dd className="text-gray-800">{familia.endereco.cidade}/{familia.endereco.uf}</dd></div>
                      <div><dt className="text-gray-500">CEP</dt><dd className="text-gray-800">{familia.endereco.cep || 'Não informado'}</dd></div>
                      <div><dt className="text-gray-500">Tempo de Moradia</dt><dd className="text-gray-800">{familia.endereco.tempo_moradia || 'Não informado'}</dd></div>
                      <div><dt className="text-gray-500">Referência</dt><dd className="text-gray-800">{familia.endereco.referencia || 'N/A'}</dd></div>
                    </dl>
                  </CardContent>
                </Card>
              </div>
            )}


            <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
  
  {/* O <CardHeader> se torna um <div> com padding */}
  <div className="p-6 pb-3"> 
  
    {/* O <CardTitle> se torna um <h3> com estilos de texto e flexbox */}
    <h3 className="text-lg font-semibold flex items-center text-gray-900">
    
      {/* O ícone permanece o mesmo, mas trocamos 'text-primary' por uma cor real do Tailwind */}
      
      Evoluções
    </h3>
    
  </div>
</div>

            {activeTab === 'composicao' && (
              <Card>
                <CardHeader><CardTitle>Composição Familiar</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {familia.integrantes.length > 0 ? (
                    familia.integrantes.map((integrante, index) => (
                      <div key={index} className="bg-gray-50 p-4 rounded-lg border">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                          <div>
                            <h4 className="font-medium text-gray-900">{integrante.nome_completo}</h4>
                            <p className="text-sm text-gray-500">{calcularIdade(integrante.data_nascimento)} anos - Renda: {formatarMoeda(integrante.renda_mensal)}</p>
                          </div>
                          <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-gray-200 text-gray-800 capitalize self-start md:self-center">{integrante.tipo_membro}</span>
                        </div>
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
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2 text-gray-800">Despesas Mensais</h4>
                      <div className="bg-gray-50 p-4 rounded-lg border space-y-2">
                        {familia.despesas.length > 0 ? familia.despesas.map((d, i) => (
                          <div key={i} className="flex justify-between"><span>{d.tipo_nome}:</span> <span className="font-medium">{formatarMoeda(d.valor)}</span></div>
                        )) : <p className="text-gray-500 text-sm">Nenhuma despesa cadastrada.</p>}
                      </div>
                    </div>
                  </div>
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
                        <div className="bg-gray-50 p-4 rounded-lg border"><h4 className="font-medium mb-1">Possui integrante com deficiência?</h4><p className="text-sm">{familia.saude.tem_deficiencia ? `Sim (${familia.saude.deficiencia_qual})` : 'Não'}</p></div>
                        <div className="bg-gray-50 p-4 rounded-lg border"><h4 className="font-medium mb-1">Realiza tratamento de saúde?</h4><p className="text-sm">{familia.saude.tem_tratamento_saude ? `Sim (${familia.saude.tratamento_qual})` : 'Não'}</p></div>
                        <div className="bg-gray-50 p-4 rounded-lg border"><h4 className="font-medium mb-1">Usa medicação contínua?</h4><p className="text-sm">{familia.saude.usa_medicacao_continua ? `Sim (${familia.saude.medicacao_qual})` : 'Não'}</p></div>
                        <div className="bg-gray-50 p-4 rounded-lg border"><h4 className="font-medium mb-1">Tem dependente que necessita de cuidados?</h4><p className="text-sm">{familia.saude.tem_dependente_cuidados ? `Sim (${familia.saude.dependente_quem})` : 'Não'}</p></div>
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
                    <div className="bg-gray-50 p-4 rounded-lg border"><h4 className="font-medium">Energia</h4><p className="capitalize">{familia.habitacao.energia_eletrica}</p></div>
                    <div className="bg-gray-50 p-4 rounded-lg border"><h4 className="font-medium">Água</h4><p className="capitalize">{familia.habitacao.agua}</p></div>
                    <div className="bg-gray-50 p-4 rounded-lg border"><h4 className="font-medium">Esgoto</h4><p className="capitalize">{familia.habitacao.esgoto}</p></div>
                    <div className="bg-gray-50 p-4 rounded-lg border"><h4 className="font-medium">Coleta de Lixo</h4><p>{familia.habitacao.coleta_lixo ? 'Sim' : 'Não'}</p></div>
                    <div className="bg-gray-50 p-4 rounded-lg border"><h4 className="font-medium">Área de Conflito</h4><p>{familia.habitacao.area_conflito ? 'Sim' : 'Não'}</p></div>
                    <div className="bg-gray-50 p-4 rounded-lg border col-span-2 md:col-span-1"><h4 className="font-medium">Tipo de Construção</h4><p>{familia.habitacao.tipo_construcao.join(', ') || 'N/A'}</p></div>
                    <div className="bg-gray-50 p-4 rounded-lg border col-span-2 md:col-span-1"><h4 className="font-medium">Condição do Domicílio</h4><p>{familia.habitacao.condicao_domicilio.join(', ') || 'N/A'}</p></div>
                </CardContent>
              </Card>
            )}

            {activeTab === 'social' && (
              <Card>
                <CardHeader><CardTitle>Situação Social</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-gray-50 p-4 rounded-lg border"><h4 className="font-medium mb-1">Participa de grupo religioso?</h4><p className="text-sm">{familia.situacao_social.participa_religiao ? `Sim (${familia.situacao_social.religiao_qual})` : 'Não'}</p></div>
                        <div className="bg-gray-50 p-4 rounded-lg border"><h4 className="font-medium mb-1">Participa de ação social?</h4><p className="text-sm">{familia.situacao_social.participa_acao_social ? `Sim (${familia.situacao_social.acao_social_qual})` : 'Não'}</p></div>
                    </div>
                    {familia.situacao_social.servicos_publicos.length > 0 && (
                        <div className="bg-gray-50 p-4 rounded-lg border">
                            <h4 className="font-medium mb-2">Acesso a Serviços Públicos</h4>
                            <div className="flex flex-wrap gap-2">
                                {familia.situacao_social.servicos_publicos.map((s, i) => <span key={i} className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800 capitalize">{s}</span>)}
                            </div>
                        </div>
                    )}
                    {familia.situacao_social.observacoes && <div className="bg-gray-50 p-4 rounded-lg border"><h4 className="font-medium mb-1">Observações</h4><p className="text-sm whitespace-pre-line">{familia.situacao_social.observacoes}</p></div>}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VisualizarFamilia;