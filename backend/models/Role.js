const mongoose = require('mongoose');

// Permissions list — each is a boolean flag on the role
const PERMISSIONS = [
  'manageServer',     // edit server name/icon/description
  'manageRoles',      // create/edit/delete roles, assign to members
  'manageChannels',   // create/edit/delete channels
  'kickMembers',      // kick members from server
  'banMembers',       // ban/unban members
  'manageMessages',   // delete/pin any message
  'sendMessages',     // send messages (can be disabled for read-only channels)
  'readMessages',     // view channels
  'mentionEveryone',  // use @everyone / @here
  'manageInvites',    // create/revoke invite links
];

const roleSchema = new mongoose.Schema({
  server: { type: mongoose.Schema.Types.ObjectId, ref: 'Server', required: true },
  name: { type: String, required: true, trim: true, maxlength: 64 },
  color: { type: String, default: '#99aab5' }, // hex color shown next to username
  hoist: { type: Boolean, default: false },    // show separately in members list
  position: { type: Number, default: 0 },      // lower = lower priority
  isDefault: { type: Boolean, default: false },// the @everyone role
  permissions: {
    manageServer:    { type: Boolean, default: false },
    manageRoles:     { type: Boolean, default: false },
    manageChannels:  { type: Boolean, default: false },
    kickMembers:     { type: Boolean, default: false },
    banMembers:      { type: Boolean, default: false },
    manageMessages:  { type: Boolean, default: false },
    sendMessages:    { type: Boolean, default: true },
    readMessages:    { type: Boolean, default: true },
    mentionEveryone: { type: Boolean, default: false },
    manageInvites:   { type: Boolean, default: false },
  },
}, { timestamps: true });

roleSchema.index({ server: 1, position: 1 });

module.exports = mongoose.model('Role', roleSchema);
module.exports.PERMISSIONS = PERMISSIONS;
