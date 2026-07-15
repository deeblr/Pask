const express = require('express');
const router = express.Router();
const Role = require('../models/Role');
const Server = require('../models/Server');
const auth = require('../middleware/auth');
const { requirePermission, getEffectivePermissions } = require('../middleware/permissions');

// GET /api/roles/server/:serverId — list all roles in a server
router.get('/server/:serverId', auth, async (req, res) => {
  try {
    const server = await Server.findById(req.params.serverId);
    if (!server) return res.status(404).json({ message: 'Server not found' });

    const isMember = server.members.some(m => m.user?.toString() === req.user._id.toString());
    if (!isMember) return res.status(403).json({ message: 'Access denied' });

    const roles = await Role.find({ server: req.params.serverId }).sort({ position: -1 });
    res.json(roles);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

const createRole = async (serverId, body) => {
  const { name, color, hoist, permissions } = body;
  if (!name?.trim()) throw { status: 400, message: 'Role name required' };

  const count = await Role.countDocuments({ server: serverId });
  const role = new Role({
    server: serverId,
    name: name.trim(),
    color: color || '#99aab5',
    hoist: hoist || false,
    position: count,
    permissions: permissions || {},
  });
  await role.save();
  return role;
};

// POST /api/roles — create a new role with serverId in body
router.post('/', auth, requirePermission('manageRoles'), async (req, res) => {
  try {
    const { serverId } = req.body;
    const role = await createRole(serverId, req.body);
    res.status(201).json(role);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    res.status(500).json({ message: err.message });
  }
});

// POST /api/roles/server/:serverId — create a new role
router.post('/server/:serverId', auth, requirePermission('manageRoles'), async (req, res) => {
  try {
    const role = await createRole(req.params.serverId, req.body);
    res.status(201).json(role);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    res.status(500).json({ message: err.message });
  }
});


// PUT /api/roles/reorder/:serverId — drag-to-reorder
router.put('/reorder/:serverId', auth, async (req, res) => {
  try {
    const server = await Server.findById(req.params.serverId);
    if (!server) return res.status(404).json({ message: 'Server not found' });

    const perms = await getEffectivePermissions(server, req.user._id.toString());
    if (!perms?.all && !perms?.manageRoles)
      return res.status(403).json({ message: 'Missing permission: manageRoles' });

    const { order } = req.body; // [{ id, position }]
    await Promise.all(order.map(({ id, position }) =>
      Role.findByIdAndUpdate(id, { position })
    ));
    res.json({ message: 'Reordered' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/roles/:roleId — edit a role's name, color, permissions
router.put('/:roleId', auth, async (req, res) => {
  try {
    const role = await Role.findById(req.params.roleId);
    if (!role) return res.status(404).json({ message: 'Role not found' });

    const server = await Server.findById(role.server).populate('members.roles');
    const perms = await getEffectivePermissions(server, req.user._id.toString());
    if (!perms?.all && !perms?.manageRoles)
      return res.status(403).json({ message: 'Missing permission: manageRoles' });

    const { name, color, hoist, permissions } = req.body;
    if (name)        role.name  = name.trim();
    if (color)       role.color = color;
    if (hoist !== undefined) role.hoist = hoist;
    if (permissions) role.permissions = { ...role.permissions.toObject(), ...permissions };
    await role.save();
    res.json(role);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/roles/:roleId — delete a role
router.delete('/:roleId', auth, async (req, res) => {
  try {
    const role = await Role.findById(req.params.roleId);
    if (!role) return res.status(404).json({ message: 'Role not found' });
    if (role.isDefault) return res.status(400).json({ message: 'Cannot delete default role' });

    const server = await Server.findById(role.server).populate('members.roles');
    const perms = await getEffectivePermissions(server, req.user._id.toString());
    if (!perms?.all && !perms?.manageRoles)
      return res.status(403).json({ message: 'Missing permission: manageRoles' });

    // Remove role from all members who have it
    await Server.updateOne(
      { _id: role.server },
      { $pull: { 'members.$[].roles': role._id } }
    );
    await role.deleteOne();
    res.json({ message: 'Role deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/roles/:roleId/assign/:userId — assign role to member
router.post('/:roleId/assign/:userId', auth, async (req, res) => {
  try {
    const role = await Role.findById(req.params.roleId);
    if (!role) return res.status(404).json({ message: 'Role not found' });

    const server = await Server.findById(role.server).populate('members.roles');
    const perms = await getEffectivePermissions(server, req.user._id.toString());
    if (!perms?.all && !perms?.manageRoles)
      return res.status(403).json({ message: 'Missing permission: manageRoles' });

    const member = server.members.find(m => m.user?.toString() === req.params.userId);
    if (!member) return res.status(404).json({ message: 'Member not found in server' });

    if (!member.roles.includes(role._id)) {
      member.roles.push(role._id);
      await server.save();
    }
    res.json({ message: 'Role assigned' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/roles/:roleId/assign/:userId — remove role from member
router.delete('/:roleId/assign/:userId', auth, async (req, res) => {
  try {
    const role = await Role.findById(req.params.roleId);
    if (!role) return res.status(404).json({ message: 'Role not found' });

    const server = await Server.findById(role.server).populate('members.roles');
    const perms = await getEffectivePermissions(server, req.user._id.toString());
    if (!perms?.all && !perms?.manageRoles)
      return res.status(403).json({ message: 'Missing permission: manageRoles' });

    await Server.updateOne(
      { _id: role.server, 'members.user': req.params.userId },
      { $pull: { 'members.$.roles': role._id } }
    );
    res.json({ message: 'Role removed' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/roles/kick/:serverId/:userId — kick a member
router.post('/kick/:serverId/:userId', auth, requirePermission('kickMembers'), async (req, res) => {
  try {
    const server = req.server;
    const targetId = req.params.userId;
    const target = server.members.find(m => m.user?.toString() === targetId);
    if (!target) return res.status(404).json({ message: 'Member not found' });
    if (target.role === 'owner') return res.status(403).json({ message: 'Cannot kick the owner' });

    await Server.updateOne({ _id: server._id }, { $pull: { members: { user: targetId } } });
    res.json({ message: 'Member kicked' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/roles/ban/:serverId/:userId — ban a member
router.post('/ban/:serverId/:userId', auth, requirePermission('banMembers'), async (req, res) => {
  try {
    const server = req.server;
    const targetId = req.params.userId;
    const { reason } = req.body;
    const target = server.members.find(m => m.user?.toString() === targetId);
    if (!target) return res.status(404).json({ message: 'Member not found' });
    if (target.role === 'owner') return res.status(403).json({ message: 'Cannot ban the owner' });

    target.isBanned = true;
    target.bannedAt = new Date();
    target.bannedReason = reason || '';
    await server.save();
    res.json({ message: 'Member banned' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

