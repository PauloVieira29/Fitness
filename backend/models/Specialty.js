// backend/models/Specialty.js
const mongoose = require('mongoose');

const SpecialtySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 2,
    maxlength: 50
  },
  slug: {
    type: String,
    unique: true,
    trim: true
  },
  description: { type: String, default: '', maxlength: 300 },
  icon: { type: String, default: null },
  active: { type: Boolean, default: true }
}, { timestamps: true });

// Gera slug automático (sem acentos)
SpecialtySchema.pre('save', function(next) {
  if (this.isModified('name') || !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  next();
});

module.exports = mongoose.model('Specialty', SpecialtySchema);