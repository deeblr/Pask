const express = require('express');
const router = express.Router();
const { DMConversation, DMMessage } = require('../models/DirectMessage');
const User = require('../models/User');
const auth = require('../middleware/auth');

// GET /api/dm — list all conversations for current user
router.get('/', auth, async (req, res) => {
  try {
    const Bot = require('../models/Bot');
    const conversations = await DMConversation.find({
      participants: req.user._id,
    })
      .populate('participants', 'username avatar status')
      .populate('lastMessage')
      .sort({ lastActivityAt: -1 });

    // Attach botInfo for bot DMs
    const results = await Promise.all(conversations.map(async (c) => {
      const obj = c.toObject();
      if (c.isBotDM && c.botParticipant) {
        const bot = await Bot.findById(c.botParticipant).select('-token');
        if (bot) obj.botInfo = { _id: bot._id, name: bot.name, avatar: bot.avatar, description: bot.description, online: bot.online };
      }
      return obj;
    }));

    res.json(results);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/dm/open/:userId — open or get existing DM with a user
router.post('/open/:userId', auth, async (req, res) => {
  try {
    const otherId = req.params.userId;
    if (otherId === req.user._id.toString())
      return res.status(400).json({ message: 'Cannot DM yourself' });

    const other = await User.findById(otherId);
    if (!other) return res.status(404).json({ message: 'User not found' });

    // Find existing conversation
    let convo = await DMConversation.findOne({
      participants: { $all: [req.user._id, otherId], $size: 2 },
    }).populate('participants', 'username avatar status').populate('lastMessage');

    // Create if doesn't exist
    if (!convo) {
      convo = new DMConversation({ participants: [req.user._id, otherId] });
      await convo.save();
      await convo.populate('participants', 'username avatar status');
    }

    res.json(convo);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/dm/:conversationId/messages — load messages (paginated)
router.get('/:conversationId/messages', auth, async (req, res) => {
  try {
    const convo = await DMConversation.findById(req.params.conversationId);
    if (!convo) return res.status(404).json({ message: 'Conversation not found' });

    const isMember = convo.participants.some(p => p.toString() === req.user._id.toString());
    if (!isMember) return res.status(403).json({ message: 'Access denied' });

    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip  = (page - 1) * limit;

    const messages = await DMMessage.find({
      conversation: req.params.conversationId,
      isDeleted: false,
    })
      .populate('author', 'username avatar status')
      .populate('replyTo')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Mark as read
    await DMMessage.updateMany(
      { conversation: req.params.conversationId, readBy: { $ne: req.user._id } },
      { $addToSet: { readBy: req.user._id } }
    );

    res.json(messages.reverse());
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/dm/:conversationId/messages — send a DM (REST fallback, socket preferred)
router.post('/:conversationId/messages', auth, async (req, res) => {
  try {
    const { content, replyTo } = req.body;
    if (!content?.trim()) return res.status(400).json({ message: 'Content required' });

    const convo = await DMConversation.findById(req.params.conversationId);
    if (!convo) return res.status(404).json({ message: 'Conversation not found' });

    const isMember = convo.participants.some(p => p.toString() === req.user._id.toString());
    if (!isMember) return res.status(403).json({ message: 'Access denied' });

    const message = new DMMessage({
      conversation: convo._id,
      author: req.user._id,
      content: content.trim(),
      replyTo: replyTo || null,
      readBy: [req.user._id],
    });
    await message.save();
    await message.populate('author', 'username avatar status');

    convo.lastMessage = message._id;
    convo.lastActivityAt = new Date();
    await convo.save();

    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/dm/messages/:messageId — soft delete a DM
router.delete('/messages/:messageId', auth, async (req, res) => {
  try {
    const msg = await DMMessage.findById(req.params.messageId);
    if (!msg) return res.status(404).json({ message: 'Message not found' });
    if (msg.author.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'Not your message' });
    msg.isDeleted = true;
    await msg.save();
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// POST /api/dm/bot/:botId — open or get DM conversation with a bot
router.post('/bot/:botId', auth, async (req, res) => {
  try {
    const Bot = require('../models/Bot');
    const bot = await Bot.findById(req.params.botId).select('-token');
    if (!bot) return res.status(404).json({ message: 'Bot not found' });

    // Use a virtual "bot user" ID stored as metadata on the conversation
    // We store botId in a special field and use a fake participant slot
    let convo = await DMConversation.findOne({
      botParticipant: bot._id,
      participants: req.user._id,
    }).populate('participants', 'username avatar status');

    if (!convo) {
      convo = new DMConversation({
        participants: [req.user._id],
        botParticipant: bot._id,
        isBotDM: true,
      });
      await convo.save();
      await convo.populate('participants', 'username avatar status');
    }

    // Attach bot info manually for the response
    const obj = convo.toObject();
    obj.botInfo = { _id: bot._id, name: bot.name, avatar: bot.avatar, description: bot.description, online: bot.online };
    res.json(obj);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;