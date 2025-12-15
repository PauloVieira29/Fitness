// backend/routes/trainers.js
const router = require('express').Router();
const Plan = require('../models/Plan');
const User = require('../models/User');
const Notification = require('../models/Notification');
const TrainerChangeRequest = require('../models/TrainerChangeRequest');
const { auth, permit } = require('../middleware/auth');

// ========================
// GERIR PEDIDOS DE CLIENTES (ACEITAR/REJEITAR)
// ========================

// 1. Listar pedidos pendentes para este treinador
router.get('/requests', auth, permit('trainer'), async (req, res) => {
  try {
    const requests = await TrainerChangeRequest.find({
      newTrainer: req.user._id,
      status: 'pending'
    })
    .populate('client', 'username profile.name profile.avatarUrl profile.goal')
    .sort({ createdAt: -1 });

    res.json(requests);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao buscar pedidos.' });
  }
});

// 2. Aceitar ou Rejeitar pedido
router.post('/requests/:id/resolve', auth, permit('trainer'), async (req, res) => {
  const { action } = req.body; // 'accept' ou 'reject'
  
  try {
    const request = await TrainerChangeRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Pedido não encontrado' });

    // Segurança: garantir que o pedido é para este treinador
    if (request.newTrainer.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Não tens permissão para este pedido.' });
    }

    if (action === 'accept') {
        // Verificar limite de clientes (10)
        const currentClients = await User.countDocuments({ trainerAssigned: req.user._id });
        if (currentClients >= 10) {
            return res.status(400).json({ message: 'Já atingiste o limite de 10 clientes.' });
        }

        // Atualizar o cliente
        const client = await User.findById(request.client);
        if (client) {
            client.trainerAssigned = req.user._id;
            await client.save();
        }

        request.status = 'accepted';
        
        // Notificar cliente
        await Notification.create({
            recipient: request.client,
            type: 'system',
            content: `O treinador aceitou o teu pedido! Agora fazem parte da mesma equipa.`,
            relatedId: req.user._id
        });

    } else {
        request.status = 'rejected';
        
        // Notificar rejeição
        await Notification.create({
            recipient: request.client,
            type: 'system',
            content: `O treinador não pôde aceitar o teu pedido de momento.`,
            relatedId: null
        });
    }

    await request.save();
    res.json({ message: `Pedido ${action === 'accept' ? 'aceite' : 'rejeitado'} com sucesso.` });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao processar pedido.' });
  }
});

// ========================
// NOVO: REMOVER CLIENTE (PARAR DE TREINAR)
// ========================
router.patch('/clients/:id/remove', auth, permit('trainer'), async (req, res) => {
  try {
    const clientId = req.params.id;
    const client = await User.findById(clientId);

    if (!client) {
      return res.status(404).json({ message: 'Cliente não encontrado.' });
    }

    // Verificar se o cliente pertence mesmo a este treinador
    if (client.trainerAssigned?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Este cliente não está associado a ti.' });
    }

    // 1. Desassociar o treinador
    client.trainerAssigned = null;
    await client.save();

    // 2. Apagar o plano ativo para não ficar inconsistente
    await Plan.deleteOne({ client: clientId });

    // 3. Notificar o cliente
    await Notification.create({
      recipient: clientId,
      type: 'system',
      content: 'O teu treinador cessou o acompanhamento. Podes escolher um novo treinador na lista.',
      relatedId: req.user._id
    });

    res.json({ message: 'Cliente removido com sucesso.' });

  } catch (err) {
    console.error('Erro ao remover cliente:', err);
    res.status(500).json({ message: 'Erro ao processar o pedido.' });
  }
});

// ========================
// CRIAR PLANO
// ========================
router.post('/plans', auth, permit('trainer'), async (req, res) => {
  const data = req.body;
  data.trainer = req.user._id;

  try {
    if (data.days && Array.isArray(data.days)) {
        for (const day of data.days) {
            if (day.exercises && day.exercises.length > 10) {
                return res.status(400).json({ 
                    message: `O limite é de 10 exercícios por sessão. O dia "${day.dayOfWeek || 'desconhecido'}" tem ${day.exercises.length}.` 
                });
            }
        }
    }

    const plan = await Plan.create(data);
    
    await Notification.create({
        recipient: data.client,
        type: 'system',
        content: `O teu treinador criou um novo plano de treino: ${plan.name}`,
        relatedId: plan._id
    });

    res.json(plan);
  } catch (e) {
    console.error(e);
    res.status(400).json({ message: e.message });
  }
});

// ========================
// OBTER PLANOS DO TREINADOR
// ========================
router.get('/plans', auth, permit('trainer'), async (req, res) => {
  try {
    const filter = { trainer: req.user._id };
    
    if (req.query.client) {
        filter.client = req.query.client;
    }

    const plans = await Plan.find(filter)
        .populate('client', 'username profile.name profile.avatarUrl')
        .sort({ createdAt: -1 });

    res.json(plans);
  } catch (err) {
    res.status(500).json({ message: 'Erro ao buscar planos' });
  }
});

// ========================
// ENVIAR ALERTA MANUAL AO CLIENTE
// ========================
router.post('/alert-client', auth, permit('trainer'), async (req, res) => {
  const { clientId, message } = req.body;
  try {
    const client = await User.findOne({ _id: clientId, trainerAssigned: req.user._id });
    
    if (!client) {
        return res.status(403).json({ message: 'Cliente não encontrado ou não associado a ti.' });
    }

    await Notification.create({
      recipient: clientId,
      type: 'alert',
      content: message || '⚠️ O teu treinador notou a tua ausência. Vamos voltar ao foco!',
      relatedId: req.user._id
    });

    res.json({ message: 'Alerta enviado com sucesso' });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;