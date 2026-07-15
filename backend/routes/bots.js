const express = require('express')
const router  = express.Router()
const Bot     = require('../models/Bot')
const auth    = require('../middleware/auth')
const multer  = require('multer')
const path    = require('path')
const fs      = require('fs')

/* ── Bot avatar upload ─────────────────────────────────── */
const botAvatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads/bot-avatars')
    fs.mkdirSync(dir, { recursive: true })
    cb(null, dir)
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.png'
    cb(null, `botav_${req.params.id}_${Date.now()}${ext}`)
  },
})
const botAvatarUpload = multer({
  storage: botAvatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true)
    else cb(new Error('Images only'))
  },
})

// GET /api/bots — my bots
router.get('/', auth, async (req, res) => {
  try {
    const bots = await Bot.find({ owner: req.user._id }).select('-token')
    res.json(bots)
  } catch (e) { res.status(500).json({ message: e.message }) }
})

// POST /api/bots — create bot
router.post('/', auth, async (req, res) => {
  try {
    const { name, prefix, description } = req.body
    if (!name?.trim()) return res.status(400).json({ message: 'Name is required' })
    const count = await Bot.countDocuments({ owner: req.user._id })
    if (count >= 10) return res.status(400).json({ message: 'Max 10 bots per account' })
    const bot = await Bot.create({
      name: name.trim(), prefix: prefix || '!',
      description: description || '', owner: req.user._id,
    })
    // Return WITH token only on creation
    res.status(201).json(bot.toObject())
  } catch (e) { res.status(500).json({ message: e.message }) }
})

// GET /api/bots/:id — get bot (owner only), includes token
router.get('/:id', auth, async (req, res) => {
  try {
    const bot = await Bot.findOne({ _id: req.params.id, owner: req.user._id })
    if (!bot) return res.status(404).json({ message: 'Bot not found' })
    res.json(bot.toObject())
  } catch (e) { res.status(500).json({ message: e.message }) }
})

// PUT /api/bots/:id — update
router.put('/:id', auth, async (req, res) => {
  try {
    const { name, prefix, description } = req.body
    const bot = await Bot.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      { name, prefix, description },
      { new: true }
    ).select('-token')
    if (!bot) return res.status(404).json({ message: 'Bot not found' })
    res.json(bot)
  } catch (e) { res.status(500).json({ message: e.message }) }
})

// POST /api/bots/:id/regen — regenerate token
router.post('/:id/regen', auth, async (req, res) => {
  try {
    const crypto = require('crypto')
    const bot = await Bot.findOne({ _id: req.params.id, owner: req.user._id })
    if (!bot) return res.status(404).json({ message: 'Bot not found' })
    bot.token = 'pask.' + crypto.randomBytes(24).toString('base64url')
    await bot.save()
    res.json({ token: bot.token })
  } catch (e) { res.status(500).json({ message: e.message }) }
})

// DELETE /api/bots/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const bot = await Bot.findOneAndDelete({ _id: req.params.id, owner: req.user._id })
    if (!bot) return res.status(404).json({ message: 'Bot not found' })
    res.json({ message: 'Bot deleted' })
  } catch (e) { res.status(500).json({ message: e.message }) }
})


// POST /api/bots/:id/avatar — upload bot avatar
router.post('/:id/avatar', auth, (req, res, next) => {
  botAvatarUpload.single('avatar')(req, res, (err) => {
    if (err) return res.status(400).json({ message: err.message })
    next()
  })
}, async (req, res) => {
  try {
    const bot = await Bot.findOne({ _id: req.params.id, owner: req.user._id })
    if (!bot) return res.status(404).json({ message: 'Bot not found' })
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' })
    // Delete old avatar
    if (bot.avatar && bot.avatar.startsWith('/uploads/')) {
      fs.unlink(path.join(__dirname, '..', bot.avatar), () => {})
    }
    bot.avatar = `/uploads/bot-avatars/${req.file.filename}`
    await bot.save()
    res.json({ avatar: bot.avatar, bot: bot.toPublicJSON ? bot.toPublicJSON() : bot })
  } catch (e) { res.status(500).json({ message: e.message }) }
})

// DELETE /api/bots/:id/avatar — remove bot avatar
router.delete('/:id/avatar', auth, async (req, res) => {
  try {
    const bot = await Bot.findOne({ _id: req.params.id, owner: req.user._id })
    if (!bot) return res.status(404).json({ message: 'Bot not found' })
    if (bot.avatar && bot.avatar.startsWith('/uploads/')) {
      fs.unlink(path.join(__dirname, '..', bot.avatar), () => {})
    }
    bot.avatar = null
    await bot.save()
    res.json({ bot: bot.toPublicJSON ? bot.toPublicJSON() : bot })
  } catch (e) { res.status(500).json({ message: e.message }) }
})

module.exports = router

// GET /api/bots/:id/public — public info (no auth needed, no token)
router.get('/:id/public', async (req, res) => {
  try {
    const bot = await Bot.findById(req.params.id)
      .select('-token')
      .populate('owner', 'username')
    if (!bot) return res.status(404).json({ message: 'Bot not found' })
    res.json(bot.toPublicJSON ? bot.toPublicJSON() : bot)
  } catch (e) { res.status(500).json({ message: e.message }) }
})

// POST /api/bots/:id/add-to-server — add bot to a server (must be server admin/owner)
router.post('/:id/add-to-server', auth, async (req, res) => {
  try {
    const { serverId } = req.body
    if (!serverId) return res.status(400).json({ message: 'serverId is required' })

    const Bot    = require('../models/Bot')
    const Server = require('../models/Server')

    const bot = await Bot.findById(req.params.id).select('-token')
    if (!bot) return res.status(404).json({ message: 'Bot not found' })

    const server = await Server.findById(serverId)
    if (!server) return res.status(404).json({ message: 'Server not found' })

    // Check user is owner or admin of the server
    const member = server.members.find(m => m.user.toString() === req.user._id.toString())
    if (!member || !['owner', 'admin'].includes(member.role)) {
      return res.status(403).json({ message: 'You must be an admin or owner to add bots' })
    }

    // Check if already added
    if (bot.guilds.includes(serverId)) {
      return res.status(400).json({ message: 'Bot is already in this server' })
    }

    bot.guilds.push(serverId)
    await bot.save()

    res.json({ message: 'Bot added successfully', bot: bot.toPublicJSON ? bot.toPublicJSON() : bot })
  } catch (e) { res.status(500).json({ message: e.message }) }
})