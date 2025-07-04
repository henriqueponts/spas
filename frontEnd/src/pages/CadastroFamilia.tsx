import React, { useState, useEffect } from 'react';
import api from '../services/api';

// Tipos baseados na estrutura do banco
interface Equipamento {
  id: number;
  nome: string;
  regiao: string;
}

interface Usuario {
  id: number;
  nome: string;
}

interface ProgramaSocial {
  id: number;
  codigo: string;
  nome: string;
  valor_padrao: number;
}

interface TipoDespesa {
  id: number;
  codigo: string;
  nome: string;
  obrigatoria: boolean;
}

interface IntegranteFamiliar {
  id?: number;
  nome_completo: string;
  data_nascimento: string;
  sexo: 'feminino' | 'masculino' | 'outro';
  cpf: string;
  rg: string;
  orgao_expedidor: string; // Adicionado
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

interface DadosFamilia {
  // Identificação
  data_atendimento: string;
  profissional_id: number;
  prontuario: string;
  equipamento_id: number;
  
  // Responsável
  responsavel: IntegranteFamiliar;
  
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
  integrantes: IntegranteFamiliar[];
  
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
    observacoes: string; // Adicionado
  };
  
  // Programas Sociais
  programas_sociais: Array<{
    programa_id: number;
    valor: number;
  }>;
  
  // Despesas
  despesas: Array<{
    tipo_despesa_id: number;
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

const CadastroFamilia: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [programasSociais, setProgramasSociais] = useState<ProgramaSocial[]>([]);
  const [tiposDespesas, setTiposDespesas] = useState<TipoDespesa[]>([]);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');
  
  // Estado principal do formulário
  const [dadosFamilia, setDadosFamilia] = useState<DadosFamilia>({
    data_atendimento: new Date().toISOString().split('T')[0],
    profissional_id: 0,
    prontuario: '',
    equipamento_id: 0,
    responsavel: {
      nome_completo: '',
      data_nascimento: '',
      sexo: 'feminino',
      cpf: '',
      rg: '',
      orgao_expedidor: '',
      estado_civil: 'solteiro',
      escolaridade: 'nao_alfabetizado',
      naturalidade: '',
      telefone: '',
      telefone_recado: '',
      email: '',
      nis: '',
      titulo_eleitor: '',
      ctps: '',
      tipo_membro: 'responsavel',
      ocupacao: '',
      renda_mensal: 0
    },
    endereco: {
      logradouro: '',
      numero: '',
      complemento: '',
      bairro: '',
      cidade: 'Bebedouro',
      uf: 'SP',
      cep: '',
      referencia: '',
      tempo_moradia: ''
    },
    integrantes: [],
    saude: {
      tem_deficiencia: false,
      deficiencia_qual: '',
      tem_tratamento_saude: false,
      tratamento_qual: '',
      usa_medicacao_continua: false,
      medicacao_qual: '',
      tem_dependente_cuidados: false,
      dependente_quem: '',
      observacoes: ''
    },
    habitacao: {
      qtd_comodos: 0,
      qtd_dormitorios: 0,
      tipo_construcao: [],
      area_conflito: false,
      condicao_domicilio: [],
      energia_eletrica: 'propria',
      agua: 'propria',
      esgoto: 'rede',
      coleta_lixo: true
    },
    trabalho_renda: {
      quem_trabalha: '',
      rendimento_total: 0,
      observacoes: ''
    },
    programas_sociais: [],
    despesas: [],
    situacao_social: {
      participa_religiao: false,
      religiao_qual: '',
      participa_acao_social: false,
      acao_social_qual: '',
      servicos_publicos: [],
      observacoes: ''
    }
  });

  // Carregar dados iniciais do backend
  useEffect(() => {
    carregarDadosIniciais();
  }, []);

  const carregarDadosIniciais = async () => {
    try {
      const [equipamentosRes, usuariosRes, programasRes, despesasRes] = await Promise.all([
        api.get('/auth/equipamentos'),
        api.get('/auth/usuarios/tecnicos'),
        api.get('/auth/programas-sociais'),
        api.get('/auth/tipos-despesas')
      ]);
      
      setEquipamentos(Array.isArray(equipamentosRes.data) ? equipamentosRes.data : []);
      setUsuarios(Array.isArray(usuariosRes.data) ? usuariosRes.data : []);
      setProgramasSociais(Array.isArray(programasRes.data) ? programasRes.data : []);
      setTiposDespesas(Array.isArray(despesasRes.data) ? despesasRes.data : []);
      
      const despesasValidas = Array.isArray(despesasRes.data) ? despesasRes.data : [];
      const despesasIniciais = despesasValidas
        .filter((tipo: TipoDespesa) => tipo.obrigatoria)
        .map((tipo: TipoDespesa) => ({ tipo_despesa_id: tipo.id, valor: 0 }));
      
      setDadosFamilia(prev => ({
        ...prev,
        despesas: despesasIniciais
      }));
      
    } catch (error) {
      console.error('Erro ao carregar dados iniciais:', error);
      showMessage(`Erro ao carregar dados iniciais: ${error instanceof Error ? error.message : 'Erro desconhecido'}`, 'error');
      setEquipamentos([]);
      setUsuarios([]);
      setProgramasSociais([]);
      setTiposDespesas([]);
    }
  };

  const showMessage = (msg: string, type: 'success' | 'error') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => {
      setMessage('');
      setMessageType('');
    }, 5000);
  };

  const adicionarIntegrante = () => {
    const novoIntegrante: IntegranteFamiliar = {
      nome_completo: '',
      data_nascimento: '',
      sexo: 'feminino',
      cpf: '',
      rg: '',
      orgao_expedidor: '',
      estado_civil: 'solteiro',
      escolaridade: 'nao_alfabetizado',
      naturalidade: '',
      telefone: '',
      telefone_recado: '',
      email: '',
      nis: '',
      titulo_eleitor: '',
      ctps: '',
      tipo_membro: 'filho',
      ocupacao: '',
      renda_mensal: 0
    };
    
    setDadosFamilia(prev => ({
      ...prev,
      integrantes: [...prev.integrantes, novoIntegrante]
    }));
  };

  const removerIntegrante = (index: number) => {
    setDadosFamilia(prev => ({
      ...prev,
      integrantes: prev.integrantes.filter((_, i) => i !== index)
    }));
  };

  const atualizarIntegrante = (index: number, campo: keyof IntegranteFamiliar, valor: any) => {
    setDadosFamilia(prev => ({
      ...prev,
      integrantes: prev.integrantes.map((integrante, i) => 
        i === index ? { ...integrante, [campo]: valor } : integrante
      )
    }));
  };

  type HabitacaoFields = 'tipo_construcao' | 'condicao_domicilio';
  type SituacaoSocialFields = 'servicos_publicos';

  const handleCheckboxChange = (
    section: 'habitacao' | 'situacao_social', 
    field: HabitacaoFields | SituacaoSocialFields, 
    value: string, 
    checked: boolean
  ) => {
    setDadosFamilia(prev => {
      const currentArray = section === 'habitacao' 
        ? prev.habitacao[field as HabitacaoFields]
        : prev.situacao_social[field as SituacaoSocialFields];

      return {
        ...prev,
        [section]: {
          ...prev[section],
          [field]: checked 
            ? [...currentArray, value]
            : currentArray.filter(item => item !== value)
        }
      };
    });
  };

  const validarFormulario = (): boolean => {
    if (!dadosFamilia.responsavel.nome_completo) {
      showMessage('Nome do responsável é obrigatório', 'error');
      return false;
    }
    if (!dadosFamilia.endereco.logradouro || !dadosFamilia.endereco.bairro) {
      showMessage('Endereço completo é obrigatório', 'error');
      return false;
    }
    if (dadosFamilia.profissional_id === 0) {
      showMessage('Selecione o profissional responsável', 'error');
      return false;
    }
    return true;
  };

  const salvarFamilia = async () => {
    if (!validarFormulario()) return;
    
    setLoading(true);
    try {
      // O objeto dadosFamilia já está completo, não precisa de um 'dadosMinimos'
      console.log('📤 Enviando dados:', dadosFamilia);
      
      const response = await api.post('/auth/familias', dadosFamilia);
      
      showMessage('Família cadastrada com sucesso!', 'success');
      
      setTimeout(() => {
        window.location.href = '/familias';
      }, 2000);
      
    } catch (error: any) {
      console.error('❌ Erro completo:', error);
      console.error('📋 Response data:', error.response?.data);
      console.error('📊 Status:', error.response?.status);
      
      let errorMessage = 'Erro desconhecido';
      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      showMessage(`Erro ao salvar família: ${errorMessage}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button 
            onClick={() => window.history.back()}
            className="text-blue-600 hover:text-blue-800 mb-4 flex items-center"
          >
            ← Voltar
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Novo Cadastro de Família</h1>
          <p className="text-gray-600 mt-2">Preencha os dados da família ou indivíduo</p>
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

        {/* Seção 1: Identificação */}
        <div className="bg-white shadow rounded-lg mb-8">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
            <h2 className="text-xl font-semibold text-gray-900">1. Identificação</h2>
            <p className="text-sm text-gray-600">Dados de identificação do atendimento e do responsável familiar</p>
          </div>
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Data do Atendimento</label>
                <input type="date" value={dadosFamilia.data_atendimento} onChange={(e) => setDadosFamilia(prev => ({ ...prev, data_atendimento: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Profissional Responsável</label>
                <select value={dadosFamilia.profissional_id} onChange={(e) => setDadosFamilia(prev => ({ ...prev, profissional_id: parseInt(e.target.value) }))} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value={0}>Selecione o profissional</option>
                  {usuarios.map(usuario => (<option key={usuario.id} value={usuario.id}>{usuario.nome}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Equipamento</label>
                <select value={dadosFamilia.equipamento_id} onChange={(e) => setDadosFamilia(prev => ({ ...prev, equipamento_id: parseInt(e.target.value) }))} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value={0}>Selecione o equipamento</option>
                  {equipamentos.map(equipamento => (<option key={equipamento.id} value={equipamento.id}>{equipamento.nome} - {equipamento.regiao}</option>))}
                </select>
              </div>
            </div>

            <hr className="my-6" />

            {/* Dados do Responsável */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Dados do Responsável Familiar</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nome Completo *</label>
                  <input type="text" placeholder="Nome completo do responsável" value={dadosFamilia.responsavel.nome_completo} onChange={(e) => setDadosFamilia(prev => ({ ...prev, responsavel: { ...prev.responsavel, nome_completo: e.target.value } }))} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Data de Nascimento</label>
                  <input type="date" value={dadosFamilia.responsavel.data_nascimento} onChange={(e) => setDadosFamilia(prev => ({ ...prev, responsavel: { ...prev.responsavel, data_nascimento: e.target.value } }))} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sexo</label>
                  <select value={dadosFamilia.responsavel.sexo} onChange={(e) => setDadosFamilia(prev => ({ ...prev, responsavel: { ...prev.responsavel, sexo: e.target.value as any } }))} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="feminino">Feminino</option>
                    <option value="masculino">Masculino</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">CPF</label>
                  <input type="text" placeholder="000.000.000-00" value={dadosFamilia.responsavel.cpf} onChange={(e) => setDadosFamilia(prev => ({ ...prev, responsavel: { ...prev.responsavel, cpf: e.target.value } }))} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">RG</label>
                  <input type="text" placeholder="00.000.000-0" value={dadosFamilia.responsavel.rg} onChange={(e) => setDadosFamilia(prev => ({ ...prev, responsavel: { ...prev.responsavel, rg: e.target.value } }))} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Órgão Expedidor</label>
                  <input type="text" placeholder="SSP/SP" value={dadosFamilia.responsavel.orgao_expedidor} onChange={(e) => setDadosFamilia(prev => ({ ...prev, responsavel: { ...prev.responsavel, orgao_expedidor: e.target.value } }))} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Estado Civil</label>
                  <select value={dadosFamilia.responsavel.estado_civil} onChange={(e) => setDadosFamilia(prev => ({ ...prev, responsavel: { ...prev.responsavel, estado_civil: e.target.value } }))} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="solteiro">Solteiro(a)</option>
                    <option value="casado">Casado(a)</option>
                    <option value="divorciado">Divorciado(a)</option>
                    <option value="viuvo">Viúvo(a)</option>
                    <option value="uniao_estavel">União Estável</option>
                    <option value="separado">Separado(a)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Naturalidade</label>
                  <input type="text" placeholder="Cidade - UF" value={dadosFamilia.responsavel.naturalidade} onChange={(e) => setDadosFamilia(prev => ({ ...prev, responsavel: { ...prev.responsavel, naturalidade: e.target.value } }))} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Telefone</label>
                  <input type="text" placeholder="(00) 00000-0000" value={dadosFamilia.responsavel.telefone} onChange={(e) => setDadosFamilia(prev => ({ ...prev, responsavel: { ...prev.responsavel, telefone: e.target.value } }))} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Telefone para Recado</label>
                  <input type="text" placeholder="(00) 00000-0000" value={dadosFamilia.responsavel.telefone_recado} onChange={(e) => setDadosFamilia(prev => ({ ...prev, responsavel: { ...prev.responsavel, telefone_recado: e.target.value } }))} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input type="email" placeholder="email@exemplo.com" value={dadosFamilia.responsavel.email} onChange={(e) => setDadosFamilia(prev => ({ ...prev, responsavel: { ...prev.responsavel, email: e.target.value } }))} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">NIS</label>
                  <input type="text" placeholder="Número do NIS" value={dadosFamilia.responsavel.nis} onChange={(e) => setDadosFamilia(prev => ({ ...prev, responsavel: { ...prev.responsavel, nis: e.target.value } }))} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Título de Eleitor</label>
                  <input type="text" placeholder="Número do Título" value={dadosFamilia.responsavel.titulo_eleitor} onChange={(e) => setDadosFamilia(prev => ({ ...prev, responsavel: { ...prev.responsavel, titulo_eleitor: e.target.value } }))} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">CTPS</label>
                  <input type="text" placeholder="Número da CTPS" value={dadosFamilia.responsavel.ctps} onChange={(e) => setDadosFamilia(prev => ({ ...prev, responsavel: { ...prev.responsavel, ctps: e.target.value } }))} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Escolaridade</label>
                  <select value={dadosFamilia.responsavel.escolaridade} onChange={(e) => setDadosFamilia(prev => ({ ...prev, responsavel: { ...prev.responsavel, escolaridade: e.target.value } }))} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="nao_alfabetizado">Não Alfabetizado</option>
                    <option value="fundamental_incompleto">Fundamental Incompleto</option>
                    <option value="fundamental_completo">Fundamental Completo</option>
                    <option value="medio_incompleto">Médio Incompleto</option>
                    <option value="medio_completo">Médio Completo</option>
                    <option value="superior_incompleto">Superior Incompleto</option>
                    <option value="superior_completo">Superior Completo</option>
                    <option value="pos_graduacao">Pós-graduação</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Ocupação</label>
                  <input type="text" placeholder="Profissão/Ocupação" value={dadosFamilia.responsavel.ocupacao} onChange={(e) => setDadosFamilia(prev => ({ ...prev, responsavel: { ...prev.responsavel, ocupacao: e.target.value } }))} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Renda Mensal Individual</label>
                  <input type="number" placeholder="R$ 0,00" value={dadosFamilia.responsavel.renda_mensal} onChange={(e) => setDadosFamilia(prev => ({ ...prev, responsavel: { ...prev.responsavel, renda_mensal: parseFloat(e.target.value) || 0 } }))} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              <hr className="my-6" />

              {/* Endereço */}
              <h3 className="text-lg font-medium text-gray-900">Endereço</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Logradouro *</label>
                  <input type="text" placeholder="Rua, Avenida, etc." value={dadosFamilia.endereco.logradouro} onChange={(e) => setDadosFamilia(prev => ({ ...prev, endereco: { ...prev.endereco, logradouro: e.target.value } }))} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Número</label>
                  <input type="text" placeholder="Número" value={dadosFamilia.endereco.numero} onChange={(e) => setDadosFamilia(prev => ({ ...prev, endereco: { ...prev.endereco, numero: e.target.value } }))} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Complemento</label>
                  <input type="text" placeholder="Apto, Bloco, Casa" value={dadosFamilia.endereco.complemento} onChange={(e) => setDadosFamilia(prev => ({ ...prev, endereco: { ...prev.endereco, complemento: e.target.value } }))} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Bairro *</label>
                  <input type="text" placeholder="Bairro" value={dadosFamilia.endereco.bairro} onChange={(e) => setDadosFamilia(prev => ({ ...prev, endereco: { ...prev.endereco, bairro: e.target.value } }))} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Cidade</label>
                  <input type="text" placeholder="Cidade" value={dadosFamilia.endereco.cidade} onChange={(e) => setDadosFamilia(prev => ({ ...prev, endereco: { ...prev.endereco, cidade: e.target.value } }))} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">UF</label>
                  <input type="text" placeholder="SP" maxLength={2} value={dadosFamilia.endereco.uf} onChange={(e) => setDadosFamilia(prev => ({ ...prev, endereco: { ...prev.endereco, uf: e.target.value.toUpperCase() } }))} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">CEP</label>
                  <input type="text" placeholder="00000-000" value={dadosFamilia.endereco.cep} onChange={(e) => setDadosFamilia(prev => ({ ...prev, endereco: { ...prev.endereco, cep: e.target.value } }))} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Ponto de Referência</label>
                  <input type="text" placeholder="Próximo a..." value={dadosFamilia.endereco.referencia} onChange={(e) => setDadosFamilia(prev => ({ ...prev, endereco: { ...prev.endereco, referencia: e.target.value } }))} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tempo de Moradia</label>
                  <input type="text" placeholder="Ex: 2 anos e 3 meses" value={dadosFamilia.endereco.tempo_moradia} onChange={(e) => setDadosFamilia(prev => ({ ...prev, endereco: { ...prev.endereco, tempo_moradia: e.target.value } }))} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Seção 2: Núcleo Familiar */}
        <div className="bg-white shadow rounded-lg mb-8">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 rounded-t-lg flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">2. Núcleo Familiar</h2>
              <p className="text-sm text-gray-600">Informações sobre os integrantes da família</p>
            </div>
            <button onClick={adicionarIntegrante} className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
              + Adicionar Integrante
            </button>
          </div>
          <div className="p-6 space-y-6">
            {dadosFamilia.integrantes.map((integrante, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-4">
                  <h4 className="font-medium text-gray-900">Integrante {index + 1}</h4>
                  <button onClick={() => removerIntegrante(index)} className="text-red-600 hover:text-red-800 text-sm">✕ Remover</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nome Completo</label>
                    <input type="text" placeholder="Nome completo" value={integrante.nome_completo} onChange={(e) => atualizarIntegrante(index, 'nome_completo', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Data de Nascimento</label>
                    <input type="date" value={integrante.data_nascimento} onChange={(e) => atualizarIntegrante(index, 'data_nascimento', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Parentesco</label>
                    <select value={integrante.tipo_membro} onChange={(e) => atualizarIntegrante(index, 'tipo_membro', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="conjuge">Cônjuge</option>
                      <option value="filho">Filho(a)</option>
                      <option value="pai">Pai</option>
                      <option value="mae">Mãe</option>
                      <option value="irmao">Irmão/Irmã</option>
                      <option value="avo">Avô/Avó</option>
                      <option value="neto">Neto(a)</option>
                      <option value="outro">Outro</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Sexo</label>
                    <select value={integrante.sexo} onChange={(e) => atualizarIntegrante(index, 'sexo', e.target.value as any)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="feminino">Feminino</option>
                      <option value="masculino">Masculino</option>
                      <option value="outro">Outro</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">CPF</label>
                    <input type="text" placeholder="000.000.000-00" value={integrante.cpf} onChange={(e) => atualizarIntegrante(index, 'cpf', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">NIS</label>
                    <input type="text" placeholder="Número do NIS" value={integrante.nis} onChange={(e) => atualizarIntegrante(index, 'nis', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Escolaridade</label>
                    <select value={integrante.escolaridade} onChange={(e) => atualizarIntegrante(index, 'escolaridade', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="nao_alfabetizado">Não Alfabetizado</option>
                      <option value="fundamental_incompleto">Fundamental Incompleto</option>
                      <option value="fundamental_completo">Fundamental Completo</option>
                      <option value="medio_incompleto">Médio Incompleto</option>
                      <option value="medio_completo">Médio Completo</option>
                      <option value="superior_incompleto">Superior Incompleto</option>
                      <option value="superior_completo">Superior Completo</option>
                      <option value="pos_graduacao">Pós-graduação</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Ocupação</label>
                    <input type="text" placeholder="Profissão/Ocupação" value={integrante.ocupacao} onChange={(e) => atualizarIntegrante(index, 'ocupacao', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Renda Mensal Individual</label>
                    <input type="number" placeholder="R$ 0,00" value={integrante.renda_mensal} onChange={(e) => atualizarIntegrante(index, 'renda_mensal', parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
              </div>
            ))}
            {dadosFamilia.integrantes.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <p>Nenhum integrante adicionado além do responsável familiar.</p>
                <p className="text-sm">Clique em "Adicionar Integrante" para incluir outros membros da família.</p>
              </div>
            )}
          </div>
        </div>

        {/* Seção 3: Condições de Saúde */}
        <div className="bg-white shadow rounded-lg mb-8">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
            <h2 className="text-xl font-semibold text-gray-900">3. Condições de Saúde</h2>
            <p className="text-sm text-gray-600">Informações sobre a saúde da família</p>
          </div>
          <div className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Há integrante familiar com deficiência?</label>
              <div className="flex gap-6">
                <label className="flex items-center"><input type="radio" name="tem_deficiencia" value="true" checked={dadosFamilia.saude.tem_deficiencia === true} onChange={(e) => setDadosFamilia(prev => ({ ...prev, saude: { ...prev.saude, tem_deficiencia: e.target.value === 'true' } }))} className="mr-2" />Sim</label>
                <label className="flex items-center"><input type="radio" name="tem_deficiencia" value="false" checked={dadosFamilia.saude.tem_deficiencia === false} onChange={(e) => setDadosFamilia(prev => ({ ...prev, saude: { ...prev.saude, tem_deficiencia: e.target.value === 'true' } }))} className="mr-2" />Não</label>
              </div>
            </div>
            {dadosFamilia.saude.tem_deficiencia && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Qual deficiência?</label>
                <input type="text" placeholder="Descreva a deficiência" value={dadosFamilia.saude.deficiencia_qual} onChange={(e) => setDadosFamilia(prev => ({ ...prev, saude: { ...prev.saude, deficiencia_qual: e.target.value } }))} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            )}
            <hr />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Há integrante familiar realizando tratamento de saúde?</label>
              <div className="flex gap-6">
                <label className="flex items-center"><input type="radio" name="tem_tratamento" value="true" checked={dadosFamilia.saude.tem_tratamento_saude === true} onChange={(e) => setDadosFamilia(prev => ({ ...prev, saude: { ...prev.saude, tem_tratamento_saude: e.target.value === 'true' } }))} className="mr-2" />Sim</label>
                <label className="flex items-center"><input type="radio" name="tem_tratamento" value="false" checked={dadosFamilia.saude.tem_tratamento_saude === false} onChange={(e) => setDadosFamilia(prev => ({ ...prev, saude: { ...prev.saude, tem_tratamento_saude: e.target.value === 'true' } }))} className="mr-2" />Não</label>
              </div>
            </div>
            {dadosFamilia.saude.tem_tratamento_saude && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Qual tratamento?</label>
                <input type="text" placeholder="Descreva o tratamento" value={dadosFamilia.saude.tratamento_qual} onChange={(e) => setDadosFamilia(prev => ({ ...prev, saude: { ...prev.saude, tratamento_qual: e.target.value } }))} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            )}
            <hr />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Usa medicação contínua?</label>
              <div className="flex gap-6">
                <label className="flex items-center"><input type="radio" name="usa_medicacao" value="true" checked={dadosFamilia.saude.usa_medicacao_continua === true} onChange={(e) => setDadosFamilia(prev => ({ ...prev, saude: { ...prev.saude, usa_medicacao_continua: e.target.value === 'true' } }))} className="mr-2" />Sim</label>
                <label className="flex items-center"><input type="radio" name="usa_medicacao" value="false" checked={dadosFamilia.saude.usa_medicacao_continua === false} onChange={(e) => setDadosFamilia(prev => ({ ...prev, saude: { ...prev.saude, usa_medicacao_continua: e.target.value === 'true' } }))} className="mr-2" />Não</label>
              </div>
            </div>
            {dadosFamilia.saude.usa_medicacao_continua && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Qual medicação?</label>
                <input type="text" placeholder="Descreva a medicação" value={dadosFamilia.saude.medicacao_qual} onChange={(e) => setDadosFamilia(prev => ({ ...prev, saude: { ...prev.saude, medicacao_qual: e.target.value } }))} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            )}
            <hr />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Há dependente que necessita de cuidados especiais?</label>
              <div className="flex gap-6">
                <label className="flex items-center"><input type="radio" name="tem_dependente" value="true" checked={dadosFamilia.saude.tem_dependente_cuidados === true} onChange={(e) => setDadosFamilia(prev => ({ ...prev, saude: { ...prev.saude, tem_dependente_cuidados: e.target.value === 'true' } }))} className="mr-2" />Sim</label>
                <label className="flex items-center"><input type="radio" name="tem_dependente" value="false" checked={dadosFamilia.saude.tem_dependente_cuidados === false} onChange={(e) => setDadosFamilia(prev => ({ ...prev, saude: { ...prev.saude, tem_dependente_cuidados: e.target.value === 'true' } }))} className="mr-2" />Não</label>
              </div>
            </div>
            {dadosFamilia.saude.tem_dependente_cuidados && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Quem é o dependente?</label>
                <input type="text" placeholder="Nome do dependente e tipo de cuidado" value={dadosFamilia.saude.dependente_quem} onChange={(e) => setDadosFamilia(prev => ({ ...prev, saude: { ...prev.saude, dependente_quem: e.target.value } }))} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            )}
            <hr />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Observações sobre saúde</label>
              <textarea placeholder="Observações adicionais sobre a saúde da família" rows={3} value={dadosFamilia.saude.observacoes} onChange={(e) => setDadosFamilia(prev => ({ ...prev, saude: { ...prev.saude, observacoes: e.target.value } }))} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
        </div>

        {/* Seção 4: Condição Habitacional */}
        <div className="bg-white shadow rounded-lg mb-8">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
            <h2 className="text-xl font-semibold text-gray-900">4. Condição Habitacional</h2>
            <p className="text-sm text-gray-600">Informações sobre a moradia da família</p>
          </div>
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Quantidade de cômodos</label>
                <input type="number" value={dadosFamilia.habitacao.qtd_comodos} onChange={(e) => setDadosFamilia(prev => ({ ...prev, habitacao: { ...prev.habitacao, qtd_comodos: parseInt(e.target.value) || 0 } }))} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Quantidade de dormitórios</label>
                <input type="number" value={dadosFamilia.habitacao.qtd_dormitorios} onChange={(e) => setDadosFamilia(prev => ({ ...prev, habitacao: { ...prev.habitacao, qtd_dormitorios: parseInt(e.target.value) || 0 } }))} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Tipo de construção</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {['alvenaria', 'madeira', 'mista', 'outro'].map(tipo => (<label key={tipo} className="flex items-center"><input type="checkbox" checked={dadosFamilia.habitacao.tipo_construcao.includes(tipo)} onChange={(e) => handleCheckboxChange('habitacao', 'tipo_construcao', tipo, e.target.checked)} className="mr-2" /><span className="text-sm capitalize">{tipo}</span></label>))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Condição do domicílio</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[{ value: 'propria_quitada', label: 'Própria/Quitada' }, { value: 'propria_financiada', label: 'Própria/Financiada' }, { value: 'alugada', label: 'Alugada' }, { value: 'cedida', label: 'Cedida' }, { value: 'ocupada', label: 'Ocupada' }, { value: 'situacao_rua', label: 'Situação de Rua' }].map(condicao => (<label key={condicao.value} className="flex items-center"><input type="checkbox" checked={dadosFamilia.habitacao.condicao_domicilio.includes(condicao.value)} onChange={(e) => handleCheckboxChange('habitacao', 'condicao_domicilio', condicao.value, e.target.checked)} className="mr-2" /><span className="text-sm">{condicao.label}</span></label>))}
              </div>
            </div>
            <hr />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Moradia em área de risco/conflito?</label>
                <div className="flex gap-6">
                  <label className="flex items-center"><input type="radio" name="area_conflito" value="true" checked={dadosFamilia.habitacao.area_conflito === true} onChange={(e) => setDadosFamilia(prev => ({ ...prev, habitacao: { ...prev.habitacao, area_conflito: e.target.value === 'true' } }))} className="mr-2" />Sim</label>
                  <label className="flex items-center"><input type="radio" name="area_conflito" value="false" checked={dadosFamilia.habitacao.area_conflito === false} onChange={(e) => setDadosFamilia(prev => ({ ...prev, habitacao: { ...prev.habitacao, area_conflito: e.target.value === 'true' } }))} className="mr-2" />Não</label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Coleta de lixo?</label>
                <div className="flex gap-6">
                  <label className="flex items-center"><input type="radio" name="coleta_lixo" value="true" checked={dadosFamilia.habitacao.coleta_lixo === true} onChange={(e) => setDadosFamilia(prev => ({ ...prev, habitacao: { ...prev.habitacao, coleta_lixo: e.target.value === 'true' } }))} className="mr-2" />Sim</label>
                  <label className="flex items-center"><input type="radio" name="coleta_lixo" value="false" checked={dadosFamilia.habitacao.coleta_lixo === false} onChange={(e) => setDadosFamilia(prev => ({ ...prev, habitacao: { ...prev.habitacao, coleta_lixo: e.target.value === 'true' } }))} className="mr-2" />Não</label>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Energia elétrica</label>
              <div className="flex flex-wrap gap-6">
                {[{ value: 'propria', label: 'Própria' }, { value: 'compartilhada', label: 'Compartilhada' }, { value: 'sem_medidor', label: 'Sem medidor' }, { value: 'nao_tem', label: 'Não tem' }].map(opcao => (<label key={opcao.value} className="flex items-center"><input type="radio" name="energia_eletrica" value={opcao.value} checked={dadosFamilia.habitacao.energia_eletrica === opcao.value} onChange={(e) => setDadosFamilia(prev => ({ ...prev, habitacao: { ...prev.habitacao, energia_eletrica: e.target.value } }))} className="mr-2" />{opcao.label}</label>))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Abastecimento de água</label>
              <div className="flex flex-wrap gap-6">
                {[{ value: 'propria', label: 'Própria' }, { value: 'compartilhada', label: 'Compartilhada' }, { value: 'sem_medidor', label: 'Sem medidor' }, { value: 'nao_tem', label: 'Não tem' }].map(opcao => (<label key={opcao.value} className="flex items-center"><input type="radio" name="agua" value={opcao.value} checked={dadosFamilia.habitacao.agua === opcao.value} onChange={(e) => setDadosFamilia(prev => ({ ...prev, habitacao: { ...prev.habitacao, agua: e.target.value } }))} className="mr-2" />{opcao.label}</label>))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Esgotamento sanitário</label>
              <div className="flex flex-wrap gap-6">
                {[{ value: 'rede', label: 'Rede' }, { value: 'fossa', label: 'Fossa' }, { value: 'ceu_aberto', label: 'Céu aberto' }, { value: 'nao_tem', label: 'Não tem' }].map(opcao => (<label key={opcao.value} className="flex items-center"><input type="radio" name="esgoto" value={opcao.value} checked={dadosFamilia.habitacao.esgoto === opcao.value} onChange={(e) => setDadosFamilia(prev => ({ ...prev, habitacao: { ...prev.habitacao, esgoto: e.target.value } }))} className="mr-2" />{opcao.label}</label>))}
              </div>
            </div>
          </div>
        </div>

        {/* Seção 5: Trabalho e Renda */}
        <div className="bg-white shadow rounded-lg mb-8">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
            <h2 className="text-xl font-semibold text-gray-900">5. Condições de Trabalho / Renda Familiar</h2>
            <p className="text-sm text-gray-600">Informações sobre trabalho e renda da família</p>
          </div>
          <div className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Quem trabalha na casa?</label>
              <textarea placeholder="Nome, renda e local de trabalho de cada pessoa" rows={4} value={dadosFamilia.trabalho_renda.quem_trabalha} onChange={(e) => setDadosFamilia(prev => ({ ...prev, trabalho_renda: { ...prev.trabalho_renda, quem_trabalha: e.target.value } }))} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Rendimento familiar total</label>
              <input type="number" placeholder="R$ 0,00" value={dadosFamilia.trabalho_renda.rendimento_total} onChange={(e) => setDadosFamilia(prev => ({ ...prev, trabalho_renda: { ...prev.trabalho_renda, rendimento_total: parseFloat(e.target.value) || 0 } }))} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Observações sobre Trabalho e Renda</label>
              <textarea placeholder="Observações adicionais" rows={3} value={dadosFamilia.trabalho_renda.observacoes} onChange={(e) => setDadosFamilia(prev => ({ ...prev, trabalho_renda: { ...prev.trabalho_renda, observacoes: e.target.value } }))} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <hr />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Programas de transferência de renda recebidos</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {programasSociais.map(programa => (
                  <div key={programa.id} className="space-y-2">
                    <label className="flex items-center">
                      <input type="checkbox" checked={dadosFamilia.programas_sociais.some(p => p.programa_id === programa.id)} onChange={(e) => {
                        if (e.target.checked) { setDadosFamilia(prev => ({ ...prev, programas_sociais: [...prev.programas_sociais, { programa_id: programa.id, valor: programa.valor_padrao }] })); } else { setDadosFamilia(prev => ({ ...prev, programas_sociais: prev.programas_sociais.filter(p => p.programa_id !== programa.id) })); }
                      }} className="mr-2" />
                      <span className="text-sm">{programa.nome} ({programa.codigo})</span>
                    </label>
                    {dadosFamilia.programas_sociais.some(p => p.programa_id === programa.id) && (
                      <input type="number" placeholder="Valor recebido" value={dadosFamilia.programas_sociais.find(p => p.programa_id === programa.id)?.valor || 0} onChange={(e) => {
                        const valor = parseFloat(e.target.value) || 0;
                        setDadosFamilia(prev => ({ ...prev, programas_sociais: prev.programas_sociais.map(p => p.programa_id === programa.id ? { ...p, valor } : p) }));
                      }} className="ml-6 max-w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    )}
                  </div>
                ))}
              </div>
            </div>
            <hr />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Despesas mensais</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tiposDespesas.map(tipo => (
                  <div key={tipo.id}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{tipo.nome} {tipo.obrigatoria && <span className="text-red-500">*</span>}</label>
                    <input type="number" placeholder="R$ 0,00" value={dadosFamilia.despesas.find(d => d.tipo_despesa_id === tipo.id)?.valor || 0} onChange={(e) => {
                      const valor = parseFloat(e.target.value) || 0;
                      setDadosFamilia(prev => ({ ...prev, despesas: prev.despesas.map(d => d.tipo_despesa_id === tipo.id ? { ...d, valor } : d).concat(prev.despesas.some(d => d.tipo_despesa_id === tipo.id) ? [] : [{ tipo_despesa_id: tipo.id, valor }]) }));
                    }} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Seção 6: Situação Social */}
        <div className="bg-white shadow rounded-lg mb-8">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
            <h2 className="text-xl font-semibold text-gray-900">6. Situação Social</h2>
            <p className="text-sm text-gray-600">Informações sobre participação social da família</p>
          </div>
          <div className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Participa de grupo/comunidade religiosa?</label>
              <div className="flex gap-6">
                <label className="flex items-center"><input type="radio" name="participa_religiao" value="true" checked={dadosFamilia.situacao_social.participa_religiao === true} onChange={(e) => setDadosFamilia(prev => ({ ...prev, situacao_social: { ...prev.situacao_social, participa_religiao: e.target.value === 'true' } }))} className="mr-2" />Sim</label>
                <label className="flex items-center"><input type="radio" name="participa_religiao" value="false" checked={dadosFamilia.situacao_social.participa_religiao === false} onChange={(e) => setDadosFamilia(prev => ({ ...prev, situacao_social: { ...prev.situacao_social, participa_religiao: e.target.value === 'true' } }))} className="mr-2" />Não</label>
              </div>
            </div>
            {dadosFamilia.situacao_social.participa_religiao && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Qual comunidade religiosa?</label>
                <input type="text" placeholder="Nome da comunidade religiosa" value={dadosFamilia.situacao_social.religiao_qual} onChange={(e) => setDadosFamilia(prev => ({ ...prev, situacao_social: { ...prev.situacao_social, religiao_qual: e.target.value } }))} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            )}
            <hr />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Participa de ação social / grupo comunitário?</label>
              <div className="flex gap-6">
                <label className="flex items-center"><input type="radio" name="participa_acao_social" value="true" checked={dadosFamilia.situacao_social.participa_acao_social === true} onChange={(e) => setDadosFamilia(prev => ({ ...prev, situacao_social: { ...prev.situacao_social, participa_acao_social: e.target.value === 'true' } }))} className="mr-2" />Sim</label>
                <label className="flex items-center"><input type="radio" name="participa_acao_social" value="false" checked={dadosFamilia.situacao_social.participa_acao_social === false} onChange={(e) => setDadosFamilia(prev => ({ ...prev, situacao_social: { ...prev.situacao_social, participa_acao_social: e.target.value === 'true' } }))} className="mr-2" />Não</label>
              </div>
            </div>
            {dadosFamilia.situacao_social.participa_acao_social && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Qual ação/grupo?</label>
                <input type="text" placeholder="Nome da ação social ou grupo" value={dadosFamilia.situacao_social.acao_social_qual} onChange={(e) => setDadosFamilia(prev => ({ ...prev, situacao_social: { ...prev.situacao_social, acao_social_qual: e.target.value } }))} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            )}
            <hr />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Acesso a serviços públicos</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[{ value: 'saude', label: 'Saúde' }, { value: 'educacao', label: 'Educação' }, { value: 'assistencia_social', label: 'Assistência Social' }, { value: 'cultura', label: 'Cultura' }, { value: 'esporte', label: 'Esporte' }, { value: 'lazer', label: 'Lazer' }].map(servico => (<label key={servico.value} className="flex items-center"><input type="checkbox" checked={dadosFamilia.situacao_social.servicos_publicos.includes(servico.value)} onChange={(e) => handleCheckboxChange('situacao_social', 'servicos_publicos', servico.value, e.target.checked)} className="mr-2" /><span className="text-sm">{servico.label}</span></label>))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Observações sobre situação social</label>
              <textarea placeholder="Observações adicionais sobre a situação social" rows={4} value={dadosFamilia.situacao_social.observacoes} onChange={(e) => setDadosFamilia(prev => ({ ...prev, situacao_social: { ...prev.situacao_social, observacoes: e.target.value } }))} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="flex justify-between items-center mt-8 bg-white p-6 rounded-lg shadow">
          <button onClick={() => window.history.back()} className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500">
            Cancelar
          </button>
          <div className="space-x-4">
            <button onClick={() => { localStorage.setItem('rascunho_familia', JSON.stringify(dadosFamilia)); showMessage('Rascunho salvo com sucesso!', 'success'); }} className="px-6 py-2 border border-blue-300 text-blue-600 rounded-md hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500">
              💾 Salvar Rascunho
            </button>
            <button onClick={salvarFamilia} disabled={loading} className={`px-6 py-2 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${loading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}>
              {loading ? 'Salvando...' : 'Salvar e Finalizar →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
};

export default CadastroFamilia;