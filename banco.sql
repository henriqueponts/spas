CREATE DATABASE spas_db;
USE spas_db;

-- Tabela de equipamentos (CRAS, CREAS, etc.)
CREATE TABLE equipamento (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL UNIQUE,
    regiao VARCHAR(100),
    endereco VARCHAR(255),
    telefone VARCHAR(20),
    email VARCHAR(100),
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabela de cargos
CREATE TABLE cargos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(50) NOT NULL UNIQUE,
    descricao TEXT NULL
);

-- Tabela de usuários do sistema
CREATE TABLE usuarios (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(255) NOT NULL,
    cpf VARCHAR(14) NOT NULL UNIQUE,
    senha_hash VARCHAR(255) NOT NULL,
    cargo_id INT NOT NULL,
    equipamento_id INT NOT NULL,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (cargo_id) REFERENCES cargos(id),
    FOREIGN KEY (equipamento_id) REFERENCES equipamento(id)
        ON UPDATE CASCADE
);

-- Tabela de status da família
CREATE TABLE status_familia (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(50) NOT NULL UNIQUE,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabela de tipos de atendimento
CREATE TABLE tipos_atendimento (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL UNIQUE,
    descricao TEXT,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabela principal de famílias
CREATE TABLE familias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    prontuario VARCHAR(50) NOT NULL,
    equipamento_id INT NOT NULL,
    tecnico_responsavel_id INT,
    data_cadastro DATE NOT NULL DEFAULT (CURRENT_DATE),
    data_ultimo_atendimento DATETIME,
    status_id INT NOT NULL,
    
    -- Dados do Responsável Familiar
    nome_responsavel VARCHAR(150) NOT NULL,
    cpf_responsavel VARCHAR(14) UNIQUE,
    rg_responsavel VARCHAR(20),
    data_nascimento_responsavel DATE,
    sexo_responsavel ENUM('Feminino', 'Masculino', 'Outro', 'Não Informado') DEFAULT 'Não Informado',
    estado_civil_responsavel ENUM('Solteiro(a)', 'Casado(a)', 'União Estável', 'Divorciado(a)', 'Viúvo(a)', 'Separado(a)', 'Não Informado') DEFAULT 'Não Informado',
    escolaridade_responsavel ENUM('Não Alfabetizado', 'Fundamental Incompleto', 'Fundamental Completo', 'Médio Incompleto', 'Médio Completo', 'Superior Incompleto', 'Superior Completo', 'Pós-Graduação', 'Não Informado') DEFAULT 'Não Informado',
    naturalidade_responsavel VARCHAR(100),
    nis_responsavel VARCHAR(20),
    titulo_eleitor_responsavel VARCHAR(30),
    ctps_responsavel VARCHAR(30),
    
    -- Endereço da Família
    endereco VARCHAR(200),
    bairro VARCHAR(100),
    cep VARCHAR(10),
    cidade VARCHAR(100) DEFAULT 'Bebedouro',
    uf CHAR(2) DEFAULT 'SP',
    ponto_referencia VARCHAR(150),
    tempo_moradia VARCHAR(50),
    
    -- Contato
    telefone VARCHAR(15),
    telefone_recado VARCHAR(15),
    email VARCHAR(100),
    
    -- Controle
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY uk_prontuario_equipamento (prontuario, equipamento_id),
    INDEX idx_nome_responsavel (nome_responsavel),
    INDEX idx_cpf_responsavel (cpf_responsavel),
    INDEX idx_data_cadastro (data_cadastro),
    
    FOREIGN KEY (equipamento_id) REFERENCES equipamento(id)
        ON UPDATE CASCADE,
    FOREIGN KEY (tecnico_responsavel_id) REFERENCES usuarios(id)
        ON UPDATE CASCADE,
    FOREIGN KEY (status_id) REFERENCES status_familia(id)
        ON UPDATE CASCADE
);

-- Tabela de membros da família
CREATE TABLE membros_familia (
    id INT AUTO_INCREMENT PRIMARY KEY,
    familia_id INT NOT NULL,
    nome VARCHAR(150) NOT NULL,
    data_nascimento DATE,
    sexo ENUM('Feminino', 'Masculino', 'Outro', 'Não Informado') DEFAULT 'Não Informado',
    parentesco ENUM('Cônjuge', 'Filho(a)', 'Pai', 'Mãe', 'Irmão/Irmã', 'Avô/Avó', 'Neto(a)', 'Sobrinho(a)', 'Tio(a)', 'Primo(a)', 'Outro', 'Não Informado') NOT NULL,
    escolaridade ENUM('Não Alfabetizado', 'Fundamental Incompleto', 'Fundamental Completo', 'Médio Incompleto', 'Médio Completo', 'Superior Incompleto', 'Superior Completo', 'Pós-Graduação', 'Não Informado') DEFAULT 'Não Informado',
    ocupacao VARCHAR(100),
    renda_mensal DECIMAL(10, 2),
    cpf VARCHAR(14) UNIQUE,
    rg VARCHAR(20),
    nis VARCHAR(20),
    titulo_eleitor VARCHAR(30),
    ctps VARCHAR(30),
    
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_familia_id (familia_id),
    INDEX idx_nome (nome),
    
    FOREIGN KEY (familia_id) REFERENCES familias(id)
        ON UPDATE CASCADE
);

-- Tabela de condições de saúde
CREATE TABLE condicoes_saude (
    id INT AUTO_INCREMENT PRIMARY KEY,
    familia_id INT NOT NULL UNIQUE,
    
    possui_deficiencia BOOLEAN DEFAULT FALSE,
    deficiencia_qual TEXT,
    realiza_tratamento_saude BOOLEAN DEFAULT FALSE,
    tratamento_qual TEXT,
    usa_medicacao_continua BOOLEAN DEFAULT FALSE,
    medicacao_qual TEXT,
    depende_cuidados BOOLEAN DEFAULT FALSE,
    cuidados_quem TEXT,
    observacoes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (familia_id) REFERENCES familias(id)
        ON UPDATE CASCADE
);

-- Tabela de condição habitacional
CREATE TABLE condicao_habitacional (
    id INT AUTO_INCREMENT PRIMARY KEY,
    familia_id INT NOT NULL UNIQUE,
    
    qtd_comodos INT,
    qtd_dormitorios INT,
    tipo_construcao ENUM('Alvenaria', 'Madeira', 'Mista', 'Outro'),
    tipo_construcao_outro VARCHAR(100),
    condicao_domicilio ENUM('Própria Quitada', 'Própria Financiada', 'Alugada', 'Cedida', 'Ocupada', 'Situação de Rua', 'Outro'),
    area_conflito BOOLEAN DEFAULT FALSE,
    energia_eletrica ENUM('Própria', 'Compartilhada', 'Sem Medidor', 'Não Tem'),
    agua ENUM('Própria', 'Compartilhada', 'Sem Medidor', 'Não Tem'),
    esgoto ENUM('Rede Pública', 'Fossa Séptica', 'Céu Aberto', 'Não Tem'),
    coleta_lixo BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (familia_id) REFERENCES familias(id)
        ON UPDATE CASCADE
);

-- Tabela de condições de trabalho e renda
CREATE TABLE trabalho_renda (
    id INT AUTO_INCREMENT PRIMARY KEY,
    familia_id INT NOT NULL UNIQUE,
    
    quem_trabalha TEXT,
    renda_total DECIMAL(10, 2),
    
    -- Programas sociais
    recebe_bpc BOOLEAN DEFAULT FALSE,
    recebe_bolsa_familia BOOLEAN DEFAULT FALSE,
    recebe_auxilio_brasil BOOLEAN DEFAULT FALSE,
    recebe_renda_cidadania BOOLEAN DEFAULT FALSE,
    recebe_renda_maternidade BOOLEAN DEFAULT FALSE,
    recebe_auxilio_jovem BOOLEAN DEFAULT FALSE,
    recebe_outros_programas BOOLEAN DEFAULT FALSE,
    outros_programas_quais TEXT,
    
    -- Despesas mensais
    despesa_alimentacao DECIMAL(10, 2),
    despesa_moradia DECIMAL(10, 2),
    despesa_agua DECIMAL(10, 2),
    despesa_energia DECIMAL(10, 2),
    despesa_gas DECIMAL(10, 2),
    despesa_telefone DECIMAL(10, 2),
    despesa_internet DECIMAL(10, 2),
    despesa_transporte DECIMAL(10, 2),
    despesa_medicacao DECIMAL(10, 2),
    despesa_outras DECIMAL(10, 2),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (familia_id) REFERENCES familias(id)
        ON UPDATE CASCADE
);

-- Tabela de situação social
CREATE TABLE situacao_social (
    id INT AUTO_INCREMENT PRIMARY KEY,
    familia_id INT NOT NULL UNIQUE,
    
    participa_grupo_religioso BOOLEAN DEFAULT FALSE,
    grupo_religioso_qual VARCHAR(150),
    participa_acao_social BOOLEAN DEFAULT FALSE,
    acao_social_qual VARCHAR(150),
    
    -- Acesso a serviços
    acesso_saude BOOLEAN DEFAULT FALSE,
    acesso_educacao BOOLEAN DEFAULT FALSE,
    acesso_assistencia_social BOOLEAN DEFAULT FALSE,
    acesso_cultura BOOLEAN DEFAULT FALSE,
    acesso_esporte BOOLEAN DEFAULT FALSE,
    acesso_lazer BOOLEAN DEFAULT FALSE,
    
    observacoes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (familia_id) REFERENCES familias(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- Tabela para registrar atendimentos
CREATE TABLE atendimentos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    familia_id INT NOT NULL,
    usuario_id INT NOT NULL,
    tipo_atendimento_id INT NOT NULL,
    data_atendimento DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    descricao TEXT,
    
    -- Campos específicos para diferentes tipos de atendimento
    observacoes TEXT,
    encaminhamentos TEXT,
    proxima_acao TEXT,
    data_proximo_atendimento DATE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_familia_data (familia_id, data_atendimento),
    INDEX idx_usuario_data (usuario_id, data_atendimento),
    INDEX idx_tipo_atendimento (tipo_atendimento_id),
    
    FOREIGN KEY (familia_id) REFERENCES familias(id)
        ON UPDATE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
        ON UPDATE CASCADE,
    FOREIGN KEY (tipo_atendimento_id) REFERENCES tipos_atendimento(id)
        ON UPDATE CASCADE
);

-- Tabela de documentos anexados
CREATE TABLE documentos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    familia_id INT NOT NULL,
    usuario_id INT NOT NULL,
    nome_arquivo VARCHAR(255) NOT NULL,
    tipo_documento VARCHAR(50),
    caminho_arquivo VARCHAR(500) NOT NULL,
    tamanho_arquivo INT,
    observacoes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_familia_id (familia_id),
    
    FOREIGN KEY (familia_id) REFERENCES familias(id)
        ON UPDATE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
        ON UPDATE CASCADE
);

-- Inserir dados iniciais
INSERT INTO cargos (nome, descricao) VALUES
('EXTERNO', 'Usuário externo sem acesso completo'),
('ATENDENTE', 'Profissional de atendimento'),
('TÉCNICO', 'Técnico em assistência social'),
('COORDENADOR', 'Coordenador de equipamento'),
('DIRETOR', 'Diretor de assistência social');

INSERT INTO equipamento (nome, regiao, endereco, telefone, email) VALUES 
('CRAS Oeste', 'Oeste', 'Rua das Palmeiras, 123 - Bairro Oeste', '(17) 3345-1100', 'cras.oeste@bebedouro.sp.gov.br'),
('CRAS Leste', 'Leste', 'Avenida Brasil, 456 - Bairro Leste', '(17) 3345-2200', 'cras.leste@bebedouro.sp.gov.br'),
('CRAS Norte', 'Norte', 'Rua Amazonas, 789 - Bairro Norte', '(17) 3345-3300', 'cras.norte@bebedouro.sp.gov.br'),
('CRAS Sul', 'Sul', 'Rua Rio de Janeiro, 101 - Bairro Sul', '(17) 3345-4400', 'cras.sul@bebedouro.sp.gov.br'),
('CREAS Central', 'Centro', 'Praça da Matriz, 200 - Centro', '(17) 3345-5500', 'creas@bebedouro.sp.gov.br'),
('Centro POP', 'Centro', 'Rua XV de Novembro, 321 - Centro', '(17) 3345-6600', 'centropop@bebedouro.sp.gov.br'),
('Secretaria de Assistência Social', 'Centro', 'Rua São João, 400 - Centro', '(17) 3345-7700', 'assistencia@bebedouro.sp.gov.br');

INSERT INTO status_familia (nome) VALUES
('Ativo'),
('Inativo'),
('Transferido'),
('Suspenso'),
('Em Acompanhamento');

INSERT INTO tipos_atendimento (nome, descricao) VALUES
('Cadastro Inicial', 'Primeiro atendimento para cadastro da família'),
('Atualização Cadastral', 'Atualização de dados da família'),
('Atendimento Técnico', 'Atendimento técnico especializado'),
('Visita Domiciliar', 'Visita realizada no domicílio da família'),
('Atendimento Psicossocial', 'Atendimento psicológico e social'),
('Orientação', 'Orientação sobre direitos e serviços'),
('Encaminhamento', 'Encaminhamento para outros serviços'),
('Acompanhamento', 'Acompanhamento sistemático'),
('Busca Ativa', 'Busca ativa de famílias'),
('Outros', 'Outros tipos de atendimento');

-- Inserir usuário administrador
insert into usuarios (nome,cpf,senha_hash,cargo_id,equipamento_id) values  ("Admin","123","$2b$10$0r8J5hKpMlCWFkrH1pEgz.xQW7xh6iQis6N.VznF0.fyZ5OrxYPB2",1,1);

-- Consultas úteis para verificação
-- SELECT u.nome AS nome_usuario, e.nome AS nome_equipamento, c.nome AS nome_cargo
-- FROM usuarios u
-- INNER JOIN equipamento e ON u.equipamento_id = e.id
-- INNER JOIN cargos c ON u.cargo_id = c.id;