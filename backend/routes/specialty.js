// backend/routes/specialty.js
const router = require('express').Router();
const Specialty = require('../models/Specialty');
const User = require('../models/User');
const { auth, permit } = require('../middleware/auth');

// GET    /admin/specialties        → lista todas
router.get('/', auth, permit('admin'), async (req, res) => {
  try {
    const specialties = await Specialty.find().sort({ name: 1 });
    res.json(specialties);
  } catch (err) {
    res.status(500).json({ message: 'Erro ao listar especialidades' });
  }
});

// POST   /admin/specialties        → criar nova
router.post('/', auth, permit('admin'), async (req, res) => {
  const { name } = req.body;
  if (!name || name.trim().length < 2)
    return res.status(400).json({ message: 'Nome inválido' });

  try {
    const exists = await Specialty.findOne({
      name: { $regex: '^' + name.trim() + '$', $options: 'i' }
    });
    if (exists) return res.status(400).json({ message: 'Já existe' });

    const specialty = new Specialty({ name: name.trim() });
    await specialty.save();
    res.status(201).json(specialty);
  } catch (err) {
    res.status(500).json({ message: 'Erro ao criar' });
  }
});

// PATCH  /admin/specialties/:id    → editar
router.patch('/:id', auth, permit('admin'), async (req, res) => {
  const { name } = req.body;
  if (!name || name.trim().length < 2)
    return res.status(400).json({ message: 'Nome inválido' });

  try {
    const specialty = await Specialty.findById(req.params.id);
    if (!specialty) return res.status(404).json({ message: 'Não encontrada' });

    const duplicate = await Specialty.findOne({
      _id: { $ne: req.params.id },
      name: { $regex: '^' + name.trim() + '$', $options: 'i' }
    });
    if (duplicate) return res.status(400).json({ message: 'Nome já usado' });

    specialty.name = name.trim();
    await specialty.save();
    res.json(specialty);
  } catch (err) {
    res.status(500).json({ message: 'Erro ao editar' });
  }
});

// DELETE /admin/specialties/:id    → apagar (com proteção)
router.delete('/:id', auth, permit('admin'), async (req, res) => {
  try {
    const specialty = await Specialty.findById(req.params.id);
    if (!specialty) return res.status(404).json({ message: 'Não encontrada' });

    const inUse = await User.exists({ 'profile.specialties': specialty._id });
    if (inUse)
      return res.status(400).json({
        message: 'Não pode apagar: há treinadores usando esta especialidade'
      });

    await specialty.deleteOne();
    res.json({ message: 'Removida com sucesso' });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao remover' });
  }
});

module.exports = router;