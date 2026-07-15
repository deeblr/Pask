const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const Channel = require('../models/Channel');
const auth = require('../middleware/auth');

router.get('/channel/:channelId', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const messages = await Message.find({
      channel: req.params.channelId,
      isDeleted: false,
    })
      .populate('author', 'username avatar status')
      .populate('botAuthor', 'name avatar description online')
      .populate('replyTo')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    res.json(messages.reverse());
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { content, channelId, serverId, replyTo } = req.body;
    if (!content?.trim()) return res.status(400).json({ message: 'Content is required' });

    const message = new Message({
      content: content.trim(),
      author: req.user._id,
      channel: channelId,
      server: serverId,
      replyTo: replyTo || null,
    });
    await message.save();
    await message.populate('author', 'username avatar status');
    await message.populate('botAuthor', 'name avatar description online');

    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ message: 'Message not found' });
    if (message.author.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'Cannot edit others messages' });

    message.content = req.body.content;
    message.editedAt = new Date();
    await message.save();
    await message.populate('author', 'username avatar status');
    await message.populate('botAuthor', 'name avatar description online');
    res.json(message);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ message: 'Message not found' });
    if (message.author.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'Cannot delete others messages' });

    message.isDeleted = true;
    await message.save();
    res.json({ message: 'Message deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/:id/react', auth, async (req, res) => {
  try {
    const { emoji } = req.body;
    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ message: 'Message not found' });

    const reactionIndex = message.reactions.findIndex(r => r.emoji === emoji);
    if (reactionIndex === -1) {
      message.reactions.push({ emoji, users: [req.user._id] });
    } else {
      const userIndex = message.reactions[reactionIndex].users.indexOf(req.user._id);
      if (userIndex === -1) {
        message.reactions[reactionIndex].users.push(req.user._id);
      } else {
        message.reactions[reactionIndex].users.splice(userIndex, 1);
        if (message.reactions[reactionIndex].users.length === 0)
          message.reactions.splice(reactionIndex, 1);
      }
    }

    await message.save();
    res.json(message);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;