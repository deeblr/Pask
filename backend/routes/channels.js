const express = require('express');
const router = express.Router();
const Channel = require('../models/Channel');
const Server = require('../models/Server');
const auth = require('../middleware/auth');

// GET /api/channels/server/:serverId
router.get('/server/:serverId', auth, async (req, res) => {
  try {
    const server = await Server.findById(req.params.serverId);
    if (!server) return res.status(404).json({ message: 'Server not found' });
    const isMember = server.members.some(m => m.user?.toString() === req.user._id.toString());
    if (!isMember) return res.status(403).json({ message: 'Access denied' });
    const channels = await Channel.find({ server: req.params.serverId }).sort({ position: 1 });
    res.json(channels);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/channels
router.post('/', auth, async (req, res) => {
  try {
    const { name, type, serverId, category, topic } = req.body;
    const server = await Server.findById(serverId);
    if (!server) return res.status(404).json({ message: 'Server not found' });
    const member = server.members.find(m => m.user?.toString() === req.user._id.toString());
    if (!member || !['owner', 'admin'].includes(member.role))
      return res.status(403).json({ message: 'Insufficient permissions' });

    const count = await Channel.countDocuments({ server: serverId });
    const channel = new Channel({ name, type, server: serverId, category, topic, position: count });
    await channel.save();
    res.status(201).json(channel);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PUT /api/channels/:id  (rename / update topic)
router.put('/:id', auth, async (req, res) => {
  try {
    const channel = await Channel.findById(req.params.id);
    if (!channel) return res.status(404).json({ message: 'Channel not found' });
    const server = await Server.findById(channel.server);
    const member = server.members.find(m => m.user?.toString() === req.user._id.toString());
    if (!member || !['owner', 'admin'].includes(member.role))
      return res.status(403).json({ message: 'Insufficient permissions' });

    const { name, topic, category } = req.body;
    if (name)     channel.name     = name;
    if (topic !== undefined) channel.topic = topic;
    if (category) channel.category = category;
    await channel.save();
    res.json(channel);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PUT /api/channels/reorder/:serverId  (bulk position update)
router.put('/reorder/:serverId', auth, async (req, res) => {
  try {
    const server = await Server.findById(req.params.serverId);
    if (!server) return res.status(404).json({ message: 'Server not found' });
    const member = server.members.find(m => m.user?.toString() === req.user._id.toString());
    if (!member || !['owner', 'admin'].includes(member.role))
      return res.status(403).json({ message: 'Insufficient permissions' });

    const { order } = req.body; // [{ id, position }]
    await Promise.all(order.map(({ id, position }) =>
      Channel.findByIdAndUpdate(id, { position })
    ));
    res.json({ message: 'Reordered' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// DELETE /api/channels/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const channel = await Channel.findById(req.params.id);
    if (!channel) return res.status(404).json({ message: 'Channel not found' });
    const server = await Server.findById(channel.server);
    const member = server.members.find(m => m.user?.toString() === req.user._id.toString());
    if (!member || !['owner', 'admin'].includes(member.role))
      return res.status(403).json({ message: 'Insufficient permissions' });
    await channel.deleteOne();
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
