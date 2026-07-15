const mongoose = require('mongoose')
const crypto   = require('crypto')

const botSchema = new mongoose.Schema({
  name: {
    type: String, required: true, trim: true, minlength: 2, maxlength: 32,
  },
  token: {
    type: String, unique: true,
    default: () => 'pask.' + crypto.randomBytes(24).toString('base64url'),
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true,
  },
  avatar: { type: String, default: null },
  prefix: { type: String, default: '!', maxlength: 8 },
  description: { type: String, default: '', maxlength: 256 },
  online: { type: Boolean, default: false },
  // Servers this bot has been added to (via bot token auth)
  guilds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Server' }],
}, { timestamps: true })

// Never expose token in JSON responses unless explicitly requested
botSchema.methods.toPublicJSON = function () {
  const o = this.toObject()
  delete o.token
  return o
}

module.exports = mongoose.model('Bot', botSchema)
