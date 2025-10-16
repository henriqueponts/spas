import express from "express"
import { connectToDatabase } from "../lib/db.js"
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"

const router = express.Router()

// Função auxiliar para criar uma única entrada de log com múltiplas alterações
async function criarLogComMultiplasAlteracoes(dados) {
  const { usuario_id, tipo_log, entidade, entidade_id, descricao, ip_address, alteracoes } = dados

  let db // <-- CORREÇÃO: Variável declarada fora do try
  try {
    console.log("[v0] 📝 Criando log com múltiplas alterações...")
    db = await connectToDatabase() // <-- CORREÇÃO: Atribuída dentro do try

    // Entrada de registro
    const [logResult] = await db.query(
      `INSERT INTO logs_sistema
       (usuario_id, tipo_log, entidade, entidade_id, descricao, ip_address)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [usuario_id, tipo_log, entidade, entidade_id, descricao, ip_address],
    )

    const log_id = logResult.insertId
    console.log("[v0] ✅ Log criado com ID:", log_id)

    // Entradas de alteração vinculadas ao mesmo log
    for (const alteracao of alteracoes) {
      await db.query(
        `INSERT INTO logs_alteracoes
         (log_id, campo, valor_antigo, valor_novo)
         VALUES (?, ?, ?, ?)`,
        [log_id, alteracao.campo, alteracao.valor_antigo || "", alteracao.valor_novo || ""],
      )
    }

    console.log("[v0] ✅ Registradas", alteracoes.length, "alterações")
  } catch (error) {
    console.error("[v0] ❌ Erro ao criar log com múltiplas alterações:", error)
    // Rollback transaction if an error occurs in a transactional context
    if (db && db.rollback) {
      // Check if db object and rollback method exist
      await db.rollback()
    }
    throw error
  }
}

router.post("/registro", async (req, res) => {
  console.log("📝 Rota de registro chamada")
  console.log("📦 Dados recebidos:", req.body)

  const { nome, cpf, email, cargo, equipamento, senha } = req.body

  // ✅ ADICIONADO: Validações de campos obrigatórios no backend
  if (!nome || !nome.trim()) {
    return res.status(400).json({ message: "O campo Nome é obrigatório." })
  }
  if (!cargo) {
    return res.status(400).json({ message: "Por favor, selecione um cargo." })
  }
  if (!equipamento) {
    return res.status(400).json({ message: "Por favor, selecione um equipamento." })
  }

  try {
    const db = await connectToDatabase()

    // Se há token (usuário logado), verificar se é DIRETOR
    const authHeader = req.headers["authorization"]
    let loggedUserId = null // Variable to store the ID of the user performing the action
    if (authHeader) {
      try {
        const token = authHeader.split(" ")[1]
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        loggedUserId = decoded.id // Store the logged-in user's ID

        // Verificar se é DIRETOR ou COORDENADOR
        const [userResult] = await db.query(
          `
                    SELECT c.nome as cargo_nome
                    FROM usuarios u
                    JOIN cargos c ON u.cargo_id = c.id
                    WHERE u.id = ?
                `,
          [decoded.id],
        )

        const cargosPermitidos = ["DIRETOR", "COORDENADOR"]
        if (userResult.length === 0 || !cargosPermitidos.includes(userResult[0].cargo_nome)) {
          return res.status(403).json({ message: "Apenas diretores e coordenadores podem criar usuários" })
        }
      } catch (tokenError) {
        return res.status(401).json({ message: "Token inválido" })
      }
    }

    // Verificar se CPF já existe
    const [rows] = await db.query("SELECT * FROM usuarios WHERE cpf = ?", [cpf])
    if (rows.length > 0) {
      return res.status(400).json({ message: "Esse CPF já está em uso!" })
    }

    // Verificar se email já existe (se fornecido)
    if (email) {
      const [emailRows] = await db.query("SELECT * FROM usuarios WHERE email = ?", [email])
      if (emailRows.length > 0) {
        return res.status(400).json({ message: "Esse email já está em uso!" })
      }
    }

    // Hash da senha
    const hashPassword = await bcrypt.hash(senha, 10)

    // Inserir usuário
    const [result] = await db.query(
      `
            INSERT INTO usuarios (nome, cpf, email, senha_hash, cargo_id, equipamento_id)
            VALUES (?, ?, ?, ?, ?, ?)
        `,
      [nome, cpf, email || null, hashPassword, cargo, equipamento],
    )

    const novoUsuarioId = result.insertId
    await criarLog({
      usuario_id: loggedUserId || novoUsuarioId, // Use logged user ID or new user ID
      tipo_log: "criacao",
      entidade: "usuario",
      entidade_id: novoUsuarioId,
      descricao: `Novo usuário criado: ${nome}`,
      ip_address: req.ip || req.connection.remoteAddress,
    })

    console.log("✅ Usuário criado com sucesso!")
    res.status(201).json({ message: "Usuário registrado com sucesso!" })
  } catch (err) {
    console.error("❌ Erro ao criar usuário:", err)
    res.status(500).json({ message: "Erro interno do servidor" })
  }
})

router.post("/login", async (req, res) => {
  const { cpf, senha } = req.body
  try {
    const db = await connectToDatabase()
    const [rows] = await db.query(
      `
            SELECT
                u.*,
                c.nome as cargo_nome,
                e.nome as equipamento_nome
            FROM usuarios u
            JOIN cargos c ON u.cargo_id = c.id
            JOIN equipamento e ON u.equipamento_id = e.id
            WHERE u.cpf = ? AND u.ativo = true
        `,
      [cpf],
    )

    if (rows.length === 0) {
      return res.status(404).json({ message: "Usuário não existe!" })
    }

    const isMatch = await bcrypt.compare(senha, rows[0].senha_hash)
    if (!isMatch) {
      return res.status(401).json({ message: "Senha incorreta!" })
    }

    await db.query("UPDATE usuarios SET ultimo_login = NOW() WHERE id = ?", [rows[0].id])

    const logId = await criarLog({
      usuario_id: rows[0].id,
      tipo_log: "login",
      entidade: "usuario",
      entidade_id: rows[0].id,
      descricao: `Login realizado por ${rows[0].nome}`,
      ip_address: req.ip || req.connection.remoteAddress,
    })

    const token = jwt.sign({ id: rows[0].id }, process.env.JWT_SECRET, { expiresIn: "3h" })

    return res.status(200).json({
      token: token,
      usuario: {
        id: rows[0].id,
        nome: rows[0].nome,
        cargo_id: rows[0].cargo_id,
        cargo_nome: rows[0].cargo_nome,
        equipamento_id: rows[0].equipamento_id,
        equipamento_nome: rows[0].equipamento_nome,
      },
    })
  } catch (err) {
    console.error("Erro no login:", err)
    return res.status(500).json({ message: "Erro no servidor" })
  }
})

// Nova rota para buscar os cargos
router.get("/cargos", async (req, res) => {
  try {
    const db = await connectToDatabase()
    const [cargos] = await db.query("SELECT id, nome FROM cargos ORDER BY nome")
    res.status(200).json(cargos)
  } catch (err) {
    console.error("Erro ao buscar cargos:", err)
    res.status(500).json({ message: "Erro ao buscar cargos" })
  }
})

// Nova rota para buscar os equipamentos
router.get("/equipamentos", async (req, res) => {
  try {
    const db = await connectToDatabase()
    const [equipamentos] = await db.query("SELECT id, nome FROM equipamento ORDER BY nome")
    res.status(200).json(equipamentos)
  } catch (err) {
    console.error("Erro ao buscar equipamentos:", err)
    res.status(500).json({ message: "Erro ao buscar equipamentos" })
  }
})

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers["authorization"]
  if (!authHeader) {
    return res.status(403).json({ message: "Nenhum token fornecido." })
  }

  const token = authHeader.split(" ")[1]
  if (!token) {
    return res.status(403).json({ message: "Formato do token inválido." })
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      // Se o erro for de expiração, envie uma mensagem específica
      if (err.name === "TokenExpiredError") {
        return res.status(401).json({ message: "Sessão expirada. Por favor, faça login novamente." })
      }
      // Para outros erros de token (malformado, etc.)
      return res.status(401).json({ message: "Falha na autenticação do token." })
    }

    // Se o token for válido, anexa o ID do usuário à requisição
    req.userId = decoded.id
    next()
  })
}

router.get("/home", verifyToken, async (req, res) => {
  try {
    const db = await connectToDatabase()
    const [rows] = await db.query(
      `
            SELECT
                u.id, u.nome, u.cargo_id, c.nome as cargo_nome,
                u.equipamento_id, e.nome as equipamento_nome
            FROM usuarios u
            JOIN cargos c ON u.cargo_id = c.id
            JOIN equipamento e ON u.equipamento_id = e.id
            WHERE u.id = ? AND u.ativo = true
        `,
      [req.userId],
    )

    if (rows.length === 0) {
      return res.status(404).json({ message: "Usuário não encontrado ou inativo!" })
    }
    return res.status(200).json(rows[0])
  } catch (err) {
    console.error("Erro na rota /home:", err)
    return res.status(500).json({ message: "Erro no servidor ao validar sessão" })
  }
})

// Teste básico
router.get("/test-familia", (req, res) => {
  res.json({ message: "Rota de teste funcionando!" })
})

router.get("/familias", verifyToken, async (req, res) => {
  console.log("📋 GET /auth/familias - Listando famílias")

  try {
    const db = await connectToDatabase()

    // Query principal - buscar famílias
    const [familias] = await db.query(`
            SELECT
                f.id,
                f.prontuario,
                f.data_cadastro,
                f.data_atendimento,
                e.nome as equipamento_nome,
                e.regiao as equipamento_regiao,
                u.nome as profissional_nome
            FROM familias f
            INNER JOIN equipamento e ON f.equipamento_id = e.id
            INNER JOIN usuarios u ON f.profissional_id = u.id
            ORDER BY f.id DESC
        `)

    console.log(`✅ ${familias.length} famílias encontradas`)

    // Para cada família, buscar dados complementares
    const familiasCompletas = []

    for (const familia of familias) {
      // Buscar responsável
      const [responsavel] = await db.query(
        'SELECT nome_completo, cpf, telefone FROM pessoas WHERE familia_id = ? AND tipo_membro = "responsavel" LIMIT 1',
        [familia.id],
      )

      // Buscar endereço
      const [endereco] = await db.query(
        "SELECT logradouro, numero, bairro, cidade, uf FROM enderecos WHERE familia_id = ? LIMIT 1",
        [familia.id],
      )

      // Buscar integrantes
      const [integrantes] = await db.query(
        'SELECT nome_completo, tipo_membro, cpf FROM pessoas WHERE familia_id = ? AND tipo_membro != "responsavel"', // <-- ADICIONADO `cpf` AQUI
        [familia.id],
      )

      // Buscar renda
      const [renda] = await db.query("SELECT rendimento_total FROM trabalho_renda WHERE familia_id = ? LIMIT 1", [
        familia.id,
      ])

      familiasCompletas.push({
        id: familia.id,
        prontuario: familia.prontuario,
        data_cadastro: familia.data_cadastro,
        data_atendimento: familia.data_atendimento,
        equipamento_nome: familia.equipamento_nome,
        equipamento_regiao: familia.equipamento_regiao,
        profissional_nome: familia.profissional_nome,
        responsavel: responsavel[0] || {
          nome_completo: "Não informado",
          cpf: "Não informado",
          telefone: "Não informado",
        },
        endereco: endereco[0] || {
          logradouro: "Não informado",
          numero: "",
          bairro: "Não informado",
          cidade: "Não informado",
          uf: "",
        },
        integrantes: integrantes || [],
        trabalho_renda: renda[0] || {
          rendimento_total: 0,
        },
      })
    }

    res.json(familiasCompletas)
  } catch (error) {
    console.error("❌ Erro ao buscar famílias:", error)
    res.status(500).json({
      message: "Erro ao buscar famílias",
      error: error.message,
    })
  }
})

// Rota para buscar apenas usuários técnicos
router.get("/usuarios/tecnicos", async (req, res) => {
  console.log("🔍 Buscando usuários técnicos...")
  try {
    const db = await connectToDatabase()
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
            AND c.nome IN ( 'TECNICO')
            ORDER BY u.nome
        `)
    console.log("✅ Usuários técnicos encontrados:", usuarios.length)
    res.status(200).json(usuarios)
  } catch (err) {
    console.error("❌ Erro ao buscar técnicos:", err)
    res.status(500).json({ message: "Erro ao buscar técnicos" })
  }
})

// Rota para buscar programas sociais
router.get("/programas-sociais", async (req, res) => {
  console.log("🔍 Buscando programas sociais...")
  try {
    const db = await connectToDatabase()
    const [programas] = await db.query(`
            SELECT id, codigo, nome, valor_padrao
            FROM programas_sociais_disponiveis
            WHERE ativo = TRUE
            ORDER BY nome
        `)
    console.log("✅ Programas sociais encontrados:", programas.length)
    res.status(200).json(programas)
  } catch (err) {
    console.error("❌ Erro ao buscar programas sociais:", err)
    res.status(500).json({ message: "Erro ao buscar programas sociais" })
  }
})

// Rota para buscar tipos de despesas
router.get("/tipos-despesas", async (req, res) => {
  console.log("🔍 Buscando tipos de despesas...")
  try {
    const db = await connectToDatabase()
    const [tipos] = await db.query(`
            SELECT id, codigo, nome, obrigatoria
            FROM tipos_despesas
            WHERE ativo = TRUE
            ORDER BY obrigatoria DESC, nome
        `)
    console.log("✅ Tipos de despesas encontrados:", tipos.length)
    res.status(200).json(tipos)
  } catch (err) {
    console.error("❌ Erro ao buscar tipos de despesas:", err)
    res.status(500).json({ message: "Erro ao buscar tipos de despesas" })
  }
})

router.post("/familias", verifyToken, async (req, res) => {
  console.log("🚀 ROTA /familias CHAMADA!")
  console.log("🔑 User ID do token:", req.userId)
  console.log("📦 Body recebido:", JSON.stringify(req.body, null, 2))

  let db // <-- CORREÇÃO: Variável declarada fora do try

  try {
    db = await connectToDatabase() // <-- CORREÇÃO: Atribuída dentro do try
    console.log("🔄 Iniciando transação...")
    await db.beginTransaction()

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
      situacao_social,
    } = req.body

    // Validações básicas
    if (!responsavel?.nome_completo) {
      throw new Error("Nome do responsável é obrigatório")
    }
    if (!responsavel.data_nascimento) {
      throw new Error("Data de nascimento do responsável é obrigatória")
    }
    if (!endereco?.logradouro) {
      throw new Error("Logradouro é obrigatório")
    }
    if (!profissional_id) {
      throw new Error("Profissional responsável é obrigatório")
    }
    if (!equipamento_id) {
      throw new Error("Equipamento é obrigatório")
    }

    console.log("✅ Validações básicas passaram")

    // 1. Inserir família
    console.log("👨‍👩‍👧‍👦 Inserindo família...")
    const [familiaResult] = await db.query(
      `
            INSERT INTO familias (
                equipamento_id,
                data_cadastro,
                data_atendimento,
                profissional_id
            ) VALUES (?, CURDATE(), ?, ?)
        `,
      [equipamento_id, data_atendimento, profissional_id],
    )

    const familia_id = familiaResult.insertId
    console.log("✅ Família inserida com ID:", familia_id)

    await criarLog({
      usuario_id: req.userId,
      tipo_log: "criacao",
      entidade: "familia",
      entidade_id: familia_id,
      descricao: `Família cadastrada - Responsável: ${responsavel.nome_completo}`,
      ip_address: req.ip || req.connection.remoteAddress,
    })

    // 2. Inserir responsável familiar
    console.log("👤 Inserindo responsável...")
    await db.query(
      `
            INSERT INTO pessoas (
                familia_id, nome_completo, data_nascimento, sexo, cpf, rg,
                estado_civil, escolaridade, naturalidade, telefone, telefone_recado,
                email, nis, titulo_eleitor, ctps, tipo_membro, ocupacao, renda_mensal
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'responsavel', ?, ?)
        `,
      [
        familia_id,
        responsavel.nome_completo || "",
        responsavel.data_nascimento,
        responsavel.sexo || "feminino",
        responsavel.cpf || "",
        responsavel.rg || "",
        responsavel.estado_civil || "",
        responsavel.escolaridade || "",
        responsavel.naturalidade || "",
        responsavel.telefone || "",
        responsavel.telefone_recado || "",
        responsavel.email || "",
        responsavel.nis || "",
        responsavel.titulo_eleitor || "",
        responsavel.ctps || "",
        responsavel.ocupacao || "",
        responsavel.renda_mensal || 0,
      ],
    )
    console.log("✅ Responsável inserido")

    // 3. Inserir endereço
    console.log("🏠 Inserindo endereço...")
    await db.query(
      `
            INSERT INTO enderecos (
                familia_id, logradouro, numero, complemento, bairro, cidade,
                uf, cep, referencia, tempo_moradia
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
      [
        familia_id,
        endereco.logradouro || "",
        endereco.numero || "",
        endereco.complemento || "",
        endereco.bairro || "",
        endereco.cidade || "",
        endereco.uf || "",
        endereco.cep || "",
        endereco.referencia || "",
        endereco.tempo_moradia || "",
      ],
    )
    console.log("✅ Endereço inserido")

    // 4. Inserir dados de saúde
    console.log("🏥 Inserindo dados de saúde...")
    await db.query(
      `
            INSERT INTO saude (
                familia_id, tem_deficiencia, deficiencia_qual, tem_tratamento_saude,
                tratamento_qual, usa_medicacao_continua, medicacao_qual,
                tem_dependente_cuidados, dependente_quem, observacoes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
      [
        familia_id,
        saude?.tem_deficiencia || false,
        saude?.deficiencia_qual || "",
        saude?.tem_tratamento_saude || false,
        saude?.tratamento_qual || "",
        saude?.usa_medicacao_continua || false,
        saude?.medicacao_qual || "",
        saude?.tem_dependente_cuidados || false,
        saude?.dependente_quem || "",
        saude?.observacoes || "",
      ],
    )
    console.log("✅ Dados de saúde inseridos")

    // 5. Inserir dados de habitação
    console.log("🏡 Inserindo dados de habitação...")
    // <-- CORREÇÃO: Lógica antiga de array removida
    await db.query(
      `
            INSERT INTO habitacao (
                familia_id, qtd_comodos, qtd_dormitorios, tipo_construcao,
                area_conflito, condicao_domicilio, energia_eletrica, agua, esgoto, coleta_lixo
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
      [
        familia_id,
        habitacao?.qtd_comodos || 0,
        habitacao?.qtd_dormitorios || 0,
        habitacao?.tipo_construcao || "alvenaria", // <-- CORREÇÃO: Passando o valor string diretamente
        habitacao?.area_conflito || false,
        habitacao?.condicao_domicilio || "propria_quitada", // <-- CORREÇÃO: Passando o valor string diretamente
        habitacao?.energia_eletrica || "propria",
        habitacao?.agua || "propria",
        habitacao?.esgoto || "rede",
        habitacao?.coleta_lixo !== undefined ? habitacao.coleta_lixo : true,
      ],
    )
    console.log("✅ Dados de habitação inseridos")

    // 6. Inserir trabalho e renda
    console.log("💼 Inserindo trabalho e renda...")
    await db.query(
      `
            INSERT INTO trabalho_renda (
                familia_id, quem_trabalha, rendimento_total
            ) VALUES (?, ?, ?)
        `,
      [familia_id, trabalho_renda?.quem_trabalha || "", trabalho_renda?.rendimento_total || 0],
    )
    console.log("✅ Trabalho e renda inseridos")

    // 7. Inserir situação social
    console.log("👥 Inserindo situação social...")
    await db.query(
      `
            INSERT INTO situacao_social (
                familia_id, participa_religiao, religiao_qual, participa_acao_social,
                acao_social_qual, observacoes
            ) VALUES (?, ?, ?, ?, ?, ?)
        `,
      [
        situacao_social?.participa_religiao || false,
        situacao_social?.religiao_qual || "",
        situacao_social?.participa_acao_social || false,
        situacao_social?.acao_social_qual || "",
        situacao_social?.observacoes || "",
      ],
    )
    console.log("✅ Situação social inserida")

    // 8. Inserir integrantes (se houver)
    if (integrantes && Array.isArray(integrantes) && integrantes.length > 0) {
      console.log("👨‍👩‍👧‍👦 Inserindo integrantes...")
      for (let i = 0; i < integrantes.length; i++) {
        const integrante = integrantes[i]
        await db.query(
          `
                    INSERT INTO pessoas (
                        familia_id, nome_completo, data_nascimento, sexo, cpf, rg,
                        estado_civil, escolaridade, naturalidade, telefone, telefone_recado,
                        email, nis, titulo_eleitor, ctps, tipo_membro, ocupacao, renda_mensal
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `,
          [
            familia_id,
            integrante.nome_completo || "",
            integrante.data_nascimento || null,
            integrante.sexo || "feminino",
            integrante.cpf || "",
            integrante.rg || "",
            integrante.estado_civil || "",
            integrante.escolaridade || "",
            integrante.naturalidade || "",
            integrante.telefone || "",
            integrante.telefone_recado || "",
            integrante.email || "",
            integrante.nis || "",
            integrante.titulo_eleitor || "",
            integrante.ctps || "",
            integrante.tipo_membro || "filho",
            integrante.ocupacao || "",
            integrante.renda_mensal || 0,
          ],
        )
        console.log(`✅ Integrante ${i + 1} inserido`)
      }
    }

    // 9. Inserir programas sociais (se houver)
    if (programas_sociais && Array.isArray(programas_sociais) && programas_sociais.length > 0) {
      console.log("🤝 Inserindo programas sociais...")
      for (const programa of programas_sociais) {
        await db.query(
          `
                    INSERT INTO familia_programas_sociais (
                        familia_id, programa_id, valor, ativo
                    ) VALUES (?, ?, ?, TRUE)
                `,
          [familia_id, programa.programa_id, programa.valor || 0],
        )
      }
      console.log("✅ Programas sociais inseridos")
    }

    // 10. Inserir despesas (se houver)
    if (despesas && Array.isArray(despesas) && despesas.length > 0) {
      console.log("💰 Inserindo despesas...")
      for (const despesa of despesas) {
        if (despesa.valor > 0) {
          await db.query(
            `
                        INSERT INTO familia_despesas (
                            familia_id, tipo_despesa_id, valor
                        ) VALUES (?, ?, ?)
                    `,
            [familia_id, despesa.tipo_despesa_id, despesa.valor],
          )
        }
      }
      console.log("✅ Despesas inseridas")
    }

    // 11. Inserir serviços públicos (se houver)
    if (situacao_social?.servicos_publicos && Array.isArray(situacao_social.servicos_publicos)) {
      console.log("🏛️ Inserindo serviços públicos...")
      for (const servico of situacao_social.servicos_publicos) {
        await db.query(
          `
                    INSERT INTO familia_servicos_publicos (familia_id, tipo)
                    VALUES (?, ?)
                `,
          [familia_id, servico],
        )
      }
      console.log("✅ Serviços públicos inseridos")
    }

    console.log("✅ Fazendo commit da transação...")
    await db.commit()

    // Buscar o prontuário gerado
    const [prontuarioResult] = await db.query("SELECT prontuario FROM familias WHERE id = ?", [familia_id])

    console.log("🎉 Família cadastrada com sucesso! ID:", familia_id)
    res.status(201).json({
      message: "Família cadastrada com sucesso!",
      familia_id: familia_id,
      prontuario: prontuarioResult[0]?.prontuario,
    })
  } catch (error) {
    console.log("❌ Erro no cadastro, fazendo rollback...")
    if (db) {
      // <-- CORREÇÃO: Verifica se 'db' existe antes do rollback
      await db.rollback()
    }
    console.error("💥 Erro detalhado:", error)

    if (error.code === "ER_DUP_ENTRY") {
      res.status(400).json({ message: "CPF já cadastrado no sistema" })
    } else if (error.message) {
      res.status(400).json({ message: error.message })
    } else {
      res.status(500).json({ message: "Erro interno do servidor" })
    }
  }
})

router.get("/verificar-tabelas", async (req, res) => {
  try {
    const db = await connectToDatabase()

    const tabelas = [
      "familias",
      "pessoas",
      "enderecos",
      "saude",
      "habitacao",
      "trabalho_renda",
      "situacao_social",
      "familia_programas_sociais",
      "familia_despesas",
      "familia_servicos_publicos",
      "programas_sociais_disponiveis",
      "tipos_despesas",
      "equipamento",
      "usuarios",
      "cargos",
    ]

    const resultados = {}

    for (const tabela of tabelas) {
      const [rows] = await db.query(`SHOW TABLES LIKE '${tabela}'`)
      resultados[tabela] = rows.length > 0 ? "EXISTS" : "NOT EXISTS"
    }

    res.json({
      message: "Verificação de tabelas concluída",
      tabelas: resultados,
    })
  } catch (error) {
    console.error("Erro ao verificar tabelas:", error)
    res.status(500).json({ message: "Erro ao verificar tabelas" })
  }
})

router.get("/familias/buscar", async (req, res) => {
  try {
    const db = await connectToDatabase()
    const { tipo, termo } = req.query
    let sqlQuery = `
            SELECT DISTINCT
                f.id,
                p_resp.nome_completo AS responsavel_nome,
                p_resp.cpf AS responsavel_cpf,
                f.prontuario
            FROM familias f
            LEFT JOIN pessoas p_resp ON f.id = p_resp.familia_id AND p_resp.tipo_membro = 'responsavel'
            LEFT JOIN pessoas p_membro ON f.id = p_membro.familia_id
            WHERE 1=1
        `
    const params = []

    if (!termo) {
      return res.status(400).json({ message: "Termo de busca não fornecido." })
    }

    const likeTerm = `%${termo}%`
    switch (tipo) {
      case "nome":
        sqlQuery += ` AND p_resp.nome_completo LIKE ?`
        params.push(likeTerm)
        break
      case "cpf":
        sqlQuery += ` AND p_resp.cpf LIKE ?`
        params.push(likeTerm)
        break
      case "prontuario":
        sqlQuery += ` AND f.prontuario LIKE ?`
        params.push(likeTerm)
        break
      case "membro_nome":
        sqlQuery += ` AND p_membro.nome_completo LIKE ?`
        params.push(likeTerm)
        break
      case "membro_cpf":
        sqlQuery += ` AND p_membro.cpf LIKE ?`
        params.push(likeTerm)
        break
      case "membro_nis":
        sqlQuery += ` AND p_membro.nis LIKE ?`
        params.push(likeTerm)
        break
      default:
        return res.status(400).json({ message: "Tipo de busca inválido." })
    }

    const [results] = await db.query(sqlQuery, params)
    res.json(results)
  } catch (error) {
    console.error("Erro na busca de famílias:", error)
    res.status(500).json({ message: "Erro interno do servidor", error: error.message })
  }
})

router.get("/familias/:id", verifyToken, async (req, res) => {
  console.log("🔍 INICIANDO busca da família ID:", req.params.id)

  const db = await connectToDatabase()

  try {
    const familia_id = Number.parseInt(req.params.id)

    if (isNaN(familia_id)) {
      return res.status(400).json({ message: "ID da família inválido" })
    }

    // 1. Buscar dados básicos da família
    const [familiaResult] = await db.query(
      `
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
        `,
      [familia_id],
    )

    if (familiaResult.length === 0) {
      return res.status(404).json({ message: "Família não encontrada" })
    }

    const familia = familiaResult[0]

    // 2. Buscar dados do responsável
    const [responsavelResult] = await db.query(
      `
            SELECT *
            FROM pessoas
            WHERE familia_id = ? AND tipo_membro = 'responsavel'
        `,
      [familia_id],
    )

    // 3. Buscar integrantes da família
    const [integrantesResult] = await db.query(
      `
            SELECT *
            FROM pessoas
            WHERE familia_id = ? AND tipo_membro != 'responsavel'
            ORDER BY data_nascimento ASC
        `,
      [familia_id],
    )

    // 4. Buscar endereço
    const [enderecoResult] = await db.query(
      `
            SELECT *
            FROM enderecos
            WHERE familia_id = ?
        `,
      [familia_id],
    )

    // 5. Buscar dados de saúde
    const [saudeResult] = await db.query(
      `
            SELECT *
            FROM saude
            WHERE familia_id = ?
        `,
      [familia_id],
    )

    // 6. Buscar dados de habitação
    const [habitacaoResult] = await db.query(
      `
            SELECT *
            FROM habitacao
            WHERE familia_id = ?
        `,
      [familia_id],
    )

    // 7. Buscar trabalho e renda
    const [trabalhoRendaResult] = await db.query(
      `
            SELECT *
            FROM trabalho_renda
            WHERE familia_id = ?
        `,
      [familia_id],
    )

    // 8. Buscar programas sociais
    const [programasSociaisResult] = await db.query(
      `
            SELECT
                fps.*,
                psd.nome as programa_nome,
                psd.codigo as programa_codigo
            FROM familia_programas_sociais fps
            JOIN programas_sociais_disponiveis psd ON fps.programa_id = psd.id
            WHERE fps.familia_id = ? AND fps.ativo = TRUE
        `,
      [familia_id],
    )

    // 9. Buscar despesas
    const [despesasResult] = await db.query(
      `
            SELECT
                fd.*,
                td.nome as tipo_nome,
                td.codigo as tipo_codigo
            FROM familia_despesas fd
            JOIN tipos_despesas td ON fd.tipo_despesa_id = td.id
            WHERE fd.familia_id = ?
            ORDER BY td.obrigatoria DESC, td.nome ASC
        `,
      [familia_id],
    )

    // 10. Buscar situação social
    const [situacaoSocialResult] = await db.query(
      `
            SELECT *
            FROM situacao_social
            WHERE familia_id = ?
        `,
      [familia_id],
    )

    // 11. Buscar serviços públicos
    const [servicosPublicosResult] = await db.query(
      `
            SELECT tipo
            FROM familia_servicos_publicos
            WHERE familia_id = ?
        `,
      [familia_id],
    )

    // Processar dados de habitação
    const habitacao = habitacaoResult[0] || {}
    if (habitacao.tipo_construcao) {
      habitacao.tipo_construcao = habitacao.tipo_construcao.split(",").filter(Boolean)
    } else {
      habitacao.tipo_construcao = []
    }

    if (habitacao.condicao_domicilio) {
      habitacao.condicao_domicilio = habitacao.condicao_domicilio.split(",").filter(Boolean)
    } else {
      habitacao.condicao_domicilio = []
    }

    // Montar resposta completa
    const familiaCompleta = {
      id: familia.id,
      prontuario: familia.prontuario,
      data_cadastro: familia.data_cadastro,
      data_atendimento: familia.data_atendimento,
      profissional_id: familia.profissional_id,
      equipamento_id: familia.equipamento_id,
      equipamento: {
        id: familia.equipamento_id,
        nome: familia.equipamento_nome,
        regiao: familia.equipamento_regiao,
      },
      profissional: {
        id: familia.profissional_id,
        nome: familia.profissional_nome,
        cargo_nome: familia.profissional_cargo,
      },
      responsavel: responsavelResult[0] || {},
      endereco: enderecoResult[0] || {},
      integrantes: integrantesResult,
      saude: saudeResult[0] || {
        tem_deficiencia: false,
        deficiencia_qual: "",
        tem_tratamento_saude: false,
        tratamento_qual: "",
        usa_medicacao_continua: false,
        medicacao_qual: "",
        tem_dependente_cuidados: false,
        dependente_quem: "",
        observacoes: "",
      },
      habitacao: {
        qtd_comodos: habitacao.qtd_comodos || 0,
        qtd_dormitorios: habitacao.qtd_dormitorios || 0,
        tipo_construcao: habitacao.tipo_construcao,
        area_conflito: habitacao.area_conflito || false,
        condicao_domicilio: habitacao.condicao_domicilio,
        energia_eletrica: habitacao.energia_eletrica || "propria",
        agua: habitacao.agua || "propria",
        esgoto: habitacao.esgoto || "rede",
        coleta_lixo: habitacao.coleta_lixo !== undefined ? !!habitacao.coleta_lixo : true,
      },
      trabalho_renda: trabalhoRendaResult[0] || {
        quem_trabalha: "",
        rendimento_total: 0,
      },
      programas_sociais: programasSociaisResult.map((programa) => ({
        programa_id: programa.programa_id,
        programa_nome: programa.programa_nome,
        programa_codigo: programa.programa_codigo,
        valor: programa.valor,
      })),
      despesas: despesasResult.map((despesa) => ({
        tipo_despesa_id: despesa.tipo_despesa_id,
        tipo_nome: despesa.tipo_nome,
        tipo_codigo: despesa.tipo_codigo,
        valor: despesa.valor,
      })),
      situacao_social: {
        ...(situacaoSocialResult[0] || {
          participa_religiao: false,
          religiao_qual: "",
          participa_acao_social: false,
          acao_social_qual: "",
          observacoes: "",
        }),
        servicos_publicos: servicosPublicosResult.map((s) => s.tipo),
      },
    }

    res.json(familiaCompleta)
  } catch (error) {
    console.error("❌ ERRO ao buscar família:", error)
    res.status(500).json({
      message: "Erro interno do servidor",
      error: error.message,
    })
  }
})

router.put("/familias/:id", verifyToken, async (req, res) => {
  console.log("🔄 ROTA PUT /familias/:id CHAMADA!")

  let db // <-- CORREÇÃO: Variável declarada fora do try

  try {
    db = await connectToDatabase() // <-- CORREÇÃO: Atribuída dentro do try

    const familia_id = Number.parseInt(req.params.id)

    if (isNaN(familia_id)) {
      return res.status(400).json({ message: "ID da família inválido" })
    }

    const [familiaAntiga] = await db.query(
      `
      SELECT f.*,
             p.nome_completo, p.data_nascimento, p.sexo, p.cpf, p.rg, p.orgao_expedidor,
             p.estado_civil, p.naturalidade, p.telefone, p.telefone_recado, p.email,
             p.nis, p.titulo_eleitor, p.ctps, p.escolaridade, p.ocupacao, p.renda_mensal,
             e.logradouro, e.numero, e.complemento, e.bairro, e.cidade, e.uf, e.cep,
             e.referencia, e.tempo_moradia,
             s.tem_deficiencia, s.deficiencia_qual, s.tem_tratamento_saude, s.tratamento_qual,
             s.usa_medicacao_continua, s.medicacao_qual, s.tem_dependente_cuidados, s.dependente_quem,
             s.observacoes as saude_observacoes,
             h.qtd_comodos, h.qtd_dormitorios, h.tipo_construcao, h.area_conflito,
             h.condicao_domicilio, h.energia_eletrica, h.agua, h.esgoto, h.coleta_lixo,
             tr.quem_trabalha, tr.rendimento_total, tr.observacoes as trabalho_observacoes,
             ss.participa_religiao, ss.religiao_qual, ss.participa_acao_social, ss.acao_social_qual,
             ss.observacoes as situacao_observacoes
      FROM familias f
      LEFT JOIN pessoas p ON f.id = p.familia_id AND p.tipo_membro = 'responsavel'
      LEFT JOIN enderecos e ON f.id = e.familia_id
      LEFT JOIN saude s ON f.id = s.familia_id
      LEFT JOIN habitacao h ON f.id = h.familia_id
      LEFT JOIN trabalho_renda tr ON f.id = tr.familia_id
      LEFT JOIN situacao_social ss ON f.id = ss.familia_id
      WHERE f.id = ?
    `,
      [familia_id],
    )

    if (familiaAntiga.length === 0) {
      return res.status(404).json({ message: "Família não encontrada" })
    }

    await db.beginTransaction()

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
      situacao_social,
    } = req.body

    // Validações básicas
    if (!responsavel?.nome_completo) {
      throw new Error("Nome do responsável é obrigatório")
    }
    if (!endereco?.logradouro) {
      throw new Error("Logradouro é obrigatório")
    }
    if (!profissional_id) {
      throw new Error("Profissional responsável é obrigatório")
    }
    if (!equipamento_id) {
      throw new Error("Equipamento é obrigatório")
    }

    // Verificar se a família existe
    const [familiaExiste] = await db.query("SELECT id FROM familias WHERE id = ?", [familia_id])
    if (familiaExiste.length === 0) {
      throw new Error("Família não encontrada")
    }

    // 1. Atualizar dados básicos da família
    await db.query(
      `
            UPDATE familias SET
                equipamento_id = ?,
                data_atendimento = ?,
                profissional_id = ?,
                updated_at = NOW()
            WHERE id = ?
        `,
      [equipamento_id, data_atendimento, profissional_id, familia_id],
    )

    // 2. Atualizar responsável familiar
    await db.query(
      `
            UPDATE pessoas SET
                nome_completo = ?, data_nascimento = ?, sexo = ?, cpf = ?, rg = ?, orgao_expedidor = ?,
                estado_civil = ?, escolaridade = ?, naturalidade = ?, telefone = ?,
                telefone_recado = ?, email = ?, nis = ?, titulo_eleitor = ?, ctps = ?,
                ocupacao = ?, renda_mensal = ?
            WHERE familia_id = ? AND tipo_membro = 'responsavel'
        `,
      [
        responsavel.nome_completo || "",
        responsavel.data_nascimento || null,
        responsavel.sexo || "feminino",
        responsavel.cpf || "",
        responsavel.rg || "",
        responsavel.orgao_expedidor || "",
        responsavel.estado_civil || "",
        responsavel.escolaridade || "",
        responsavel.naturalidade || "",
        responsavel.telefone || "",
        responsavel.telefone_recado || "",
        responsavel.email || "",
        responsavel.nis || "",
        responsavel.titulo_eleitor || "",
        responsavel.ctps || "",
        responsavel.ocupacao || "",
        responsavel.renda_mensal || 0,
        familia_id,
      ],
    )

    // 3. Atualizar endereço
    await db.query(
      `
            UPDATE enderecos SET
                logradouro = ?, numero = ?, complemento = ?, bairro = ?, cidade = ?,
                uf = ?, cep = ?, referencia = ?, tempo_moradia = ?
            WHERE familia_id = ?
        `,
      [
        endereco.logradouro || "",
        endereco.numero || "",
        endereco.complemento || "",
        endereco.bairro || "",
        endereco.cidade || "",
        endereco.uf || "",
        endereco.cep || "",
        endereco.referencia || "",
        endereco.tempo_moradia || "",
        familia_id,
      ],
    )

    // 4. Atualizar dados de saúde
    await db.query(
      `
            UPDATE saude SET
                tem_deficiencia = ?, deficiencia_qual = ?, tem_tratamento_saude = ?,
                tratamento_qual = ?, usa_medicacao_continua = ?, medicacao_qual = ?,
                tem_dependente_cuidados = ?, dependente_quem = ?, observacoes = ?
            WHERE familia_id = ?
        `,
      [
        saude?.tem_deficiencia || false,
        saude?.deficiencia_qual || "",
        saude?.tem_tratamento_saude || false,
        saude?.tratamento_qual || "",
        saude?.usa_medicacao_continua || false,
        saude?.medicacao_qual || "",
        saude?.tem_dependente_cuidados || false,
        saude?.dependente_quem || "",
        saude?.observacoes || "",
        familia_id,
      ],
    )

    // 5. Atualizar dados de habitação
    // <-- CORREÇÃO: Lógica antiga de array removida
    await db.query(
      `
            UPDATE habitacao SET
                qtd_comodos = ?,qtd_dormitorios = ?, tipo_construcao = ?,
                area_conflito = ?, condicao_domicilio = ?, energia_eletrica = ?,
                agua = ?, esgoto = ?, coleta_lixo = ?
            WHERE familia_id = ?
        `,
      [
        habitacao?.qtd_comodos || 0,
        habitacao?.qtd_dormitorios || 0,
        habitacao?.tipo_construcao || "alvenaria", // <-- CORREÇÃO: Passando o valor string diretamente
        habitacao?.area_conflito || false,
        habitacao?.condicao_domicilio || "propria_quitada", // <-- CORREÇÃO: Passando o valor string diretamente
        habitacao?.energia_eletrica || "propria",
        habitacao?.agua || "propria",
        habitacao?.esgoto || "rede",
        habitacao?.coleta_lixo !== undefined ? habitacao.coleta_lixo : true,
        familia_id,
      ],
    )

    // 6. Atualizar trabalho e renda
    await db.query(
      `
            UPDATE trabalho_renda SET
                quem_trabalha = ?, rendimento_total = ?, observacoes = ?
            WHERE familia_id = ?
        `,
      [
        trabalho_renda?.quem_trabalha || "",
        trabalho_renda?.rendimento_total || 0,
        trabalho_renda?.observacoes || "",
        familia_id,
      ],
    )

    // 7. Atualizar situação social
    await db.query(
      `
            UPDATE situacao_social SET
                participa_religiao = ?, religiao_qual = ?, participa_acao_social = ?,
                acao_social_qual = ?, observacoes = ?
            WHERE familia_id = ?
        `,
      [
        situacao_social?.participa_religiao || false,
        situacao_social?.religiao_qual || "",
        situacao_social?.participa_acao_social || false,
        situacao_social?.acao_social_qual || "",
        situacao_social?.observacoes || "",
        familia_id,
      ],
    )

    // 8. Atualizar integrantes
    await db.query('DELETE FROM pessoas WHERE familia_id = ? AND tipo_membro != "responsavel"', [familia_id])

    if (integrantes && Array.isArray(integrantes) && integrantes.length > 0) {
      for (const integrante of integrantes) {
        await db.query(
          `
                    INSERT INTO pessoas (
                        familia_id, nome_completo, data_nascimento, sexo, cpf, rg,
                        estado_civil, escolaridade, naturalidade, telefone, telefone_recado,
                        email, nis, titulo_eleitor, ctps, tipo_membro, ocupacao, renda_mensal
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `,
          [
            familia_id,
            integrante.nome_completo || "",
            integrante.data_nascimento || null,
            integrante.sexo || "Outro",
            integrante.cpf || "",
            integrante.rg || "",
            integrante.estado_civil || "",
            integrante.escolaridade || "",
            integrante.naturalidade || "",
            integrante.telefone || "",
            integrante.telefone_recado || "",
            integrante.email || "",
            integrante.nis || "",
            integrante.titulo_eleitor || "",
            integrante.ctps || "",
            integrante.tipo_membro || "filho",
            integrante.ocupacao || "",
            integrante.renda_mensal || 0,
          ],
        )
      }
    }

    // 9. Atualizar programas sociais
    await db.query("DELETE FROM familia_programas_sociais WHERE familia_id = ?", [familia_id])

    if (programas_sociais && Array.isArray(programas_sociais) && programas_sociais.length > 0) {
      for (const programa of programas_sociais) {
        await db.query(
          `
                    INSERT INTO familia_programas_sociais (
                        familia_id, programa_id, valor, ativo
                    ) VALUES (?, ?, ?, TRUE)
                `,
          [familia_id, programa.programa_id, programa.valor || 0],
        )
      }
    }

    // 10. Atualizar despesas
    await db.query("DELETE FROM familia_despesas WHERE familia_id = ?", [familia_id])

    if (despesas && Array.isArray(despesas) && despesas.length > 0) {
      for (const despesa of despesas) {
        if (despesa.valor > 0) {
          await db.query(
            `
                        INSERT INTO familia_despesas (
                            familia_id, tipo_despesa_id, valor
                        ) VALUES (?, ?, ?)
                    `,
            [familia_id, despesa.tipo_despesa_id, despesa.valor],
          )
        }
      }
    }

    // 11. Atualizar serviços públicos
    await db.query("DELETE FROM familia_servicos_publicos WHERE familia_id = ?", [familia_id])

    if (situacao_social?.servicos_publicos && Array.isArray(situacao_social.servicos_publicos)) {
      for (const servico of situacao_social.servicos_publicos) {
        await db.query(
          `
                    INSERT INTO familia_servicos_publicos (familia_id, tipo)
                    VALUES (?, ?)
                `,
          [familia_id, servico],
        )
      }
    }

    const alteracoes = []
    const old = familiaAntiga[0]

    // Responsável fields
    if (old.nome_completo !== responsavel.nome_completo) {
      alteracoes.push({
        campo: "Nome do Responsável",
        valor_antigo: old.nome_completo || "",
        valor_novo: responsavel.nome_completo || "",
      })
    }

    if (old.cpf !== responsavel.cpf) {
      alteracoes.push({
        campo: "CPF",
        valor_antigo: old.cpf || "",
        valor_novo: responsavel.cpf || "",
      })
    }

    if (old.rg !== responsavel.rg) {
      alteracoes.push({
        campo: "RG",
        valor_antigo: old.rg || "",
        valor_novo: responsavel.rg || "",
      })
    }

    if (old.orgao_expedidor !== responsavel.orgao_expedidor) {
      alteracoes.push({
        campo: "Órgão Expedidor",
        valor_antigo: old.orgao_expedidor || "",
        valor_novo: responsavel.orgao_expedidor || "",
      })
    }

    if (old.data_nascimento !== responsavel.data_nascimento) {
      alteracoes.push({
        campo: "Data de Nascimento",
        valor_antigo: old.data_nascimento || "",
        valor_novo: responsavel.data_nascimento || "",
      })
    }

    if (old.sexo !== responsavel.sexo) {
      alteracoes.push({
        campo: "Sexo",
        valor_antigo: old.sexo || "",
        valor_novo: responsavel.sexo || "",
      })
    }

    if (old.estado_civil !== responsavel.estado_civil) {
      alteracoes.push({
        campo: "Estado Civil",
        valor_antigo: old.estado_civil || "",
        valor_novo: responsavel.estado_civil || "",
      })
    }

    if (old.naturalidade !== responsavel.naturalidade) {
      alteracoes.push({
        campo: "Naturalidade",
        valor_antigo: old.naturalidade || "",
        valor_novo: responsavel.naturalidade || "",
      })
    }

    if (old.telefone !== responsavel.telefone) {
      alteracoes.push({
        campo: "Telefone",
        valor_antigo: old.telefone || "",
        valor_novo: responsavel.telefone || "",
      })
    }

    if (old.telefone_recado !== responsavel.telefone_recado) {
      alteracoes.push({
        campo: "Telefone de Recado",
        valor_antigo: old.telefone_recado || "",
        valor_novo: responsavel.telefone_recado || "",
      })
    }

    if (old.email !== responsavel.email) {
      alteracoes.push({
        campo: "Email",
        valor_antigo: old.email || "",
        valor_novo: responsavel.email || "",
      })
    }

    if (old.nis !== responsavel.nis) {
      alteracoes.push({
        campo: "NIS",
        valor_antigo: old.nis || "",
        valor_novo: responsavel.nis || "",
      })
    }

    if (old.titulo_eleitor !== responsavel.titulo_eleitor) {
      alteracoes.push({
        campo: "Título de Eleitor",
        valor_antigo: old.titulo_eleitor || "",
        valor_novo: responsavel.titulo_eleitor || "",
      })
    }

    if (old.ctps !== responsavel.ctps) {
      alteracoes.push({
        campo: "CTPS",
        valor_antigo: old.ctps || "",
        valor_novo: responsavel.ctps || "",
      })
    }

    if (old.escolaridade !== responsavel.escolaridade) {
      alteracoes.push({
        campo: "Escolaridade",
        valor_antigo: old.escolaridade || "",
        valor_novo: responsavel.escolaridade || "",
      })
    }

    if (old.ocupacao !== responsavel.ocupacao) {
      alteracoes.push({
        campo: "Ocupação",
        valor_antigo: old.ocupacao || "",
        valor_novo: responsavel.ocupacao || "",
      })
    }

    if (old.renda_mensal !== responsavel.renda_mensal) {
      alteracoes.push({
        campo: "Renda Mensal",
        valor_antigo: String(old.renda_mensal || 0),
        valor_novo: String(responsavel.renda_mensal || 0),
      })
    }

    // Endereço fields
    if (old.logradouro !== endereco.logradouro) {
      alteracoes.push({
        campo: "Logradouro",
        valor_antigo: old.logradouro || "",
        valor_novo: endereco.logradouro || "",
      })
    }

    if (old.numero !== endereco.numero) {
      alteracoes.push({
        campo: "Número",
        valor_antigo: old.numero || "",
        valor_novo: endereco.numero || "",
      })
    }

    if (old.complemento !== endereco.complemento) {
      alteracoes.push({
        campo: "Complemento",
        valor_antigo: old.complemento || "",
        valor_novo: endereco.complemento || "",
      })
    }

    if (old.bairro !== endereco.bairro) {
      alteracoes.push({
        campo: "Bairro",
        valor_antigo: old.bairro || "",
        valor_novo: endereco.bairro || "",
      })
    }

    if (old.cidade !== endereco.cidade) {
      alteracoes.push({
        campo: "Cidade",
        valor_antigo: old.cidade || "",
        valor_novo: endereco.cidade || "",
      })
    }

    if (old.uf !== endereco.uf) {
      alteracoes.push({
        campo: "UF",
        valor_antigo: old.uf || "",
        valor_novo: endereco.uf || "",
      })
    }

    if (old.cep !== endereco.cep) {
      alteracoes.push({
        campo: "CEP",
        valor_antigo: old.cep || "",
        valor_novo: endereco.cep || "",
      })
    }

    if (old.referencia !== endereco.referencia) {
      alteracoes.push({
        campo: "Ponto de Referência",
        valor_antigo: old.referencia || "",
        valor_novo: endereco.referencia || "",
      })
    }

    if (old.tempo_moradia !== endereco.tempo_moradia) {
      alteracoes.push({
        campo: "Tempo de Moradia",
        valor_antigo: old.tempo_moradia || "",
        valor_novo: endereco.tempo_moradia || "",
      })
    }

    if (old.tem_deficiencia !== (saude?.tem_deficiencia || false)) {
      alteracoes.push({
        campo: "Tem Deficiência",
        valor_antigo: old.tem_deficiencia ? "Sim" : "Não",
        valor_novo: saude?.tem_deficiencia || false ? "Sim" : "Não",
      })
    }

    if (old.deficiencia_qual !== (saude?.deficiencia_qual || "")) {
      alteracoes.push({
        campo: "Qual Deficiência",
        valor_antigo: old.deficiencia_qual || "",
        valor_novo: saude?.deficiencia_qual || "",
      })
    }

    if (old.tem_tratamento_saude !== (saude?.tem_tratamento_saude || false)) {
      alteracoes.push({
        campo: "Tem Tratamento de Saúde",
        valor_antigo: old.tem_tratamento_saude ? "Sim" : "Não",
        valor_novo: saude?.tem_tratamento_saude || false ? "Sim" : "Não",
      })
    }

    if (old.tratamento_qual !== (saude?.tratamento_qual || "")) {
      alteracoes.push({
        campo: "Qual Tratamento",
        valor_antigo: old.tratamento_qual || "",
        valor_novo: saude?.tratamento_qual || "",
      })
    }

    if (old.usa_medicacao_continua !== (saude?.usa_medicacao_continua || false)) {
      alteracoes.push({
        campo: "Usa Medicação Contínua",
        valor_antigo: old.usa_medicacao_continua ? "Sim" : "Não",
        valor_novo: saude?.usa_medicacao_continua || false ? "Sim" : "Não",
      })
    }

    if (old.medicacao_qual !== (saude?.medicacao_qual || "")) {
      alteracoes.push({
        campo: "Qual Medicação",
        valor_antigo: old.medicacao_qual || "",
        valor_novo: saude?.medicacao_qual || "",
      })
    }

    if (old.tem_dependente_cuidados !== (saude?.tem_dependente_cuidados || false)) {
      alteracoes.push({
        campo: "Tem Dependente com Cuidados Especiais",
        valor_antigo: old.tem_dependente_cuidados ? "Sim" : "Não",
        valor_novo: saude?.tem_dependente_cuidados || false ? "Sim" : "Não",
      })
    }

    if (old.dependente_quem !== (saude?.dependente_quem || "")) {
      alteracoes.push({
        campo: "Quem é o Dependente",
        valor_antigo: old.dependente_quem || "",
        valor_novo: saude?.dependente_quem || "",
      })
    }

    if (old.saude_observacoes !== (saude?.observacoes || "")) {
      alteracoes.push({
        campo: "Observações de Saúde",
        valor_antigo: old.saude_observacoes || "",
        valor_novo: saude?.observacoes || "",
      })
    }

    if (old.qtd_comodos !== (habitacao?.qtd_comodos || 0)) {
      alteracoes.push({
        campo: "Quantidade de Cômodos",
        valor_antigo: String(old.qtd_comodos || 0),
        valor_novo: String(habitacao?.qtd_comodos || 0),
      })
    }

    if (old.qtd_dormitorios !== (habitacao?.qtd_dormitorios || 0)) {
      alteracoes.push({
        campo: "Quantidade de Dormitórios",
        valor_antigo: String(old.qtd_dormitorios || 0),
        valor_novo: String(habitacao?.qtd_dormitorios || 0),
      })
    }

    if (old.tipo_construcao !== (habitacao?.tipo_construcao || "alvenaria")) {
      alteracoes.push({
        campo: "Tipo de Construção",
        valor_antigo: old.tipo_construcao || "",
        valor_novo: habitacao?.tipo_construcao || "",
      })
    }

    if (old.area_conflito !== (habitacao?.area_conflito || false)) {
      alteracoes.push({
        campo: "Área de Risco/Conflito",
        valor_antigo: old.area_conflito ? "Sim" : "Não",
        valor_novo: habitacao?.area_conflito || false ? "Sim" : "Não",
      })
    }

    if (old.condicao_domicilio !== (habitacao?.condicao_domicilio || "propria_quitada")) {
      alteracoes.push({
        campo: "Condição do Domicílio",
        valor_antigo: old.condicao_domicilio || "",
        valor_novo: habitacao?.condicao_domicilio || "",
      })
    }

    if (old.energia_eletrica !== (habitacao?.energia_eletrica || "propria")) {
      alteracoes.push({
        campo: "Energia Elétrica",
        valor_antigo: old.energia_eletrica || "",
        valor_novo: habitacao?.energia_eletrica || "",
      })
    }

    if (old.agua !== (habitacao?.agua || "propria")) {
      alteracoes.push({
        campo: "Abastecimento de Água",
        valor_antigo: old.agua || "",
        valor_novo: habitacao?.agua || "",
      })
    }

    if (old.esgoto !== (habitacao?.esgoto || "rede")) {
      alteracoes.push({
        campo: "Esgotamento Sanitário",
        valor_antigo: old.esgoto || "",
        valor_novo: habitacao?.esgoto || "",
      })
    }

    const oldColetaLixo = old.coleta_lixo !== undefined ? old.coleta_lixo : true
    const newColetaLixo = habitacao?.coleta_lixo !== undefined ? habitacao.coleta_lixo : true
    if (oldColetaLixo !== newColetaLixo) {
      alteracoes.push({
        campo: "Coleta de Lixo",
        valor_antigo: oldColetaLixo ? "Sim" : "Não",
        valor_novo: newColetaLixo ? "Sim" : "Não",
      })
    }

    if (old.quem_trabalha !== (trabalho_renda?.quem_trabalha || "")) {
      alteracoes.push({
        campo: "Quem Trabalha",
        valor_antigo: old.quem_trabalha || "",
        valor_novo: trabalho_renda?.quem_trabalha || "",
      })
    }

    if (old.rendimento_total !== (trabalho_renda?.rendimento_total || 0)) {
      alteracoes.push({
        campo: "Rendimento Total",
        valor_antigo: `R$ ${old.rendimento_total || 0}`,
        valor_novo: `R$ ${trabalho_renda?.rendimento_total || 0}`,
      })
    }

    if (old.trabalho_observacoes !== (trabalho_renda?.observacoes || "")) {
      alteracoes.push({
        campo: "Observações de Trabalho/Renda",
        valor_antigo: old.trabalho_observacoes || "",
        valor_novo: trabalho_renda?.observacoes || "",
      })
    }

    if (old.participa_religiao !== (situacao_social?.participa_religiao || false)) {
      alteracoes.push({
        campo: "Participa de Religião",
        valor_antigo: old.participa_religiao ? "Sim" : "Não",
        valor_novo: situacao_social?.participa_religiao || false ? "Sim" : "Não",
      })
    }

    if (old.religiao_qual !== (situacao_social?.religiao_qual || "")) {
      alteracoes.push({
        campo: "Qual Religião",
        valor_antigo: old.religiao_qual || "",
        valor_novo: situacao_social?.religiao_qual || "",
      })
    }

    if (old.participa_acao_social !== (situacao_social?.participa_acao_social || false)) {
      alteracoes.push({
        campo: "Participa de Ação Social",
        valor_antigo: old.participa_acao_social ? "Sim" : "Não",
        valor_novo: situacao_social?.participa_acao_social || false ? "Sim" : "Não",
      })
    }

    if (old.acao_social_qual !== (situacao_social?.acao_social_qual || "")) {
      alteracoes.push({
        campo: "Qual Ação Social",
        valor_antigo: old.acao_social_qual || "",
        valor_novo: situacao_social?.acao_social_qual || "",
      })
    }

    if (old.situacao_observacoes !== (situacao_social?.observacoes || "")) {
      alteracoes.push({
        campo: "Observações de Situação Social",
        valor_antigo: old.situacao_observacoes || "",
        valor_novo: situacao_social?.observacoes || "",
      })
    }

    const [oldProgramas] = await db.query(
      `SELECT programa_id, valor FROM familia_programas_sociais WHERE familia_id = ?`,
      [familia_id],
    )

    const oldProgramasMap = new Map(oldProgramas.map((p) => [p.programa_id, p.valor]))
    const newProgramasMap = new Map((programas_sociais || []).map((p) => [p.programa_id, p.valor]))

    // Check for removed programs
    for (const [programaId, valor] of oldProgramasMap) {
      if (!newProgramasMap.has(programaId)) {
        const [programaInfo] = await db.query(`SELECT nome FROM programas_sociais WHERE id = ?`, [programaId])
        alteracoes.push({
          campo: `Programa Social Removido`,
          valor_antigo: `${programaInfo[0]?.nome || "Programa"} (R$ ${valor})`,
          valor_novo: "",
        })
      }
    }

    // Check for added or modified programs
    for (const [programaId, valor] of newProgramasMap) {
      const [programaInfo] = await db.query(`SELECT nome FROM programas_sociais WHERE id = ?`, [programaId])
      const programaNome = programaInfo[0]?.nome || "Programa"

      if (!oldProgramasMap.has(programaId)) {
        alteracoes.push({
          campo: `Programa Social Adicionado`,
          valor_antigo: "",
          valor_novo: `${programaNome} (R$ ${valor})`,
        })
      } else if (oldProgramasMap.get(programaId) !== valor) {
        alteracoes.push({
          campo: `Valor do Programa ${programaNome}`,
          valor_antigo: `R$ ${oldProgramasMap.get(programaId)}`,
          valor_novo: `R$ ${valor}`,
        })
      }
    }

    const [oldDespesas] = await db.query(`SELECT tipo_despesa_id, valor FROM familia_despesas WHERE familia_id = ?`, [
      familia_id,
    ])

    const oldDespesasMap = new Map(oldDespesas.map((d) => [d.tipo_despesa_id, d.valor]))
    const newDespesasMap = new Map((despesas || []).filter((d) => d.valor > 0).map((d) => [d.tipo_despesa_id, d.valor]))

    // Check for removed expenses
    for (const [tipoId, valor] of oldDespesasMap) {
      if (!newDespesasMap.has(tipoId)) {
        const [tipoInfo] = await db.query(`SELECT nome FROM tipos_despesas WHERE id = ?`, [tipoId])
        alteracoes.push({
          campo: `Despesa Removida`,
          valor_antigo: `${tipoInfo[0]?.nome || "Despesa"} (R$ ${valor})`,
          valor_novo: "",
        })
      }
    }

    // Check for added or modified expenses
    for (const [tipoId, valor] of newDespesasMap) {
      const [tipoInfo] = await db.query(`SELECT nome FROM tipos_despesas WHERE id = ?`, [tipoId])
      const tipoNome = tipoInfo[0]?.nome || "Despesa"

      if (!oldDespesasMap.has(tipoId)) {
        alteracoes.push({
          campo: `Despesa Adicionada`,
          valor_antigo: "",
          valor_novo: `${tipoNome} (R$ ${valor})`,
        })
      } else if (oldDespesasMap.get(tipoId) !== valor) {
        alteracoes.push({
          campo: `Valor da Despesa ${tipoNome}`,
          valor_antigo: `R$ ${oldDespesasMap.get(tipoId)}`,
          valor_novo: `R$ ${valor}`,
        })
      }
    }

    const [oldServicos] = await db.query(`SELECT tipo FROM familia_servicos_publicos WHERE familia_id = ?`, [
      familia_id,
    ])

    const oldServicosSet = new Set(oldServicos.map((s) => s.tipo))
    const newServicosSet = new Set(situacao_social?.servicos_publicos || [])

    // Check for removed services
    for (const servico of oldServicosSet) {
      if (!newServicosSet.has(servico)) {
        alteracoes.push({
          campo: `Serviço Público Removido`,
          valor_antigo: servico.toUpperCase(),
          valor_novo: "",
        })
      }
    }

    // Check for added services
    for (const servico of newServicosSet) {
      if (!oldServicosSet.has(servico)) {
        alteracoes.push({
          campo: `Serviço Público Adicionado`,
          valor_antigo: "",
          valor_novo: servico.toUpperCase(),
        })
      }
    }

    const [oldIntegrantes] = await db.query(
      `SELECT nome_completo, cpf, tipo_membro FROM pessoas WHERE familia_id = ? AND tipo_membro != 'responsavel'`,
      [familia_id],
    )

    const oldIntegrantesSet = new Set(oldIntegrantes.map((i) => `${i.nome_completo}|${i.cpf}`))
    const newIntegrantesSet = new Set((integrantes || []).map((i) => `${i.nome_completo}|${i.cpf}`))

    // Check for removed members
    for (const integrante of oldIntegrantes) {
      const key = `${integrante.nome_completo}|${integrante.cpf}`
      if (!newIntegrantesSet.has(key)) {
        alteracoes.push({
          campo: `Integrante Removido`,
          valor_antigo: `${integrante.nome_completo} (${integrante.tipo_membro})`,
          valor_novo: "",
        })
      }
    }

    // Check for added members
    for (const integrante of integrantes || []) {
      const key = `${integrante.nome_completo}|${integrante.cpf}`
      if (!oldIntegrantesSet.has(key)) {
        alteracoes.push({
          campo: `Integrante Adicionado`,
          valor_antigo: "",
          valor_novo: `${integrante.nome_completo} (${integrante.tipo_membro})`,
        })
      }
    }

    if (alteracoes.length > 0) {
      await criarLogComMultiplasAlteracoes({
        usuario_id: req.userId,
        tipo_log: "atualizacao",
        entidade: "familia",
        entidade_id: familia_id,
        descricao: `Família atualizada - ${alteracoes.length} campo(s) modificado(s)`,
        ip_address: req.ip || req.connection.remoteAddress,
        alteracoes: alteracoes,
      })
    } else {
      // If no specific changes tracked, log general update
      await criarLog({
        usuario_id: req.userId,
        tipo_log: "atualizacao",
        entidade: "familia",
        entidade_id: familia_id,
        descricao: `Dados da família atualizados`,
        ip_address: req.ip || req.connection.remoteAddress,
      })
    }

    await db.commit()

    res.status(200).json({
      message: "Família atualizada com sucesso!",
      familia_id: familia_id,
    })
  } catch (error) {
    if (db) {
      // <-- CORREÇÃO: Verifica se 'db' existe antes do rollback
      await db.rollback()
    }
    console.error("❌ ERRO ao atualizar família:", error)
    res.status(500).json({
      message: error.message || "Erro ao atualizar família",
    })
  }
})

router.get("/familias/:id/evolucoes", verifyToken, async (req, res) => {
  const db = await connectToDatabase()

  try {
    const familia_id = Number.parseInt(req.params.id)
    const usuario_id = req.userId

    if (isNaN(familia_id)) {
      return res.status(400).json({ message: "ID da família inválido" })
    }

    const [userResult] = await db.query("SELECT cargo_id FROM usuarios WHERE id = ?", [usuario_id])

    if (userResult.length === 0) {
      return res.status(403).json({ message: "Usuário não encontrado" })
    }

    const cargo_id = userResult[0].cargo_id
    const podeVisualizar = cargo_id === 1 || cargo_id === 2 || cargo_id === 3

    if (!podeVisualizar) {
      return res.status(403).json({
        message: "Você não tem permissão para visualizar evoluções",
      })
    }

    const [evolucoes] = await db.query(
      `
            SELECT
                e.*,
                u.nome as usuario_nome,
                c.nome as usuario_cargo
            FROM evolucoes e
            JOIN usuarios u ON e.usuario_id = u.id
            JOIN cargos c ON u.cargo_id = c.id
            WHERE e.familia_id = ?
            ORDER BY e.data_evolucao DESC, e.hora_evolucao DESC
        `,
      [familia_id],
    )

    res.json(evolucoes)
  } catch (error) {
    console.error("❌ Erro ao buscar evoluções:", error)
    res.status(500).json({
      message: "Erro ao buscar evoluções",
      error: error.message,
    })
  }
})

router.post("/familias/:id/evolucoes", verifyToken, async (req, res) => {
  const db = await connectToDatabase()

  try {
    const familia_id = Number.parseInt(req.params.id)
    const usuario_id = req.userId
    const { descricao } = req.body

    if (isNaN(familia_id)) {
      return res.status(400).json({ message: "ID da família inválido" })
    }

    if (!descricao || descricao.trim() === "") {
      return res.status(400).json({ message: "Descrição é obrigatória" })
    }

    const [userResult] = await db.query("SELECT cargo_id FROM usuarios WHERE id = ?", [usuario_id])

    if (userResult.length === 0) {
      return res.status(403).json({ message: "Usuário não encontrado" })
    }

    const cargo_id = userResult[0].cargo_id
    const podeCadastrar = cargo_id === 2 || cargo_id === 3

    if (!podeCadastrar) {
      return res.status(403).json({
        message: "Apenas técnicos e coordenadores podem registrar evoluções",
      })
    }

    const [familiaResult] = await db.query("SELECT id FROM familias WHERE id = ?", [familia_id])

    if (familiaResult.length === 0) {
      return res.status(404).json({ message: "Família não encontrada" })
    }

    const dataAtual = new Date()
    const data_evolucao = dataAtual.toISOString().split("T")[0]
    const hora_evolucao = dataAtual.toTimeString().split(" ")[0]

    const [result] = await db.query(
      `
            INSERT INTO evolucoes (
                familia_id,
                usuario_id,
                data_evolucao,
                hora_evolucao,
                descricao
            ) VALUES (?, ?, ?, ?, ?)
        `,
      [familia_id, usuario_id, data_evolucao, hora_evolucao, descricao],
    )

    // Log evolution creation
    await criarLog({
      usuario_id: usuario_id,
      tipo_log: "criacao",
      entidade: "evolucoes",
      entidade_id: result.insertId,
      descricao: `Evolução registrada para a família ID ${familia_id}`,
      ip_address: req.ip || req.connection.remoteAddress,
    })

    res.status(201).json({
      message: "Evolução registrada com sucesso",
      id: result.insertId,
    })
  } catch (error) {
    console.error("❌ Erro ao criar evolução:", error)
    res.status(500).json({
      message: "Erro ao registrar evolução",
      error: error.message,
    })
  }
})

router.post("/familias/:id/encaminhamentos", verifyToken, async (req, res) => {
  const db = await connectToDatabase()

  try {
    const familia_id = Number.parseInt(req.params.id)
    const usuario_id = req.userId
    const { evolucao_id, locais_ids } = req.body

    if (isNaN(familia_id)) {
      return res.status(400).json({ message: "ID da família inválido" })
    }

    const [userResult] = await db.query("SELECT cargo_id FROM usuarios WHERE id = ?", [usuario_id])

    if (userResult.length === 0) {
      return res.status(403).json({ message: "Usuário não encontrado" })
    }

    const cargo_id = userResult[0].cargo_id
    const podeCadastrar = cargo_id === 2 || cargo_id === 3

    if (!podeCadastrar) {
      return res.status(403).json({
        message: "Apenas técnicos e coordenadores podem registrar encaminhamentos",
      })
    }

    if (!locais_ids || !Array.isArray(locais_ids) || locais_ids.length === 0) {
      return res.status(400).json({ message: "Selecione pelo menos um local de encaminhamento" })
    }

    const [familiaResult] = await db.query("SELECT id FROM familias WHERE id = ?", [familia_id])

    if (familiaResult.length === 0) {
      return res.status(404).json({ message: "Família não encontrada" })
    }

    if (evolucao_id) {
      const [evolucaoResult] = await db.query("SELECT id FROM evolucoes WHERE id = ? AND familia_id = ?", [
        evolucao_id,
        familia_id,
      ])

      if (evolucaoResult.length === 0) {
        return res.status(404).json({ message: "Evolução não encontrada" })
      }
    }

    const data_encaminhamento = new Date().toISOString().split("T")[0]
    const encaminhamentosInseridos = []

    for (const local_id of locais_ids) {
      const [localResult] = await db.query("SELECT id FROM local_encaminhamento WHERE id = ?", [local_id])

      if (localResult.length === 0) {
        continue
      }

      const [result] = await db.query(
        `
                INSERT INTO encaminhamentos (
                    familia_id,
                    evolucao_id,
                    local_encaminhamento_id,
                    data_encaminhamento,
                    responsavel_id
                ) VALUES (?, ?, ?, ?, ?)
            `,
        [familia_id, evolucao_id || null, local_id, data_encaminhamento, usuario_id],
      )

      encaminhamentosInseridos.push(result.insertId)
    }

    // Log encaminhamento creation
    await criarLog({
      usuario_id: usuario_id,
      tipo_log: "criacao",
      entidade: "encaminhamentos",
      entidade_id: encaminhamentosInseridos.join(", "), // Pode ser uma lista de IDs
      descricao: `Encaminhamento(s) registrado(s) para a família ID ${familia_id} para ${locais_ids.length} local(is)`,
      ip_address: req.ip || req.connection.remoteAddress,
    })

    res.status(201).json({
      message: "Encaminhamentos registrados com sucesso",
      ids: encaminhamentosInseridos,
    })
  } catch (error) {
    console.error("❌ Erro ao criar encaminhamentos:", error)
    res.status(500).json({
      message: "Erro ao registrar encaminhamentos",
      error: error.message,
    })
  }
})

router.get("/usuarios", verifyToken, async (req, res) => {
  try {
    const db = await connectToDatabase()

    const [userResult] = await db.query(
      `
            SELECT c.nome as cargo_nome
            FROM usuarios u
            JOIN cargos c ON u.cargo_id = c.id
            WHERE u.id = ?
        `,
      [req.userId],
    )

    const cargosPermitidos = ["DIRETOR", "COORDENADOR"]
    if (userResult.length === 0 || !cargosPermitidos.includes(userResult[0].cargo_nome)) {
      return res.status(403).json({ message: "Acesso negado. Permissão de Diretor ou Coordenador necessária." })
    }

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
        `)

    res.json(usuarios)
  } catch (error) {
    console.error("❌ Erro ao buscar usuários:", error)
    res.status(500).json({ message: "Erro interno ao buscar usuários" })
  }
})

router.put("/usuarios/:id/status", verifyToken, async (req, res) => {
  try {
    const db = await connectToDatabase()
    const usuario_id = Number.parseInt(req.params.id)

    if (isNaN(usuario_id)) {
      return res.status(400).json({ message: "ID do usuário inválido" })
    }

    const [userResult] = await db.query(
      `
            SELECT c.nome as cargo_nome
            FROM usuarios u
            JOIN cargos c ON u.cargo_id = c.id
            WHERE u.id = ?
        `,
      [req.userId],
    )

    const cargosPermitidos = ["DIRETOR", "COORDENADOR"]
    if (userResult.length === 0 || !cargosPermitidos.includes(userResult[0].cargo_nome)) {
      return res.status(403).json({ message: "Acesso negado. Apenas diretores ou coordenadores podem alterar status." })
    }

    const [usuarioExiste] = await db.query("SELECT id, nome, ativo FROM usuarios WHERE id = ?", [usuario_id])

    if (usuarioExiste.length === 0) {
      return res.status(404).json({ message: "Usuário não encontrado" })
    }

    if (req.userId === usuario_id && usuarioExiste[0].ativo) {
      return res.status(400).json({ message: "Você não pode inativar seu próprio usuário!" })
    }

    const novoStatus = !usuarioExiste[0].ativo

    const logId = await criarLog({
      usuario_id: req.userId,
      tipo_log: "atualizacao",
      entidade: "usuario",
      entidade_id: usuario_id,
      descricao: `Status do usuário ${usuarioExiste[0].nome} alterado`,
      ip_address: req.ip || req.connection.remoteAddress,
    })

    if (logId) {
      await criarLogAlteracao({
        log_id: logId,
        campo: "ativo",
        valor_antigo: usuarioExiste[0].ativo ? "Ativo" : "Inativo",
        valor_novo: novoStatus ? "Ativo" : "Inativo",
      })
    }

    await db.query("UPDATE usuarios SET ativo = ? WHERE id = ?", [novoStatus, usuario_id])

    res.json({
      message: `Usuário ${novoStatus ? "ativado" : "inativado"} com sucesso`,
      ativo: novoStatus,
    })
  } catch (error) {
    console.error("❌ Erro ao alterar status do usuário:", error)
    res.status(500).json({ message: "Erro ao alterar status do usuário" })
  }
})

router.put("/usuarios/:id/senha", verifyToken, async (req, res) => {
  try {
    const db = await connectToDatabase()
    const usuario_id = Number.parseInt(req.params.id)
    const { novaSenha } = req.body

    if (isNaN(usuario_id)) {
      return res.status(400).json({ message: "ID do usuário inválido" })
    }

    if (!novaSenha || novaSenha.trim().length < 6) {
      return res.status(400).json({ message: "Nova senha deve ter pelo menos 6 caracteres" })
    }

    const [userResult] = await db.query(
      `
            SELECT c.nome as cargo_nome
            FROM usuarios u
            JOIN cargos c ON u.cargo_id = c.id
            WHERE u.id = ?
        `,
      [req.userId],
    )

    const cargosPermitidos = ["DIRETOR", "COORDENADOR"]
    if (userResult.length === 0 || !cargosPermitidos.includes(userResult[0].cargo_nome)) {
      return res.status(403).json({ message: "Acesso negado. Apenas diretores ou coordenadores podem alterar senhas." })
    }

    const [usuarioExiste] = await db.query("SELECT id, nome FROM usuarios WHERE id = ?", [usuario_id])

    if (usuarioExiste.length === 0) {
      return res.status(404).json({ message: "Usuário não encontrado" })
    }

    const saltRounds = 10
    const senhaHash = await bcrypt.hash(novaSenha, saltRounds)

    await criarLog({
      usuario_id: req.userId,
      tipo_log: "atualizacao",
      entidade: "usuario",
      entidade_id: usuario_id,
      descricao: `Senha do usuário ${usuarioExiste[0].nome} alterada`,
      ip_address: req.ip || req.connection.remoteAddress,
    })

    await db.query("UPDATE usuarios SET senha_hash = ?, updated_at = NOW() WHERE id = ?", [senhaHash, usuario_id])

    res.json({
      message: "Senha alterada com sucesso",
      usuario: usuarioExiste[0].nome,
    })
  } catch (error) {
    console.error("❌ Erro ao alterar senha do usuário:", error)
    res.status(500).json({ message: "Erro interno do servidor ao alterar senha" })
  }
})

function isDateInPast(date) {
  const today = new Date()
  const inputDate = new Date(date)
  inputDate.setHours(0, 0, 0, 0)
  today.setHours(0, 0, 0, 0)
  return inputDate < today
}

router.post("/beneficios", verifyToken, async (req, res) => {
  let db
  try {
    db = await connectToDatabase()
    await db.beginTransaction()

    const {
      familia_id,
      autorizacao_id,
      tipo_beneficio,
      descricao_beneficio,
      valor,
      justificativa,
      data_entrega,
      observacoes,
      force,
    } = req.body

    const responsavel_id = req.userId

    if (!familia_id || !tipo_beneficio || !justificativa) {
      return res.status(400).json({ message: "Campos obrigatórios não preenchidos." })
    }

    if (autorizacao_id) {
      const [autorizacao] = await db.query(
        `SELECT * FROM autorizacoes_beneficios
         WHERE id = ? AND familia_id = ? AND status = 'ativa'
         AND data_validade >= CURDATE() AND quantidade_utilizada < quantidade`,
        [autorizacao_id, familia_id],
      )

      if (autorizacao.length === 0) {
        return res.status(400).json({
          message: "Autorização inválida, expirada ou já totalmente utilizada.",
        })
      }

      if (autorizacao[0].tipo_beneficio !== tipo_beneficio) {
        return res.status(400).json({
          message: "Tipo de benefício não corresponde à autorização.",
        })
      }
    }

    if (!force) {
      const [existingBenefits] = await db.query(
        `SELECT b.id, b.tipo_beneficio, p.nome_completo AS responsavel_familia_nome, f.prontuario
         FROM beneficios b
         LEFT JOIN familias f ON b.familia_id = f.id
         LEFT JOIN pessoas p ON f.id = p.familia_id AND p.tipo_membro = 'responsavel'
         WHERE
             b.familia_id = ? AND
             MONTH(b.data_entrega) = MONTH(CURDATE()) AND
             YEAR(b.data_entrega) = YEAR(CURDATE())
         LIMIT 1`,
        [familia_id],
      )

      if (existingBenefits.length > 0) {
        const { responsavel_familia_nome, tipo_beneficio: tipoBeneficioExistente, prontuario } = existingBenefits[0]
        return res.status(409).json({
          message: `ATENÇÃO: A família de ${responsavel_familia_nome || "um responsável"} (Prontuário: ${prontuario || "N/A"}) já recebeu um benefício do tipo "${tipoBeneficioExistente}" este mês. Deseja registrar a entrega mesmo assim?`,
          requiresConfirmation: true,
          existingBenefit: { responsavel_familia_nome, tipo_beneficio: tipoBeneficioExistente, prontuario },
        })
      }
    }

    const sqlQuery = `
        INSERT INTO beneficios (
            familia_id, autorizacao_id, tipo_beneficio, descricao_beneficio, valor,
            justificativa, responsavel_id, status, data_entrega, observacoes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    const params = [
      familia_id,
      autorizacao_id || null,
      tipo_beneficio,
      descricao_beneficio || "",
      valor || 0,
      justificativa,
      responsavel_id,
      "entregue",
      data_entrega,
      observacoes || "",
    ]

    const [result] = await db.query(sqlQuery, params)

    if (autorizacao_id) {
      await db.query(
        `UPDATE autorizacoes_beneficios
         SET quantidade_utilizada = quantidade_utilizada + 1,
             updated_at = NOW()
         WHERE id = ?`,
        [autorizacao_id],
      )

      await db.query(
        `UPDATE autorizacoes_beneficios
         SET status = 'utilizada'
         WHERE id = ? AND quantidade_utilizada >= quantidade`,
        [autorizacao_id],
      )
    }

    await db.commit()
    const beneficio_id = result.insertId

    const [beneficioInserido] = await db.query(
      `
        SELECT b.*, u.nome as responsavel_nome_str, f.prontuario, p.nome_completo as responsavel_nome
        FROM beneficios b
        LEFT JOIN familias f ON b.familia_id = f.id
        LEFT JOIN pessoas p ON f.id = p.familia_id AND p.tipo_membro = 'responsavel'
        LEFT JOIN usuarios u ON b.responsavel_id = u.id
        WHERE b.id = ?
    `,
      [beneficio_id],
    )

    await criarLog({
      usuario_id: responsavel_id,
      tipo_log: "entrega",
      entidade: "beneficio",
      entidade_id: beneficio_id,
      descricao: `Benefício "${tipo_beneficio}" registrado para a família ID ${beneficioInserido[0]?.familia_id} (Prontuário: ${beneficioInserido[0]?.prontuario || "N/A"}). Entregue por ${beneficioInserido[0]?.responsavel_nome_str || "N/A"}.`,
      ip_address: req.ip || req.connection.remoteAddress,
    })

    return res.status(201).json(beneficioInserido[0])
  } catch (err) {
    if (db) {
      await db.rollback()
    }
    console.error("Erro ao registrar benefício:", err)
    return res.status(500).json({ message: err.sqlMessage || err.message || "Erro interno do servidor" })
  }
})

router.get("/beneficios/historico", async (req, res) => {
  try {
    const db = await connectToDatabase()

    const [results] = await db.query(`
            SELECT
                b.id, b.familia_id, b.tipo_beneficio, b.descricao_beneficio,
                b.data_entrega, b.valor, b.justificativa, b.status,
                b.observacoes,
                COALESCE(p.nome_completo, 'Responsável não encontrado') as responsavel_nome,
                COALESCE(f.prontuario, 'Prontuário não encontrado') as prontuario
            FROM beneficios b
            LEFT JOIN familias f ON b.familia_id = f.id
            LEFT JOIN pessoas p ON f.id = p.familia_id AND p.tipo_membro = 'responsavel'
            ORDER BY b.data_entrega DESC, b.created_at DESC
            LIMIT 100
        `)

    res.json(results)
  } catch (error) {
    console.error("Erro ao buscar histórico de benefícios:", error)
    res.status(500).json({ message: "Erro ao buscar histórico", error: error.message })
  }
})

router.get("/beneficios/historico-completo", async (req, res) => {
  try {
    const db = await connectToDatabase()

    const [results] = await db.query(`
                SELECT
                    b.id,
                    b.familia_id,
                    b.tipo_beneficio,
                    b.descricao_beneficio,
                    b.valor,
                    b.justificativa,
                    b.status,
                    b.data_entrega,
                    b.observacoes,
                    b.created_at,
                    COALESCE(p.nome_completo, 'Nome não encontrado') as responsavel_nome,
                    COALESCE(f.prontuario, 'Prontuário não encontrado') as prontuario,
                    COALESCE(u.nome, 'Usuário não encontrado') as responsavel_id
                FROM beneficios b
                LEFT JOIN familias f ON b.familia_id = f.id
                LEFT JOIN pessoas p ON f.id = p.familia_id AND p.tipo_membro = 'responsavel'
                LEFT JOIN usuarios u ON b.responsavel_id = u.id
                ORDER BY b.created_at DESC
                LIMIT 50
            `)

    res.json(results)
  } catch (error) {
    console.error("❌ Erro ao buscar histórico completo:", error)
    res.status(500).json({
      message: "Erro ao buscar histórico completo",
      error: error.message,
    })
  }
})

router.put("/beneficios/:id/entregar", async (req, res) => {
  try {
    const { id } = req.params

    if (!id || isNaN(Number.parseInt(id)) || Number.parseInt(id) <= 0) {
      return res.status(400).json({ message: "ID do benefício inválido." })
    }

    const db = await connectToDatabase()

    const [beneficioAntes] = await db.query("SELECT * FROM beneficios WHERE id = ?", [id])

    if (beneficioAntes.length === 0) {
      return res.status(404).json({ message: "Benefício não encontrado com o ID fornecido." })
    }

    const [result] = await db.query(
      "UPDATE beneficios SET status = 'entregue', data_entrega = CURDATE() WHERE id = ?",
      [id],
    )

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Benefício não encontrado com o ID fornecido." })
    }

    const logId = await criarLog({
      usuario_id: req.userId || 1, // Assuming req.userId is available from verifyToken middleware
      tipo_log: "entrega", // Changed from 'atualizacao' to 'entrega' for specificity
      entidade: "beneficio",
      entidade_id: id,
      descricao: `Benefício entregue - ${beneficioAntes[0].tipo_beneficio}`, // More descriptive log message
      ip_address: req.ip || req.connection.remoteAddress,
    })

    await criarLogAlteracao({
      log_id: logId,
      campo: "status",
      valor_antigo: beneficioAntes[0].status,
      valor_novo: "entregue",
    })

    return res.status(200).json({ message: "Benefício marcado como entregue com sucesso!" })
  } catch (err) {
    console.error("💥 ERRO AO ATUALIZAR BENEFÍCIO:", err)
    return res.status(500).json({
      message: err.sqlMessage || err.message || "Erro ao atualizar status do benefício",
    })
  }
})

router.post("/familias/:id/autorizacoes-beneficios", verifyToken, async (req, res) => {
  const db = await connectToDatabase()

  try {
    const familia_id = Number.parseInt(req.params.id)
    const usuario_id = req.userId
    const { tipo_beneficio, quantidade, validade_meses, justificativa, observacoes } = req.body

    if (isNaN(familia_id)) {
      return res.status(400).json({ message: "ID da família inválido" })
    }

    if (!tipo_beneficio) {
      return res.status(400).json({ message: "Tipo de benefício é obrigatório" })
    }
    if (!justificativa || justificativa.trim() === "") {
      return res.status(400).json({ message: "Justificativa é obrigatória" })
    }
    if (!quantidade || quantidade < 1) {
      return res.status(400).json({ message: "Quantidade deve ser maior que zero" })
    }
    if (!validade_meses || validade_meses < 1) {
      return res.status(400).json({ message: "Validade deve ser maior que zero" })
    }

    const [userResult] = await db.query("SELECT cargo_id FROM usuarios WHERE id = ?", [usuario_id])

    if (userResult.length === 0 || (userResult[0].cargo_id !== 3 && userResult[0].cargo_id !== 2)) {
      return res.status(403).json({
        message: "Apenas técnicos e coordenadores podem autorizar benefícios",
      })
    }

    const [familiaResult] = await db.query("SELECT id FROM familias WHERE id = ?", [familia_id])

    if (familiaResult.length === 0) {
      return res.status(404).json({ message: "Família não encontrada" })
    }

    const data_autorizacao = new Date().toISOString().split("T")[0]
    const data_validade = new Date()
    data_validade.setMonth(data_validade.getMonth() + validade_meses)
    const data_validade_formatada = data_validade.toISOString().split("T")[0]

    const [result] = await db.query(
      `
            INSERT INTO autorizacoes_beneficios (
                familia_id,
                tipo_beneficio,
                quantidade,
                validade_meses,
                data_autorizacao,
                data_validade,
                autorizador_id,
                justificativa,
                observacoes,
                status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ativa')
        `,
      [
        familia_id,
        tipo_beneficio,
        quantidade,
        validade_meses,
        data_autorizacao,
        data_validade_formatada,
        usuario_id,
        justificativa,
        observacoes || "",
      ],
    )

    // Log benefit authorization creation
    await criarLog({
      usuario_id: usuario_id,
      tipo_log: "criacao",
      entidade: "autorizacoes_beneficios",
      entidade_id: result.insertId,
      descricao: `Autorização de benefício "${tipo_beneficio}" criada para família ID ${familia_id}. Quantidade: ${quantidade}, Validade: ${validade_meses} meses.`,
      ip_address: req.ip || req.connection.remoteAddress,
    })

    res.status(201).json({
      message: "Benefício autorizado com sucesso",
      id: result.insertId,
    })
  } catch (error) {
    console.error("❌ Erro ao criar autorização:", error)
    res.status(500).json({
      message: "Erro ao autorizar benefício",
      error: error.message,
    })
  }
})

router.get("/familias/:id/autorizacoes-beneficios", verifyToken, async (req, res) => {
  const db = await connectToDatabase()

  try {
    const familia_id = Number.parseInt(req.params.id)

    if (isNaN(familia_id)) {
      return res.status(400).json({ message: "ID da família inválido" })
    }

    const [autorizacoes] = await db.query(
      `
            SELECT
                a.*,
                u.nome as autorizador_nome,
                c.nome as autorizador_cargo
            FROM autorizacoes_beneficios a
            INNER JOIN usuarios u ON a.autorizador_id = u.id
            INNER JOIN cargos c ON u.cargo_id = c.id
            WHERE a.familia_id = ?
            ORDER BY a.data_autorizacao DESC
        `,
      [familia_id],
    )

    for (const autorizacao of autorizacoes) {
      if (autorizacao.status === "ativa" && new Date(autorizacao.data_validade) < new Date()) {
        await db.query("UPDATE autorizacoes_beneficios SET status = 'expirada' WHERE id = ?", [autorizacao.id])
        autorizacao.status = "expirada"
      }
    }

    res.json(autorizacoes)
  } catch (error) {
    console.error("❌ Erro ao buscar autorizações:", error)
    res.status(500).json({
      message: "Erro ao buscar autorizações",
      error: error.message,
    })
  }
})

router.get("/familias/:id/autorizacoes-beneficios/disponiveis", verifyToken, async (req, res) => {
  const db = await connectToDatabase()

  try {
    const familia_id = Number.parseInt(req.params.id)

    if (isNaN(familia_id)) {
      return res.status(400).json({ message: "ID da família inválido" })
    }

    const [autorizacoes] = await db.query(
      `
            SELECT
                a.*,
                u.nome as autorizador_nome,
                c.nome as autorizador_cargo,
                (a.quantidade - a.quantidade_utilizada) as quantidade_disponivel
            FROM autorizacoes_beneficios a
            INNER JOIN usuarios u ON a.autorizador_id = u.id
            INNER JOIN cargos c ON u.cargo_id = c.id
            WHERE a.familia_id = ?
            AND a.status = 'ativa'
            AND a.data_validade >= CURDATE()
            AND a.quantidade_utilizada < a.quantidade
            ORDER BY a.data_autorizacao DESC
        `,
      [familia_id],
    )

    res.json(autorizacoes)
  } catch (error) {
    console.error("❌ Erro ao buscar autorizações disponíveis:", error)
    res.status(500).json({
      message: "Erro ao buscar autorizações disponíveis",
      error: error.message,
    })
  }
})

router.get(
  "/familias/:id/autorizacoes-beneficios/:autorizacaoId/beneficios-concedidos",
  verifyToken,
  async (req, res) => {
    const db = await connectToDatabase()

    try {
      const familia_id = Number.parseInt(req.params.id)
      const autorizacao_id = Number.parseInt(req.params.autorizacaoId)

      if (isNaN(familia_id) || isNaN(autorizacao_id)) {
        return res.status(400).json({ message: "ID inválido" })
      }

      const [beneficios] = await db.query(
        `
            SELECT
                b.id,
                b.tipo_beneficio,
                b.descricao_beneficio,
                b.valor,
                b.data_entrega,
                b.observacoes,
                u.nome as responsavel_entrega
            FROM beneficios b
            INNER JOIN usuarios u ON b.responsavel_id = u.id
            WHERE b.autorizacao_id = ?
            AND b.familia_id = ?
            AND b.status = 'entregue'
            ORDER BY b.data_entrega DESC
        `,
        [autorizacao_id, familia_id],
      )

      res.json(beneficios)
    } catch (error) {
      console.error("❌ Erro ao buscar benefícios concedidos:", error)
      res.status(500).json({
        message: "Erro ao buscar benefícios concedidos",
        error: error.message,
      })
    }
  },
)

router.put("/familias/:id/autorizacoes-beneficios/:autorizacaoId/cancelar", verifyToken, async (req, res) => {
  const db = await connectToDatabase()

  try {
    const familia_id = Number.parseInt(req.params.id)
    const autorizacao_id = Number.parseInt(req.params.autorizacaoId)
    const usuario_id = req.userId
    const { motivo_cancelamento, observacoes_cancelamento } = req.body

    if (isNaN(familia_id) || isNaN(autorizacao_id)) {
      return res.status(400).json({ message: "ID inválido" })
    }

    if (!motivo_cancelamento || motivo_cancelamento.trim() === "") {
      return res.status(400).json({ message: "Motivo do cancelamento é obrigatório" })
    }

    const [autorizacao] = await db.query(`SELECT * FROM autorizacoes_beneficios WHERE id = ? AND familia_id = ?`, [
      autorizacao_id,
      familia_id,
    ])

    if (autorizacao.length === 0) {
      return res.status(404).json({ message: "Autorização não encontrada" })
    }

    if (autorizacao[0].status !== "ativa") {
      return res.status(400).json({
        message: "Apenas autorizações ativas podem ser canceladas. O status atual é: " + autorizacao[0].status,
      })
    }

    // Log authorization cancellation
    await criarLog({
      usuario_id: usuario_id,
      tipo_log: "atualizacao",
      entidade: "autorizacoes_beneficios",
      entidade_id: autorizacao_id,
      descricao: `Autorização de benefício cancelada. Motivo: ${motivo_cancelamento}. Anteriormente: Tipo ${autorizacao[0].tipo_beneficio}, Qtd ${autorizacao[0].quantidade}, Validade ${autorizacao[0].validade_meses} meses.`,
      ip_address: req.ip || req.connection.remoteAddress,
    })

    await db.query(
      `
            UPDATE autorizacoes_beneficios
            SET
                status = 'cancelada',
                motivo_cancelamento = ?,
                observacoes_cancelamento = ?,
                cancelado_por = ?,
                data_cancelamento = NOW(),
                updated_at = NOW()
            WHERE id = ?
        `,
      [motivo_cancelamento, observacoes_cancelamento || "", usuario_id, autorizacao_id],
    )

    res.json({
      message: "Autorização cancelada com sucesso",
      autorizacao_id: autorizacao_id,
    })
  } catch (error) {
    console.error("❌ Erro ao cancelar autorização:", error)
    res.status(500).json({
      message: "Erro ao cancelar autorização",
      error: error.message,
    })
  }
})

router.get("/beneficios/historico/familia/:familia_id", verifyToken, async (req, res) => {
  try {
    const db = await connectToDatabase()
    const familia_id = Number.parseInt(req.params.familia_id)

    if (isNaN(familia_id)) {
      return res.status(400).json({ message: "ID da família inválido" })
    }

    const [results] = await db.query(
      `
                SELECT
                    b.id,
                    b.familia_id,
                    b.tipo_beneficio,
                    b.descricao_beneficio,
                    b.valor,
                    b.justificativa,
                    b.status,
                    b.data_entrega,
                    b.observacoes,
                    b.created_at,
                    COALESCE(p.nome_completo, 'Nome não encontrado') as responsavel_nome,
                    COALESCE(f.prontuario, 'Prontuário não encontrado') as prontuario,
                    COALESCE(u.nome, 'Usuário não encontrado') as responsavel_id
                FROM beneficios b
                LEFT JOIN familias f ON b.familia_id = f.id
                LEFT JOIN pessoas p ON f.id = p.familia_id AND p.tipo_membro = 'responsavel'
                LEFT JOIN usuarios u ON b.responsavel_id = u.id
                WHERE b.familia_id = ?
                ORDER BY b.created_at DESC
            `,
      [familia_id],
    )

    res.json(results)
  } catch (error) {
    console.error("❌ Erro ao buscar histórico da família:", error)
    res.status(500).json({
      message: "Erro ao buscar histórico da família",
      error: error.message,
    })
  }
})

router.get("/locais-encaminhamento", verifyToken, async (req, res) => {
  const db = await connectToDatabase()

  try {
    const [locais] = await db.query(
      `
            SELECT id, nome, created_at, updated_at
            FROM local_encaminhamento
            ORDER BY nome ASC
        `,
    )

    res.json(locais)
  } catch (error) {
    console.error("❌ Erro ao buscar locais de encaminhamento:", error)
    res.status(500).json({
      message: "Erro ao buscar locais de encaminhamento",
      error: error.message,
    })
  }
})

router.post("/locais-encaminhamento", verifyToken, async (req, res) => {
  const db = await connectToDatabase()

  try {
    const { nome } = req.body

    if (!nome || nome.trim() === "") {
      return res.status(400).json({ message: "Nome do local é obrigatório" })
    }

    const [userResult] = await db.query("SELECT cargo_id FROM usuarios WHERE id = ?", [req.userId])

    if (userResult.length === 0 || (userResult[0].cargo_id !== 3 && userResult[0].cargo_id !== 2)) {
      return res.status(403).json({
        message: "Apenas técnicos e coordenadores podem cadastrar locais de encaminhamento",
      })
    }

    const [localExistente] = await db.query("SELECT id FROM local_encaminhamento WHERE nome = ?", [nome.trim()])

    if (localExistente.length > 0) {
      return res.status(400).json({ message: "Já existe um local com esse nome" })
    }

    const [result] = await db.query(
      `
            INSERT INTO local_encaminhamento (nome)
            VALUES (?)
        `,
      [nome.trim()],
    )

    // Log new referral location creation
    await criarLog({
      usuario_id: req.userId,
      tipo_log: "criacao",
      entidade: "local_encaminhamento",
      entidade_id: result.insertId,
      descricao: `Local de encaminhamento "${nome.trim()}" cadastrado`,
      ip_address: req.ip || req.connection.remoteAddress,
    })

    res.status(201).json({
      message: "Local de encaminhamento cadastrado com sucesso",
      id: result.insertId,
      nome: nome.trim(),
    })
  } catch (error) {
    console.error("❌ Erro ao criar local de encaminhamento:", error)
    res.status(500).json({
      message: "Erro ao cadastrar local de encaminhamento",
      error: error.message,
    })
  }
})

router.get("/familias/:id/encaminhamentos", verifyToken, async (req, res) => {
  const db = await connectToDatabase()

  try {
    const familia_id = Number.parseInt(req.params.id)
    const usuario_id = req.userId

    if (isNaN(familia_id)) {
      return res.status(400).json({ message: "ID da família inválido" })
    }

    const [userResult] = await db.query("SELECT cargo_id FROM usuarios WHERE id = ?", [usuario_id])

    if (userResult.length === 0) {
      return res.status(403).json({ message: "Usuário não encontrado" })
    }

    const cargo_id = userResult[0].cargo_id
    const podeVisualizar = cargo_id === 1 || cargo_id === 2 || cargo_id === 3

    if (!podeVisualizar) {
      return res.status(403).json({
        message: "Você não tem permissão para visualizar encaminhamentos",
      })
    }

    const [encaminhamentos] = await db.query(
      `
            SELECT
                e.id,
                e.familia_id,
                e.evolucao_id,
                e.data_encaminhamento,
                l.nome as local_nome,
                u.nome as responsavel_nome,
                e.created_at
            FROM encaminhamentos e
            JOIN local_encaminhamento l ON e.local_encaminhamento_id = l.id
            JOIN usuarios u ON e.responsavel_id = u.id
            WHERE e.familia_id = ?
            ORDER BY e.data_encaminhamento DESC, e.created_at DESC
        `,
      [familia_id],
    )

    res.json(encaminhamentos)
  } catch (error) {
    console.error("❌ Erro ao buscar encaminhamentos:", error)
    res.status(500).json({
      message: "Erro ao buscar encaminhamentos",
      error: error.message,
    })
  }
})

router.put("/familias/:id/autorizacoes-beneficios/:autorizacaoId/editar", verifyToken, async (req, res) => {
  const db = await connectToDatabase()

  try {
    const familia_id = Number.parseInt(req.params.id)
    const autorizacao_id = Number.parseInt(req.params.autorizacaoId)
    const usuario_id = req.userId
    const { tipo_beneficio, quantidade, validade_meses, justificativa, observacoes, motivo_edicao } = req.body

    if (isNaN(familia_id) || isNaN(autorizacao_id)) {
      return res.status(400).json({ message: "ID inválido" })
    }

    if (!tipo_beneficio || !quantidade || !validade_meses || !justificativa || !motivo_edicao) {
      return res.status(400).json({ message: "Todos os campos obrigatórios devem ser preenchidos" })
    }

    if (quantidade < 1) {
      return res.status(400).json({ message: "Quantidade deve ser maior que zero" })
    }

    if (validade_meses < 1) {
      return res.status(400).json({ message: "Validade deve ser maior que zero" })
    }

    const [autorizacao] = await db.query(`SELECT * FROM autorizacoes_beneficios WHERE id = ? AND familia_id = ?`, [
      autorizacao_id,
      familia_id,
    ])

    if (autorizacao.length === 0) {
      return res.status(404).json({ message: "Autorização não encontrada" })
    }

    if (autorizacao[0].status !== "ativa") {
      return res.status(400).json({
        message: "Somente autorizações ativas podem ser editadas",
      })
    }

    if (quantidade < autorizacao[0].quantidade_utilizada) {
      return res.status(400).json({
        message: `A quantidade não pode ser menor que a quantidade já utilizada (${autorizacao[0].quantidade_utilizada})`,
      })
    }

    const data_autorizacao = new Date(autorizacao[0].data_autorizacao)
    const nova_data_validade = new Date(data_autorizacao)
    nova_data_validade.setMonth(nova_data_validade.getMonth() + validade_meses)

    await db.query(
      `
      UPDATE autorizacoes_beneficios
      SET
        tipo_beneficio = ?,
        quantidade = ?,
        validade_meses = ?,
        data_validade = ?,
        justificativa = ?,
        observacoes = ?,
        updated_at = NOW()
      WHERE id = ?
      `,
      [
        tipo_beneficio,
        quantidade,
        validade_meses,
        nova_data_validade,
        justificativa,
        observacoes || "",
        autorizacao_id,
      ],
    )

    // Log authorization edit
    await criarLog({
      usuario_id: usuario_id,
      tipo_log: "atualizacao",
      entidade: "autorizacoes_beneficios",
      entidade_id: autorizacao_id,
      descricao: `Autorização de benefício editada. Motivo: ${motivo_edicao}. Novo tipo: ${tipo_beneficio}, Nova Qtd: ${quantidade}, Nova Validade: ${validade_meses} meses.`,
      ip_address: req.ip || req.connection.remoteAddress,
    })

    const [autorizacaoAtualizada] = await db.query(
      `
      SELECT
        ab.*,
        u.nome as autorizador_nome,
        c.nome as autorizador_cargo
      FROM autorizacoes_beneficios ab
      LEFT JOIN usuarios u ON ab.autorizador_id = u.id
      LEFT JOIN cargos c ON u.cargo_id = c.id
      WHERE ab.id = ?
      `,
      [autorizacao_id],
    )

    res.json({
      message: "Autorização editada com sucesso",
      autorizacao: autorizacaoAtualizada[0],
      dados_anteriores: autorizacao[0],
    })
  } catch (error) {
    console.error("❌ Erro ao editar autorização:", error)
    res.status(500).json({
      message: "Erro ao editar autorização",
      error: error.message,
    })
  }
})

router.put("/autorizacoes-beneficios/:id", verifyToken, async (req, res) => {
  let db
  try {
    db = await connectToDatabase()
    const autorizacao_id = Number.parseInt(req.params.id)
    const usuario_id = req.userId

    const { tipo_beneficio, quantidade, validade_meses, justificativa, observacoes, motivo_edicao } = req.body

    if (!tipo_beneficio || !quantidade || !validade_meses || !justificativa || !motivo_edicao) {
      return res.status(400).json({
        message:
          "Campos obrigatórios não preenchidos (tipo_beneficio, quantidade, validade_meses, justificativa, motivo_edicao).",
      })
    }

    if (quantidade < 1) {
      return res.status(400).json({ message: "Quantidade deve ser no mínimo 1." })
    }

    if (validade_meses < 1) {
      return res.status(400).json({ message: "Validade deve ser no mínimo 1 mês." })
    }

    const [autorizacaoAtual] = await db.query(
      `SELECT * FROM autorizacoes_beneficios WHERE id = ? AND status = 'ativa'`,
      [autorizacao_id],
    )

    if (autorizacaoAtual.length === 0) {
      return res.status(404).json({ message: "Autorização não encontrada ou não está ativa." })
    }

    const autorizacao = autorizacaoAtual[0]

    const data_autorizacao = new Date(autorizacao.data_autorizacao)
    const nova_data_validade = new Date(data_autorizacao)
    nova_data_validade.setMonth(nova_data_validade.getMonth() + Number.parseInt(validade_meses))
    const nova_data_validade_str = nova_data_validade.toISOString().split("T")[0]

    await db.query("START TRANSACTION")

    try {
      await db.query(
        `INSERT INTO edicoes_beneficios (
          autorizacao_id, familia_id, editado_por,
          tipo_beneficio_anterior, quantidade_anterior, validade_meses_anterior,
          data_validade_anterior, justificativa_anterior, observacoes_anterior,
          tipo_beneficio_novo, quantidade_nova, validade_meses_nova,
          data_validade_nova, justificativa_novo, observacoes_novo,
          motivo_edicao, data_edicao
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          autorizacao_id,
          autorizacao.familia_id,
          usuario_id,
          autorizacao.tipo_beneficio,
          autorizacao.quantidade,
          autorizacao.validade_meses,
          autorizacao.data_validade,
          autorizacao.justificativa,
          autorizacao.observacoes,
          tipo_beneficio,
          quantidade,
          validade_meses,
          nova_data_validade_str,
          justificativa,
          observacoes,
          motivo_edicao,
        ],
      )

      await db.query(
        `UPDATE autorizacoes_beneficios
         SET tipo_beneficio = ?, quantidade = ?, validade_meses = ?,
             data_validade = ?, justificativa = ?, observacoes = ?,
             updated_at = NOW()
         WHERE id = ?`,
        [
          tipo_beneficio,
          quantidade,
          validade_meses,
          nova_data_validade_str,
          justificativa,
          observacoes,
          autorizacao_id,
        ],
      )

      await db.query(
        `INSERT INTO evolucoes (familia_id, usuario_id, data_evolucao, hora_evolucao, descricao)
         VALUES (?, ?, CURDATE(), CURTIME(), ?)`,
        [
          autorizacao.familia_id,
          usuario_id,
          `Autorização de benefício editada. Tipo: ${tipo_beneficio}, Quantidade: ${quantidade}, Validade: ${validade_meses} meses. Motivo: ${motivo_edicao}`,
        ],
      )

      // Log authorization edit
      await criarLog({
        usuario_id: usuario_id,
        tipo_log: "atualizacao",
        entidade: "autorizacoes_beneficios",
        entidade_id: autorizacao_id,
        descricao: `Autorização de benefício editada. Motivo: ${motivo_edicao}. Novo tipo: ${tipo_beneficio}, Nova Qtd: ${quantidade}, Nova Validade: ${validade_meses} meses.`,
        ip_address: req.ip || req.connection.remoteAddress,
      })

      await db.query("COMMIT")

      res.status(200).json({
        message: "Autorização editada com sucesso!",
        autorizacao_id: autorizacao_id,
      })
    } catch (error) {
      await db.query("ROLLBACK")
      throw error
    }
  } catch (error) {
    console.error("❌ Erro ao editar autorização:", error)
    res.status(500).json({
      message: "Erro ao editar autorização",
      error: error.message,
    })
  }
})

// ==================== ROTAS DE LOGS  ====================

// Listar logs com filtros
router.get("/logs", verifyToken, async (req, res) => {
  try {
    const db = await connectToDatabase()

    const {
      tipo_log,
      entidade,
      usuario_id,
      data_inicio,
      data_fim,
      limite: limiteQuery,
      offset: offsetQuery,
    } = req.query

    const limite = Number.parseInt(limiteQuery) || 100
    const offset = Number.parseInt(offsetQuery) || 0

    // Validar que são números válidos
    if (isNaN(limite) || isNaN(offset) || limite < 1 || offset < 0) {
      return res.status(400).json({
        error: "Parâmetros de paginação inválidos",
      })
    }

    let query = `
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
        c.nome as cargo_nome,
        e.nome as equipamento_nome,
        f.prontuario as familia_prontuario,
        p.nome_completo as familia_responsavel
      FROM logs_sistema ls
      INNER JOIN usuarios u ON ls.usuario_id = u.id
      INNER JOIN cargos c ON u.cargo_id = c.id
      INNER JOIN equipamento e ON u.equipamento_id = e.id
      LEFT JOIN familias f ON ls.entidade = 'familia' AND ls.entidade_id = f.id
      LEFT JOIN pessoas p ON f.id = p.familia_id AND p.tipo_membro = 'responsavel'
      WHERE 1=1
    `

    const params = []

    if (tipo_log) {
      query += ` AND ls.tipo_log = ?`
      params.push(tipo_log)
    }

    if (entidade) {
      query += ` AND ls.entidade = ?`
      params.push(entidade)
    }

    if (usuario_id) {
      query += ` AND ls.usuario_id = ?`
      params.push(Number.parseInt(usuario_id))
    }

    if (data_inicio) {
      query += ` AND DATE(ls.created_at) >= ?`
      params.push(data_inicio)
    }

    if (data_fim) {
      query += ` AND DATE(ls.created_at) <= ?`
      params.push(data_fim)
    }

    query += ` ORDER BY ls.created_at DESC LIMIT ? OFFSET ?`
    params.push(limite)
    params.push(offset)

    const [logs] = await db.query(query, params)

    // Buscar contagem total
    let countQuery = `
      SELECT COUNT(*) as total
      FROM logs_sistema ls
      WHERE 1=1
    `

    const countParams = []

    if (tipo_log) {
      countQuery += ` AND ls.tipo_log = ?`
      countParams.push(tipo_log)
    }

    if (entidade) {
      countQuery += ` AND ls.entidade = ?`
      countParams.push(entidade)
    }

    if (usuario_id) {
      countQuery += ` AND ls.usuario_id = ?`
      countParams.push(Number.parseInt(usuario_id))
    }

    if (data_inicio) {
      countQuery += ` AND DATE(ls.created_at) >= ?`
      countParams.push(data_inicio)
    }

    if (data_fim) {
      countQuery += ` AND DATE(ls.created_at) <= ?`
      countParams.push(data_fim)
    }

    const [countResult] = await db.query(countQuery, countParams)

    res.json({
      logs,
      total: countResult[0].total,
      limite,
      offset,
    })
  } catch (error) {
    console.error("Erro ao buscar logs:", error)
    res.status(500).json({
      message: "Erro ao buscar logs",
      error: error.message,
    })
  }
})

// Listar usuários para filtro
router.get("/logs/usuarios/lista", verifyToken, async (req, res) => {
  try {
    const db = await connectToDatabase()

    const [usuarios] = await db.query(`
      SELECT DISTINCT
        u.id,
        u.nome,
        u.cpf
      FROM usuarios u
      INNER JOIN logs_sistema ls ON u.id = ls.usuario_id
      ORDER BY u.nome
    `)

    res.json(usuarios)
  } catch (error) {
    console.error("Erro ao buscar usuários:", error)
    res.status(500).json({
      message: "Erro ao buscar usuários",
      error: error.message,
    })
  }
})

// Buscar detalhes de um log específico
router.get("/logs/:id", verifyToken, async (req, res) => {
  try {
    const db = await connectToDatabase()

    const { id } = req.params

    const [logs] = await db.query(
      `
      SELECT
        ls.*,
        u.nome as usuario_nome,
        u.cpf as usuario_cpf,
        c.nome as cargo_nome,
        e.nome as equipamento_nome
      FROM logs_sistema ls
      INNER JOIN usuarios u ON ls.usuario_id = u.id
      INNER JOIN cargos c ON u.cargo_id = c.id
      INNER JOIN equipamento e ON u.equipamento_id = e.id
      WHERE ls.id = ?
    `,
      [id],
    )

    if (logs.length === 0) {
      return res.status(404).json({ message: "Log não encontrado" })
    }

    // Buscar alterações relacionadas
    const [alteracoes] = await db.query(
      `
      SELECT * FROM logs_alteracoes
      WHERE log_id = ?
      ORDER BY id
    `,
      [id],
    )

    res.json({
      log: logs[0],
      alteracoes,
    })
  } catch (error) {
    console.error("Erro ao buscar detalhes do log:", error)
    res.status(500).json({
      message: "Erro ao buscar detalhes do log",
      error: error.message,
    })
  }
})

// Funções auxiliares para criar logs
async function criarLog(dados) {
  const { usuario_id, tipo_log, entidade, entidade_id, descricao, ip_address } = dados

  console.log("[v0] criarLog chamado com dados:", dados)

  try {
    const db = await connectToDatabase()
    console.log("[v0] Conexão com banco estabelecida")

    const [result] = await db.query(
      `INSERT INTO logs_sistema
       (usuario_id, tipo_log, entidade, entidade_id, descricao, ip_address)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [usuario_id, tipo_log, entidade, entidade_id, descricao, ip_address],
    )

    console.log("[v0] Log inserido com sucesso, ID:", result.insertId)
    return result.insertId
  } catch (error) {
    console.error("[v0] Erro ao criar log:", error)
    console.error("[v0] Detalhes do erro:", error.message)
    console.error("[v0] SQL State:", error.sqlState)
    console.error("[v0] SQL Message:", error.sqlMessage)
    return null
  }
}

async function criarLogAlteracao(dados) {
  const { log_id, campo, valor_antigo, valor_novo } = dados

  try {
    const db = await connectToDatabase()
    await db.query(
      `INSERT INTO logs_alteracoes
       (log_id, campo, valor_antigo, valor_novo)
       VALUES (?, ?, ?, ?)`,
      [log_id, campo, valor_antigo, valor_novo],
    )
  } catch (error) {
    console.error("Erro ao criar log de alteração:", error)
  }
}

router.post("/logout", verifyToken, async (req, res) => {
  try {
    console.log("[v0] Logout chamado para usuário:", req.userId)

    await criarLog({
      usuario_id: req.userId,
      tipo_log: "logout",
      entidade: "usuario",
      entidade_id: req.userId,
      descricao: "Usuário saiu do sistema",
      ip_address: req.ip || req.connection.remoteAddress,
    })

    res.json({ message: "Logout registrado com sucesso" })
  } catch (error) {
    console.error("Erro ao registrar logout:", error)
    res.status(500).json({ message: "Erro ao registrar logout" })
  }
})

export default router
