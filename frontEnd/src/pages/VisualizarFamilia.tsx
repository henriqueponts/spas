import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

interface FamiliaCompleta {
  // Dados da família
  id: number;
  prontuario: string;
  data_cadastro: string;
  data_atendimento: string;
  situacao: string;
  
  // Equipamento e profissional
  equipamento: {
    nome: string;
    regiao: string;
  };
  profissional: {
    nome: string;
    cargo_nome: string;
  };
  
  // Responsável familiar
  responsavel: {
    nome_completo: string;
    data_nascimento: string;
    sexo: string;
    cpf: string;
    rg: string;
    estado_civil: string;
    escolaridade: string;
    naturalidade: string;
    telefone: string;
    telefone_recado: string;
    email: string;
    nis: string;
    titulo_eleitor: string;
    ctps: string;
    ocupacao: string;
    renda_mensal: number;
  };
  
  // Endereço
  endereco: {
    logradouro: string;
    numero: string;
    complemento: string;
    bairro: string;
    cidade: string;
    uf: string;
    cep: string;
    referencia: string;
    tempo_moradia: string;
  };
  
  // Integrantes
  integrantes: Array<{
    nome_completo: string;
    data_nascimento: string;
    sexo: string;
    cpf: string;
    tipo_membro: string;
    ocupacao: string;
    renda_mensal: number;
  }>;
  
  // Saúde
  saude: {
    tem_deficiencia: boolean;
    deficiencia_qual: string;
    tem_tratamento_saude: boolean;
    tratamento_qual: string;
    usa_medicacao_continua: boolean;
    medicacao_qual: string;
    tem_dependente_cuidados: boolean;
    dependente_quem: string;
    observacoes: string;
  };
  
  // Habitação
  habitacao: {
    qtd_comodos: number;
    qtd_dormitorios: number;
    tipo_construcao: string[];
    area_conflito: boolean;
    condicao_domicilio: string[];
    energia_eletrica: string;
    agua: string;
    esgoto: string;
    coleta_lixo: boolean;
  };
  
  // Trabalho e Renda
  trabalho_renda: {
    quem_trabalha: string;
    rendimento_total: number;
  };
  
  // Programas Sociais
  programas_sociais: Array<{
    programa_nome: string;
    programa_codigo: string;
    valor: number;
  }>;
  
  // Despesas
  despesas: Array<{
    tipo_nome: string;
    valor: number;
  }>;
  
  // Situação Social
  situacao_social: {
    participa_religiao: boolean;
    religiao_qual: string;
    participa_acao_social: boolean;
    acao_social_qual: string;
    servicos_publicos: string[];
    observacoes: string;
  };
}

const VisualizarFamilia: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [familia, setFamilia] = useState<FamiliaCompleta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) {
      carregarDadosFamilia();
    }
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

  const formatarData = (data: string) => {
    return new Date(data).toLocaleDateString('pt-BR');
  };

// Função auxiliar para garantir que o valor é um número
  const garantirNumero = (valor: any): number => {
    if (typeof valor === 'number' && !isNaN(valor)) {
      return valor;
    }
    if (typeof valor === 'string') {
      const numero = parseFloat(valor.replace(',', '.'));
      return isNaN(numero) ? 0 : numero;
    }
    return 0;
  };

  // Função formatarMoeda atualizada
  const formatarMoeda = (valor: number | string | undefined | null) => {
    const numeroValido = garantirNumero(valor);
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(numeroValido);
  };

  const calcularIdade = (dataNascimento: string) => {
    const hoje = new Date();
    const nascimento = new Date(dataNascimento);
    let idade = hoje.getFullYear() - nascimento.getFullYear();
    const m = hoje.getMonth() - nascimento.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < nascimento.getDate())) {
      idade--;
    }
    return idade;
  };

  const formatarEscolaridade = (escolaridade: string) => {
    const mapeamento: { [key: string]: string } = {
      'nao_alfabetizado': 'Não Alfabetizado',
      'fundamental_incompleto': 'Fundamental Incompleto',
      'fundamental_completo': 'Fundamental Completo',
      'medio_incompleto': 'Médio Incompleto',
      'medio_completo': 'Médio Completo',
      'superior_incompleto': 'Superior Incompleto',
      'superior_completo': 'Superior Completo',
      'pos_graduacao': 'Pós-graduação'
    };
    return mapeamento[escolaridade] || escolaridade;
  };

  const formatarEstadoCivil = (estadoCivil: string) => {
    const mapeamento: { [key: string]: string } = {
      'solteiro': 'Solteiro(a)',
      'casado': 'Casado(a)',
      'divorciado': 'Divorciado(a)',
      'viuvo': 'Viúvo(a)',
      'uniao_estavel': 'União Estável',
      'separado': 'Separado(a)'
    };
    return mapeamento[estadoCivil] || estadoCivil;
  };

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Erro ao carregar família</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/familias')}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Voltar para lista
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button 
            onClick={() => navigate('/familias')}
            className="text-blue-600 hover:text-blue-800 mb-4 flex items-center"
          >
            ← Voltar para lista de famílias
          </button>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Prontuário Familiar</h1>
              <p className="text-gray-600 mt-2">
                {familia.responsavel.nome_completo} - Prontuário: {familia.prontuario}
              </p>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => navigate(`/familias/${id}/editar`)}
                className="bg-yellow-600 text-white px-4 py-2 rounded-md hover:bg-yellow-700"
              >
                ✏️ Editar
              </button>
              <button 
                onClick={() => window.print()}
                className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
              >
                🖨️ Imprimir
              </button>
            </div>
          </div>
        </div>

        {/* Informações Básicas */}
        <div className="bg-white shadow rounded-lg mb-8">
          <div className="px-6 py-4 border-b border-gray-200 bg-blue-50">
            <h2 className="text-xl font-semibold text-gray-900">Informações Básicas</h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm font-medium text-gray-500">Situação</p>
              <p className="mt-1 text-sm text-gray-900 capitalize">{familia.situacao}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Data de Cadastro</p>
              <p className="mt-1 text-sm text-gray-900">{formatarData(familia.data_cadastro)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Data do Atendimento</p>
              <p className="mt-1 text-sm text-gray-900">{formatarData(familia.data_atendimento)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Equipamento</p>
              <p className="mt-1 text-sm text-gray-900">{familia.equipamento.nome} - {familia.equipamento.regiao}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Profissional Responsável</p>
              <p className="mt-1 text-sm text-gray-900">{familia.profissional.nome}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Cargo</p>
              <p className="mt-1 text-sm text-gray-900">{familia.profissional.cargo_nome}</p>
            </div>
          </div>
        </div>

        {/* Responsável Familiar */}
        <div className="bg-white shadow rounded-lg mb-8">
          <div className="px-6 py-4 border-b border-gray-200 bg-green-50">
            <h2 className="text-xl font-semibold text-gray-900">Responsável Familiar</h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <p className="text-sm font-medium text-gray-500">Nome Completo</p>
              <p className="mt-1 text-sm text-gray-900">{familia.responsavel.nome_completo}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Idade</p>
              <p className="mt-1 text-sm text-gray-900">
                {calcularIdade(familia.responsavel.data_nascimento)} anos
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Sexo</p>
              <p className="mt-1 text-sm text-gray-900 capitalize">{familia.responsavel.sexo}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">CPF</p>
              <p className="mt-1 text-sm text-gray-900">{familia.responsavel.cpf}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">RG</p>
              <p className="mt-1 text-sm text-gray-900">{familia.responsavel.rg || 'Não informado'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Estado Civil</p>
              <p className="mt-1 text-sm text-gray-900">{formatarEstadoCivil(familia.responsavel.estado_civil)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Escolaridade</p>
              <p className="mt-1 text-sm text-gray-900">{formatarEscolaridade(familia.responsavel.escolaridade)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Telefone</p>
              <p className="mt-1 text-sm text-gray-900">{familia.responsavel.telefone || 'Não informado'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Ocupação</p>
              <p className="mt-1 text-sm text-gray-900">{familia.responsavel.ocupacao || 'Não informado'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Renda Mensal</p>
              <p className="mt-1 text-sm text-gray-900">{formatarMoeda(familia.responsavel.renda_mensal)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">NIS</p>
              <p className="mt-1 text-sm text-gray-900">{familia.responsavel.nis || 'Não informado'}</p>
            </div>
          </div>
        </div>

        {/* Endereço */}
        <div className="bg-white shadow rounded-lg mb-8">
          <div className="px-6 py-4 border-b border-gray-200 bg-purple-50">
            <h2 className="text-xl font-semibold text-gray-900">Endereço</h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <p className="text-sm font-medium text-gray-500">Logradouro</p>
              <p className="mt-1 text-sm text-gray-900">{familia.endereco.logradouro}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Número</p>
              <p className="mt-1 text-sm text-gray-900">{familia.endereco.numero || 'S/N'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Complemento</p>
              <p className="mt-1 text-sm text-gray-900">{familia.endereco.complemento || 'Não informado'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Bairro</p>
              <p className="mt-1 text-sm text-gray-900">{familia.endereco.bairro}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Cidade</p>
              <p className="mt-1 text-sm text-gray-900">{familia.endereco.cidade}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">UF</p>
              <p className="mt-1 text-sm text-gray-900">{familia.endereco.uf}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">CEP</p>
              <p className="mt-1 text-sm text-gray-900">{familia.endereco.cep || 'Não informado'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Tempo de Moradia</p>
              <p className="mt-1 text-sm text-gray-900">{familia.endereco.tempo_moradia || 'Não informado'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Referência</p>
              <p className="mt-1 text-sm text-gray-900">{familia.endereco.referencia || 'Não informado'}</p>
            </div>
          </div>
        </div>

        {/* Integrantes da Família */}
        <div className="bg-white shadow rounded-lg mb-8">
          <div className="px-6 py-4 border-b border-gray-200 bg-orange-50">
            <h2 className="text-xl font-semibold text-gray-900">
              Nucleo Familiar
            </h2>
          </div>
          <div className="p-6">
            {familia.integrantes.length > 0 ? (
              <div className="space-y-4">
                {familia.integrantes.map((integrante, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-500">Nome</p>
                        <p className="mt-1 text-sm text-gray-900">{integrante.nome_completo}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Parentesco</p>
                        <p className="mt-1 text-sm text-gray-900 capitalize">{integrante.tipo_membro}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Idade</p>
                        <p className="mt-1 text-sm text-gray-900">
                          {calcularIdade(integrante.data_nascimento)} anos
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Renda</p>
                        <p className="mt-1 text-sm text-gray-900">{formatarMoeda(integrante.renda_mensal)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-4">
                Família composta apenas pelo responsável familiar.
              </p>
            )}
          </div>
        </div>

        {/* Condições de Saúde */}
        <div className="bg-white shadow rounded-lg mb-8">
          <div className="px-6 py-4 border-b border-gray-200 bg-red-50">
            <h2 className="text-xl font-semibold text-gray-900">Condições de Saúde</h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm font-medium text-gray-500">Tem deficiência?</p>
              <p className="mt-1 text-sm text-gray-900">
                {familia.saude.tem_deficiencia ? 'Sim' : 'Não'}
              </p>
              {familia.saude.tem_deficiencia && familia.saude.deficiencia_qual && (
                <p className="mt-1 text-sm text-gray-600">{familia.saude.deficiencia_qual}</p>
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Realiza tratamento de saúde?</p>
              <p className="mt-1 text-sm text-gray-900">
                {familia.saude.tem_tratamento_saude ? 'Sim' : 'Não'}
              </p>
              {familia.saude.tem_tratamento_saude && familia.saude.tratamento_qual && (
                <p className="mt-1 text-sm text-gray-600">{familia.saude.tratamento_qual}</p>
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Usa medicação contínua?</p>
              <p className="mt-1 text-sm text-gray-900">
                {familia.saude.usa_medicacao_continua ? 'Sim' : 'Não'}
              </p>
              {familia.saude.usa_medicacao_continua && familia.saude.medicacao_qual && (
                <p className="mt-1 text-sm text-gray-600">{familia.saude.medicacao_qual}</p>
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Tem dependente que necessita cuidados?</p>
              <p className="mt-1 text-sm text-gray-900">
                {familia.saude.tem_dependente_cuidados ? 'Sim' : 'Não'}
              </p>
              {familia.saude.tem_dependente_cuidados && familia.saude.dependente_quem && (
                <p className="mt-1 text-sm text-gray-600">{familia.saude.dependente_quem}</p>
              )}
            </div>
            {familia.saude.observacoes && (
              <div className="md:col-span-2">
                <p className="text-sm font-medium text-gray-500">Observações sobre saúde</p>
                <p className="mt-1 text-sm text-gray-900">{familia.saude.observacoes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Condições Habitacionais */}
        <div className="bg-white shadow rounded-lg mb-8">
          <div className="px-6 py-4 border-b border-gray-200 bg-yellow-50">
            <h2 className="text-xl font-semibold text-gray-900">Condições Habitacionais</h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <p className="text-sm font-medium text-gray-500">Cômodos</p>
              <p className="mt-1 text-sm text-gray-900">{familia.habitacao.qtd_comodos}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Dormitórios</p>
              <p className="mt-1 text-sm text-gray-900">{familia.habitacao.qtd_dormitorios}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Energia Elétrica</p>
              <p className="mt-1 text-sm text-gray-900 capitalize">{familia.habitacao.energia_eletrica}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Água</p>
              <p className="mt-1 text-sm text-gray-900 capitalize">{familia.habitacao.agua}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Esgoto</p>
              <p className="mt-1 text-sm text-gray-900 capitalize">{familia.habitacao.esgoto}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Coleta de Lixo</p>
              <p className="mt-1 text-sm text-gray-900">{familia.habitacao.coleta_lixo ? 'Sim' : 'Não'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Tipo de Construção</p>
              <p className="mt-1 text-sm text-gray-900">
                {familia.habitacao.tipo_construcao.length > 0 
                  ? familia.habitacao.tipo_construcao.join(', ')
                  : 'Não informado'
                }
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Condição do Domicílio</p>
              <p className="mt-1 text-sm text-gray-900">
                {familia.habitacao.condicao_domicilio.length > 0 
                  ? familia.habitacao.condicao_domicilio.join(', ')
                  : 'Não informado'
                }
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Área de Conflito</p>
              <p className="mt-1 text-sm text-gray-900">{familia.habitacao.area_conflito ? 'Sim' : 'Não'}</p>
            </div>
          </div>
        </div>

        {/* Trabalho e Renda */}
        <div className="bg-white shadow rounded-lg mb-8">
          <div className="px-6 py-4 border-b border-gray-200 bg-indigo-50">
            <h2 className="text-xl font-semibold text-gray-900">Trabalho e Renda</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <p className="text-sm font-medium text-gray-500">Rendimento Total da Família</p>
                <p className="mt-1 text-lg font-semibold text-gray-900">
                  {formatarMoeda(familia.trabalho_renda.rendimento_total)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Renda Per Capita</p>
                <p className="mt-1 text-lg font-semibold text-gray-900">
                  {formatarMoeda(familia.trabalho_renda.rendimento_total / (familia.integrantes.length + 1))}
                </p>
              </div>
            </div>
            {familia.trabalho_renda.quem_trabalha && (
              <div>
                <p className="text-sm font-medium text-gray-500">Informações sobre trabalho</p>
                <p className="mt-1 text-sm text-gray-900 whitespace-pre-line">
                  {familia.trabalho_renda.quem_trabalha}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Programas Sociais */}
        {familia.programas_sociais.length > 0 && (
          <div className="bg-white shadow rounded-lg mb-8">
            <div className="px-6 py-4 border-b border-gray-200 bg-green-50">
              <h2 className="text-xl font-semibold text-gray-900">Programas Sociais</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {familia.programas_sociais.map((programa, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium text-gray-900">{programa.programa_nome}</p>
                        <p className="text-sm text-gray-500">{programa.programa_codigo}</p>
                      </div>
                      <p className="text-lg font-semibold text-green-600">
                        {formatarMoeda(programa.valor)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <p className="font-medium text-gray-900">Total de Programas Sociais:</p>
                  <p className="text-xl font-bold text-green-600">
                    {formatarMoeda(familia.programas_sociais.reduce((total, programa) => total + programa.valor, 0))}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}


        {/* Despesas */}
        {familia.despesas.length > 0 && (
          <div className="bg-white shadow rounded-lg mb-8">
            <div className="px-6 py-4 border-b border-gray-200 bg-red-50">
              <h2 className="text-xl font-semibold text-gray-900">Despesas Mensais</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {familia.despesas.map((despesa, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <p className="font-medium text-gray-900">{despesa.tipo_nome}</p>
                      <p className="text-lg font-semibold text-red-600">
                        {formatarMoeda(despesa.valor)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <p className="font-medium text-gray-900">Total de Despesas:</p>
                  <p className="text-xl font-bold text-red-600">
                    {formatarMoeda(
                      familia.despesas.reduce((total, despesa) => {
                        return total + garantirNumero(despesa.valor);
                      }, 0)
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Situação Social */}
        <div className="bg-white shadow rounded-lg mb-8">
          <div className="px-6 py-4 border-b border-gray-200 bg-teal-50">
            <h2 className="text-xl font-semibold text-gray-900">Situação Social</h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm font-medium text-gray-500">Participa de grupo/comunidade religiosa?</p>
              <p className="mt-1 text-sm text-gray-900">
                {familia.situacao_social.participa_religiao ? 'Sim' : 'Não'}
              </p>
              {familia.situacao_social.participa_religiao && familia.situacao_social.religiao_qual && (
                <p className="mt-1 text-sm text-gray-600">{familia.situacao_social.religiao_qual}</p>
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Participa de ação social?</p>
              <p className="mt-1 text-sm text-gray-900">
                {familia.situacao_social.participa_acao_social ? 'Sim' : 'Não'}
              </p>
              {familia.situacao_social.participa_acao_social && familia.situacao_social.acao_social_qual && (
                <p className="mt-1 text-sm text-gray-600">{familia.situacao_social.acao_social_qual}</p>
              )}
            </div>
            {familia.situacao_social.servicos_publicos.length > 0 && (
              <div className="md:col-span-2">
                <p className="text-sm font-medium text-gray-500">Acesso a serviços públicos</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {familia.situacao_social.servicos_publicos.map((servico, index) => (
                    <span 
                      key={index}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                    >
                      {servico.charAt(0).toUpperCase() + servico.slice(1)}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {familia.situacao_social.observacoes && (
              <div className="md:col-span-2">
                <p className="text-sm font-medium text-gray-500">Observações sobre situação social</p>
                <p className="mt-1 text-sm text-gray-900 whitespace-pre-line">
                  {familia.situacao_social.observacoes}
                </p>
              </div>
            )}
          </div>
        </div>



        {/* Rodapé com informações do sistema */}
        <div className="bg-white shadow rounded-lg">
          <div className="p-6 text-center text-sm text-gray-500">
            <p>Documento gerado pelo Sistema SPAS - Bebedouro</p>
            <p>Data de geração: {new Date().toLocaleString('pt-BR')}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VisualizarFamilia;