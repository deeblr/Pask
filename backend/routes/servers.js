const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const Server  = require('../models/Server');
const Channel = require('../models/Channel');
const User    = require('../models/User');
const auth    = require('../middleware/auth');

/* ── server icon upload ────────────────────────────────── */
const iconStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads/server-icons');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.png';
    cb(null, `icon_${req.params.id}_${Date.now()}${ext}`);
  },
});
const iconUpload = multer({
  storage: iconStorage,
  limits: { fileSize: 4 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = ['image/jpeg','image/png','image/webp','image/gif'].includes(file.mimetype);
    cb(ok ? null : new Error('Images only'), ok);
  },
});

/* ── helpers ───────────────────────────────────────────── */
const isOwnerOrAdmin = (server, userId) => {
  const m = server.members.find(m => m.user?.toString() === userId.toString());
  return m?.role === 'owner' || m?.role === 'admin' || server.owner?.toString() === userId.toString();
};
const isOwner = (server, userId) =>
  server.owner?.toString() === userId.toString() ||
  server.owner?._id?.toString() === userId.toString();

/* ── routes ────────────────────────────────────────────── */

// GET  /api/servers
router.get('/', auth, async (req, res) => {
  try {
    const servers = await Server.find({ 'members.user': req.user._id })
      .populate('owner', 'username avatar').lean();
    res.json(servers);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/servers
router.post('/', auth, async (req, res) => {
  try {
    const { name, description, isPublic } = req.body;
    const server = new Server({
      name, description, isPublic,
      owner: req.user._id,
      members: [{ user: req.user._id, role: 'owner' }],
    });
    await server.save();
    await Channel.insertMany([
      { name: 'general', type: 'text',  server: server._id, category: 'Text Channels',  position: 0 },
      { name: 'General', type: 'voice', server: server._id, category: 'Voice Channels', position: 0 },
    ]);
    res.status(201).json(server);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET  /api/servers/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const Bot = require('../models/Bot');
    const server = await Server.findById(req.params.id)
      .populate('owner', 'username avatar')
      .populate('members.user', 'username avatar status bannerColor')
      .populate('members.roles');
    if (!server) return res.status(404).json({ message: 'Server not found' });
    const isMember = server.members.some(m => m.user?._id?.toString() === req.user._id.toString());
    if (!isMember) return res.status(403).json({ message: 'Access denied' });
    const bots = await Bot.find({ guilds: server._id }).select('-token');
    const obj = server.toObject();
    obj.bots = bots;
    res.json(obj);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PUT  /api/servers/:id  — edit name/description/isPublic
router.put('/:id', auth, async (req, res) => {
  try {
    const server = await Server.findById(req.params.id);
    if (!server) return res.status(404).json({ message: 'Server not found' });
    if (!isOwnerOrAdmin(server, req.user._id))
      return res.status(403).json({ message: 'Insufficient permissions' });

    const { name, description, isPublic } = req.body;
    if (name?.trim())           server.name        = name.trim();
    if (description !== undefined) server.description = description;
    if (isPublic    !== undefined) server.isPublic    = isPublic;
    await server.save();
    res.json(server);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/servers/:id/icon  — upload server icon
router.post('/:id/icon', auth, iconUpload.single('icon'), async (req, res) => {
  try {
    const server = await Server.findById(req.params.id);
    if (!server) return res.status(404).json({ message: 'Server not found' });
    if (!isOwnerOrAdmin(server, req.user._id))
      return res.status(403).json({ message: 'Insufficient permissions' });
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    // Delete old icon
    if (server.icon && server.icon.startsWith('/uploads/')) {
      fs.unlink(path.join(__dirname, '..', server.icon), () => {});
    }
    server.icon = `/uploads/server-icons/${req.file.filename}`;
    await server.save();
    res.json({ icon: server.icon, server });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// DELETE /api/servers/:id/icon  — remove server icon
router.delete('/:id/icon', auth, async (req, res) => {
  try {
    const server = await Server.findById(req.params.id);
    if (!server) return res.status(404).json({ message: 'Server not found' });
    if (!isOwnerOrAdmin(server, req.user._id))
      return res.status(403).json({ message: 'Insufficient permissions' });
    if (server.icon && server.icon.startsWith('/uploads/')) {
      fs.unlink(path.join(__dirname, '..', server.icon), () => {});
    }
    server.icon = null;
    await server.save();
    res.json({ server });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/servers/:id/transfer  — transfer ownership
router.post('/:id/transfer', auth, async (req, res) => {
  try {
    const { newOwnerId } = req.body;
    const server = await Server.findById(req.params.id);
    if (!server) return res.status(404).json({ message: 'Server not found' });
    if (!isOwner(server, req.user._id))
      return res.status(403).json({ message: 'Only the owner can transfer ownership' });
    if (!newOwnerId || newOwnerId === req.user._id.toString())
      return res.status(400).json({ message: 'Invalid target user' });

    const target = server.members.find(m => m.user?.toString() === newOwnerId);
    if (!target) return res.status(404).json({ message: 'User is not a member' });

    // Demote current owner → admin, promote target → owner
    const me = server.members.find(m => m.user?.toString() === req.user._id.toString());
    if (me) me.role = 'admin';
    target.role = 'owner';
    server.owner = newOwnerId;
    await server.save();
    res.json({ message: 'Ownership transferred', server });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/servers/:id/leave  — leave server (owner cannot leave)
router.post('/:id/leave', auth, async (req, res) => {
  try {
    const server = await Server.findById(req.params.id);
    if (!server) return res.status(404).json({ message: 'Server not found' });
    if (isOwner(server, req.user._id))
      return res.status(400).json({ message: 'You are the owner. Transfer ownership or delete the server first.' });

    await Server.updateOne({ _id: server._id }, { $pull: { members: { user: req.user._id } } });
    res.json({ message: 'Left server' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/servers/invite/:inviteCode  — public info for invite preview
router.get('/invite/:inviteCode', auth, async (req, res) => {
  try {
    const server = await Server.findOne({ inviteCode: req.params.inviteCode.toUpperCase() })
      .populate('members.user', 'username status')
      .select('name icon inviteCode members');
    if (!server) return res.status(404).json({ message: 'Invalid invite code' });
    const isMember = server.members.some(m => m.user?._id?.toString() === req.user._id.toString());
    res.json({
      _id: server._id,
      name: server.name,
      icon: server.icon,
      inviteCode: server.inviteCode,
      memberCount: server.members.length,
      onlineCount: server.members.filter(m => m.user?.status && m.user.status !== 'offline').length,
      isMember,
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/servers/join/:inviteCode
router.post('/join/:inviteCode', auth, async (req, res) => {
  try {
    const server = await Server.findOne({ inviteCode: req.params.inviteCode.toUpperCase() });
    if (!server) return res.status(404).json({ message: 'Invalid invite code' });
    if (server.members.some(m => m.user?.toString() === req.user._id.toString()))
      return res.status(400).json({ message: 'Already a member' });
    server.members.push({ user: req.user._id, role: 'member' });
    await server.save();
    res.json(server);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// DELETE /api/servers/:id  — delete server (owner only)
router.delete('/:id', auth, async (req, res) => {
  try {
    const server = await Server.findById(req.params.id);
    if (!server) return res.status(404).json({ message: 'Server not found' });
    if (!isOwner(server, req.user._id))
      return res.status(403).json({ message: 'Only the owner can delete the server' });
    await Channel.deleteMany({ server: server._id });
    await server.deleteOne();
    res.json({ message: 'Server deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;