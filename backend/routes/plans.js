// backend/routes/plans.js
const router = require('express').Router();
const Plan = require('../models/Plan');
const PlanTemplate = require('../models/PlanTemplate');
const User = require('../models/User');
const Entry = require('../models/Entry');
const Notification = require('../models/Notification');
const { auth, permit } = require('../middleware/auth');

// Cliente vê o seu plano E marca notificações como lidas
router.get('/my', auth, permit('client'), async (req, res) => {
  try {
    const plan = await Plan.findOne({ client: req.user._id }).populate('trainer', 'username profile.name');
    
    // Limpar notificações
    await Notification.updateMany({
        recipient: req.user._id,
        type: 'plan',
        isRead: false
    }, { $set: { isRead: true } });

    res.json(plan || null);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Treinador aplica template
router.post('/from-template', auth, permit('trainer'), async (req, res) => {
  const { clientId, templateId } = req.body;

  try {
    const template = await PlanTemplate.findById(templateId);
    if (!template || template.trainer.toString() !== req.user._id.toString()) {
      return res.status(404).json({ message: 'Template não encontrado ou não pertence a ti' });
    }

    const client = await User.findOne({ _id: clientId, trainerAssigned: req.user._id, role: 'client' });
    if (!client) return res.status(403).json({ message: 'Cliente não é teu' });

    // --- SINCRONIZAÇÃO DE PLANOS (HISTÓRICO) ---
    // Verifica quantos planos ativos o treinador tem ANTES de apagar/criar
    const activePlansCount = await Plan.countDocuments({ trainer: req.user._id });
    const trainerUser = await User.findById(req.user._id);
    
    // Se o histórico for menor que o real atual, ajusta
    if ((trainerUser.profile.totalPlans || 0) < activePlansCount) {
        await User.findByIdAndUpdate(req.user._id, { 'profile.totalPlans': activePlansCount });
    }
    // -------------------------------------------------------

    // Remove plano anterior
    await Plan.deleteOne({ client: clientId });

    const newPlan = new Plan({
      trainer: req.user._id,
      client: clientId,
      name: template.name,
      weeks: template.weeks,
      sessionsPerWeek: template.sessionsPerWeek,
      days: template.days,
      notes: template.notes,
      isFromTemplate: true
    });

    await newPlan.save();
    
    // --- INCREMENTA CONTADOR DE PLANOS ---
    await User.findByIdAndUpdate(req.user._id, { 
      $inc: { 'profile.totalPlans': 1 } 
    });
    // -------------------------------------

    // Notificar Cliente
    if (client.notificationSettings && client.notificationSettings.plans) {
       await Notification.create({
           recipient: clientId,
           type: 'plan',
           content: `Novo plano atribuído: ${template.name}`,
           relatedId: newPlan._id
       });
    }

    const populated = await newPlan.populate('trainer client');
    res.status(201).json({ message: 'Plano aplicado!', plan: populated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao aplicar template' });
  }
});

// Treinador cria plano custom direto
router.post('/', auth, permit('trainer'), async (req, res) => {
  const { clientId, name, weeks, sessionsPerWeek, days, notes } = req.body;

  try {
    const client = await User.findOne({ 
      _id: clientId, 
      trainerAssigned: req.user._id,
      role: 'client' 
    });
    if (!client) return res.status(403).json({ message: 'Cliente não é teu' });

    // --- SINCRONIZAÇÃO DE PLANOS (HISTÓRICO) ---
    const activePlansCount = await Plan.countDocuments({ trainer: req.user._id });
    const trainerUser = await User.findById(req.user._id);
    
    if ((trainerUser.profile.totalPlans || 0) < activePlansCount) {
        await User.findByIdAndUpdate(req.user._id, { 'profile.totalPlans': activePlansCount });
    }
    // -------------------------------------------------------

    // Remove plano anterior
    await Plan.deleteOne({ client: clientId });

    const newPlan = new Plan({
      trainer: req.user._id,
      client: clientId,
      name: name || 'Plano Personalizado',
      weeks: Number(weeks) || 8,
      sessionsPerWeek: Number(sessionsPerWeek) || 4,
      days: days || [],
      notes: notes || '',
      isFromTemplate: false
    });

    await newPlan.save();

    // --- INCREMENTA CONTADOR DE PLANOS ---
    await User.findByIdAndUpdate(req.user._id, { 
      $inc: { 'profile.totalPlans': 1 } 
    });
    // -------------------------------------

    // Notificar Cliente
    if (client.notificationSettings && client.notificationSettings.plans) {
       await Notification.create({
           recipient: clientId,
           type: 'plan',
           content: `Tens um novo plano de treino personalizado!`,
           relatedId: newPlan._id
       });
    }

    const populated = await newPlan.populate('trainer client');
    res.status(201).json({ message: 'Plano criado!', plan: populated });
  } catch (err) {
    console.error('Erro ao criar plano direto:', err);
    res.status(500).json({ message: 'Erro interno' });
  }
});

// Treinador remove plano do cliente
router.delete('/client/:clientId', auth, permit('trainer'), async (req, res) => {
  try {
    const plan = await Plan.findOne({ client: req.params.clientId });
    if (!plan) return res.status(404).json({ message: 'Plano não encontrado' });

    if (plan.trainer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Não autorizado' });
    }

    await Plan.deleteOne({ _id: plan._id });
    res.json({ message: 'Plano removido com sucesso' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao remover plano' });
  }
});

// Treinador vê plano de um cliente
router.get('/client/:clientId', auth, permit('trainer'), async (req, res) => {
  try {
    const plan = await Plan.findOne({ client: req.params.clientId }).populate('trainer', 'username');
    res.json(plan || null);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/my/stats', auth, permit('client'), async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + 1); 

    const plan = await Plan.findOne({ client: req.user._id });
    const expectedWorkoutsPerWeek = plan?.days?.length || 0;

    const workoutsThisMonth = await Entry.countDocuments({
      client: req.user._id,
      completed: true,
      completedAt: { $gte: startOfMonth }
    });

    const workoutsThisWeek = await Entry.countDocuments({
      client: req.user._id,
      completed: true,
      completedAt: { $gte: startOfWeek }
    });

    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    const todayEntries = await Entry.find({
      client: req.user._id,
      completed: true,
      completedAt: { $gte: today, $lte: todayEnd }
    });

    const caloriesToday = todayEntries.reduce((sum, e) => sum + e.caloriesBurned, 0);

    const weeklyAdherence = expectedWorkoutsPerWeek > 0
      ? Math.min(100, Math.round((workoutsThisWeek / expectedWorkoutsPerWeek) * 100)) + '%'
      : '0%';

    res.json({
      workoutsThisMonth,
      weeklyAdherence,
      weightLostThisMonth: '0 kg', 
      caloriesToday: caloriesToday || 0
    });
  } catch (err) {
    console.error('Erro em /plans/my/stats:', err);
    res.status(500).json({ message: 'Erro ao calcular estatísticas' });
  }
});

module.exports = router;