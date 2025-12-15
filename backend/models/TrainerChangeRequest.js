// backend/models/TrainerChangeRequest.js
const mongoose = require('mongoose');

const TrainerChangeRequestSchema = new mongoose.Schema({
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  currentTrainer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  newTrainer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { 
    type: String, 
    enum: ['pending', 'accepted', 'rejected'], 
    default: 'pending' 
  },
}, { timestamps: true });

module.exports = mongoose.model('TrainerChangeRequest', TrainerChangeRequestSchema);