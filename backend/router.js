// backend/router.js
const express = require('express');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const trainerRoutes = require('./routes/trainers');
const planRoutes = require('./routes/plans');
const planTemplateRoutes = require('./routes/planTemplates');
const entryRoutes = require('./routes/entries');
const adminRoutes = require('./routes/admin');
const specialtyRoutes = require('./routes/specialty');
const Specialty = require('./models/Specialty');
const uploadRoutes = require('./routes/upload');
const messageRoutes = require('./routes/messages');
const notificationRoutes = require('./routes/notifications');

function init() {
  const router = express.Router();

  // Rotas públicas (ou semi-públicas)
  router.use('/auth', authRoutes);
  router.use('/users', userRoutes);
  router.use('/trainers', trainerRoutes);
  router.use('/plans', planRoutes);
  router.use('/plan-templates', planTemplateRoutes);
  router.use('/entries', entryRoutes);
  router.use('/upload', uploadRoutes);
  router.use('/messages', messageRoutes);
  router.use('/notifications', notificationRoutes);

  // Especialidades públicas
  router.get('/specialties', async (req, res) => {
    try {
      const specialties = await Specialty.find({ active: true })
        .select('_id name')
        .sort({ name: 1 })
        .lean();
      res.json(specialties);
    } catch (err) {
      console.error('Erro na rota /specialties:', err);
      res.status(500).json({ message: 'Erro ao carregar especialidades' });
    }
  });

  // Rotas protegidas admin
  router.use('/admin', adminRoutes);
  router.use('/admin/specialties', specialtyRoutes);

  return router;
}

module.exports = { init };