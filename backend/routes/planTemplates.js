// backend/routes/planTemplates.js
const router = require('express').Router();
const PlanTemplate = require('../models/PlanTemplate');  // ← IMPORTANTE
const { auth, permit } = require('../middleware/auth');

// Criar template
router.post('/', auth, permit('trainer'), async (req, res) => {
  try {
    const template = new PlanTemplate({
      ...req.body,
      trainer: req.user._id
    });
    await template.save();
    res.status(201).json(template);
  } catch (err) {
    console.error('Erro ao criar template:', err);
    res.status(400).json({ message: err.message });
  }
});

// Listar templates do treinador
router.get('/', auth, permit('trainer'), async (req, res) => {
  try {
    const templates = await PlanTemplate.find({ trainer: req.user._id })
      .sort({ createdAt: -1 })
      .lean();
    res.json(templates);
  } catch (err) {
    console.error('Erro ao listar templates:', err);
    res.status(500).json({ message: 'Erro ao carregar templates' });
  }
});

// Editar
router.put('/:id', auth, permit('trainer'), async (req, res) => {
  try {
    const template = await PlanTemplate.findOneAndUpdate(
      { _id: req.params.id, trainer: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!template) return res.status(404).json({ message: 'Template não encontrado' });
    res.json(template);
  } catch (err) {
    console.error('Erro ao editar template:', err);
    res.status(400).json({ message: err.message });
  }
});

// Apagar
router.delete('/:id', auth, permit('trainer'), async (req, res) => {
  try {
    const result = await PlanTemplate.findOneAndDelete({
      _id: req.params.id,
      trainer: req.user._id
    });
    if (!result) return res.status(404).json({ message: 'Template não encontrado' });
    res.json({ message: 'Template apagado' });
  } catch (err) {
    console.error('Erro ao apagar template:', err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;