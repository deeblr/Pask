const mongoose = require('mongoose');

const serverSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
  description: {
    type: String,
    maxlength: 500,
    default: '',
  },
  icon: {
    type: String,
    default: null,
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  members: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: { type: String, enum: ['owner', 'admin', 'moderator', 'member'], default: 'member' },
    // Custom roles assigned to this member (references Role documents)
    roles: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Role' }],
    joinedAt: { type: Date, default: Date.now },
    // Ban info
    isBanned: { type: Boolean, default: false },
    bannedAt: { type: Date, default: null },
    bannedReason: { type: String, default: '' },
    // Nickname override in this server
    nickname: { type: String, default: '', maxlength: 32 },
  }],
  inviteCode: {
    type: String,
    unique: true,
  },
  isPublic: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true });

serverSchema.pre('save', function (next) {
  if (!this.inviteCode) {
    this.inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();
  }
  next();
});

module.exports = mongoose.model('Server', serverSchema);
