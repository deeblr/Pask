/**
 * PASK Bot Gateway
 * Bots connect via WebSocket with token auth.
 * They receive MESSAGE_CREATE events and can send messages back.
 * Prefix-based commands only (no slash).
 */
const Bot = require('../models/Bot')

// Track connected bots: botId -> socket
const connectedBots = new Map()

const initBotGateway = (io) => {
  const botNs = io.of('/bot-gateway')

  botNs.on('connection', async (socket) => {
    const token = socket.handshake.auth?.token
    if (!token) { socket.emit('ERROR', { code: 4001, message: 'No token provided' }); socket.disconnect(); return }

    let bot
    try {
      bot = await Bot.findOne({ token }).populate('owner', 'username')
    } catch {}

    if (!bot) {
      socket.emit('ERROR', { code: 4004, message: 'Invalid token' })
      socket.disconnect(); return
    }

    // Mark online
    bot.online = true
    await bot.save()
    connectedBots.set(bot._id.toString(), socket)
    socket.botId = bot._id.toString()
    socket.botData = bot

    console.log(`🤖 Bot connected: ${bot.name}`)

    // Send READY
    socket.emit('READY', {
      id: bot._id,
      name: bot.name,
      prefix: bot.prefix,
      guilds: bot.guilds,
    })

    // SEND_MESSAGE: bot sends a message to a channel
    socket.on('SEND_MESSAGE', async (data) => {
      try {
        const { channelId, content } = data
        if (!channelId || !content?.trim()) return

        const Message = require('../models/Message')
        const Channel = require('../models/Channel')

        const channel = await Channel.findById(channelId)
        if (!channel) return

        const msg = await Message.create({
          content: content.trim(),
          author: null,
          botAuthor: bot._id,
          botName: bot.name,
          channel: channelId,
          server: channel.server,
        })

        // Broadcast to the channel room via main io
        io.to(`channel:${channelId}`).emit('message:new', {
          _id: msg._id,
          content: msg.content,
          createdAt: msg.createdAt,
          channel: channelId,
          author: null,
          isBot: true,
          botName: bot.name,
          botAvatar: bot.avatar,
          botAuthor: {
            _id: bot._id,
            name: bot.name,
            avatar: bot.avatar,
            description: bot.description,
            online: true,
          },
          reactions: [],
        })
      } catch (e) { console.error('[BotGateway] SEND_MESSAGE error:', e.message) }
    })

    socket.on('disconnect', async () => {
      connectedBots.delete(bot._id.toString())
      try {
        await Bot.findByIdAndUpdate(bot._id, { online: false })
        console.log(`🤖 Bot disconnected: ${bot.name}`)
      } catch {}
    })
  })
}

// Called from socketHandler when a message is created
const dispatchMessageToBots = async (message, channel) => {
  try {
    const Bot = require('../models/Bot')
    const bots = await Bot.find({ guilds: channel.server, online: true })
    for (const bot of bots) {
      const socket = connectedBots.get(bot._id.toString())
      if (!socket) continue
      socket.emit('MESSAGE_CREATE', {
        id: message._id,
        content: message.content,
        channelId: message.channel,
        guildId: channel.server,
        author: {
          id: message.author?._id,
          username: message.author?.username,
          bot: false,
        },
        prefix: bot.prefix,
        isCommand: message.content?.startsWith(bot.prefix),
        commandName: message.content?.startsWith(bot.prefix)
          ? message.content.slice(bot.prefix.length).split(' ')[0]
          : null,
        args: message.content?.startsWith(bot.prefix)
          ? message.content.slice(bot.prefix.length).split(' ').slice(1)
          : [],
      })
    }
  } catch {}
}

module.exports = { initBotGateway, dispatchMessageToBots, connectedBots }