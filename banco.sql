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

-- Tabela principal para famílias
CREATE TABLE familias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    equipamento_id INT NOT NULL,
    data_cadastro DATE NOT NULL,
    prontuario VARCHAR(50),
    profissional_id INT NOT NULL,
    situacao VARCHAR(20) NOT NULL DEFAULT 'ativo',
    observacoes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (equipamento_id) REFERENCES equipamento(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    FOREIGN KEY (profissional_id) REFERENCES usuarios(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
);

-- Tabela para pessoas (responsável familiar e membros)
CREATE TABLE pessoas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    familia_id INT NOT NULL,
    nome_completo VARCHAR(255) NOT NULL,
    data_nascimento DATE NOT NULL,
    sexo ENUM('feminino', 'masculino', 'outro') NOT NULL,
    cpf VARCHAR(14) UNIQUE,
    rg VARCHAR(20),
    estado_civil VARCHAR(50),
    escolaridade VARCHAR(50),
    naturalidade VARCHAR(100),
    telefone VARCHAR(20),
    telefone_recado VARCHAR(20),
    email VARCHAR(100),
    nis VARCHAR(20),
    titulo_eleitor VARCHAR(20),
    ctps VARCHAR(20),
    tipo_membro ENUM('responsavel', 'conjuge', 'filho', 'pai', 'mae', 'irmao', 'avo', 'neto', 'sobrinho', 'tio', 'primo', 'outro') NOT NULL,
    ocupacao VARCHAR(100),
    renda_mensal DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (familia_id) REFERENCES familias(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- Tabela para endereços
CREATE TABLE enderecos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    familia_id INT NOT NULL UNIQUE,
    logradouro VARCHAR(255) NOT NULL,
    numero VARCHAR(20),
    complemento VARCHAR(100),
    bairro VARCHAR(100) NOT NULL,
    cidade VARCHAR(100) NOT NULL,
    uf CHAR(2) NOT NULL,
    cep VARCHAR(10),
    referencia VARCHAR(255),
    tempo_moradia VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (familia_id) REFERENCES familias(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- Tabela para condições de saúde
CREATE TABLE saude (
    id INT AUTO_INCREMENT PRIMARY KEY,
    familia_id INT NOT NULL UNIQUE,
    tem_deficiencia BOOLEAN DEFAULT FALSE,
    deficiencia_qual VARCHAR(255),
    tem_tratamento_saude BOOLEAN DEFAULT FALSE,
    tratamento_qual VARCHAR(255),
    usa_medicacao_continua BOOLEAN DEFAULT FALSE,
    medicacao_qual VARCHAR(255),
    tem_dependente_cuidados BOOLEAN DEFAULT FALSE,
    dependente_quem VARCHAR(255),
    observacoes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (familia_id) REFERENCES familias(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- Tabela para condições habitacionais
CREATE TABLE habitacao (
    id INT AUTO_INCREMENT PRIMARY KEY,
    familia_id INT NOT NULL UNIQUE,
    qtd_comodos INT,
    qtd_dormitorios INT,
    tipo_construcao ENUM('alvenaria', 'madeira', 'mista', 'outro'),
    area_conflito BOOLEAN DEFAULT FALSE,
    condicao_domicilio ENUM('propria_quitada', 'propria_financiada', 'alugada', 'cedida', 'ocupada', 'situacao_rua'),
    energia_eletrica ENUM('propria', 'compartilhada', 'sem_medidor', 'nao_tem'),
    agua ENUM('propria', 'compartilhada', 'sem_medidor', 'nao_tem'),
    esgoto ENUM('rede', 'fossa', 'ceu_aberto', 'nao_tem'),
    coleta_lixo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (familia_id) REFERENCES familias(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- Tabela para trabalho e renda
CREATE TABLE trabalho_renda (
    id INT AUTO_INCREMENT PRIMARY KEY,
    familia_id INT NOT NULL UNIQUE,
    quem_trabalha TEXT,
    rendimento_total DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (familia_id) REFERENCES familias(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- Tabela para programas sociais recebidos
CREATE TABLE programas_sociais (
    id INT AUTO_INCREMENT PRIMARY KEY,
    familia_id INT NOT NULL,
    programa ENUM('bpc', 'bolsa_familia', 'auxilio_brasil', 'rm', 'rc', 'aj', 'outro'),
    valor DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (familia_id) REFERENCES familias(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- Tabela para despesas mensais
CREATE TABLE despesas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    familia_id INT NOT NULL,
    tipo ENUM('alimentacao', 'moradia', 'energia', 'agua', 'gas', 'telefone', 'internet', 'transporte', 'medicacao', 'outros'),
    valor DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (familia_id) REFERENCES familias(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- Tabela para situação social
CREATE TABLE situacao_social (
    id INT AUTO_INCREMENT PRIMARY KEY,
    familia_id INT NOT NULL UNIQUE,
    participa_religiao BOOLEAN DEFAULT FALSE,
    religiao_qual VARCHAR(255),
    participa_acao_social BOOLEAN DEFAULT FALSE,
    acao_social_qual VARCHAR(255),
    observacoes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (familia_id) REFERENCES familias(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- Tabela para serviços públicos acessados
CREATE TABLE servicos_publicos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    familia_id INT NOT NULL,
    tipo ENUM('saude', 'educacao', 'assistencia_social', 'cultura', 'esporte', 'lazer'),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (familia_id) REFERENCES familias(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    UNIQUE KEY (familia_id, tipo)
);

-- Tabela para evolução do prontuário
CREATE TABLE evolucoes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    familia_id INT NOT NULL,
    usuario_id INT NOT NULL,
    data_evolucao DATE NOT NULL,
    hora_evolucao TIME NOT NULL,
    descricao TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (familia_id) REFERENCES familias(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
);

-- Tabela para benefícios concedidos
CREATE TABLE beneficios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    familia_id INT NOT NULL,
    tipo_beneficio ENUM('cesta_basica', 'auxilio_funeral', 'auxilio_natalidade', 'passagem', 'outro'),
    data_concessao DATE NOT NULL,
    justificativa TEXT,
    responsavel_id INT NOT NULL,
    status ENUM('concedido', 'entregue', 'cancelado') DEFAULT 'concedido',
    observacoes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (familia_id) REFERENCES familias(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    FOREIGN KEY (responsavel_id) REFERENCES usuarios(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
);

-- Tabela para encaminhamentos
CREATE TABLE encaminhamentos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    familia_id INT NOT NULL,
    evolucao_id INT,
    local_encaminhamento VARCHAR(255) NOT NULL,
    motivo TEXT NOT NULL,
    data_encaminhamento DATE NOT NULL,
    responsavel_id INT NOT NULL,
    status ENUM('pendente', 'realizado', 'cancelado') DEFAULT 'pendente',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (familia_id) REFERENCES familias(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    FOREIGN KEY (evolucao_id) REFERENCES evolucoes(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE,
    FOREIGN KEY (responsavel_id) REFERENCES usuarios(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
);