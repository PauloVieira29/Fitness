// backend/models/User.js
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  passwordHash: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['admin', 'trainer', 'client'], 
    default: 'client' 
  },
  
  isActive: { type: Boolean, default: true },

  notificationSettings: {
    messages: { type: Boolean, default: true },
    plans: { type: Boolean, default: true },
    system: { type: Boolean, default: true }
  },

  profile: {
    name: { type: String, default: '' },
    email: { type: String, default: '' },
    bio: { type: String, default: '' },
    goal: { type: String, default: '' },

    weight: { type: Number, default: null },
    initialWeight: { type: Number, default: null },
    lastWeightUpdate: { type: Date, default: null },

    height: { type: Number, default: null },
    birthDate: { type: Date, default: null },
    avatarUrl: { type: String, default: null },
    
    totalPlans: { type: Number, default: 0 },
    totalWorkouts: { type: Number, default: 0 }, 
    
    weightLost: { type: Number, default: 0 },

    specialties: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Specialty',
    }],

    weightHistory: [{
      weight: { type: Number, required: true },
      date: { type: Date, default: Date.now }
    }]
  },
  trainerAssigned: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  validated: { type: Boolean, default: false }
}, { timestamps: true });

UserSchema.index({ 'profile.specialties': 1 });
UserSchema.index({ role: 1 });

UserSchema.virtual('clients', {
  ref: 'User',
  localField: '_id',
  foreignField: 'trainerAssigned'
});

UserSchema.set('toJSON', { virtuals: true });
UserSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('User', UserSchema);