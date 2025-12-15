// backend/models/Plan.js
const mongoose = require('mongoose');

const ExerciseSchema = new mongoose.Schema({
  name: String,
  sets: Number,
  reps: String,
  notes: String,
  media: String,
  rest: String
});

const DaySchema = new mongoose.Schema({
  dayOfWeek: { type: String },
  exercises: { type: [ExerciseSchema], default: [] }
});

const PlanSchema = new mongoose.Schema({
  trainer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, default: 'Plano Sem Nome' },
  weeks: { type: Number, default: 4 },
  sessionsPerWeek: { type: Number, enum: [3, 4, 5], default: 4 },
  days: { type: [DaySchema], default: [] },
  notes: String,
  isFromTemplate: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Plan', PlanSchema);