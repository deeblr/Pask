const Server = require('../models/Server');
const Role = require('../models/Role');

/**
 * Resolve effective permissions for a user in a server.
 * Owner always has all permissions.
 * Other members: union of all their custom roles' permissions,
 * plus the legacy role field fallback.
 */
const getEffectivePermissions = async (server, userId) => {
  const member = server.members.find(
    m => m.user?._id?.toString() === userId || m.user?.toString() === userId
  );
  if (!member) return null;

  // Owner gets everything
  if (member.role === 'owner') return { _isOwner: true, all: true };

  // Legacy admin fallback
  const legacyPerms = {
    manageServer:    ['admin'].includes(member.role),
    manageRoles:     ['admin'].includes(member.role),
    manageChannels:  ['admin', 'moderator'].includes(member.role),
    kickMembers:     ['admin', 'moderator'].includes(member.role),
    banMembers:      ['admin'].includes(member.role),
    manageMessages:  ['admin', 'moderator'].includes(member.role),
    sendMessages:    true,
    readMessages:    true,
    mentionEveryone: ['admin'].includes(member.role),
    manageInvites:   ['admin', 'moderator'].includes(member.role),
  };

  if (!member.roles || member.roles.length === 0) return legacyPerms;

  // Load custom roles and merge
  const roles = await Role.find({ _id: { $in: member.roles }, server: server._id });
  const merged = { ...legacyPerms };
  for (const role of roles) {
    for (const [perm, val] of Object.entries(role.permissions.toObject())) {
      if (val) merged[perm] = true;
    }
  }
  return merged;
};

/**
 * Express middleware factory — checks a specific permission.
 * Expects req.user and a serverId in req.params or req.body.
 */
const requirePermission = (permission) => async (req, res, next) => {
  try {
    const serverId = req.params.serverId || req.params.id || req.body.serverId;
    const server = await Server.findById(serverId).populate('members.roles');
    if (!server) return res.status(404).json({ message: 'Server not found' });

    const perms = await getEffectivePermissions(server, req.user._id.toString());
    if (!perms) return res.status(403).json({ message: 'You are not a member' });
    if (perms.all || perms[permission]) {
      req.server = server;
      req.memberPerms = perms;
      return next();
    }
    return res.status(403).json({ message: `Missing permission: ${permission}` });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

module.exports = { getEffectivePermissions, requirePermission };
