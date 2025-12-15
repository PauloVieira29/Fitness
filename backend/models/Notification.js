// backend/models/Notification.js
const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  type: { 
    type: String, 
    enum: ['message', 'plan', 'system', 'alert'], 
    required: true 
  },
  
  content: { type: String, required: true },
  relatedId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // ID do user (msg/alert) ou plano
  isRead: { type: Boolean, default: false },
  toastShown: { type: Boolean, default: false } // Opcional, útil para controlo frontend
}, { timestamps: true });

module.exports = mongoose.model('Notification', NotificationSchema);