const mongoose = require('mongoose');

const channelSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
  type: {
    type: String,
    enum: ['text', 'voice', 'announcement'],
    default: 'text',
  },
  server: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Server',
    required: true,
  },
  category: {
    type: String,
    default: 'General',
  },
  topic: {
    type: String,
    maxlength: 1024,
    default: '',
  },
  isPrivate: {
    type: Boolean,
    default: false,
  },
  allowedRoles: [{
    type: String,
    enum: ['owner', 'admin', 'moderator', 'member'],
  }],
  position: {
    type: Number,
    default: 0,
  },
}, { timestamps: true });

module.exports = mongoose.model('Channel', channelSchema);
