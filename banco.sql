CREATE DATABASE IF NOT EXISTS spas_db;
USE spas_db;

-- ============================================
-- 1. CRIAÇÃO DAS TABELAS
-- ============================================

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
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
   
    INDEX idx_equipamento_ativo (ativo),
    INDEX idx_equipamento_regiao (regiao)
);

-- Tabela de cargos
CREATE TABLE cargos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(50) NOT NULL UNIQUE,
    descricao TEXT NULL,
    nivel_acesso TINYINT NOT NULL COMMENT '1=Básico, 2=Intermediário, 3=Avançado, 4=Diretor',
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de usuários do sistema
CREATE TABLE usuarios (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(255) NOT NULL,
    cpf VARCHAR(14) NOT NULL UNIQUE,
    email VARCHAR(100) UNIQUE,
    senha_hash VARCHAR(255) NOT NULL,
    cargo_id INT NOT NULL,
    equipamento_id INT NOT NULL,
    ativo BOOLEAN DEFAULT TRUE,
    ultimo_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (cargo_id) REFERENCES cargos(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (equipamento_id) REFERENCES equipamento(id) ON DELETE RESTRICT ON UPDATE CASCADE,
       
    INDEX idx_usuarios_cpf (cpf),
    INDEX idx_usuarios_ativo (ativo),
    INDEX idx_usuarios_equipamento (equipamento_id)
);

-- Tabela de programas sociais disponíveis
CREATE TABLE programas_sociais_disponiveis (
    id INT AUTO_INCREMENT PRIMARY KEY,
    codigo VARCHAR(10) NOT NULL UNIQUE,
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,
    valor_padrao DECIMAL(10,2) DEFAULT 0.00,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
   
    INDEX idx_programas_codigo (codigo),
    INDEX idx_programas_ativo (ativo)
);

-- Tabela de tipos de despesas
CREATE TABLE tipos_despesas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    codigo VARCHAR(20) NOT NULL UNIQUE,
    nome VARCHAR(50) NOT NULL,
    descricao TEXT,
    obrigatoria BOOLEAN DEFAULT FALSE,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- Tabela principal para famílias
CREATE TABLE familias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    equipamento_id INT NOT NULL,
    data_cadastro DATE NOT NULL,
    data_atendimento DATE NOT NULL COMMENT 'Data do atendimento que gerou o cadastro',
    prontuario VARCHAR(50) UNIQUE,
    profissional_id INT NOT NULL,
    observacoes_gerais TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
   
    FOREIGN KEY (equipamento_id) REFERENCES equipamento(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (profissional_id) REFERENCES usuarios(id) ON DELETE RESTRICT ON UPDATE CASCADE,
       
    INDEX idx_familias_data_cadastro (data_cadastro),
    INDEX idx_familias_prontuario (prontuario),
    INDEX idx_familias_equipamento (equipamento_id),
    INDEX idx_familias_profissional (profissional_id)
);

-- Tabela para pessoas (responsável familiar e membros)
CREATE TABLE pessoas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    familia_id INT NOT NULL,
    nome_completo VARCHAR(255) NOT NULL,
    data_nascimento DATE NOT NULL,
    sexo ENUM('feminino', 'masculino', 'outro') NOT NULL DEFAULT 'outro',
    cpf VARCHAR(14) UNIQUE,
    rg VARCHAR(20),
    orgao_expedidor VARCHAR(20),
    estado_civil ENUM('solteiro', 'casado', 'divorciado', 'viuvo', 'uniao_estavel', 'separado') DEFAULT 'solteiro',
    escolaridade ENUM('nao_alfabetizado', 'fundamental_incompleto', 'fundamental_completo', 'medio_incompleto', 'medio_completo', 'superior_incompleto', 'superior_completo', 'pos_graduacao') DEFAULT 'nao_alfabetizado',
    naturalidade VARCHAR(100),
    telefone VARCHAR(20),
    telefone_recado VARCHAR(20),
    email VARCHAR(100),
    nis VARCHAR(20),
    titulo_eleitor VARCHAR(20),
    ctps VARCHAR(20),
    tipo_membro ENUM('responsavel', 'conjuge', 'filho', 'pai', 'mae', 'irmao', 'avo', 'neto', 'sobrinho', 'tio', 'primo', 'outro') NOT NULL,
    ocupacao VARCHAR(100),
    renda_mensal DECIMAL(10,2) DEFAULT 0.00,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
   
    FOREIGN KEY (familia_id) REFERENCES familias(id) ON DELETE CASCADE ON UPDATE CASCADE,
       
    INDEX idx_pessoas_familia (familia_id),
    INDEX idx_pessoas_cpf (cpf),
    INDEX idx_pessoas_tipo_membro (tipo_membro),
    INDEX idx_pessoas_ativo (ativo)
);

-- Tabela para endereços
CREATE TABLE enderecos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    familia_id INT NOT NULL UNIQUE,
    logradouro VARCHAR(255) NOT NULL,
    numero VARCHAR(20) DEFAULT '',
    complemento VARCHAR(100),
    bairro VARCHAR(100) NOT NULL,
    cidade VARCHAR(100) NOT NULL,
    uf CHAR(2) NOT NULL,
    cep VARCHAR(10),
    referencia VARCHAR(255),
    tempo_moradia VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
   
    FOREIGN KEY (familia_id) REFERENCES familias(id) ON DELETE CASCADE ON UPDATE CASCADE,
       
    INDEX idx_enderecos_bairro (bairro),
    INDEX idx_enderecos_cidade (cidade),
    INDEX idx_enderecos_cep (cep)
);

-- Tabela para condições de saúde
CREATE TABLE saude (
    id INT AUTO_INCREMENT PRIMARY KEY,
    familia_id INT NOT NULL UNIQUE,
    tem_deficiencia BOOLEAN DEFAULT FALSE,
    deficiencia_qual TEXT,
    tem_tratamento_saude BOOLEAN DEFAULT FALSE,
    tratamento_qual TEXT,
    usa_medicacao_continua BOOLEAN DEFAULT FALSE,
    medicacao_qual TEXT,
    tem_dependente_cuidados BOOLEAN DEFAULT FALSE,
    dependente_quem VARCHAR(255),
    observacoes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
   
    FOREIGN KEY (familia_id) REFERENCES familias(id) ON DELETE CASCADE ON UPDATE CASCADE,
       
    INDEX idx_saude_deficiencia (tem_deficiencia),
    INDEX idx_saude_tratamento (tem_tratamento_saude)
);

-- Tabela para condições habitacionais
CREATE TABLE habitacao (
    id INT AUTO_INCREMENT PRIMARY KEY,
    familia_id INT NOT NULL UNIQUE,
    qtd_comodos INT DEFAULT 0,
    qtd_dormitorios INT DEFAULT 0,
    tipo_construcao ENUM('alvenaria', 'madeira', 'mista', 'taipa', 'outro') DEFAULT 'alvenaria',
    area_conflito BOOLEAN DEFAULT FALSE,
    condicao_domicilio ENUM('propria_quitada', 'propria_financiada', 'alugada', 'cedida', 'ocupada', 'situacao_rua') DEFAULT 'propria_quitada',
    energia_eletrica ENUM('propria', 'compartilhada', 'sem_medidor', 'nao_tem') DEFAULT 'propria',
    agua ENUM('propria', 'compartilhada', 'rede_publica', 'poco', 'carro pipa', 'sem_medidor', 'nao_tem') DEFAULT 'propria',
    esgoto ENUM('rede', 'fossa_septica', 'fossa_comum', 'ceu_aberto', 'nao_tem') DEFAULT 'rede',
    coleta_lixo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (familia_id) REFERENCES familias(id) ON DELETE CASCADE ON UPDATE CASCADE,
       
    INDEX idx_habitacao_area_conflito (area_conflito)
);

-- Tabela para trabalho e renda
CREATE TABLE trabalho_renda (
    id INT AUTO_INCREMENT PRIMARY KEY,
    familia_id INT NOT NULL UNIQUE,
    quem_trabalha TEXT COMMENT 'Descrição detalhada de quem trabalha',
    rendimento_total DECIMAL(10,2) DEFAULT 0.00,
    observacoes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
   
    FOREIGN KEY (familia_id) REFERENCES familias(id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Tabela para programas sociais recebidos
CREATE TABLE familia_programas_sociais (
    id INT AUTO_INCREMENT PRIMARY KEY,
    familia_id INT NOT NULL,
    programa_id INT NOT NULL,
    valor DECIMAL(10,2) DEFAULT 0.00,
    data_inicio DATE,
    data_fim DATE,
    ativo BOOLEAN DEFAULT TRUE,
    observacoes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
   
    FOREIGN KEY (familia_id) REFERENCES familias(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (programa_id) REFERENCES programas_sociais_disponiveis(id) ON DELETE RESTRICT ON UPDATE CASCADE,
       
    UNIQUE KEY unique_familia_programa (familia_id, programa_id),
    INDEX idx_familia_programas_ativo (ativo),
    INDEX idx_familia_programas_data (data_inicio, data_fim)
);

-- Tabela para despesas mensais
CREATE TABLE familia_despesas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    familia_id INT NOT NULL,
    tipo_despesa_id INT NOT NULL,
    valor DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    observacoes VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
   
    FOREIGN KEY (familia_id) REFERENCES familias(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (tipo_despesa_id) REFERENCES tipos_despesas(id) ON DELETE RESTRICT ON UPDATE CASCADE,
       
    UNIQUE KEY unique_familia_despesa (familia_id, tipo_despesa_id),
    INDEX idx_familia_despesas_valor (valor)
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
   
    FOREIGN KEY (familia_id) REFERENCES familias(id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Tabela para serviços públicos acessados
CREATE TABLE familia_servicos_publicos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    familia_id INT NOT NULL,
    tipo ENUM('CRAS', 'CREAS', 'saude', 'educacao', 'esporte', 'habitacao', 'assistencia social'),
    observacoes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
   
    FOREIGN KEY (familia_id) REFERENCES familias(id) ON DELETE CASCADE ON UPDATE CASCADE,
    UNIQUE KEY unique_familia_servico (familia_id, tipo),
    INDEX idx_familia_servicos_tipo (tipo)
);

-- Tabela para evolução do prontuário
CREATE TABLE IF NOT EXISTS evolucoes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    familia_id INT NOT NULL,
    usuario_id INT NOT NULL,
    data_evolucao DATE NOT NULL,
    hora_evolucao TIME NOT NULL,
    descricao TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
   
    FOREIGN KEY (familia_id) REFERENCES familias(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Tabela de autorizações de benefícios
CREATE TABLE IF NOT EXISTS autorizacoes_beneficios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    familia_id INT NOT NULL,
    tipo_beneficio ENUM('cesta_basica', 'auxilio_funeral', 'auxilio_natalidade', 'passagem', 'outro') NOT NULL,
    quantidade INT NOT NULL DEFAULT 1,
    quantidade_utilizada INT NOT NULL DEFAULT 0,
    validade_meses INT NOT NULL,
    data_autorizacao DATE NOT NULL,
    data_validade DATE NOT NULL,
    autorizador_id INT NOT NULL,
    evolucao_id INT NULL,
    justificativa TEXT NOT NULL,
    observacoes TEXT,
    status ENUM('ativa', 'utilizada', 'expirada', 'cancelada') NOT NULL DEFAULT 'ativa',
    motivo_cancelamento TEXT NULL,
    observacoes_cancelamento TEXT NULL,
    cancelado_por INT NULL,
    data_cancelamento DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (familia_id) REFERENCES familias(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (autorizador_id) REFERENCES usuarios(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (evolucao_id) REFERENCES evolucoes(id) ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY (cancelado_por) REFERENCES usuarios(id),
        
    INDEX idx_autorizacoes_familia (familia_id),
    INDEX idx_autorizacoes_status (status),
    INDEX idx_autorizacoes_tipo (tipo_beneficio),
    INDEX idx_autorizacoes_validade (data_validade),
    INDEX idx_autorizacoes_autorizador (autorizador_id),
    INDEX idx_autorizacoes_cancelado_por (cancelado_por)
);

-- Tabela para registrar histórico de edições de benefícios
CREATE TABLE IF NOT EXISTS edicoes_beneficios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    autorizacao_id INT NOT NULL,
    familia_id INT NOT NULL,
    editado_por INT NOT NULL,
    
    tipo_beneficio_anterior ENUM('cesta_basica', 'auxilio_funeral', 'auxilio_natalidade', 'passagem', 'outro') NOT NULL,
    quantidade_anterior INT NOT NULL,
    validade_meses_anterior INT NOT NULL,
    data_validade_anterior DATE NOT NULL,
    justificativa_anterior TEXT NOT NULL,
    observacoes_anterior TEXT,
    
    tipo_beneficio_novo ENUM('cesta_basica', 'auxilio_funeral', 'auxilio_natalidade', 'passagem', 'outro') NOT NULL,
    quantidade_nova INT NOT NULL,
    validade_meses_nova INT NOT NULL,
    data_validade_nova DATE NOT NULL,
    justificativa_nova TEXT NOT NULL,
    observacoes_nova TEXT,
    
    motivo_edicao TEXT NOT NULL,
    data_edicao DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (autorizacao_id) REFERENCES autorizacoes_beneficios(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (familia_id) REFERENCES familias(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (editado_por) REFERENCES usuarios(id) ON DELETE RESTRICT ON UPDATE CASCADE,
        
    INDEX idx_edicoes_autorizacao (autorizacao_id),
    INDEX idx_edicoes_familia (familia_id),
    INDEX idx_edicoes_data (data_edicao),
    INDEX idx_edicoes_editado_por (editado_por)
);

-- Tabela para benefícios concedidos
CREATE TABLE beneficios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    familia_id INT NOT NULL,
    tipo_beneficio ENUM('cesta_basica', 'auxilio_funeral', 'auxilio_natalidade', 'passagem', 'outro'),
    descricao_beneficio VARCHAR(255),
    valor DECIMAL(10,2) DEFAULT 0.00,
    justificativa TEXT,
    responsavel_id INT NOT NULL,
    autorizacao_id INT NULL,
    status ENUM('entregue', 'cancelado') DEFAULT 'entregue',
    data_entrega DATE NULL,
    observacoes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
   
    FOREIGN KEY (familia_id) REFERENCES familias(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (responsavel_id) REFERENCES usuarios(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (autorizacao_id) REFERENCES autorizacoes_beneficios(id) ON DELETE SET NULL ON UPDATE CASCADE,

    INDEX idx_beneficios_autorizacao (autorizacao_id),
    INDEX idx_beneficios_status (status),
    INDEX idx_beneficios_tipo (tipo_beneficio)
);

-- Tabela para locais encaminhamentos
CREATE TABLE local_encaminhamento (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR (255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabela para encaminhamentos
CREATE TABLE encaminhamentos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    familia_id INT NOT NULL,
    evolucao_id INT,
    local_encaminhamento_id INT NOT NULL,
    data_encaminhamento DATE NOT NULL,
    responsavel_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
   
    FOREIGN KEY (familia_id) REFERENCES familias(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (evolucao_id) REFERENCES evolucoes(id) ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY (responsavel_id) REFERENCES usuarios(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (local_encaminhamento_id) REFERENCES local_encaminhamento(id) ON DELETE RESTRICT ON UPDATE CASCADE,
       
    INDEX idx_encaminhamentos_data (data_encaminhamento),
    INDEX idx_encaminhamentos_familia (familia_id)
);

-- ============================================
-- 2. VIEWS, TRIGGERS E ÍNDICES (sem alterações)
-- ============================================

-- View para busca de famílias com informações básicas
CREATE VIEW view_familias_resumo AS
SELECT
    f.id,
    f.prontuario,
    f.data_cadastro,
    f.data_atendimento,
    e.nome as equipamento_nome,
    e.regiao,
    u.nome as profissional_nome,
    p.nome_completo as responsavel_nome,
    p.cpf as responsavel_cpf,
    p.telefone as responsavel_telefone,
    end.bairro,
    end.cidade,
    tr.rendimento_total
FROM familias f
INNER JOIN equipamento e ON f.equipamento_id = e.id
INNER JOIN usuarios u ON f.profissional_id = u.id
LEFT JOIN pessoas p ON f.id = p.familia_id AND p.tipo_membro = 'responsavel'
LEFT JOIN enderecos end ON f.id = end.familia_id
LEFT JOIN trabalho_renda tr ON f.id = tr.familia_id
ORDER BY f.data_cadastro DESC;

-- View para relatórios de atendimentos
CREATE VIEW view_atendimentos_mes AS
SELECT
    DATE_FORMAT(f.data_cadastro, '%Y-%m') as mes_ano,
    e.nome as equipamento,
    COUNT(*) as total_atendimentos,
    AVG(tr.rendimento_total) as renda_media
FROM familias f
INNER JOIN equipamento e ON f.equipamento_id = e.id
LEFT JOIN trabalho_renda tr ON f.id = tr.familia_id
WHERE f.data_cadastro >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
GROUP BY DATE_FORMAT(f.data_cadastro, '%Y-%m'), e.id, e.nome
ORDER BY mes_ano DESC, e.nome;

-- --------------------------------------------
-- TRIGGERS
-- --------------------------------------------

DELIMITER //

-- Trigger para gerar prontuário automaticamente
CREATE TRIGGER trg_familia_prontuario
BEFORE INSERT ON familias
FOR EACH ROW
BEGIN
    IF NEW.prontuario IS NULL OR NEW.prontuario = '' THEN
        SET NEW.prontuario = CONCAT(
            YEAR(NEW.data_cadastro),
            LPAD(NEW.equipamento_id, 2, '0'),
            LPAD((SELECT COALESCE(MAX(SUBSTRING(prontuario, -6)), 0) + 1
                  FROM familias
                  WHERE equipamento_id = NEW.equipamento_id
                  AND YEAR(data_cadastro) = YEAR(NEW.data_cadastro)), 6, '0')
        );
    END IF;
END//

-- Trigger para validar responsável familiar
CREATE TRIGGER trg_validar_responsavel
AFTER INSERT ON pessoas
FOR EACH ROW
BEGIN
    DECLARE responsavel_count INT;
   
    IF NEW.tipo_membro = 'responsavel' THEN
        SELECT COUNT(*) INTO responsavel_count
        FROM pessoas
        WHERE familia_id = NEW.familia_id
        AND tipo_membro = 'responsavel'
        AND id != NEW.id;
       
        IF responsavel_count > 0 THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Uma família pode ter apenas um responsável';
        END IF;
    END IF;
END//

-- Triggers para aplicar TRIM na tabela USUARIOS
CREATE TRIGGER trg_trim_usuarios_before_insert
BEFORE INSERT ON usuarios
FOR EACH ROW
BEGIN
    SET NEW.nome = TRIM(NEW.nome);
    SET NEW.cpf = TRIM(NEW.cpf);
    SET NEW.email = TRIM(NEW.email);
END//

CREATE TRIGGER trg_trim_usuarios_before_update
BEFORE UPDATE ON usuarios
FOR EACH ROW
BEGIN
    SET NEW.nome = TRIM(NEW.nome);
    SET NEW.cpf = TRIM(NEW.cpf);
    SET NEW.email = TRIM(NEW.email);
END//

-- Triggers para aplicar TRIM na tabela PESSOAS
CREATE TRIGGER trg_trim_pessoas_before_insert
BEFORE INSERT ON pessoas
FOR EACH ROW
BEGIN
    SET NEW.nome_completo = TRIM(NEW.nome_completo);
    SET NEW.cpf = TRIM(NEW.cpf);
    SET NEW.rg = TRIM(NEW.rg);
    SET NEW.orgao_expedidor = TRIM(NEW.orgao_expedidor);
    SET NEW.naturalidade = TRIM(NEW.naturalidade);
    SET NEW.telefone = TRIM(NEW.telefone);
    SET NEW.email = TRIM(NEW.email);
    SET NEW.ocupacao = TRIM(NEW.ocupacao);
END//

CREATE TRIGGER trg_trim_pessoas_before_update
BEFORE UPDATE ON pessoas
FOR EACH ROW
BEGIN
    SET NEW.nome_completo = TRIM(NEW.nome_completo);
    SET NEW.cpf = TRIM(NEW.cpf);
    SET NEW.rg = TRIM(NEW.rg);
    SET NEW.orgao_expedidor = TRIM(NEW.orgao_expedidor);
    SET NEW.naturalidade = TRIM(NEW.naturalidade);
    SET NEW.telefone = TRIM(NEW.telefone);
    SET NEW.email = TRIM(NEW.email);
    SET NEW.ocupacao = TRIM(NEW.ocupacao);
END//

-- Triggers para aplicar TRIM na tabela ENDERECOS
CREATE TRIGGER trg_trim_enderecos_before_insert
BEFORE INSERT ON enderecos
FOR EACH ROW
BEGIN
    SET NEW.logradouro = TRIM(NEW.logradouro);
    SET NEW.bairro = TRIM(NEW.bairro);
    SET NEW.cidade = TRIM(NEW.cidade);
    SET NEW.cep = TRIM(NEW.cep);
END//

CREATE TRIGGER trg_trim_enderecos_before_update
BEFORE UPDATE ON enderecos
FOR EACH ROW
BEGIN
    SET NEW.logradouro = TRIM(NEW.logradouro);
    SET NEW.bairro = TRIM(NEW.bairro);
    SET NEW.cidade = TRIM(NEW.cidade);
    SET NEW.cep = TRIM(NEW.cep);
END//

DELIMITER ;

-- --------------------------------------------
-- ÍNDICES ADICIONAIS
-- --------------------------------------------

CREATE INDEX idx_familias_equipamento_data ON familias(equipamento_id, data_cadastro);
CREATE INDEX idx_pessoas_familia_tipo ON pessoas(familia_id, tipo_membro);
CREATE INDEX idx_evolucoes_familia_data ON evolucoes(familia_id, data_evolucao);

-- ============================================
-- 3. INSERÇÃO DE DADOS INICIAIS
-- ============================================

-- Inserir cargos
INSERT INTO cargos (nome, descricao, nivel_acesso, ativo) VALUES
('DIRETOR', 'Diretor de departamento', 4, TRUE),
('COORDENADOR', 'Coordenador de equipamento', 3, TRUE),
('TECNICO', 'Técnico especializado', 2, TRUE),
('ASSISTENTE', 'Assistente social', 2, TRUE),
('EXTERNO', 'Usuário externo com acesso limitado', 1, TRUE);

-- Inserir equipamentos
INSERT INTO equipamento (nome, regiao, endereco, telefone, email, ativo) VALUES
('CRAS Oeste', 'Oeste', 'Rua das Palmeiras, 123 - Bairro Oeste', '(17) 3345-1100', 'cras.oeste@bebedouro.sp.gov.br', TRUE),
('CRAS Leste', 'Leste', 'Avenida Brasil, 456 - Bairro Leste', '(17) 3345-2200', 'cras.leste@bebedouro.sp.gov.br', TRUE),
('CRAS Norte', 'Norte', 'Rua Amazonas, 789 - Bairro Norte', '(17) 3345-3300', 'cras.norte@bebedouro.sp.gov.br', TRUE),
('CRAS Sul', 'Sul', 'Rua Rio de Janeiro, 101 - Bairro Sul', '(17) 3345-4400', 'cras.sul@bebedouro.sp.gov.br', TRUE),
('CREAS Central', 'Centro', 'Praça da Matriz, 200 - Centro', '(17) 3345-5500', 'creas@bebedouro.sp.gov.br', TRUE),
('Centro POP', 'Centro', 'Rua XV de Novembro, 321 - Centro', '(17) 3345-6600', 'centropop@bebedouro.sp.gov.br', TRUE),
('Secretaria de Assistência Social', 'Centro', 'Rua São João, 400 - Centro', '(17) 3345-7700', 'assistencia@bebedouro.sp.gov.br', TRUE);

-- Inserir programas sociais disponíveis
INSERT INTO programas_sociais_disponiveis (codigo, nome, descricao, valor_padrao, ativo) VALUES
('BPC', 'Benefício de Prestação Continuada', 'Benefício mensal para idosos e pessoas com deficiência', 1412.00, TRUE),
('BF', 'Bolsa Família', 'Programa de transferência de renda', 600.00, TRUE),
('AB', 'Auxílio Brasil', 'Programa de transferência de renda', 600.00, TRUE),
('RM', 'Renda Mínima', 'Programa municipal de renda mínima', 300.00, TRUE),
('RC', 'Renda Cidadã', 'Programa estadual de renda', 250.00, TRUE),
('AJ', 'Auxílio Jovem', 'Programa para jovens', 200.00, TRUE),
('OUTRO', 'Outros Programas', 'Outros programas não listados', NULL, TRUE);

-- Inserir tipos de despesas
INSERT INTO tipos_despesas (codigo, nome, descricao, obrigatoria, ativo) VALUES
('ALIMENTACAO', 'Alimentação', 'Gastos com alimentação da família', TRUE, TRUE),
('MORADIA', 'Moradia', 'Aluguel, financiamento ou taxas de moradia', TRUE, TRUE),
('ENERGIA', 'Energia Elétrica', 'Conta de energia elétrica', TRUE, TRUE),
('AGUA', 'Água', 'Conta de água e esgoto', TRUE, TRUE),
('GAS', 'Gás', 'Gás de cozinha', TRUE, TRUE),
('TELEFONE', 'Telefone', 'Telefone fixo e celular', FALSE, TRUE),
('INTERNET', 'Internet', 'Acesso à internet', FALSE, TRUE),
('TRANSPORTE', 'Transporte', 'Passagens e combustível', TRUE, TRUE),
('MEDICACAO', 'Medicação', 'Medicamentos e tratamentos', FALSE, TRUE),
('OUTROS', 'Outros', 'Outras despesas não categorizadas', FALSE, TRUE);

-- Inserir usuários
INSERT INTO usuarios (nome,cpf,senha_hash,cargo_id,equipamento_id, ativo) VALUES
("Diretor","123","$2b$10$0r8J5hKpMlCWFkrH1pEgz.xQW7xh6iQis6N.VznF0.fyZ5OrxYPB2",1,1, TRUE),
("Externo","456","$2b$10$0r8J5hKpMlCWFkrH1pEgz.xQW7xh6iQis6N.VznF0.fyZ5OrxYPB2",5,1, TRUE),
("Assistente","789","$2b$10$0r8J5hKpMlCWFkrH1pEgz.xQW7xh6iQis6N.VznF0.fyZ5OrxYPB2",4,1, TRUE),
("Tecnico","321","$2b$10$0r8J5hKpMlCWFkrH1pEgz.xQW7xh6iQis6N.VznF0.fyZ5OrxYPB2",3,1, TRUE),
("Coordenador","654","$2b$10$0r8J5hKpMlCWFkrH1pEgz.xQW7xh6iQis6N.VznF0.fyZ5OrxYPB2",2,1, TRUE);

-- Inserir dados de famílias e pessoas
-- FAMÍLIA 1
INSERT INTO familias (equipamento_id, data_cadastro, data_atendimento, profissional_id)
VALUES (4, '2025-07-01', '2025-07-04', 1);
SET @last_familia_id = LAST_INSERT_ID();
INSERT INTO pessoas (familia_id, nome_completo, data_nascimento, sexo, cpf, telefone, estado_civil, escolaridade, tipo_membro, ocupacao, renda_mensal, ativo)
VALUES (@last_familia_id, 'Responsável 1 da Silva', '2012-05-29', 'feminino', '000.000.001-00', '(17) 99123-4510', 'solteiro', 'medio_completo', 'responsavel', 'Autônomo', 1485.10, TRUE);
INSERT INTO enderecos (familia_id, logradouro, numero, bairro, cidade, uf)
VALUES (@last_familia_id, 'Rua Fictícia 1', '100', 'Centro', 'Bebedouro', 'SP');
INSERT INTO habitacao (familia_id, qtd_comodos, qtd_dormitorios, tipo_construcao, condicao_domicilio, area_conflito, coleta_lixo)
VALUES (@last_familia_id, 4, 2, 'alvenaria', 'propria_quitada', FALSE, TRUE);
INSERT INTO trabalho_renda (familia_id, quem_trabalha, rendimento_total)
VALUES (@last_familia_id, 'Responsável', 1883.90);

-- FAMÍLIA 2
INSERT INTO familias (equipamento_id, data_cadastro, data_atendimento, profissional_id)
VALUES (4, '2025-06-19', '2025-06-23', 1);
SET @last_familia_id = LAST_INSERT_ID();
INSERT INTO pessoas (familia_id, nome_completo, data_nascimento, sexo, cpf, telefone, estado_civil, escolaridade, tipo_membro, ocupacao, renda_mensal, ativo)
VALUES (@last_familia_id, 'Responsável 2 da Silva', '2006-04-09', 'masculino', '000.000.002-00', '(17) 99123-4511', 'solteiro', 'medio_completo', 'responsavel', 'Autônomo', 1191.35, TRUE);
INSERT INTO enderecos (familia_id, logradouro, numero, bairro, cidade, uf)
VALUES (@last_familia_id, 'Rua Fictícia 2', '101', 'Centro', 'Bebedouro', 'SP');
INSERT INTO habitacao (familia_id, qtd_comodos, qtd_dormitorios, tipo_construcao, condicao_domicilio, area_conflito, coleta_lixo)
VALUES (@last_familia_id, 4, 2, 'alvenaria', 'alugada', FALSE, TRUE);
INSERT INTO trabalho_renda (familia_id, quem_trabalha, rendimento_total)
VALUES (@last_familia_id, 'Responsável', 1248.86);

-- FAMÍLIA 3
INSERT INTO familias (equipamento_id, data_cadastro, data_atendimento, profissional_id)
VALUES (1, '2025-06-16', '2025-06-18', 1);
SET @last_familia_id = LAST_INSERT_ID();
INSERT INTO pessoas (familia_id, nome_completo, data_nascimento, sexo, cpf, telefone, estado_civil, escolaridade, tipo_membro, ocupacao, renda_mensal, ativo)
VALUES (@last_familia_id, 'Responsável 3 da Silva', '2016-11-27', 'feminino', '000.000.003-00', '(17) 99123-4512', 'solteiro', 'medio_completo', 'responsavel', 'Autônomo', 971.48, TRUE);
INSERT INTO enderecos (familia_id, logradouro, numero, bairro, cidade, uf)
VALUES (@last_familia_id, 'Rua Fictícia 3', '102', 'Centro', 'Bebedouro', 'SP');
INSERT INTO habitacao (familia_id, qtd_comodos, qtd_dormitorios, tipo_construcao, condicao_domicilio, area_conflito, coleta_lixo)
VALUES (@last_familia_id, 4, 2, 'madeira', 'cedida', FALSE, TRUE);
INSERT INTO trabalho_renda (familia_id, quem_trabalha, rendimento_total)
VALUES (@last_familia_id, 'Responsável', 1346.36);

-- FAMÍLIA 4
INSERT INTO familias (equipamento_id, data_cadastro, data_atendimento, profissional_id)
VALUES (2, '2025-07-07', '2025-07-07', 1);
SET @last_familia_id = LAST_INSERT_ID();
INSERT INTO pessoas (familia_id, nome_completo, data_nascimento, sexo, cpf, telefone, estado_civil, escolaridade, tipo_membro, ocupacao, renda_mensal, ativo)
VALUES (@last_familia_id, 'Responsável 4 da Silva', '2019-01-26', 'masculino', '000.000.004-00', '(17) 99123-4513', 'solteiro', 'medio_completo', 'responsavel', 'Autônomo', 1008.94, TRUE);
INSERT INTO enderecos (familia_id, logradouro, numero, bairro, cidade, uf)
VALUES (@last_familia_id, 'Rua Fictícia 4', '103', 'Centro', 'Bebedouro', 'SP');
INSERT INTO habitacao (familia_id, qtd_comodos, qtd_dormitorios, tipo_construcao, condicao_domicilio, area_conflito, coleta_lixo)
VALUES (@last_familia_id, 4, 2, 'mista', 'propria_financiada', FALSE, TRUE);
INSERT INTO trabalho_renda (familia_id, quem_trabalha, rendimento_total)
VALUES (@last_familia_id, 'Responsável', 2361.28);

-- LOCAL ENCAMINHAMENTO
INSERT INTO local_encaminhamento (nome)
VALUES ("CAPS"), ("Hospital");

-- Tabela principal de logs do sistema
CREATE TABLE IF NOT EXISTS logs_sistema (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tipo_log ENUM(
        'login', 
        'logout', 
        'criacao', 
        'atualizacao', 
        'entrega', 
        'cancelamento',
        'inativacao',
        'ativacao'
    ) NOT NULL,
    entidade ENUM(
        'usuario',
        'familia',
        'pessoa',
        'beneficio',
        'autorizacao_beneficio',
        'evolucao',
        'encaminhamento',
        'endereco',
        'saude',
        'habitacao',
        'trabalho_renda',
        'programa_social',
        'despesa',
        'situacao_social',
        'servico_publico'
    ) NOT NULL,
    entidade_id INT NULL COMMENT 'ID do registro afetado',
    usuario_id INT NOT NULL COMMENT 'Usuário que realizou a ação',
    descricao TEXT NOT NULL COMMENT 'Descrição da ação realizada',
    ip_address VARCHAR(45) NULL COMMENT 'Endereço IP do usuário',
    user_agent TEXT NULL COMMENT 'Navegador/dispositivo utilizado',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    
    INDEX idx_logs_tipo (tipo_log),
    INDEX idx_logs_entidade (entidade),
    INDEX idx_logs_usuario (usuario_id),
    INDEX idx_logs_data (created_at),
    INDEX idx_logs_entidade_id (entidade_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela para armazenar detalhes de alterações (valores antigos vs novos)
CREATE TABLE IF NOT EXISTS logs_alteracoes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    log_id INT NOT NULL COMMENT 'Referência ao log principal',
    campo VARCHAR(100) NOT NULL COMMENT 'Nome do campo alterado',
    valor_antigo TEXT NULL COMMENT 'Valor antes da alteração',
    valor_novo TEXT NULL COMMENT 'Valor após a alteração',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (log_id) REFERENCES logs_sistema(id) ON DELETE CASCADE ON UPDATE CASCADE,
    
    INDEX idx_alteracoes_log (log_id),
    INDEX idx_alteracoes_campo (campo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- View para facilitar consultas de logs com informações do usuário
CREATE VIEW view_logs_completo AS
SELECT 
    ls.id,
    ls.tipo_log,
    ls.entidade,
    ls.entidade_id,
    ls.descricao,
    ls.ip_address,
    ls.created_at,
    u.nome as usuario_nome,
    u.cpf as usuario_cpf,
    u.email as usuario_email,
    c.nome as cargo_nome,
    e.nome as equipamento_nome
FROM logs_sistema ls
INNER JOIN usuarios u ON ls.usuario_id = u.id
INNER JOIN cargos c ON u.cargo_id = c.id
INNER JOIN equipamento e ON u.equipamento_id = e.id
ORDER BY ls.created_at DESC;

-- View para logs de alterações com detalhes
CREATE VIEW view_logs_alteracoes_completo AS
SELECT 
    la.id,
    la.log_id,
    la.campo,
    la.valor_antigo,
    la.valor_novo,
    la.created_at,
    ls.tipo_log,
    ls.entidade,
    ls.entidade_id,
    ls.descricao,
    u.nome as usuario_nome,
    c.nome as cargo_nome
FROM logs_alteracoes la
INNER JOIN logs_sistema ls ON la.log_id = ls.id
INNER JOIN usuarios u ON ls.usuario_id = u.id
INNER JOIN cargos c ON u.cargo_id = c.id
ORDER BY la.created_at DESC;

ALTER TABLE logs_sistema MODIFY COLUMN entidade VARCHAR(50) NOT NULL;
