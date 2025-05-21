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
    const { cpf, senha} = req.body;
    try{
        const db = await connectToDatabase()
        const [rows] = await db.query('SELECT * FROM usuarios WHERE cpf = ?', [cpf])
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Usuário não existe!' })
        }

        const isMatch = await bcrypt.compare(senha, rows[0].senha_hash)
        if (!isMatch) {
            return res.status(401).json({ message: 'Senha incorreta!' })
        }

        const token = jwt.sign({ id: rows[0].id }, process.env.JWT_SECRET, { expiresIn: '3h' })


       return res.status(201).json({ token: token })
    } catch(err) {
       return res.status(500).json(err)
    }
})

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

export default router