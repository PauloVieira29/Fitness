// backend/routes/auth.js
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
// CORREÇÃO: Importar desestruturando para obter a função 'auth' específica
const { auth } = require('../middleware/auth'); 

const secret = process.env.JWT_SECRET || 'secret';

// ========================
// REGISTO
// ========================
router.post('/register', async (req, res) => {
  const { username, password, role = 'client', profile } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Username e password são obrigatórios' });
  }

  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'Username já existe' });
    }

    const hash = await bcrypt.hash(password, 10);
    
    const user = await User.create({
      username,
      passwordHash: hash,
      role,
      isActive: true, // Garante que nasce ativa
      profile: {
        ...profile,
        name: profile?.name || '',
        email: profile?.email || ''
      },
      validated: role !== 'trainer' 
    });

    const token = jwt.sign({ id: user._id }, secret, { expiresIn: '7d' });
    res.json({ token });
  } catch (err) {
    console.error('Erro no registo:', err);
    res.status(500).json({ message: 'Erro ao criar conta' });
  }
});

// ========================
// LOGIN (Com suporte a QR Code e Verificação de Inativo)
// ========================
router.post('/login', async (req, res) => {
  const { username, password, isQrCode = false } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Preencha todos os campos' });
  }

  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ message: 'Credenciais inválidas' });
    }

    // Validação da Password
    let isMatch;
    if (isQrCode) {
      isMatch = user.passwordHash === password; 
    } else {
      isMatch = await bcrypt.compare(password, user.passwordHash);
    }

    if (!isMatch) {
      return res.status(400).json({ message: 'Credenciais inválidas' });
    }

    // Verificar se está inativa APÓS validar a password
    if (user.isActive === false) {
       return res.status(403).json({ 
         code: 'ACCOUNT_DEACTIVATED',
         message: 'Esta conta foi desativada.' 
       });
    }

    const token = jwt.sign({ id: user._id }, secret, { expiresIn: '7d' });
    
    res.json({ 
        token,
        user: {
            _id: user._id,
            username: user.username,
            role: user.role,
            profile: user.profile
        }
    });
  } catch (err) {
    console.error('Erro no login:', err);
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

// ========================
// DESATIVAR CONTA (Requer Auth Token e Password)
// ========================
// CORREÇÃO: Usar 'auth' em vez de 'authMiddleware'
router.post('/deactivate', auth, async (req, res) => {
    try {
        const { password } = req.body;
        // req.user vem do middleware 'auth'
        const user = await User.findById(req.user._id);

        if (!user) return res.status(404).json({ message: 'Utilizador não encontrado' });

        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
            return res.status(401).json({ message: 'Password incorreta' });
        }

        user.isActive = false;
        await user.save();

        res.json({ message: 'Conta desativada com sucesso' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Erro ao desativar conta' });
    }
});

// ========================
// REATIVAR CONTA (Pública, requer credenciais)
// ========================
router.post('/reactivate', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        const user = await User.findOne({ username });
        if (!user) return res.status(404).json({ message: 'Utilizador não encontrado' });

        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
            return res.status(401).json({ message: 'Credenciais inválidas' });
        }

        user.isActive = true;
        await user.save();

        // Gera novo token para login imediato
        const token = jwt.sign({ id: user._id }, secret, { expiresIn: '7d' });

        res.json({ 
            token, 
            user: {
                _id: user._id,
                username: user.username,
                role: user.role,
                profile: user.profile
            },
            message: 'Conta reativada com sucesso!' 
        });

    } catch (err) {
        res.status(500).json({ message: 'Erro ao reativar conta' });
    }
});

module.exports = router;