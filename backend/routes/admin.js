// backend/routes/admin.js
const router = require('express').Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const { auth, permit } = require('../middleware/auth');
const TrainerChangeRequest = require('../models/TrainerChangeRequest');
const Notification = require('../models/Notification');

// === USERS ===

// Listar utilizadores
router.get('/users', auth, permit('admin'), async (req, res) => {
  const users = await User.find().limit(300).select('-passwordHash');
  res.json(users);
});

// Validar utilizador (ex: treinador)
router.post('/validate/:id', auth, permit('admin'), async (req, res) => {
  const u = await User.findById(req.params.id);
  if (!u) return res.status(404).json({ message: 'Not found' });
  u.validated = true;
  await u.save();
  res.json(u);
});

// Criar utilizador
router.post('/users', auth, permit('admin'), async (req, res) => {
  const { username, password, role, profile } = req.body;
  if (!username || !password || !role)
    return res.status(400).json({ message: 'Campos obrigatórios' });

  const existing = await User.findOne({ username });
  if (existing) return res.status(400).json({ message: 'Username já existe' });

  const hash = await bcrypt.hash(password, 10);
  const user = new User({
    username,
    passwordHash: hash,
    role,
    isActive: true,
    profile: profile || {},
    validated: role !== 'trainer'
  });
  await user.save();
  res.json(user);
});

// Editar utilizador
router.patch('/users/:id', auth, permit('admin'), async (req, res) => {
  const updates = req.body;
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: 'Não encontrado' });

  if (updates.username) user.username = updates.username;
  if (updates.role) user.role = updates.role;
  if (updates.profile) Object.assign(user.profile, updates.profile);
  if (updates.password) user.passwordHash = await bcrypt.hash(updates.password, 10);

  await user.save();
  res.json(user);
});

// Alterar estado (Ativar/Desativar)
router.post('/users/:id/status', auth, permit('admin'), async (req, res) => {
    try {
        const { password, isActive } = req.body; 
        
        const admin = await User.findById(req.user._id);
        const isMatch = await bcrypt.compare(password, admin.passwordHash);
        
        if (!isMatch) {
            return res.status(401).json({ message: 'Password de administrador incorreta.' });
        }

        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'Utilizador não encontrado.' });

        if (user._id.toString() === admin._id.toString()) {
            return res.status(400).json({ message: 'Não podes desativar a tua própria conta aqui.' });
        }

        user.isActive = isActive;
        await user.save();

        res.json({ message: `Conta ${isActive ? 'reativada' : 'desativada'} com sucesso.`, user });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Erro ao alterar estado da conta.' });
    }
});

// Apagar utilizador permanentemente
router.delete('/users/:id', auth, permit('admin'), async (req, res) => {
  try {
    const { password } = req.body; 

    if (!password) return res.status(400).json({ message: 'Password obrigatória.' });
    
    const admin = await User.findById(req.user._id);
    const isMatch = await bcrypt.compare(password, admin.passwordHash);
    
    if (!isMatch) {
        return res.status(401).json({ message: 'Password de administrador incorreta.' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Utilizador não encontrado' });

    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'Não podes apagar a tua própria conta de admin aqui.' });
    }

    await User.deleteOne({ _id: req.params.id });

    res.json({ message: 'Utilizador apagado permanentemente.' });
  } catch (err) {
    console.error('Erro ao apagar utilizador:', err);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// === PEDIDOS DE MUDANÇA DE TREINADOR ===
router.get('/trainer-change-requests', auth, permit('admin'), async (req, res) => {
  const requests = await TrainerChangeRequest.find({ status: 'pending' })
    .populate('client', 'username profile')
    .populate('newTrainer', 'username profile');
  res.json({ requests });
});

// ATUALIZADO: Restrição de limite para Admin
router.post('/trainer-change/:id', auth, permit('admin'), async (req, res) => {
  const { accept } = req.body;
  const request = await TrainerChangeRequest.findById(req.params.id);
  if (!request) return res.status(404).json({ message: 'Pedido não encontrado' });

  try {
    if (accept) {
        // --- NOVA VALIDAÇÃO: Limite de Clientes ---
        const currentClients = await User.countDocuments({ trainerAssigned: request.newTrainer });
        if (currentClients >= 10) {
            return res.status(400).json({ 
                message: 'Não é possível aceitar: O treinador de destino já atingiu o limite de 10 clientes.' 
            });
        }
        // ------------------------------------------

        const client = await User.findById(request.client);
        if (client) {
            client.trainerAssigned = request.newTrainer;
            await client.save();
        }
        request.status = 'accepted';
    } else {
        request.status = 'rejected';
    }
    await request.save();

    const client = await User.findById(request.client);
    if (client && client.notificationSettings && client.notificationSettings.system === true) {
        const message = accept 
            ? 'O teu pedido de transferência de treinador foi aceite.' 
            : 'O teu pedido de transferência de treinador foi rejeitado.';

        await Notification.create({
            recipient: client._id,
            type: 'system',
            content: message,
            relatedId: request._id
        });
    }

    res.json({ message: 'Processado' });
  } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Erro ao processar pedido.' });
  }
});

module.exports = router;