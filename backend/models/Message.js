const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true,
    maxlength: 4000,
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,      // null for bot messages
  },
  // Bot message fields
  isBot:     { type: Boolean, default: false },
  botName:   { type: String,  default: null  },
  botAvatar: { type: String,  default: null  },
  botAuthor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bot',
    default: null,
  },
  channel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Channel',
    required: true,
  },
  server: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Server',
  },
  type: {
    type: String,
    enum: ['text', 'image', 'file', 'system'],
    default: 'text',
  },
  attachments: [{
    url: String,
    filename: String,
    size: Number,
    type: String,
  }],
  reactions: [{
    emoji: String,
    users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  }],
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    default: null,
  },
  editedAt:  { type: Date,    default: null  },
  isDeleted: { type: Boolean, default: false },
  isPinned:  { type: Boolean, default: false },
}, { timestamps: true });

messageSchema.index({ channel: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
