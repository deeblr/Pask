const mongoose = require('mongoose');

// A conversation between two users
const dmConversationSchema = new mongoose.Schema({
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
  lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'DMMessage', default: null },
  lastActivityAt: { type: Date, default: Date.now },
  botParticipant: { type: mongoose.Schema.Types.ObjectId, ref: 'Bot', default: null },
  isBotDM: { type: Boolean, default: false },
}, { timestamps: true });

dmConversationSchema.index({ participants: 1 });

// Individual message inside a DM conversation
const dmMessageSchema = new mongoose.Schema({
  conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'DMConversation', required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true, maxlength: 4000 },
  replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'DMMessage', default: null },
  editedAt: { type: Date, default: null },
  isDeleted: { type: Boolean, default: false },
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

dmMessageSchema.index({ conversation: 1, createdAt: -1 });

const DMConversation = mongoose.model('DMConversation', dmConversationSchema);
const DMMessage = mongoose.model('DMMessage', dmMessageSchema);

module.exports = { DMConversation, DMMessage };