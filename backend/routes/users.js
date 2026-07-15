const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Server = require('../models/Server');
const auth = require('../middleware/auth');

// Search users by username
router.get('/search', auth, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json([]);
    const users = await User.find({
      username: { $regex: q, $options: 'i' },
      _id: { $ne: req.user._id },
    }).select('username avatar status bio').limit(10);
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get my own full profile
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password')
      .populate('friends', 'username avatar status');
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update my profile
router.put('/me', auth, async (req, res) => {
  try {
    const { username, bio, status, bannerColor, pronouns, avatar } = req.body;
    const updates = {};
    if (username)              updates.username    = username;
    if (bio !== undefined)     updates.bio         = bio;
    if (status)                updates.status      = status;
    if (bannerColor)           updates.bannerColor = bannerColor;
    if (pronouns !== undefined) updates.pronouns   = pronouns;
    if (avatar !== undefined)  updates.avatar      = avatar;

    // Username uniqueness check
    if (username) {
      const exists = await User.findOne({ username, _id: { $ne: req.user._id } });
      if (exists) return res.status(400).json({ message: 'Username already taken' });
    }

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true })
      .select('-password')
      .populate('friends', 'username avatar status');
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Change password
router.put('/me/password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
      return res.status(400).json({ message: 'Both fields required' });
    if (newPassword.length < 6)
      return res.status(400).json({ message: 'New password must be at least 6 characters' });

    const user = await User.findById(req.user._id);
    const ok = await user.comparePassword(currentPassword);
    if (!ok) return res.status(401).json({ message: 'Current password is incorrect' });

    user.password = newPassword;
    await user.save();
    res.json({ message: 'Password updated' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get any user's public profile
router.get('/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -email -friendRequests')
      .populate('friends', 'username avatar status');
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Find mutual servers
    const myServers = await Server.find({ 'members.user': req.user._id }).select('_id name icon');
    const theirServers = await Server.find({ 'members.user': req.params.id }).select('_id');
    const theirIds = new Set(theirServers.map(s => s._id.toString()));
    const mutualServers = myServers.filter(s => theirIds.has(s._id.toString()));

    // Is this person my friend?
    const me = await User.findById(req.user._id).select('friends');
    const isFriend = me.friends.map(f => f.toString()).includes(req.params.id);

    // Has request been sent already?
    const targetUser = await User.findById(req.params.id).select('friendRequests');
    const requestSent = targetUser.friendRequests.some(
      r => r.from.toString() === req.user._id.toString() && r.status === 'pending'
    );

    res.json({
      ...user.toJSON(),
      mutualServers,
      isFriend,
      requestSent,
      isMe: req.params.id === req.user._id.toString(),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
