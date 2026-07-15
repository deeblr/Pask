const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');

// GET  /api/friends
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('friends', 'username avatar status bio bannerColor pronouns');
    res.json(user.friends);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET  /api/friends/requests
router.get('/requests', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('friendRequests.from', 'username avatar status bannerColor');
    res.json(user.friendRequests.filter(r => r.status === 'pending'));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET  /api/friends/blocked
router.get('/blocked', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('blockedUsers', 'username avatar status');
    res.json(user.blockedUsers);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/friends/request/:userId
router.post('/request/:userId', auth, async (req, res) => {
  try {
    const targetId = req.params.userId;
    if (targetId === req.user._id.toString())
      return res.status(400).json({ message: 'Cannot add yourself' });

    const [me, target] = await Promise.all([
      User.findById(req.user._id),
      User.findById(targetId),
    ]);
    if (!target) return res.status(404).json({ message: 'User not found' });
    if (target.blockedUsers?.includes(req.user._id))
      return res.status(403).json({ message: 'Cannot send request' });
    if (me.friends.includes(targetId))
      return res.status(400).json({ message: 'Already friends' });
    if (target.friendRequests.find(r => r.from.toString() === req.user._id.toString() && r.status === 'pending'))
      return res.status(400).json({ message: 'Request already sent' });

    target.friendRequests.push({ from: req.user._id, status: 'pending' });
    await target.save();
    res.json({ message: 'Friend request sent' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/friends/accept/:requestId
router.post('/accept/:requestId', auth, async (req, res) => {
  try {
    const me = await User.findById(req.user._id);
    const request = me.friendRequests.id(req.params.requestId);
    if (!request || request.status !== 'pending')
      return res.status(404).json({ message: 'Request not found' });

    const senderId = request.from.toString();
    request.status = 'accepted';
    if (!me.friends.includes(senderId)) me.friends.push(senderId);
    await me.save();

    const sender = await User.findById(senderId);
    if (!sender.friends.includes(req.user._id)) sender.friends.push(req.user._id);
    await sender.save();

    const updated = await User.findById(req.user._id).populate('friends', 'username avatar status bio bannerColor pronouns');
    res.json({ message: 'Friend added', friends: updated.friends });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/friends/decline/:requestId
router.post('/decline/:requestId', auth, async (req, res) => {
  try {
    const me = await User.findById(req.user._id);
    const req_ = me.friendRequests.id(req.params.requestId);
    if (!req_) return res.status(404).json({ message: 'Not found' });
    req_.status = 'declined';
    await me.save();
    res.json({ message: 'Declined' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// DELETE /api/friends/:userId
router.delete('/:userId', auth, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { $pull: { friends: req.params.userId } });
    await User.findByIdAndUpdate(req.params.userId, { $pull: { friends: req.user._id } });
    res.json({ message: 'Removed' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/friends/block/:userId
router.post('/block/:userId', auth, async (req, res) => {
  try {
    const targetId = req.params.userId;
    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { blockedUsers: targetId },
      $pull: { friends: targetId },
    });
    await User.findByIdAndUpdate(targetId, { $pull: { friends: req.user._id } });
    res.json({ message: 'Blocked' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// DELETE /api/friends/block/:userId  (unblock)
router.delete('/block/:userId', auth, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { $pull: { blockedUsers: req.params.userId } });
    res.json({ message: 'Unblocked' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
