// backend/routes/messages.js
const router = require('express').Router();
const Message = require('../models/Message');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { auth } = require('../middleware/auth');

router.use(auth);

// GET /unread -> Contagem de mensagens não lidas (ignorando as apagadas pelo user)
router.get('/unread', async (req, res) => {
  try {
    const myId = req.user._id;
    const unreadMessages = await Message.find({ 
      to: myId, 
      read: false,
      deletedFor: { $ne: myId } // <--- FILTRO NOVO
    })
      .populate('from', 'username profile.name');

    const byUser = {};
    unreadMessages.forEach(msg => {
      const senderId = msg.from._id.toString();
      if (!byUser[senderId]) {
        byUser[senderId] = {
          count: 0,
          name: msg.from.profile?.name || msg.from.username
        };
      }
      byUser[senderId].count++;
    });

    res.json({ total: unreadMessages.length, byUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao buscar notificações' });
  }
});

// GET /conversations -> Listar conversas (ignorando mensagens apagadas pelo user)
router.get('/conversations', async (req, res) => {
  try {
    const myId = req.user._id;
    // Encontrar todas as mensagens onde sou remetente ou destinatário
    // E que NÃO foram apagadas por mim
    const messages = await Message.find({
        $or: [{ from: myId }, { to: myId }],
        deletedFor: { $ne: myId } // <--- FILTRO NOVO
    })
    .sort({ createdAt: -1 })
    .populate('from', 'username profile.name profile.avatarUrl')
    .populate('to', 'username profile.name profile.avatarUrl')
    .lean();

    const partners = new Map();

    messages.forEach(msg => {
        const isFromMe = msg.from._id.toString() === myId.toString();
        const partner = isFromMe ? msg.to : msg.from;
        
        if (!partner) return;

        const partnerId = partner._id.toString();

        if (!partners.has(partnerId)) {
            partners.set(partnerId, {
                _id: partner._id,
                username: partner.username,
                profile: partner.profile,
                lastMessage: msg.text,
                lastMessageDate: msg.createdAt
            });
        }
    });

    res.json(Array.from(partners.values()));
  } catch (err) {
    console.error('Erro ao buscar conversas:', err);
    res.status(500).json({ message: 'Erro ao buscar conversas' });
  }
});

// PUT /read/:senderId -> Marcar conversa como lida e limpar notificação
router.put('/read/:senderId', async (req, res) => {
  try {
    const { senderId } = req.params;
    const myId = req.user._id;

    await Message.updateMany(
      { from: senderId, to: myId, read: false },
      { $set: { read: true } }
    );

    await Notification.updateMany({
        recipient: myId,
        type: 'message',
        relatedId: senderId,
        isRead: false
    }, { $set: { isRead: true } });

    res.json({ message: 'Conversa marcada como lida' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao atualizar mensagens' });
  }
});

// GET /:userId -> Histórico de conversa (ignorando as apagadas)
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const myId = req.user._id;

    const messages = await Message.find({
      $or: [
        { from: myId, to: userId },
        { from: userId, to: myId }
      ],
      deletedFor: { $ne: myId } // <--- FILTRO NOVO
    })
      .sort({ createdAt: 1 })
      .populate('from', 'username profile.name profile.avatarUrl')
      .lean();

    res.json(messages);
  } catch (err) {
    console.error('Erro ao buscar mensagens:', err);
    res.status(500).json({ message: 'Erro interno ao carregar chat' });
  }
});

// POST / -> Enviar mensagem
router.post('/', async (req, res) => {
  try {
    const { to, text } = req.body;
    const myId = req.user._id;

    if (!to || !text) return res.status(400).json({ message: 'Dados incompletos' });

    const newMessage = await Message.create({
      from: myId, to: to, text: text, read: false, deletedFor: []
    });

    const recipientUser = await User.findById(to).select('notificationSettings username profile');
    const shouldNotify = recipientUser && 
                         recipientUser.notificationSettings && 
                         recipientUser.notificationSettings.messages === true;

    if (shouldNotify) {
        const sender = await User.findById(myId).select('username profile');
        const senderName = sender.profile?.name || sender.username;

        await Notification.create({
            recipient: to,
            type: 'message',
            content: `Recebeu uma mensagem de ${senderName}`, 
            relatedId: myId
        });
    }

    await newMessage.populate('from', 'username profile.name profile.avatarUrl');
    res.status(201).json(newMessage);

  } catch (err) {
    console.error('Erro ao enviar mensagem:', err);
    res.status(500).json({ message: 'Erro ao enviar mensagem' });
  }
});

// ========================
// NOVA ROTA: ELIMINAR CONVERSA (Soft Delete p/ user)
// ========================
router.delete('/conversation/:partnerId', async (req, res) => {
  try {
    const { partnerId } = req.params;
    const myId = req.user._id;

    // Encontra todas as mensagens entre os dois e adiciona o meu ID ao array deletedFor
    await Message.updateMany(
      {
        $or: [
          { from: myId, to: partnerId },
          { from: partnerId, to: myId }
        ]
      },
      {
        $addToSet: { deletedFor: myId }
      }
    );

    res.json({ message: 'Conversa eliminada com sucesso' });
  } catch (err) {
    console.error('Erro ao eliminar conversa:', err);
    res.status(500).json({ message: 'Erro ao eliminar conversa' });
  }
});

module.exports = router;