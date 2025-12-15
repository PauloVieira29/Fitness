// backend/routes/notifications.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth').auth; // Ajusta conforme a tua exportação do middleware
const Notification = require('../models/Notification');
const User = require('../models/User');

router.use(auth);

// Obter notificações do utilizador
router.get('/', async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.user._id })
      .sort({ createdAt: -1 })
      .limit(20);
    res.json(notifications);
  } catch (err) {
    console.error(err);
    res.status(500).send('Erro ao buscar notificações');
  }
});

// Marcar notificação como lida
router.put('/:id/read', async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) return res.status(404).json({ msg: 'Notificação não encontrada' });
    
    // Verifica se pertence ao user
    if (notification.recipient.toString() !== req.user._id.toString()) {
        return res.status(401).json({ msg: 'Não autorizado' });
    }

    notification.isRead = true;
    await notification.save();
    res.json(notification);
  } catch (err) {
    res.status(500).send('Erro no servidor');
  }
});

// Atualizar preferências de notificação
router.put('/settings', async (req, res) => {
    try {
        const { messages, plans, system } = req.body;
        const user = await User.findById(req.user._id);
        
        if (messages !== undefined) user.notificationSettings.messages = messages;
        if (plans !== undefined) user.notificationSettings.plans = plans;
        if (system !== undefined) user.notificationSettings.system = system;

        await user.save();
        res.json(user.notificationSettings);
    } catch (err) {
        console.error(err);
        res.status(500).send('Erro ao salvar definições');
    }
});

module.exports = router;