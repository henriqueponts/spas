import express from 'express';
import { connectToDatabase } from '../lib/db.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const router = express.Router()

router.post('/registro', async (req, res) => {
    console.log('📝 Rota de registro chamada');
    console.log('📦 Dados recebidos:', req.body);
    
    const { nome, cpf, email, cargo, equipamento, senha } = req.body;
    
    try {
        const db = await connectToDatabase();
        
        // Se há token (usuário logado), verificar se é DIRETOR
        const authHeader = req.headers['authorization'];
        if (authHeader) {
            try {
                const token = authHeader.split(' ')[1];
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                
                // Verificar se é DIRETOR
                const [userResult] = await db.query(`
                    SELECT c.nome as cargo_nome 
                    FROM usuarios u 
                    JOIN cargos c ON u.cargo_id = c.id 
                    WHERE u.id = ?
                `, [decoded.id]);
                
                if (userResult.length === 0 || userResult[0].cargo_nome !== 'DIRETOR') {
                    return res.status(403).json({ message: 'Apenas diretores podem criar usuários' });
                }
            } catch (tokenError) {
                return res.status(401).json({ message: 'Token inválido' });
            }
        }
        
        // Verificar se CPF já existe
        const [rows] = await db.query('SELECT * FROM usuarios WHERE cpf = ?', [cpf]);
        if (rows.length > 0) {
            return res.status(400).json({ message: 'Esse CPF já está em uso!' });
        }
        
        // Verificar se email já existe (se fornecido)
        if (email) {
            const [emailRows] = await db.query('SELECT * FROM usuarios WHERE email = ?', [email]);
            if (emailRows.length > 0) {
                return res.status(400).json({ message: 'Esse email já está em uso!' });
            }
        }
        
        // Hash da senha
        const hashPassword = await bcrypt.hash(senha, 10);
        
        // Inserir usuário
        await db.query(`
            INSERT INTO usuarios (nome, cpf, email, senha_hash, cargo_id, equipamento_id) 
            VALUES (?, ?, ?, ?, ?, ?)
        `, [nome, cpf, email || null, hashPassword, cargo, equipamento]);
        
        console.log('✅ Usuário criado com sucesso!');
        res.status(201).json({ message: 'Usuário registrado com sucesso!' });
        
    } catch (err) {
        console.error('❌ Erro ao criar usuário:', err);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});

router.post('/login', async (req, res) => {
    const { cpf, senha } = req.body;
    try {
        const db = await connectToDatabase();
        const [rows] = await db.query(`
            SELECT 
                u.*,
                c.nome as cargo_nome,
                e.nome as equipamento_nome
            FROM usuarios u
            JOIN cargos c ON u.cargo_id = c.id
            JOIN equipamento e ON u.equipamento_id = e.id
            WHERE u.cpf = ? AND u.ativo = true
        `, [cpf]);
        
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Usuário não existe!' });
        }

        const isMatch = await bcrypt.compare(senha, rows[0].senha_hash);
        if (!isMatch) {
            return res.status(401).json({ message: 'Senha incorreta!' });
        }

        await db.query('UPDATE usuarios SET ultimo_login = NOW() WHERE id = ?', [rows[0].id]);

        const token = jwt.sign(
            { id: rows[0].id }, 
            process.env.JWT_SECRET, 
            { expiresIn: '3h' }
        );

        return res.status(200).json({ 
            token: token,
            usuario: {
                id: rows[0].id,
                nome: rows[0].nome,
                cargo_id: rows[0].cargo_id,
                cargo_nome: rows[0].cargo_nome,
                equipamento_id: rows[0].equipamento_id,
                equipamento_nome: rows[0].equipamento_nome
            }
        });
    } catch(err) {
        console.error('Erro no login:', err);
        return res.status(500).json({ message: 'Erro no servidor' });
    }
});

// Nova rota para buscar os cargos
router.get('/cargos', async (req, res) => {
    try {
        const db = await connectToDatabase();
        const [cargos] = await db.query('SELECT id, nome FROM cargos ORDER BY nome');
        res.status(200).json(cargos);
    } catch (err) {
        console.error('Erro ao buscar cargos:', err);
        res.status(500).json({ message: 'Erro ao buscar cargos' });
    }
});

// Nova rota para buscar os equipamentos
router.get('/equipamentos', async (req, res) => {
    try {
        const db = await connectToDatabase();
        const [equipamentos] = await db.query('SELECT id, nome FROM equipamento WHERE ativo = TRUE ORDER BY nome');
        res.status(200).json(equipamentos);
    } catch (err) {
        console.error('Erro ao buscar equipamentos:', err);
        res.status(500).json({ message: 'Erro ao buscar equipamentos' });
    }
});

const verifyToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
        return res.status(403).json({ message: 'Nenhum token fornecido.' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
        return res.status(403).json({ message: 'Formato do token inválido.' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            // Se o erro for de expiração, envie uma mensagem específica
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({ message: 'Sessão expirada. Por favor, faça login novamente.' });
            }
            // Para outros erros de token (malformado, etc.)
            return res.status(401).json({ message: 'Falha na autenticação do token.' });
        }
        
        // Se o token for válido, anexa o ID do usuário à requisição
        req.userId = decoded.id;
        next();
    });
};

router.get('/home', verifyToken, async (req, res) => {
    try {
        const db = await connectToDatabase();
        const [rows] = await db.query(`
            SELECT 
                u.id, u.nome, u.cargo_id, c.nome as cargo_nome,
                u.equipamento_id, e.nome as equipamento_nome
            FROM usuarios u
            JOIN cargos c ON u.cargo_id = c.id
            JOIN equipamento e ON u.equipamento_id = e.id
            WHERE u.id = ? AND u.ativo = true
        `, [req.userId]);
        
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Usuário não encontrado ou inativo!' });
        }
        return res.status(200).json(rows[0]);
    } catch (err) {
        console.error('Erro na rota /home:', err);
        return res.status(500).json({ message: 'Erro no servidor ao validar sessão' });
    }
});

// ============================================
// 1. PRIMEIRO - ADICIONE ESTAS ROTAS SIMPLES PARA TESTAR
// ============================================

// Teste básico - adicione no final do seu authRoutes.js
router.get('/test-familia', (req, res) => {
    res.json({ message: 'Rota de teste funcionando!' });
});

router.get('/familias', verifyToken, async (req, res) => {
    console.log('📋 GET /auth/familias - Listando famílias');
    
    try {
        const db = await connectToDatabase();
        
        // Query principal - buscar famílias
        const [familias] = await db.query(`
            SELECT 
                f.id,
                f.prontuario,
                f.data_cadastro,
                f.data_atendimento,
                f.situacao,
                e.nome as equipamento_nome,
                e.regiao as equipamento_regiao,
                u.nome as profissional_nome
            FROM familias f
            INNER JOIN equipamento e ON f.equipamento_id = e.id
            INNER JOIN usuarios u ON f.profissional_id = u.id
            ORDER BY f.id DESC
        `);

        console.log(`✅ ${familias.length} famílias encontradas`);

        // Para cada família, buscar dados complementares
        const familiasCompletas = [];
        
        for (const familia of familias) {
            // Buscar responsável
            const [responsavel] = await db.query(
                'SELECT nome_completo, cpf, telefone FROM pessoas WHERE familia_id = ? AND tipo_membro = "responsavel" LIMIT 1',
                [familia.id]
            );

            // Buscar endereço
            const [endereco] = await db.query(
                'SELECT logradouro, numero, bairro, cidade, uf FROM enderecos WHERE familia_id = ? LIMIT 1',
                [familia.id]
            );

            // Buscar integrantes
            const [integrantes] = await db.query(
                'SELECT nome_completo, tipo_membro FROM pessoas WHERE familia_id = ? AND tipo_membro != "responsavel"',
                [familia.id]
            );

            // Buscar renda
            const [renda] = await db.query(
                'SELECT rendimento_total FROM trabalho_renda WHERE familia_id = ? LIMIT 1',
                [familia.id]
            );

            familiasCompletas.push({
                id: familia.id,
                prontuario: familia.prontuario,
                data_cadastro: familia.data_cadastro,
                data_atendimento: familia.data_atendimento,
                situacao: familia.situacao,
                equipamento_nome: familia.equipamento_nome,
                equipamento_regiao: familia.equipamento_regiao,
                profissional_nome: familia.profissional_nome,
                responsavel: responsavel[0] || {
                    nome_completo: 'Não informado',
                    cpf: 'Não informado',
                    telefone: 'Não informado'
                },
                endereco: endereco[0] || {
                    logradouro: 'Não informado',
                    numero: '',
                    bairro: 'Não informado',
                    cidade: 'Não informado',
                    uf: ''
                },
                integrantes: integrantes || [],
                trabalho_renda: renda[0] || {
                    rendimento_total: 0
                }
            });
        }

        res.json(familiasCompletas);

    } catch (error) {
        console.error('❌ Erro ao buscar famílias:', error);
        res.status(500).json({ 
            message: 'Erro ao buscar famílias', 
            error: error.message 
        });
    }
});


// ============================================
// 2. ROTAS CORRIGIDAS COM LOGS DE DEBUG
// ============================================

// Rota para buscar apenas usuários técnicos
router.get('/usuarios/tecnicos', async (req, res) => {
    console.log('🔍 Buscando usuários técnicos...');
    try {
        const db = await connectToDatabase();
        const [usuarios] = await db.query(`
            SELECT 
                u.id, 
                u.nome,
                c.nome as cargo_nome,
                e.nome as equipamento_nome
            FROM usuarios u
            JOIN cargos c ON u.cargo_id = c.id
            JOIN equipamento e ON u.equipamento_id = e.id
            WHERE u.ativo = true 
            AND c.nome IN ('ASSISTENTE', 'TECNICO')
            ORDER BY u.nome
        `);
        console.log('✅ Usuários técnicos encontrados:', usuarios.length);
        res.status(200).json(usuarios);
    } catch (err) {
        console.error('❌ Erro ao buscar técnicos:', err);
        res.status(500).json({ message: 'Erro ao buscar técnicos' });
    }
});

// Rota para buscar programas sociais
router.get('/programas-sociais', async (req, res) => {
    console.log('🔍 Buscando programas sociais...');
    try {
        const db = await connectToDatabase();
        const [programas] = await db.query(`
            SELECT id, codigo, nome, valor_padrao 
            FROM programas_sociais_disponiveis 
            WHERE ativo = TRUE 
            ORDER BY nome
        `);
        console.log('✅ Programas sociais encontrados:', programas.length);
        res.status(200).json(programas);
    } catch (err) {
        console.error('❌ Erro ao buscar programas sociais:', err);
        res.status(500).json({ message: 'Erro ao buscar programas sociais' });
    }
});

// Rota para buscar tipos de despesas
router.get('/tipos-despesas', async (req, res) => {
    console.log('🔍 Buscando tipos de despesas...');
    try {
        const db = await connectToDatabase();
        const [tipos] = await db.query(`
            SELECT id, codigo, nome, obrigatoria 
            FROM tipos_despesas 
            WHERE ativo = TRUE 
            ORDER BY obrigatoria DESC, nome
        `);
        console.log('✅ Tipos de despesas encontrados:', tipos.length);
        res.status(200).json(tipos);
    } catch (err) {
        console.error('❌ Erro ao buscar tipos de despesas:', err);
        res.status(500).json({ message: 'Erro ao buscar tipos de despesas' });
    }
});

// ============================================
// 3. ROTA DE CADASTRO COM LOGS DETALHADOS
// ============================================

router.post('/familias', verifyToken, async (req, res) => {
    console.log('🚀 ROTA /familias CHAMADA!');
    console.log('🔑 User ID do token:', req.userId);
    console.log('📦 Body recebido:', JSON.stringify(req.body, null, 2));
    console.log('🏠 Iniciando cadastro de família...');
    console.log('📝 Dados recebidos:', {
        responsavel: req.body.responsavel?.nome_completo,
        endereco: req.body.endereco?.logradouro,
        profissional_id: req.body.profissional_id,
        equipamento_id: req.body.equipamento_id
    });

    const db = await connectToDatabase();
    
    try {
        console.log('🔄 Iniciando transação...');
        await db.beginTransaction();
        
        const {
            data_atendimento,
            profissional_id,
            equipamento_id,
            responsavel,
            endereco,
            integrantes,
            saude,
            habitacao,
            trabalho_renda,
            programas_sociais,
            despesas,
            situacao_social
        } = req.body;

        // Validações básicas
        if (!responsavel?.nome_completo) {
            throw new Error('Nome do responsável é obrigatório');
        }
         if (!responsavel.data_nascimento) {
            throw new Error('Data de nascimento do responsável é obrigatória');
        }
        if (!endereco?.logradouro) {
            throw new Error('Logradouro é obrigatório');
        }
        if (!profissional_id) {
            throw new Error('Profissional responsável é obrigatório');
        }
        if (!equipamento_id) {
            throw new Error('Equipamento é obrigatório');
        }

        console.log('✅ Validações básicas passaram');

        // 1. Inserir família
        console.log('👨‍👩‍👧‍👦 Inserindo família...');
        const [familiaResult] = await db.query(`
            INSERT INTO familias (
                equipamento_id, 
                data_cadastro, 
                data_atendimento, 
                profissional_id,
                situacao
            ) VALUES (?, CURDATE(), ?, ?, 'ativo')
        `, [equipamento_id, data_atendimento, profissional_id]);
        
        const familia_id = familiaResult.insertId;
        console.log('✅ Família inserida com ID:', familia_id);

        // 2. Inserir responsável familiar
        console.log('👤 Inserindo responsável...');
        await db.query(`
            INSERT INTO pessoas (
                familia_id, nome_completo, data_nascimento, sexo, cpf, rg, 
                estado_civil, escolaridade, naturalidade, telefone, telefone_recado, 
                email, nis, titulo_eleitor, ctps, tipo_membro, ocupacao, renda_mensal
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'responsavel', ?, ?)
        `, [
            familia_id, 
            responsavel.nome_completo || '', 
            responsavel.data_nascimento,
            responsavel.sexo || 'feminino', 
            responsavel.cpf || '', 
            responsavel.rg || '', 
            responsavel.estado_civil || '',
            responsavel.escolaridade || '', 
            responsavel.naturalidade || '', 
            responsavel.telefone || '',
            responsavel.telefone_recado || '', 
            responsavel.email || '', 
            responsavel.nis || '',
            responsavel.titulo_eleitor || '', 
            responsavel.ctps || '', 
            responsavel.ocupacao || '',
            responsavel.renda_mensal || 0
        ]);
        console.log('✅ Responsável inserido');

        // 3. Inserir endereço
        console.log('🏠 Inserindo endereço...');
        await db.query(`
            INSERT INTO enderecos (
                familia_id, logradouro, numero, complemento, bairro, cidade, 
                uf, cep, referencia, tempo_moradia
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            familia_id, 
            endereco.logradouro || '', 
            endereco.numero || '', 
            endereco.complemento || '',
            endereco.bairro || '', 
            endereco.cidade || '', 
            endereco.uf || '', 
            endereco.cep || '',
            endereco.referencia || '', 
            endereco.tempo_moradia || ''
        ]);
        console.log('✅ Endereço inserido');

        // 4. Inserir dados de saúde
        console.log('🏥 Inserindo dados de saúde...');
        await db.query(`
            INSERT INTO saude (
                familia_id, tem_deficiencia, deficiencia_qual, tem_tratamento_saude,
                tratamento_qual, usa_medicacao_continua, medicacao_qual,
                tem_dependente_cuidados, dependente_quem, observacoes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            familia_id, 
            saude?.tem_deficiencia || false, 
            saude?.deficiencia_qual || '',
            saude?.tem_tratamento_saude || false, 
            saude?.tratamento_qual || '', 
            saude?.usa_medicacao_continua || false,
            saude?.medicacao_qual || '', 
            saude?.tem_dependente_cuidados || false, 
            saude?.dependente_quem || '',
            saude?.observacoes || ''
        ]);
        console.log('✅ Dados de saúde inseridos');

        // 5. Inserir dados de habitação
        console.log('🏡 Inserindo dados de habitação...');
        const tipo_construcao_str = Array.isArray(habitacao?.tipo_construcao) 
            ? habitacao.tipo_construcao.join(',') : '';
        const condicao_domicilio_str = Array.isArray(habitacao?.condicao_domicilio) 
            ? habitacao.condicao_domicilio.join(',') : '';

        await db.query(`
            INSERT INTO habitacao (
                familia_id, qtd_comodos, qtd_dormitorios, tipo_construcao,
                area_conflito, condicao_domicilio, energia_eletrica, agua, esgoto, coleta_lixo
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            familia_id, 
            habitacao?.qtd_comodos || 0, 
            habitacao?.qtd_dormitorios || 0,
            tipo_construcao_str, 
            habitacao?.area_conflito || false, 
            condicao_domicilio_str,
            habitacao?.energia_eletrica || 'propria', 
            habitacao?.agua || 'propria', 
            habitacao?.esgoto || 'rede', 
            habitacao?.coleta_lixo || true
        ]);
        console.log('✅ Dados de habitação inseridos');

        // 6. Inserir trabalho e renda
        console.log('💼 Inserindo trabalho e renda...');
        await db.query(`
            INSERT INTO trabalho_renda (
                familia_id, quem_trabalha, rendimento_total
            ) VALUES (?, ?, ?)
        `, [
            familia_id, 
            trabalho_renda?.quem_trabalha || '', 
            trabalho_renda?.rendimento_total || 0
        ]);
        console.log('✅ Trabalho e renda inseridos');

        // 7. Inserir situação social
        console.log('👥 Inserindo situação social...');
        await db.query(`
            INSERT INTO situacao_social (
                familia_id, participa_religiao, religiao_qual, participa_acao_social,
                acao_social_qual, observacoes
            ) VALUES (?, ?, ?, ?, ?, ?)
        `, [
            familia_id, 
            situacao_social?.participa_religiao || false, 
            situacao_social?.religiao_qual || '',
            situacao_social?.participa_acao_social || false, 
            situacao_social?.acao_social_qual || '',
            situacao_social?.observacoes || ''
        ]);
        console.log('✅ Situação social inserida');

        // 8. Inserir integrantes (se houver)
        if (integrantes && Array.isArray(integrantes) && integrantes.length > 0) {
            console.log('👨‍👩‍👧‍👦 Inserindo integrantes...');
            for (let i = 0; i < integrantes.length; i++) {
                const integrante = integrantes[i];
                await db.query(`
                    INSERT INTO pessoas (
                        familia_id, nome_completo, data_nascimento, sexo, cpf, rg,
                        estado_civil, escolaridade, naturalidade, telefone, telefone_recado,
                        email, nis, titulo_eleitor, ctps, tipo_membro, ocupacao, renda_mensal
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    familia_id, 
                    integrante.nome_completo || '', 
                    integrante.data_nascimento || null,
                    integrante.sexo || 'feminino', 
                    integrante.cpf || '', 
                    integrante.rg || '', 
                    integrante.estado_civil || '',
                    integrante.escolaridade || '', 
                    integrante.naturalidade || '', 
                    integrante.telefone || '',
                    integrante.telefone_recado || '', 
                    integrante.email || '', 
                    integrante.nis || '',
                    integrante.titulo_eleitor || '', 
                    integrante.ctps || '', 
                    integrante.tipo_membro || 'filho',
                    integrante.ocupacao || '', 
                    integrante.renda_mensal || 0
                ]);
                console.log(`✅ Integrante ${i + 1} inserido`);
            }
        }

        // 9. Inserir programas sociais (se houver)
        if (programas_sociais && Array.isArray(programas_sociais) && programas_sociais.length > 0) {
            console.log('🤝 Inserindo programas sociais...');
            for (const programa of programas_sociais) {
                await db.query(`
                    INSERT INTO familia_programas_sociais (
                        familia_id, programa_id, valor, ativo
                    ) VALUES (?, ?, ?, TRUE)
                `, [familia_id, programa.programa_id, programa.valor || 0]);
            }
            console.log('✅ Programas sociais inseridos');
        }

        // 10. Inserir despesas (se houver)
        if (despesas && Array.isArray(despesas) && despesas.length > 0) {
            console.log('💰 Inserindo despesas...');
            for (const despesa of despesas) {
                if (despesa.valor > 0) {
                    await db.query(`
                        INSERT INTO familia_despesas (
                            familia_id, tipo_despesa_id, valor
                        ) VALUES (?, ?, ?)
                    `, [familia_id, despesa.tipo_despesa_id, despesa.valor]);
                }
            }
            console.log('✅ Despesas inseridas');
        }

        // 11. Inserir serviços públicos (se houver)
        if (situacao_social?.servicos_publicos && Array.isArray(situacao_social.servicos_publicos)) {
            console.log('🏛️ Inserindo serviços públicos...');
            for (const servico of situacao_social.servicos_publicos) {
                await db.query(`
                    INSERT INTO familia_servicos_publicos (familia_id, tipo)
                    VALUES (?, ?)
                `, [familia_id, servico]);
            }
            console.log('✅ Serviços públicos inseridos');
        }

        console.log('✅ Fazendo commit da transação...');
        await db.commit();
        
        // Buscar o prontuário gerado
        const [prontuarioResult] = await db.query(
            'SELECT prontuario FROM familias WHERE id = ?',
            [familia_id]
        );

        console.log('🎉 Família cadastrada com sucesso! ID:', familia_id);
        res.status(201).json({
            message: 'Família cadastrada com sucesso!',
            familia_id: familia_id,
            prontuario: prontuarioResult[0]?.prontuario
        });

    } catch (error) {
        console.log('❌ Erro no cadastro, fazendo rollback...');
        await db.rollback();
        console.error('💥 Erro detalhado:', error);
        
        if (error.code === 'ER_DUP_ENTRY') {
            res.status(400).json({ message: 'CPF já cadastrado no sistema' });
        } else if (error.message) {
            res.status(400).json({ message: error.message });
        } else {
            res.status(500).json({ message: 'Erro interno do servidor' });
        }
    }
});

// ============================================
// 4. SCRIPT PARA VERIFICAR SE AS TABELAS EXISTEM
// ============================================

router.get('/verificar-tabelas', async (req, res) => {
    try {
        const db = await connectToDatabase();
        
        const tabelas = [
            'familias', 'pessoas', 'enderecos', 'saude', 'habitacao', 
            'trabalho_renda', 'situacao_social', 'familia_programas_sociais',
            'familia_despesas', 'familia_servicos_publicos', 'programas_sociais_disponiveis',
            'tipos_despesas', 'equipamento', 'usuarios', 'cargos'
        ];
        
        const resultados = {};
        
        for (const tabela of tabelas) {
            const [rows] = await db.query(`SHOW TABLES LIKE '${tabela}'`);
            resultados[tabela] = rows.length > 0 ? 'EXISTS' : 'NOT EXISTS';
        }
        
        res.json({
            message: 'Verificação de tabelas concluída',
            tabelas: resultados
        });
        
    } catch (error) {
        console.error('Erro ao verificar tabelas:', error);
        res.status(500).json({ message: 'Erro ao verificar tabelas' });
    }
});

// ============================================
// ENDPOINT COM DEBUG MELHORADO - ADICIONE NO authRoutes.js
// ============================================

router.get('/familias/:id', verifyToken, async (req, res) => {
    console.log('🔍 INICIANDO busca da família ID:', req.params.id);
    console.log('👤 Usuário logado ID:', req.userId);
    
    const db = await connectToDatabase();
    
    try {
        const familia_id = parseInt(req.params.id);
        
        if (isNaN(familia_id)) {
            console.log('❌ ID inválido:', req.params.id);
            return res.status(400).json({ message: 'ID da família inválido' });
        }

        console.log('📋 Buscando dados básicos da família...');

        // 1. Buscar dados básicos da família
        const [familiaResult] = await db.query(`
            SELECT 
                f.*,
                e.nome as equipamento_nome,
                e.regiao as equipamento_regiao,
                u.nome as profissional_nome,
                c.nome as profissional_cargo
            FROM familias f
            JOIN equipamento e ON f.equipamento_id = e.id
            JOIN usuarios u ON f.profissional_id = u.id
            JOIN cargos c ON u.cargo_id = c.id
            WHERE f.id = ?
        `, [familia_id]);

        console.log('✅ Dados básicos encontrados:', familiaResult.length);
        
        if (familiaResult.length === 0) {
            console.log('❌ Família não encontrada para ID:', familia_id);
            return res.status(404).json({ message: 'Família não encontrada' });
        }

        const familia = familiaResult[0];
        console.log('📊 Família encontrada:', {
            id: familia.id,
            prontuario: familia.prontuario,
            responsavel_nome: 'será buscado...'
        });

        // 2. Buscar dados do responsável
        console.log('👤 Buscando responsável...');
        const [responsavelResult] = await db.query(`
            SELECT *
            FROM pessoas 
            WHERE familia_id = ? AND tipo_membro = 'responsavel'
        `, [familia_id]);
        console.log('✅ Responsável encontrado:', responsavelResult.length);

        // 3. Buscar integrantes da família (exceto responsável)
        console.log('👨‍👩‍👧‍👦 Buscando integrantes...');
        const [integrantesResult] = await db.query(`
            SELECT *
            FROM pessoas 
            WHERE familia_id = ? AND tipo_membro != 'responsavel'
            ORDER BY data_nascimento ASC
        `, [familia_id]);
        console.log('✅ Integrantes encontrados:', integrantesResult.length);

        // 4. Buscar endereço
        console.log('🏠 Buscando endereço...');
        const [enderecoResult] = await db.query(`
            SELECT *
            FROM enderecos 
            WHERE familia_id = ?
        `, [familia_id]);
        console.log('✅ Endereço encontrado:', enderecoResult.length);

        // 5. Buscar dados de saúde
        console.log('🏥 Buscando dados de saúde...');
        const [saudeResult] = await db.query(`
            SELECT *
            FROM saude 
            WHERE familia_id = ?
        `, [familia_id]);
        console.log('✅ Dados de saúde encontrados:', saudeResult.length);

        // 6. Buscar dados de habitação
        console.log('🏡 Buscando dados de habitação...');
        const [habitacaoResult] = await db.query(`
            SELECT *
            FROM habitacao 
            WHERE familia_id = ?
        `, [familia_id]);
        console.log('✅ Dados de habitação encontrados:', habitacaoResult.length);

        // 7. Buscar trabalho e renda
        console.log('💼 Buscando trabalho e renda...');
        const [trabalhoRendaResult] = await db.query(`
            SELECT *
            FROM trabalho_renda 
            WHERE familia_id = ?
        `, [familia_id]);
        console.log('✅ Trabalho e renda encontrados:', trabalhoRendaResult.length);

        // 8. Buscar programas sociais
        console.log('🤝 Buscando programas sociais...');
        const [programasSociaisResult] = await db.query(`
            SELECT 
                fps.*,
                psd.nome as programa_nome,
                psd.codigo as programa_codigo
            FROM familia_programas_sociais fps
            JOIN programas_sociais_disponiveis psd ON fps.programa_id = psd.id
            WHERE fps.familia_id = ? AND fps.ativo = TRUE
        `, [familia_id]);
        console.log('✅ Programas sociais encontrados:', programasSociaisResult.length);

        // 9. Buscar despesas
        console.log('💰 Buscando despesas...');
        const [despesasResult] = await db.query(`
            SELECT 
                fd.*,
                td.nome as tipo_nome,
                td.codigo as tipo_codigo
            FROM familia_despesas fd
            JOIN tipos_despesas td ON fd.tipo_despesa_id = td.id
            WHERE fd.familia_id = ?
            ORDER BY td.obrigatoria DESC, td.nome ASC
        `, [familia_id]);
        console.log('✅ Despesas encontradas:', despesasResult.length);

        // 10. Buscar situação social
        console.log('👥 Buscando situação social...');
        const [situacaoSocialResult] = await db.query(`
            SELECT *
            FROM situacao_social 
            WHERE familia_id = ?
        `, [familia_id]);
        console.log('✅ Situação social encontrada:', situacaoSocialResult.length);

        // 11. Buscar serviços públicos
        console.log('🏛️ Buscando serviços públicos...');
        const [servicosPublicosResult] = await db.query(`
            SELECT tipo
            FROM familia_servicos_publicos 
            WHERE familia_id = ?
        `, [familia_id]);
        console.log('✅ Serviços públicos encontrados:', servicosPublicosResult.length);

        // Processar dados de habitação (converter SET para array)
        const habitacao = habitacaoResult[0] || {};
        if (habitacao.tipo_construcao) {
            habitacao.tipo_construcao = habitacao.tipo_construcao.split(',').filter(Boolean);
        } else {
            habitacao.tipo_construcao = [];
        }
        
        if (habitacao.condicao_domicilio) {
            habitacao.condicao_domicilio = habitacao.condicao_domicilio.split(',').filter(Boolean);
        } else {
            habitacao.condicao_domicilio = [];
        }

        // Montar resposta completa
        const familiaCompleta = {
            // Dados básicos
            id: familia.id,
            prontuario: familia.prontuario,
            data_cadastro: familia.data_cadastro,
            data_atendimento: familia.data_atendimento,
            situacao: familia.situacao,
            profissional_id: familia.profissional_id, // CORRIGIDO: Adicionado ID do profissional
            equipamento_id: familia.equipamento_id, // CORRIGIDO: Adicionado ID do equipamento
            
            // Equipamento e profissional
            equipamento: {
                id: familia.equipamento_id,
                nome: familia.equipamento_nome,
                regiao: familia.equipamento_regiao
            },
            profissional: {
                id: familia.profissional_id,
                nome: familia.profissional_nome,
                cargo_nome: familia.profissional_cargo
            },
            
            // Responsável familiar
            responsavel: responsavelResult[0] || {},
            
            // Endereço
            endereco: enderecoResult[0] || {},
            
            // Integrantes
            integrantes: integrantesResult,
            
            // Saúde
            saude: saudeResult[0] || {
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
            
            // Habitação
            habitacao: {
                qtd_comodos: habitacao.qtd_comodos || 0,
                qtd_dormitorios: habitacao.qtd_dormitorios || 0,
                tipo_construcao: habitacao.tipo_construcao,
                area_conflito: habitacao.area_conflito || false,
                condicao_domicilio: habitacao.condicao_domicilio,
                energia_eletrica: habitacao.energia_eletrica || 'propria',
                agua: habitacao.agua || 'propria',
                esgoto: habitacao.esgoto || 'rede',
                coleta_lixo: habitacao.coleta_lixo || true
            },
            
            // Trabalho e renda
            trabalho_renda: trabalhoRendaResult[0] || {
                quem_trabalha: '',
                rendimento_total: 0
            },
            
            // Programas sociais
            programas_sociais: programasSociaisResult.map(programa => ({
                programa_id: programa.programa_id, // CORRIGIDO
                programa_nome: programa.programa_nome,
                programa_codigo: programa.programa_codigo,
                valor: programa.valor
            })),
            
            // Despesas
            despesas: despesasResult.map(despesa => ({
                tipo_despesa_id: despesa.tipo_despesa_id, // CORRIGIDO
                tipo_nome: despesa.tipo_nome,
                tipo_codigo: despesa.tipo_codigo,
                valor: despesa.valor
            })),
            
            // Situação social
            situacao_social: {
                ...situacaoSocialResult[0] || {
                    participa_religiao: false,
                    religiao_qual: '',
                    participa_acao_social: false,
                    acao_social_qual: '',
                    observacoes: ''
                },
                servicos_publicos: servicosPublicosResult.map(s => s.tipo)
            }
        };

        console.log('🎉 Montagem da resposta concluída!');
        console.log('📤 Enviando resposta com dados de:', familiaCompleta.responsavel.nome_completo || 'Nome não encontrado');
        
        res.json(familiaCompleta);

    } catch (error) {
        console.error('❌ ERRO DETALHADO ao buscar família:', error);
        console.error('📍 Stack trace:', error.stack);
        res.status(500).json({ 
            message: 'Erro interno do servidor',
            error: error.message 
        });
    }
});

// ============================================
// ROTA PARA ATUALIZAR FAMÍLIA EXISTENTE
// ============================================
router.put('/familias/:id', verifyToken, async (req, res) => {
    console.log('🔄 ROTA PUT /familias/:id CHAMADA!');
    console.log('🆔 ID da família:', req.params.id);
    console.log('🔑 User ID do token:', req.userId);
    console.log('📦 Body recebido:', JSON.stringify(req.body, null, 2));

    const db = await connectToDatabase();
    
    try {
        const familia_id = parseInt(req.params.id);
        
        if (isNaN(familia_id)) {
            return res.status(400).json({ message: 'ID da família inválido' });
        }

        console.log('🔄 Iniciando transação para atualização...');
        await db.beginTransaction();

        const {
            data_atendimento,
            profissional_id,
            equipamento_id,
            responsavel,
            endereco,
            integrantes,
            saude,
            habitacao,
            trabalho_renda,
            programas_sociais,
            despesas,
            situacao_social
        } = req.body;

        // Validações básicas
        if (!responsavel?.nome_completo) {
            throw new Error('Nome do responsável é obrigatório');
        }
        if (!endereco?.logradouro) {
            throw new Error('Logradouro é obrigatório');
        }
        if (!profissional_id) {
            throw new Error('Profissional responsável é obrigatório');
        }
        if (!equipamento_id) {
            throw new Error('Equipamento é obrigatório');
        }

        console.log('✅ Validações básicas passaram');

        // Verificar se a família existe
        const [familiaExiste] = await db.query('SELECT id FROM familias WHERE id = ?', [familia_id]);
        if (familiaExiste.length === 0) {
            throw new Error('Família não encontrada');
        }

        // 1. Atualizar dados básicos da família
        console.log('👨‍👩‍👧‍👦 Atualizando dados básicos da família...');
        await db.query(`
            UPDATE familias SET 
                equipamento_id = ?,
                data_atendimento = ?,
                profissional_id = ?,
                updated_at = NOW()
            WHERE id = ?
        `, [equipamento_id, data_atendimento, profissional_id, familia_id]);
        console.log('✅ Dados básicos da família atualizados');

        // 2. Atualizar responsável familiar
        console.log('👤 Atualizando responsável...');
        await db.query(`
            UPDATE pessoas SET 
                nome_completo = ?, data_nascimento = ?, sexo = ?, cpf = ?, rg = ?,
                estado_civil = ?, escolaridade = ?, naturalidade = ?, telefone = ?, 
                telefone_recado = ?, email = ?, nis = ?, titulo_eleitor = ?, ctps = ?, 
                ocupacao = ?, renda_mensal = ?
            WHERE familia_id = ? AND tipo_membro = 'responsavel'
        `, [
            responsavel.nome_completo || '',
            responsavel.data_nascimento || null,
            responsavel.sexo || 'feminino',
            responsavel.cpf || '',
            responsavel.rg || '',
            responsavel.estado_civil || '',
            responsavel.escolaridade || '',
            responsavel.naturalidade || '',
            responsavel.telefone || '',
            responsavel.telefone_recado || '',
            responsavel.email || '',
            responsavel.nis || '',
            responsavel.titulo_eleitor || '',
            responsavel.ctps || '',
            responsavel.ocupacao || '',
            responsavel.renda_mensal || 0,
            familia_id
        ]);
        console.log('✅ Responsável atualizado');

        // 3. Atualizar endereço
        console.log('🏠 Atualizando endereço...');
        await db.query(`
            UPDATE enderecos SET 
                logradouro = ?, numero = ?, complemento = ?, bairro = ?, cidade = ?,
                uf = ?, cep = ?, referencia = ?, tempo_moradia = ?
            WHERE familia_id = ?
        `, [
            endereco.logradouro || '',
            endereco.numero || '',
            endereco.complemento || '',
            endereco.bairro || '',
            endereco.cidade || '',
            endereco.uf || '',
            endereco.cep || '',
            endereco.referencia || '',
            endereco.tempo_moradia || '',
            familia_id
        ]);
        console.log('✅ Endereço atualizado');

        // 4. Atualizar dados de saúde
        console.log('🏥 Atualizando dados de saúde...');
        await db.query(`
            UPDATE saude SET 
                tem_deficiencia = ?, deficiencia_qual = ?, tem_tratamento_saude = ?,
                tratamento_qual = ?, usa_medicacao_continua = ?, medicacao_qual = ?,
                tem_dependente_cuidados = ?, dependente_quem = ?, observacoes = ?
            WHERE familia_id = ?
        `, [
            saude?.tem_deficiencia || false,
            saude?.deficiencia_qual || '',
            saude?.tem_tratamento_saude || false,
            saude?.tratamento_qual || '',
            saude?.usa_medicacao_continua || false,
            saude?.medicacao_qual || '',
            saude?.tem_dependente_cuidados || false,
            saude?.dependente_quem || '',
            saude?.observacoes || '',
            familia_id
        ]);
        console.log('✅ Dados de saúde atualizados');

        // 5. Atualizar dados de habitação
        console.log('🏡 Atualizando dados de habitação...');
        const tipo_construcao_str = Array.isArray(habitacao?.tipo_construcao) 
            ? habitacao.tipo_construcao.join(',') : '';
        const condicao_domicilio_str = Array.isArray(habitacao?.condicao_domicilio) 
            ? habitacao.condicao_domicilio.join(',') : '';

        await db.query(`
            UPDATE habitacao SET 
                qtd_comodos = ?, qtd_dormitorios = ?, tipo_construcao = ?,
                area_conflito = ?, condicao_domicilio = ?, energia_eletrica = ?, 
                agua = ?, esgoto = ?, coleta_lixo = ?
            WHERE familia_id = ?
        `, [
            habitacao?.qtd_comodos || 0,
            habitacao?.qtd_dormitorios || 0,
            tipo_construcao_str,
            habitacao?.area_conflito || false,
            condicao_domicilio_str,
            habitacao?.energia_eletrica || 'propria',
            habitacao?.agua || 'propria',
            habitacao?.esgoto || 'rede',
            habitacao?.coleta_lixo || true,
            familia_id
        ]);
        console.log('✅ Dados de habitação atualizados');

        // 6. Atualizar trabalho e renda
        console.log('💼 Atualizando trabalho e renda...');
        await db.query(`
            UPDATE trabalho_renda SET 
                quem_trabalha = ?, rendimento_total = ?
            WHERE familia_id = ?
        `, [
            trabalho_renda?.quem_trabalha || '',
            trabalho_renda?.rendimento_total || 0,
            familia_id
        ]);
        console.log('✅ Trabalho e renda atualizados');

        // 7. Atualizar situação social
        console.log('👥 Atualizando situação social...');
        await db.query(`
            UPDATE situacao_social SET 
                participa_religiao = ?, religiao_qual = ?, participa_acao_social = ?,
                acao_social_qual = ?, observacoes = ?
            WHERE familia_id = ?
        `, [
            situacao_social?.participa_religiao || false,
            situacao_social?.religiao_qual || '',
            situacao_social?.participa_acao_social || false,
            situacao_social?.acao_social_qual || '',
            situacao_social?.observacoes || '',
            familia_id
        ]);
        console.log('✅ Situação social atualizada');

        // 8. Atualizar integrantes (remover todos e inserir novamente)
        console.log('👨‍👩‍👧‍👦 Atualizando integrantes...');
        await db.query('DELETE FROM pessoas WHERE familia_id = ? AND tipo_membro != "responsavel"', [familia_id]);
        
        if (integrantes && Array.isArray(integrantes) && integrantes.length > 0) {
            for (let i = 0; i < integrantes.length; i++) {
                const integrante = integrantes[i];

                if (!integrante.data_nascimento) {
                    throw new Error(`Data de nascimento do integrante '${integrante.nome_completo}' é obrigatória`);
                } else if (!isDateInPast(integrante.data_nascimento)) {
                    throw new Error(`Data de nascimento do integrante '${integrante.nome_completo}' não pode ser no futuro`);
                }

                await db.query(`
                    INSERT INTO pessoas (
                        familia_id, nome_completo, data_nascimento, sexo, cpf, rg,
                        estado_civil, escolaridade, naturalidade, telefone, telefone_recado,
                        email, nis, titulo_eleitor, ctps, tipo_membro, ocupacao, renda_mensal
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    familia_id,
                    integrante.nome_completo || '',
                    integrante.data_nascimento || null,
                    integrante.sexo || 'Outro',
                    integrante.cpf || '',
                    integrante.rg || '',
                    integrante.estado_civil || '',
                    integrante.escolaridade || '',
                    integrante.naturalidade || '',
                    integrante.telefone || '',
                    integrante.telefone_recado || '',
                    integrante.email || '',
                    integrante.nis || '',
                    integrante.titulo_eleitor || '',
                    integrante.ctps || '',
                    integrante.tipo_membro || 'filho',
                    integrante.ocupacao || '',
                    integrante.renda_mensal || 0
                ]);
            }
        }
        console.log('✅ Integrantes atualizados');

        // 9. Atualizar programas sociais (remover todos e inserir novamente)
        console.log('🤝 Atualizando programas sociais...');
        await db.query('DELETE FROM familia_programas_sociais WHERE familia_id = ?', [familia_id]);
        
        if (programas_sociais && Array.isArray(programas_sociais) && programas_sociais.length > 0) {
            for (const programa of programas_sociais) {
                await db.query(`
                    INSERT INTO familia_programas_sociais (
                        familia_id, programa_id, valor, ativo
                    ) VALUES (?, ?, ?, TRUE)
                `, [familia_id, programa.programa_id, programa.valor || 0]);
            }
        }
        console.log('✅ Programas sociais atualizados');

        // 10. Atualizar despesas (remover todas e inserir novamente)
        console.log('💰 Atualizando despesas...');
        await db.query('DELETE FROM familia_despesas WHERE familia_id = ?', [familia_id]);
        
        if (despesas && Array.isArray(despesas) && despesas.length > 0) {
            for (const despesa of despesas) {
                if (despesa.valor > 0) {
                    await db.query(`
                        INSERT INTO familia_despesas (
                            familia_id, tipo_despesa_id, valor
                        ) VALUES (?, ?, ?)
                    `, [familia_id, despesa.tipo_despesa_id, despesa.valor]);
                }
            }
        }
        console.log('✅ Despesas atualizadas');

        // 11. Atualizar serviços públicos (remover todos e inserir novamente)
        console.log('🏛️ Atualizando serviços públicos...');
        await db.query('DELETE FROM familia_servicos_publicos WHERE familia_id = ?', [familia_id]);
        
        if (situacao_social?.servicos_publicos && Array.isArray(situacao_social.servicos_publicos)) {
            for (const servico of situacao_social.servicos_publicos) {
                await db.query(`
                    INSERT INTO familia_servicos_publicos (familia_id, tipo)
                    VALUES (?, ?)
                `, [familia_id, servico]);
            }
        }
        console.log('✅ Serviços públicos atualizados');

        console.log('✅ Fazendo commit da transação...');
        await db.commit();

        console.log('🎉 Família atualizada com sucesso! ID:', familia_id);
        res.status(200).json({
            message: 'Família atualizada com sucesso!',
            familia_id: familia_id
        });

    } catch (error) {
        console.log('❌ Erro na atualização, fazendo rollback...');
        await db.rollback();
        console.error('💥 Erro detalhado:', error);

        if (error.code === 'ER_DUP_ENTRY') {
            res.status(400).json({ message: 'CPF já cadastrado no sistema' });
        } else if (error.message) {
            res.status(400).json({ message: error.message });
        } else {
            res.status(500).json({ message: 'Erro interno do servidor' });
        }
    }
});


router.get('/familias/:id/evolucoes', verifyToken, async (req, res) => {
    console.log('🔍 Buscando evoluções da família:', req.params.id);
    
    const db = await connectToDatabase();
    
    try {
        const familia_id = parseInt(req.params.id);
        
        if (isNaN(familia_id)) {
            return res.status(400).json({ message: 'ID da família inválido' });
        }

        // Buscar evoluções com informações do usuário
        const [evolucoes] = await db.query(`
            SELECT 
                e.*,
                u.nome as usuario_nome,
                c.nome as usuario_cargo
            FROM evolucoes e
            JOIN usuarios u ON e.usuario_id = u.id
            JOIN cargos c ON u.cargo_id = c.id
            WHERE e.familia_id = ?
            ORDER BY e.data_evolucao DESC, e.hora_evolucao DESC
        `, [familia_id]);

        console.log(`✅ ${evolucoes.length} evoluções encontradas`);
        res.json(evolucoes);

    } catch (error) {
        console.error('❌ Erro ao buscar evoluções:', error);
        res.status(500).json({ 
            message: 'Erro ao buscar evoluções',
            error: error.message 
        });
    }
});

// Criar nova evolução
router.post('/familias/:id/evolucoes', verifyToken, async (req, res) => {
    console.log('📝 Criando nova evolução para família:', req.params.id);
    
    const db = await connectToDatabase();
    
    try {
        const familia_id = parseInt(req.params.id);
        const usuario_id = req.userId; // ID do usuário autenticado
        const { descricao } = req.body;
        
        if (isNaN(familia_id)) {
            return res.status(400).json({ message: 'ID da família inválido' });
        }

        if (!descricao || descricao.trim() === '') {
            return res.status(400).json({ message: 'Descrição é obrigatória' });
        }

        // Verificar se o usuário é técnico (cargo_id = 3)
        const [userResult] = await db.query(
            'SELECT cargo_id FROM usuarios WHERE id = ?',
            [usuario_id]
        );

        if (userResult.length === 0 || userResult[0].cargo_id !== 3) {
            return res.status(403).json({ 
                message: 'Apenas técnicos podem registrar evoluções' 
            });
        }

        // Verificar se a família existe
        const [familiaResult] = await db.query(
            'SELECT id FROM familias WHERE id = ?',
            [familia_id]
        );

        if (familiaResult.length === 0) {
            return res.status(404).json({ message: 'Família não encontrada' });
        }

        // Inserir a evolução
        const dataAtual = new Date();
        const data_evolucao = dataAtual.toISOString().split('T')[0]; // YYYY-MM-DD
        const hora_evolucao = dataAtual.toTimeString().split(' ')[0]; // HH:MM:SS

        const [result] = await db.query(`
            INSERT INTO evolucoes (
                familia_id, 
                usuario_id, 
                data_evolucao, 
                hora_evolucao, 
                descricao
            ) VALUES (?, ?, ?, ?, ?)
        `, [familia_id, usuario_id, data_evolucao, hora_evolucao, descricao]);

        console.log('✅ Evolução criada com ID:', result.insertId);

        res.status(201).json({
            message: 'Evolução registrada com sucesso',
            id: result.insertId
        });

    } catch (error) {
        console.error('❌ Erro ao criar evolução:', error);
        res.status(500).json({ 
            message: 'Erro ao registrar evolução',
            error: error.message 
        });
    }
});

router.get('/usuarios', verifyToken, async (req, res) => {
    // ADICIONE ESTES LOGS
    console.log('===========================================');
    console.log('🕵️  ROTA GET /usuarios ACESSADA');
    console.log('🔑 ID do usuário (do token):', req.userId);
    // FIM DOS LOGS

    try {
        const db = await connectToDatabase();
        
        // Verificar se o usuário logado é DIRETOR
        const [userResult] = await db.query(`
            SELECT c.nome as cargo_nome 
            FROM usuarios u 
            JOIN cargos c ON u.cargo_id = c.id 
            WHERE u.id = ?
        `, [req.userId]);
        
        // ADICIONE ESTE LOG
        console.log('📦 Resultado da query de permissão:', userResult);

        if (userResult.length === 0 || userResult[0].cargo_nome !== 'DIRETOR') {
            // ADICIONE ESTE LOG
            console.log('🚫 ACESSO NEGADO! O usuário não é DIRETOR.');
            console.log('===========================================');
            return res.status(403).json({ message: 'Acesso negado. Permissão de Diretor necessária.' });
        }
        
        // ADICIONE ESTE LOG
        console.log('✅ Acesso PERMITIDO! Buscando lista de usuários...');
        
        // Buscar todos os usuários com informações completas
        const [usuarios] = await db.query(`
            SELECT 
                u.id,
                u.nome,
                u.cpf,
                u.email,
                u.cargo_id,
                c.nome as cargo_nome,
                u.equipamento_id,
                e.nome as equipamento_nome,
                u.ativo,
                u.created_at,
                u.ultimo_login
            FROM usuarios u
            JOIN cargos c ON u.cargo_id = c.id
            JOIN equipamento e ON u.equipamento_id = e.id
            ORDER BY u.nome ASC
        `);
        
        console.log(`✅ ${usuarios.length} usuários encontrados e enviados.`);
        console.log('===========================================');
        res.json(usuarios);
        
    } catch (error) {
        console.error('❌ Erro GERAL na rota /usuarios:', error);
        console.log('===========================================');
        res.status(500).json({ message: 'Erro interno ao buscar usuários' });
    }
});
// Alterar status do usuário (ativar/inativar)
router.put('/usuarios/:id/status', verifyToken, async (req, res) => {
    console.log('🔄 Alterando status do usuário:', req.params.id);
    
    try {
        const db = await connectToDatabase();
        const usuario_id = parseInt(req.params.id);
        
        if (isNaN(usuario_id)) {
            return res.status(400).json({ message: 'ID do usuário inválido' });
        }
        
        // Verificar se o usuário logado é DIRETOR
        const [userResult] = await db.query(`
            SELECT c.nome as cargo_nome 
            FROM usuarios u 
            JOIN cargos c ON u.cargo_id = c.id 
            WHERE u.id = ?
        `, [req.userId]);
        
        if (userResult.length === 0 || userResult[0].cargo_nome !== 'DIRETOR') {
            return res.status(403).json({ message: 'Acesso negado' });
        }
        
        // Verificar se o usuário existe
        const [usuarioExiste] = await db.query(
            'SELECT id, ativo FROM usuarios WHERE id = ?', 
            [usuario_id]
        );
        
        if (usuarioExiste.length === 0) {
            return res.status(404).json({ message: 'Usuário não encontrado' });
        }
        
        // Alternar status
        const novoStatus = !usuarioExiste[0].ativo;
        
        await db.query(
            'UPDATE usuarios SET ativo = ? WHERE id = ?', 
            [novoStatus, usuario_id]
        );
        
        console.log(`✅ Status do usuário ${usuario_id} alterado para: ${novoStatus ? 'ativo' : 'inativo'}`);
        
        res.json({
            message: `Usuário ${novoStatus ? 'ativado' : 'inativado'} com sucesso`,
            ativo: novoStatus
        });
        
    } catch (error) {
        console.error('❌ Erro ao alterar status do usuário:', error);
        res.status(500).json({ message: 'Erro ao alterar status do usuário' });
    }
});



export default router