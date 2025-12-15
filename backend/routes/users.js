// backend/routes/users.js
const router = require('express').Router();
const User = require('../models/User');
const TrainerChangeRequest = require('../models/TrainerChangeRequest');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const mongoose = require('mongoose');
const { auth, permit } = require('../middleware/auth');
const { cloudinary } = require('../config/cloudinary');

// ========================
// ROTA: OBTER AGENTE DE SUPORTE (ADMIN)
// ========================
router.get('/support-agent', auth, async (req, res) => {
  try {
    const admin = await User.findOne({ role: 'admin' })
      .select('username profile.name profile.avatarUrl')
      .lean();

    if (!admin) return res.status(404).json({ message: 'Serviço de suporte indisponível' });

    res.json(admin);
  } catch (err) {
    console.error('Erro ao buscar suporte:', err);
    res.status(500).json({ message: 'Erro interno' });
  }
});

// ========================
// PERFIL DO UTILIZADOR LOGADO
// ========================

router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-passwordHash -__v')
      .populate('profile.specialties')
      .lean();

    if (!user) return res.status(404).json({ message: 'Utilizador não encontrado' });

    res.json(user);
  } catch (err) {
    console.error('Erro em GET /me:', err);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

router.patch('/me', auth, async (req, res) => {
  const updates = req.body;

  let allowedUpdates = ['name', 'email', 'bio', 'goal', 'weight', 'height', 'birthDate', 'avatarUrl'];
  if (req.user.role === 'trainer') allowedUpdates.push('specialties');

  const updateKeys = Object.keys(updates);
  const isValidUpdate = updateKeys.every(key => allowedUpdates.includes(key));

  if (!isValidUpdate) {
    return res.status(400).json({ message: 'Campos inválidos para atualização' });
  }

  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'Utilizador não encontrado' });

    updateKeys.forEach(key => {
      if (key === 'specialties' && req.user.role === 'trainer') {
        user.profile.specialties = updates[key].map(id => new mongoose.Types.ObjectId(id));
      } else if (key === 'name' || key === 'email') {
        user.profile[key] = updates[key];
      } else if (key === 'birthDate') {
        user.profile.birthDate = updates[key] ? new Date(updates[key]) : null;
      } else {
        user.profile[key] = updates[key] === '' ? null : updates[key];
      }
    });

    await user.save({ validateModifiedOnly: true });

    const updatedUser = await User.findById(req.user._id)
      .select('-passwordHash -__v')
      .populate('profile.specialties')
      .lean();

    res.json(updatedUser);
  } catch (err) {
    console.error('Erro ao atualizar perfil:', err);
    res.status(500).json({ message: 'Erro ao salvar alterações' });
  }
});

router.get('/me/qr-login', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('username passwordHash');
    if (!user) return res.status(404).json({ message: 'Utilizador não encontrado' });

    res.json({
      username: user.username,
      code: user.passwordHash  
    });
  } catch (err) {
    console.error('Erro ao gerar dados QR:', err);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

router.patch('/me/password', auth, async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;

  if (!currentPassword || !newPassword || !confirmPassword)
    return res.status(400).json({ message: 'Todos os campos são obrigatórios' });

  if (newPassword !== confirmPassword)
    return res.status(400).json({ message: 'As novas passwords não coincidem' });

  if (newPassword.length < 6)
    return res.status(400).json({ message: 'A nova password deve ter pelo menos 6 caracteres' });

  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'Utilizador não encontrado' });

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) return res.status(400).json({ message: 'Password atual incorreta' });

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: 'Password alterada com sucesso' });
  } catch (err) {
    console.error('Erro ao alterar password:', err);
    res.status(500).json({ message: 'Erro ao alterar password' });
  }
});

router.post('/me/weight', auth, permit('client'), async (req, res) => {
  const { weight } = req.body;

  if (!weight || weight <= 30 || weight >= 300) {
    return res.status(400).json({ message: 'Peso inválido (30-300 kg)' });
  }

  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'Utilizador não encontrado' });

    const parsedWeight = parseFloat(weight);

    if (!user.profile.initialWeight) {
      user.profile.initialWeight = parsedWeight;
    }

    user.profile.weight = parsedWeight;
    user.profile.lastWeightUpdate = new Date();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastEntry = user.profile.weightHistory[user.profile.weightHistory.length - 1];
    const lastEntryDate = lastEntry ? new Date(lastEntry.date) : null;
    if (lastEntryDate) lastEntryDate.setHours(0, 0, 0, 0);

    if (!lastEntry || lastEntryDate < today) {
      user.profile.weightHistory.push({ weight: parsedWeight });
    } else {
      lastEntry.weight = parsedWeight;
      lastEntry.date = new Date();
    }

    if (user.profile.initialWeight) {
      user.profile.weightLost = Number((user.profile.initialWeight - parsedWeight).toFixed(1));
    }

    await user.save();

    const updated = await User.findById(req.user._id)
      .select('profile.weight profile.initialWeight profile.weightLost profile.lastWeightUpdate profile.weightHistory')
      .lean();

    res.json({
      message: 'Peso atualizado com sucesso!',
      profile: updated.profile
    });

  } catch (err) {
    console.error('Erro ao atualizar peso:', err);
    res.status(500).json({ message: 'Erro ao guardar peso' });
  }
});

// ========================
// UPLOAD DE AVATAR
// ========================
const memoryStorage = multer.memoryStorage();
const uploadMiddleware = multer({
  storage: memoryStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|webp/;
    const extname = filetypes.test(file.originalname.toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (extname && mimetype) return cb(null, true);
    cb(new Error('Apenas imagens JPEG, PNG ou WEBP são permitidas'));
  }
}).single('avatar');

router.post('/me/avatar', auth, (req, res) => {
  uploadMiddleware(req, res, async (err) => {
    if (err) return res.status(400).json({ message: err.message });
    if (!req.file) return res.status(400).json({ message: 'Nenhuma imagem enviada' });

    try {
      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: 'fitapp/avatars',
            transformation: [
              { width: 1028, height: 1028, crop: 'fill', gravity: 'face' },
              { quality: 'auto:best', fetch_format: 'auto' },
              { flags: 'progressive' }
            ],
            allowed_formats: ['jpg', 'png', 'webp']
          },
          (error, result) => (error ? reject(error) : resolve(result))
        );
        stream.end(req.file.buffer);
      });

      const user = await User.findById(req.user._id);
      if (user.profile.avatarUrl) {
        const publicId = user.profile.avatarUrl.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(`fitapp/avatars/${publicId}`).catch(() => {});
      }

      user.profile.avatarUrl = result.secure_url;
      await user.save();

      res.json({ avatarUrl: result.secure_url });
    } catch (error) {
      console.error('Erro no upload:', error);
      res.status(500).json({ message: 'Erro ao fazer upload da imagem' });
    }
  });
});

// ========================
// GESTÃO DE TREINADORES (PUBLIC / CLIENT)
// ========================

router.get('/trainers', async (req, res) => {
  const { q, page = 1, limit = 12 } = req.query;
  const filter = { role: 'trainer', validated: true };

  if (q) filter['profile.name'] = new RegExp(q, 'i');

  try {
    const trainers = await User.find(filter)
      .select('username profile.name profile.avatarUrl profile.bio profile.goal profile.specialties')
      .sort({ 'profile.name': 1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    const total = await User.countDocuments(filter);

    res.json({
      trainers,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit)
    });
  } catch (err) {
    console.error('Erro ao listar trainers:', err);
    res.status(500).json({ message: 'Erro ao buscar treinadores' });
  }
});

router.get('/trainers/:id', async (req, res) => {
  try {
    const trainer = await User.findOne({
      _id: req.params.id,
      role: 'trainer',
      validated: true
    })
      .select('-passwordHash -__v')
      .populate('profile.specialties', 'name')
      .lean({ virtuals: true });

    if (!trainer) return res.status(404).json({ message: 'Treinador não encontrado' });

    const clientsCount = await User.countDocuments({ trainerAssigned: req.params.id });
    trainer.clientsCount = clientsCount;

    res.json(trainer);
  } catch (err) {
    console.error('Erro ao carregar treinador:', err);
    res.status(500).json({ message: 'Erro interno' });
  }
});

// --- ROTA ALTERADA PARA CRIAR PEDIDO EM VEZ DE ATRIBUIR ---
router.post('/me/assign-trainer', auth, permit('client'), async (req, res) => {
  const { trainerId } = req.body;
  if (!trainerId) return res.status(400).json({ message: 'ID do treinador é obrigatório' });

  try {
    const trainer = await User.findOne({ _id: trainerId, role: 'trainer', validated: true });
    if (!trainer) return res.status(404).json({ message: 'Treinador não encontrado ou não validado' });

    // Verificar se já existe um pedido pendente para este treinador
    const existingReq = await TrainerChangeRequest.findOne({
      client: req.user._id,
      newTrainer: trainerId,
      status: 'pending'
    });
    
    if (existingReq) {
      return res.status(400).json({ message: 'Já tens um pedido pendente para este treinador. Aguarda a aprovação.' });
    }

    const currentCount = await User.countDocuments({ trainerAssigned: trainerId });
    if (currentCount >= 10) return res.status(400).json({ message: 'Este treinador já tem lotação completa (10 clientes)' });

    const client = await User.findById(req.user._id);
    if (client.trainerAssigned?.toString() === trainerId)
      return res.status(400).json({ message: 'Este já é o teu treinador' });

    // Cria o pedido de mudança/atribuição
    await TrainerChangeRequest.create({
      client: req.user._id,
      currentTrainer: client.trainerAssigned || null,
      newTrainer: trainerId,
      status: 'pending'
    });

    res.json({ message: 'Pedido enviado com sucesso! O treinador deve aceitar a tua solicitação.' });
  } catch (err) {
    console.error('Erro ao atribuir treinador:', err);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

router.post('/me/request-trainer-change', auth, permit('client'), async (req, res) => {
  const { newTrainerId } = req.body;
  if (!newTrainerId) return res.status(400).json({ message: 'ID do novo treinador obrigatório' });

  try {
    const client = await User.findById(req.user._id).populate('trainerAssigned');
    const newTrainer = await User.findOne({ _id: newTrainerId, role: 'trainer', validated: true });
    if (!newTrainer) return res.status(404).json({ message: 'Novo treinador não encontrado ou não validado' });

    const existing = await TrainerChangeRequest.findOne({
      client: req.user._id,
      newTrainer: newTrainerId,
      status: 'pending'
    });
    if (existing) return res.status(400).json({ message: 'Já tens um pedido pendente para este treinador' });

    const clientCount = await User.countDocuments({ trainerAssigned: newTrainerId });
    if (clientCount >= 10) return res.status(400).json({ message: 'Este treinador já tem lotação completa' });

    const request = await TrainerChangeRequest.create({
      client: req.user._id,
      currentTrainer: client.trainerAssigned?._id || null,
      newTrainer: newTrainerId
    });

    await request.populate([
      { path: 'client', select: 'username profile.name profile.avatarUrl' },
      { path: 'currentTrainer', select: 'username profile.name profile.avatarUrl' },
      { path: 'newTrainer', select: 'username profile.name profile.avatarUrl' }
    ]);

    res.json({ message: 'Pedido de mudança enviado!', request });
  } catch (err) {
    console.error('Erro no request-trainer-change:', err);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// ========================
// ROTAS DO TREINADOR (GERIR CLIENTES)
// ========================

router.get('/my-clients', auth, permit('trainer'), async (req, res) => {
  try {
    const clients = await User.find({ trainerAssigned: req.user._id })
      .select('username profile.name profile.avatarUrl profile.email profile.weight profile.height profile.goal profile.bio')
      .sort({ 'profile.name': 1 })
      .lean();

    res.json(clients);
  } catch (err) {
    console.error('Erro ao buscar meus clientes:', err);
    res.status(500).json({ message: 'Erro ao carregar clientes' });
  }
});

router.get('/:id', auth, permit('trainer'), async (req, res) => {
  try {
    const client = await User.findById(req.params.id)
      .select('-passwordHash -__v')
      .populate('profile.specialties');

    if (!client) return res.status(404).json({ message: 'Cliente não encontrado' });

    if (client.trainerAssigned?.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'Este cliente não pertence a ti' });

    res.json(client);
  } catch (err) {
    console.error('Erro ao carregar cliente:', err);
    res.status(500).json({ message: 'Erro interno' });
  }
});

// ========================
// ROTA NOVA: Verificar se falhou treino ontem
// ========================
router.post('/me/check-missed-workout', auth, permit('client'), async (req, res) => {
  try {
    const Plan = require('../models/Plan');
    const Entry = require('../models/Entry');
    const Notification = require('../models/Notification');
    const { format, subDays } = require('date-fns');
    const { pt } = require('date-fns/locale');

    // 1. Determinar qual foi o dia de ontem
    const yesterday = subDays(new Date(), 1);
    yesterday.setHours(0, 0, 0, 0);
    
    // Formatar dia da semana (ex: "Segunda-feira")
    let dayName = format(yesterday, 'EEEE', { locale: pt });
    dayName = dayName.charAt(0).toUpperCase() + dayName.slice(1);

    // 2. Buscar o plano do utilizador
    const plan = await Plan.findOne({ client: req.user._id });
    if (!plan) return res.json({ message: 'Sem plano ativo' });

    // 3. Verificar se "ontem" era dia de treino neste plano
    const wasWorkoutDay = plan.days.some(d => d.dayOfWeek === dayName && d.exercises.length > 0);
    
    if (!wasWorkoutDay) return res.json({ message: 'Ontem não era dia de treino' });

    // 4. Verificar se existe entrada (Entry) para ontem marcada como completed
    const entry = await Entry.findOne({ 
      client: req.user._id, 
      date: yesterday,
      completed: true 
    });

    if (!entry) {
      // FALHOU O TREINO!
      // Verificar se já existe notificação criada nas últimas 24h
      const exists = await Notification.findOne({
        recipient: req.user._id,
        type: 'alert',
        createdAt: { $gte: yesterday } 
      });

      if (!exists) {
        await Notification.create({
          recipient: req.user._id,
          type: 'alert',
          content: `⚠️ Alerta: Falhaste o treino de ontem (${dayName})! A consistência é a chave.`,
          relatedId: null 
        });
        return res.json({ missed: true, message: 'Notificação criada' });
      }
    }

    res.json({ missed: false });
  } catch (err) {
    console.error('Erro check-missed:', err);
    res.status(500).json({ message: 'Erro interno' });
  }
});

module.exports = router;