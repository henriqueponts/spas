import express from "express"
import { connectToDatabase } from "../lib/db.js"
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"

const router = express.Router()

router.post("/registro", async (req, res) => {
  console.log("📝 Rota de registro chamada")
  console.log("📦 Dados recebidos:", req.body)

  const { nome, cpf, email, cargo, equipamento, senha } = req.body

  try {
    const db = await connectToDatabase()

    const authHeader = req.headers["authorization"]
    if (authHeader) {
      try {
        const token = authHeader.split(" ")[1]
        const decoded = jwt.verify(token, process.env.JWT_SECRET)

        const [userResult] = await db.query(
          `
                    SELECT c.nome as cargo_nome 
                    FROM usuarios u 
                    JOIN cargos c ON u.cargo_id = c.id 
                    WHERE u.id = ?
                `,
          [decoded.id],
        )

        if (
          userResult.length === 0 ||
          (userResult[0].cargo_nome !== "DIRETOR" && userResult[0].cargo_nome !== "COORDENADOR")
        ) {
          return res.status(403).json({ message: "Apenas diretores e coordenadores podem criar usuários" })
        }
      } catch (tokenError) {
        return res.status(401).json({ message: "Token inválido" })
      }
    }

    const [rows] = await db.query("SELECT * FROM usuarios WHERE cpf = ?", [cpf])
    if (rows.length > 0) {
      return res.status(400).json({ message: "Esse CPF já está em uso!" })
    }

    if (email) {
      const [emailRows] = await db.query("SELECT * FROM usuarios WHERE email = ?", [email])
      if (emailRows.length > 0) {
        return res.status(400).json({ message: "Esse email já está em uso!" })
      }
    }

    const hashPassword = await bcrypt.hash(senha, 10)

    await db.query(
      `
            INSERT INTO usuarios (nome, cpf, email, senha_hash, cargo_id, equipamento_id) 
            VALUES (?, ?, ?, ?, ?, ?)
        `,
      [nome, cpf, email || null, hashPassword, cargo, equipamento],
    )

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
      if (err.name === "TokenExpiredError") {
        return res.status(401).json({ message: "Sessão expirada. Por favor, faça login novamente." })
      }
      return res.status(401).json({ message: "Falha na autenticação do token." })
    }

    req.userId = decoded.id
    next()
  })
}

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

router.get("/equipamentos", async (req, res) => {
  try {
    const db = await connectToDatabase()
    const [equipamentos] = await db.query("SELECT id, nome FROM equipamento WHERE ativo = TRUE ORDER BY nome")
    res.status(200).json(equipamentos)
  } catch (err) {
    console.error("Erro ao buscar equipamentos:", err)
    res.status(500).json({ message: "Erro ao buscar equipamentos" })
  }
})

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

// Rota para buscar todos os usuários (rota protegida)
router.get("/usuarios", verifyToken, async (req, res) => {
  console.log("🔍 Rota de busca de usuários chamada")
  try {
    const db = await connectToDatabase()
    const [usuarios] = await db.query(
      `
            SELECT u.id, u.nome, u.cpf, u.email, u.ativo, u.created_at, u.ultimo_login, 
                   c.nome as cargo_nome, c.id as cargo_id,
                   e.nome as equipamento_nome, e.id as equipamento_id
            FROM usuarios u
            JOIN cargos c ON u.cargo_id = c.id
            JOIN equipamento e ON u.equipamento_id = e.id
            ORDER BY u.nome
        `,
    )
    res.status(200).json(usuarios)
  } catch (err) {
    console.error("❌ Erro ao buscar usuários:", err)
    res.status(500).json({ message: "Erro interno do servidor." })
  }
})

// Rota para alterar o status de um usuário
router.put("/usuarios/:id/status", verifyToken, async (req, res) => {
  console.log("🚦 Rota de troca de status chamada")
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

    if (
      userResult.length === 0 ||
      (userResult[0].cargo_nome !== "DIRETOR" && userResult[0].cargo_nome !== "COORDENADOR")
    ) {
      return res.status(403).json({ message: "Acesso negado" })
    }
    
    // ✅ ADIÇÃO: Impedir que o próprio usuário inative sua conta
    if (usuario_id === req.userId) {
      return res.status(403).json({ message: "Você não pode inativar a si mesmo." })
    }

    const [usuarioExiste] = await db.query("SELECT id, ativo FROM usuarios WHERE id = ?", [usuario_id])

    if (usuarioExiste.length === 0) {
      return res.status(404).json({ message: "Usuário não encontrado" })
    }

    const novoStatus = !usuarioExiste[0].ativo

    await db.query("UPDATE usuarios SET ativo = ? WHERE id = ?", [novoStatus, usuario_id])

    console.log(`✅ Status do usuário ${usuario_id} alterado para: ${novoStatus}`)
    res.status(200).json({ message: "Status alterado com sucesso!" })
  } catch (err) {
    console.error("❌ Erro ao alterar status do usuário:", err)
    res.status(500).json({ message: "Erro interno do servidor." })
  }
})

// Rota para alterar a senha de um usuário
router.put("/usuarios/:id/senha", verifyToken, async (req, res) => {
  console.log("🔒 Rota de troca de senha chamada")

  const { novaSenha } = req.body
  const usuario_id = req.params.id

  try {
    const db = await connectToDatabase()

    const [userResult] = await db.query(
      `SELECT c.nome as cargo_nome FROM usuarios u JOIN cargos c ON u.cargo_id = c.id WHERE u.id = ?`,
      [req.userId]
    )

    if (
      userResult.length === 0 ||
      (userResult[0].cargo_nome !== "DIRETOR" && userResult[0].cargo_nome !== "COORDENADOR")
    ) {
      return res.status(403).json({ message: "Acesso negado. Apenas diretores e coordenadores podem alterar senhas." })
    }

    if (!novaSenha || novaSenha.length < 6) {
      return res.status(400).json({ message: "A nova senha deve ter no mínimo 6 caracteres." })
    }

    const hashPassword = await bcrypt.hash(novaSenha, 10);

    const [updateResult] = await db.query("UPDATE usuarios SET senha_hash = ? WHERE id = ?", [
      hashPassword,
      usuario_id,
    ]);

    if (updateResult.affectedRows === 0) {
      return res.status(404).json({ message: "Usuário não encontrado." });
    }

    console.log(`✅ Senha do usuário ${usuario_id} alterada com sucesso!`);
    res.status(200).json({ message: "Senha alterada com sucesso!" });
  } catch (err) {
    console.error("❌ Erro ao alterar senha:", err);
    res.status(500).json({ message: "Erro interno do servidor ao alterar a senha." });
  }
});

export default router