// backend/models/Entry.js
const mongoose = require('mongoose');

const EntrySchema = new mongoose.Schema({
  client: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  date: { 
    type: Date, 
    required: true 
  },
  completed: { 
    type: Boolean, 
    default: false 
  },
  completedAt: { 
    type: Date,
    default: null 
  },
  reason: String,
  proofMedia: String, // url da foto/video
  caloriesBurned: { 
    type: Number, 
    default: 0 
  },
  notes: String // opcional: feedback do cliente
}, { 
  timestamps: true 
});

// Índices para buscas rápidas
EntrySchema.index({ client: 1, date: 1 }, { unique: true });
EntrySchema.index({ client: 1, completedAt: -1 });

module.exports = mongoose.model('Entry', EntrySchema);