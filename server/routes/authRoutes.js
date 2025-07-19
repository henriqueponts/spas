import express from 'express';
import { connectToDatabase } from '../lib/db.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const router = express.Router()

router.post('/registro', async (req, res) => {
    const { nome, cpf, cargo, senha, equipamento } = req.body;
    try{
        const db = await connectToDatabase()
        const [rows] = await db.query('SELECT * FROM usuarios WHERE cpf = ?', [cpf])
        if (rows.length > 0) {
            return res.status(400).json({ message: 'Esse CPF já está em uso!' })
        }

        const hashPassword = await bcrypt.hash(senha, 10)
        await db.query('INSERT INTO usuarios (nome, cpf, senha_hash, cargo_id, equipamento_id) VALUES (?, ?, ?, ?, ?)', [nome, cpf, hashPassword, cargo, equipamento])
        
        res.status(201).json({ message: 'Usuário registrado com sucesso!' })
    } catch(err) {
        res.status(500).json(err)
    }
})

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
    try {
        const token = req.headers['authorization'].split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'Token não fornecido' });
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.id;
        next()
    } catch (err) {
        return res.status(500).json({ message: 'server error' })
    }
}

router.get('/home', verifyToken, async (req, res) => {
    try {
        const db = await connectToDatabase()
        const [rows] = await db.query('SELECT * FROM usuarios WHERE id = ?', [req.userId])
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Usuário não existe!' })
        }

        return res.status(200).json({ nome: rows[0].nome, cargo: rows[0].cargo_id, equipamento: rows[0].equipamento_id })
    } catch (err) {
        return res.status(500).json({ message: 'server error' })
    }
}
)

// ============================================
// 1. PRIMEIRO - ADICIONE ESTAS ROTAS SIMPLES PARA TESTAR
// ============================================

// Teste básico - adicione no final do seu authRoutes.js
router.get('/test-familia', (req, res) => {
    res.json({ message: 'Rota de teste funcionando!' });
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
// teste Beneficios

// Rota de busca Familia (específica)
router.get('/familias/buscar', async (req, res) => {
    console.log('🔍 Rota /familias/buscar chamada');
    console.log('📋 Query params:', req.query);

    const { tipo, termo } = req.query;

    if (!tipo || !termo) {
        console.log('❌ Parâmetros inválidos');
        return res.status(400).json({ message: 'Tipo e termo são obrigatórios' });
    }

    try {
        const db = await connectToDatabase();
        console.log('✅ Conexão estabelecida para busca');

        let query = '';
        let params = [];

        switch (tipo) {
            case 'nome':
                query = `
                    SELECT 
                        f.id,
                        f.prontuario,
                        p.nome_completo as responsavel_nome,
                        p.cpf as responsavel_cpf,
                        'CRAS Centro' as equipamento_nome
                    FROM familias f
                    INNER JOIN pessoas p ON f.id = p.familia_id 
                    WHERE p.tipo_membro = 'responsavel' 
                    AND p.nome_completo LIKE ?
                    LIMIT 10
                `;
                params = [`%${termo}%`];    
                break;

            case 'cpf':
                const cpfLimpo = termo.replace(/\D/g, '');
                query = `
                    SELECT 
                        f.id,
                        f.prontuario,
                        p.nome_completo as responsavel_nome,
                        p.cpf as responsavel_cpf,
                        'CRAS Centro' as equipamento_nome
                    FROM familias f
                    INNER JOIN pessoas p ON f.id = p.familia_id 
                    WHERE p.tipo_membro = 'responsavel' 
                    AND p.cpf = ?
                    LIMIT 10
                `;
                params = [cpfLimpo];
                break;

            case 'prontuario':
                query = `
                    SELECT 
                        f.id,
                        f.prontuario,
                        p.nome_completo as responsavel_nome,
                        p.cpf as responsavel_cpf,
                        'CRAS Centro' as equipamento_nome
                    FROM familias f
                    INNER JOIN pessoas p ON f.id = p.familia_id 
                    WHERE p.tipo_membro = 'responsavel' 
                    AND f.prontuario = ?
                    LIMIT 10
                `;
                params = [termo];
                break;

            default:
                query = `
                    SELECT 
                        f.id,
                        f.prontuario,
                        p.nome_completo as responsavel_nome,
                        p.cpf as responsavel_cpf,
                        'CRAS Centro' as equipamento_nome
                    FROM familias f
                    INNER JOIN pessoas p ON f.id = p.familia_id 
                    WHERE p.tipo_membro = 'responsavel'
                    LIMIT 10
                `;
                params = [];
        }

        console.log('🔍 Executando query de busca...');
        console.log('📋 Buscando por:', tipo, '=', termo);

        const [results] = await db.query(query, params);

        console.log('✅ Busca concluída, resultados:', results.length);

        res.json(results);

    } catch (error) {
        console.error('❌ Erro na busca:', error);
        res.status(500).json({
            message: 'Erro ao buscar famílias',
            error: error.message
        });
    }
});


// final teste Beneficios
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
            
            // Equipamento e profissional
            equipamento: {
                nome: familia.equipamento_nome,
                regiao: familia.equipamento_regiao
            },
            profissional: {
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
                programa_nome: programa.programa_nome,
                programa_codigo: programa.programa_codigo,
                valor: programa.valor
            })),
            
            // Despesas
            despesas: despesasResult.map(despesa => ({
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
// ROTA PARA CADASTRAR BENEFÍCIOS
// ============================================

router.post('/beneficios', verifyToken, async (req, res) => {
    console.log('🎯 ROTA POST /beneficios chamada');
    console.log('👤 Usuário logado ID:', req.userId);
    console.log('📦 Dados recebidos:', JSON.stringify(req.body, null, 2));

    try {
        const db = await connectToDatabase();
        
        const {
            familia_id,
            tipo_beneficio,
            descricao_beneficio,
            data_concessao,
            valor,
            justificativa,
            observacoes
        } = req.body;

        // Validações básicas
        if (!familia_id) {
            return res.status(400).json({ message: 'ID da família é obrigatório' });
        }
        if (!tipo_beneficio) {
            return res.status(400).json({ message: 'Tipo de benefício é obrigatório' });
        }
        
        // Validar se o tipo de benefício é válido
        const tiposValidos = ['cesta_basica', 'auxilio_funeral', 'auxilio_natalidade', 'passagem', 'outro'];
        if (!tiposValidos.includes(tipo_beneficio)) {
            return res.status(400).json({ message: 'Tipo de benefício inválido' });
        }
        
        if (!data_concessao) {
            return res.status(400).json({ message: 'Data de concessão é obrigatória' });
        }
        if (!valor || valor <= 0) {
            return res.status(400).json({ message: 'Valor deve ser maior que zero' });
        }
        if (!justificativa) {
            return res.status(400).json({ message: 'Justificativa é obrigatória' });
        }

        console.log('✅ Validações passaram');

        // Verificar se a família existe
        console.log('🔍 Verificando se família existe...');
        const [familiaExists] = await db.query(
            'SELECT id FROM familias WHERE id = ?',
            [familia_id]
        );

        if (familiaExists.length === 0) {
            console.log('❌ Família não encontrada:', familia_id);
            return res.status(404).json({ message: 'Família não encontrada' });
        }

        console.log('✅ Família encontrada');

        // Verificar se o usuário existe
        console.log('🔍 Verificando se usuário existe...');
        const [usuarioExists] = await db.query(
            'SELECT id FROM usuarios WHERE id = ?',
            [req.userId]
        );

        if (usuarioExists.length === 0) {
            console.log('❌ Usuário não encontrado:', req.userId);
            return res.status(404).json({ message: 'Usuário não encontrado' });
        }

        console.log('✅ Usuário encontrado');

        // Inserir benefício
        console.log('💰 Inserindo benefício...');
        const [result] = await db.query(`
            INSERT INTO beneficios (
                familia_id,
                tipo_beneficio,
                descricao_beneficio,
                data_concessao,
                valor,
                justificativa,
                responsavel_id,
                status,
                observacoes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'concedido', ?)
        `, [
            familia_id,
            tipo_beneficio,
            descricao_beneficio || '',
            data_concessao,
            valor,
            justificativa,
            req.userId, // responsavel_id
            observacoes || ''
        ]);

        const beneficio_id = result.insertId;
        console.log('✅ Benefício inserido com ID:', beneficio_id);

        // Buscar dados do benefício inserido para retornar
        console.log('📋 Buscando dados do benefício inserido...');
        const [beneficioInserido] = await db.query(`
            SELECT 
                b.*,
                p.nome_completo as responsavel_nome,
                f.prontuario
            FROM beneficios b
            LEFT JOIN familias f ON b.familia_id = f.id
            LEFT JOIN pessoas p ON f.id = p.familia_id AND p.tipo_membro = 'responsavel'
            WHERE b.id = ?
        `, [beneficio_id]);

        res.status(201).json({
            message: 'Benefício cadastrado com sucesso!',
            beneficio: beneficioInserido[0]
        });

    } catch (error) {
        console.error('❌ Erro ao cadastrar benefício:', error);
        console.error('💥 Stack trace:', error.stack);
        
        if (error.code === 'ER_BAD_FIELD_ERROR') {
            return res.status(400).json({ 
                message: 'Erro na estrutura dos dados enviados',
                error: error.message 
            });
        }
        
        if (error.code === 'ER_NO_REFERENCED_ROW_2') {
            return res.status(400).json({ 
                message: 'Referência inválida (família ou usuário não existe)',
                error: error.message 
            });
        }
        
        res.status(500).json({
            message: 'Erro interno do servidor',
            error: error.message
        });
    }
});


// Buscar histórico de benefícios (SEM verifyToken) - VERSÃO SIMPLIFICADA
router.get('/beneficios/historico', async (req, res) => {
    console.log('📋 Rota GET /beneficios/historico chamada');
    
    try {
        const db = await connectToDatabase();
        
        console.log('🔍 Buscando histórico de benefícios...');
        
        // Primeiro, vamos tentar uma query mais simples
        const [results] = await db.query(`
            SELECT 
                b.id,
                b.familia_id,
                b.tipo_beneficio,
                b.descricao_beneficio,
                b.data_concessao,
                b.valor,
                b.justificativa,
                b.status,
                b.data_entrega,
                b.observacoes,
                b.created_at,
                'Nome não encontrado' as responsavel_nome,
                'Prontuário não encontrado' as prontuario
            FROM beneficios b
            ORDER BY b.created_at DESC
            LIMIT 50
        `);

        console.log('✅ Histórico encontrado:', results.length, 'benefícios');

        res.json(results);
    } catch (error) {
        console.error('❌ Erro ao buscar histórico:', error);
        console.error('💥 Stack trace:', error.stack);
        res.status(500).json({ 
            message: 'Erro ao buscar histórico',
            error: error.message 
        });
    }
});

// Atualizar rota de histórico completo
router.get('/beneficios/historico-completo', async (req, res) => {
    console.log('📋 Rota GET /beneficios/historico-completo chamada');

    try {
        const db = await connectToDatabase();

        console.log('🔍 Buscando histórico completo...');

        const [results] = await db.query(`
            SELECT
                b.id,
                b.familia_id,
                b.tipo_beneficio,
                b.descricao_beneficio,
                b.data_concessao,
                b.valor,
                b.justificativa,
                b.status,
                b.data_entrega,
                b.observacoes,
                b.created_at,
                COALESCE(p.nome_completo, 'Nome não encontrado') as responsavel_nome,
                COALESCE(f.prontuario, 'Prontuário não encontrado') as prontuario,
                COALESCE(u.nome, 'Usuário não encontrado') as responsavel_concessao
            FROM beneficios b
            LEFT JOIN familias f ON b.familia_id = f.id
            LEFT JOIN pessoas p ON f.id = p.familia_id AND p.tipo_membro = 'responsavel'
            LEFT JOIN usuarios u ON b.responsavel_id = u.id
            ORDER BY b.created_at DESC
            LIMIT 50
        `);

        console.log('✅ Histórico completo encontrado:', results.length, 'benefícios');

        res.json(results);
    } catch (error) {
        console.error('❌ Erro ao buscar histórico completo:', error);
        res.status(500).json({
            message: 'Erro ao buscar histórico completo',
            error: error.message
        });
    }
});



export default router