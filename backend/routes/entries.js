// backend/routes/entries.js
const router = require('express').Router();
const Entry = require('../models/Entry');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { auth, permit } = require('../middleware/auth');
const mongoose = require('mongoose');

const isSameOrBeforeToday = (dateString) => {
  const workoutDate = new Date(dateString);
  workoutDate.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return workoutDate <= today;
};

// POST / -> Registar/Atualizar treino
router.post('/', auth, permit('client'), async (req, res) => {
  const { date, completed, reason, proofMedia, caloriesBurned = 0, notes } = req.body;

  if (completed && !isSameOrBeforeToday(date)) {
    return res.status(403).json({
      message: 'Ainda não podes concluir este treino. Espera até ao dia do treino.'
    });
  }

  try {
    let entry = await Entry.findOne({ client: req.user._id, date });
    let isNewCompletion = false;

    if (entry) {
      if (!entry.completed && completed) isNewCompletion = true;

      entry.completed = completed;
      entry.reason = reason || entry.reason;
      entry.proofMedia = proofMedia || entry.proofMedia;
      entry.caloriesBurned = caloriesBurned;
      entry.notes = notes || entry.notes;

      if (completed && !entry.completedAt) entry.completedAt = new Date();
      if (!completed) entry.completedAt = null;

      await entry.save();
    } else {
      entry = await Entry.create({
        client: req.user._id,
        date: new Date(date),
        completed,
        completedAt: completed ? new Date() : null,
        reason,
        proofMedia,
        caloriesBurned: Number(caloriesBurned) || 0,
        notes
      });
      if (completed) isNewCompletion = true;
    }

    // --- NOTIFICAÇÃO DE SISTEMA ---
    if (isNewCompletion) {
        const user = await User.findById(req.user._id);
        if (user && user.notificationSettings && user.notificationSettings.system === true) {
            await Notification.create({
                recipient: req.user._id,
                type: 'system',
                content: 'Parabéns! Completaste o treino do dia.',
                relatedId: entry._id
            });
        }
    }

    res.json(entry);
  } catch (err) {
    console.error('Erro ao salvar entrada:', err);
    res.status(500).json({ message: 'Erro ao guardar treino' });
  }
});

// GET /stats -> Dados para o gráfico (Agrupado por Semana ou Mês)
router.get('/stats', auth, async (req, res) => {
    try {
        const targetClientId = (req.user.role === 'trainer' && req.query.client) 
            ? req.query.client 
            : req.user._id;

        const { period = 'week' } = req.query; // 'week' | 'month'

        // Define o formato de agrupamento do MongoDB
        // %Y-%U para semana (Ano-Semana), %Y-%m para mês
        const dateFormat = period === 'month' ? '%Y-%m' : '%Y-%U';

        const stats = await Entry.aggregate([
            {
                $match: {
                    client: new mongoose.Types.ObjectId(targetClientId),
                    completed: true
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: dateFormat, date: "$date" } },
                    count: { $sum: 1 },
                    calories: { $sum: "$caloriesBurned" }
                }
            },
            { $sort: { _id: 1 } } // Ordenar cronologicamente
        ]);

        res.json(stats);
    } catch (err) {
        console.error('Erro nos stats:', err);
        res.status(500).json({ message: 'Erro ao calcular estatísticas' });
    }
});

// GET / -> Histórico com Filtros
router.get('/', auth, async (req, res) => {
  try {
    const { client, startDate, endDate, sort } = req.query;

    // Se for trainer, usa o cliente pedido, senão usa o próprio ID
    const targetClient = (req.user.role === 'trainer' && client) 
        ? client 
        : req.user._id;

    let query = { client: targetClient };

    // Filtro de Data
    if (startDate || endDate) {
        query.date = {};
        if (startDate) query.date.$gte = new Date(startDate);
        if (endDate) query.date.$lte = new Date(endDate);
    }

    // Ordenação (descendente por padrão)
    const sortOrder = sort === 'asc' ? 1 : -1;

    const entries = await Entry.find(query)
      .sort({ date: sortOrder })
      .select('-__v')
      .lean();

    res.json(entries);
  } catch (err) {
    console.error('Erro ao listar entradas:', err);
    res.status(500).json({ message: 'Erro ao carregar histórico' });
  }
});

module.exports = router;