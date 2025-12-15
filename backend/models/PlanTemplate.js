// backend/models/PlanTemplate.js
const mongoose = require('mongoose');

const ExerciseTemplateSchema = new mongoose.Schema({
  name: { type: String, required: true },
  sets: { type: Number, required: true, min: 1 },
  reps: { type: String, required: true },  // ex: "8-12"
  rest: { type: String },  // ex: "90s"
  notes: { type: String },
  media: { type: String }  // URL de vídeo, etc.
});

const DayTemplateSchema = new mongoose.Schema({
  dayOfWeek: { type: String, required: true },
  exercises: [ExerciseTemplateSchema]
});

const PlanTemplateSchema = new mongoose.Schema({
  trainer: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  name: { type: String, required: true },
  weeks: { type: Number, default: 4, min: 1 },
  sessionsPerWeek: { type: Number, enum: [3, 4, 5], default: 4 },
  days: [DayTemplateSchema],
  notes: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('PlanTemplate', PlanTemplateSchema);