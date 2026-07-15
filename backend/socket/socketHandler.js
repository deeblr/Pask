const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Message = require('../models/Message');
const { DMConversation, DMMessage } = require('../models/DirectMessage');

const connectedUsers = new Map(); // userId -> socketId
// voiceRooms: channelId -> Map(userId -> { username, avatar, muted, deafened })
const voiceRooms = new Map();

const initializeSocket = (io) => {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error('Authentication error'));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).select('-password');
      if (!user) return next(new Error('User not found'));
      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.user._id.toString();
    connectedUsers.set(userId, socket.id);

    await User.findByIdAndUpdate(userId, { status: 'online' });
    io.emit('user:statusChange', { userId, status: 'online' });

    socket.join(`user:${userId}`);

    console.log(`✅ ${socket.user.username} connected`);

    // ── Server / Channel rooms ──────────────────────────────
    socket.on('server:join', (serverId) => socket.join(`server:${serverId}`));
    socket.on('channel:join', (channelId) => socket.join(`channel:${channelId}`));
    socket.on('channel:leave', (channelId) => socket.leave(`channel:${channelId}`));

    // ── Server channel messages ─────────────────────────────
    socket.on('message:send', async (data) => {
      try {
        const { content, channelId, serverId, replyTo } = data;
        if (!content?.trim()) return;
        const message = new Message({
          content: content.trim(),
          author: socket.user._id,
          channel: channelId,
          server: serverId,
          replyTo: replyTo || null,
        });
        await message.save();
        await message.populate('author', 'username avatar status');
        io.to(`channel:${channelId}`).emit('message:new', message);
        // Dispatch to bots in this server
        try {
          const { dispatchMessageToBots } = require('./botGateway');
          const Channel = require('../models/Channel');
          const ch = await Channel.findById(channelId);
          if (ch) dispatchMessageToBots(message, ch);
        } catch {}
      } catch (err) {
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    socket.on('message:delete', async (data) => {
      try {
        const message = await Message.findById(data.messageId);
        if (!message || message.author.toString() !== userId) return;
        message.isDeleted = true;
        await message.save();
        io.to(`channel:${message.channel}`).emit('message:deleted', { messageId: data.messageId });
      } catch (err) {
        socket.emit('error', { message: 'Failed to delete message' });
      }
    });

    socket.on('message:edit', async (data) => {
      try {
        const message = await Message.findById(data.messageId);
        if (!message || message.author.toString() !== userId) return;
        message.content = data.content;
        message.editedAt = new Date();
        await message.save();
        await message.populate('author', 'username avatar status');
        io.to(`channel:${message.channel}`).emit('message:updated', message);
      } catch (err) {
        socket.emit('error', { message: 'Failed to edit message' });
      }
    });

    // ── Typing indicators ───────────────────────────────────
    socket.on('typing:start', (data) => {
      socket.to(`channel:${data.channelId}`).emit('typing:update', {
        userId, username: socket.user.username, channelId: data.channelId, isTyping: true,
      });
    });
    socket.on('typing:stop', (data) => {
      socket.to(`channel:${data.channelId}`).emit('typing:update', {
        userId, username: socket.user.username, channelId: data.channelId, isTyping: false,
      });
    });

    // ── DM: join a conversation room ────────────────────────
    socket.on('dm:join', (conversationId) => socket.join(`dm:${conversationId}`));
    socket.on('dm:leave', (conversationId) => socket.leave(`dm:${conversationId}`));

    socket.on('dm:send', async (data) => {
      try {
        const { conversationId, content, replyTo } = data;
        if (!content?.trim()) return;
        const convo = await DMConversation.findById(conversationId);
        if (!convo) return;
        const isMember = convo.participants.some(p => p.toString() === userId);
        if (!isMember) return;
        const message = new DMMessage({
          conversation: convo._id,
          author: socket.user._id,
          content: content.trim(),
          replyTo: replyTo || null,
          readBy: [socket.user._id],
        });
        await message.save();
        await message.populate('author', 'username avatar status');
        convo.lastMessage = message._id;
        convo.lastActivityAt = new Date();
        await convo.save();
        io.to(`dm:${conversationId}`).emit('dm:new', message);
        const otherId = convo.participants.find(p => p.toString() !== userId)?.toString();
        if (otherId) {
          io.to(`user:${otherId}`).emit('dm:notification', {
            conversationId,
            message,
            from: { _id: userId, username: socket.user.username, avatar: socket.user.avatar },
          });
        }
      } catch (err) {
        socket.emit('error', { message: 'Failed to send DM' });
      }
    });

    socket.on('dm:typing:start', (conversationId) => {
      socket.to(`dm:${conversationId}`).emit('dm:typing:update', {
        userId, username: socket.user.username, conversationId, isTyping: true,
      });
    });
    socket.on('dm:typing:stop', (conversationId) => {
      socket.to(`dm:${conversationId}`).emit('dm:typing:update', {
        userId, username: socket.user.username, conversationId, isTyping: false,
      });
    });

    socket.on('dm:read', async (conversationId) => {
      try {
        await DMMessage.updateMany(
          { conversation: conversationId, readBy: { $ne: socket.user._id } },
          { $addToSet: { readBy: socket.user._id } }
        );
        socket.to(`dm:${conversationId}`).emit('dm:read:ack', { conversationId, userId });
      } catch (err) {}
    });

    socket.on('friend:request:sent', async (targetUserId) => {
      const targetSocketId = connectedUsers.get(targetUserId);
      if (targetSocketId) {
        io.to(`user:${targetUserId}`).emit('friend:request:received', {
          from: { _id: userId, username: socket.user.username, avatar: socket.user.avatar },
        });
      }
    });

    socket.on('status:change', async (status) => {
      await User.findByIdAndUpdate(userId, { status });
      io.emit('user:statusChange', { userId, status });
    });

    // ── VOICE ROOMS ─────────────────────────────────────────

    // Join voice channel
    socket.on('voice:join', ({ channelId, serverId }) => {
      // Leave any previous voice room first
      leaveAllVoiceRooms(socket, userId, io);

      if (!voiceRooms.has(channelId)) voiceRooms.set(channelId, new Map());
      const room = voiceRooms.get(channelId);

      const member = {
        userId,
        username: socket.user.username,
        avatar: socket.user.avatar,
        muted: false,
        deafened: false,
      };
      room.set(userId, member);
      socket.join(`voice:${channelId}`);
      socket.voiceChannelId = channelId;

      // Send current members to the joiner
      socket.emit('voice:members', {
        channelId,
        members: Array.from(room.values()),
      });

      // Notify others
      socket.to(`voice:${channelId}`).emit('voice:userJoined', { channelId, member });
      // WebRTC: tell joiner to initiate offers with existing peers
      const existingPeers = Array.from(room.keys()).filter(id => id !== userId);
      socket.emit('voice:existingPeers', { channelId, peerIds: existingPeers });

      // Broadcast updated voice state to server channel list
      io.to(`server:${serverId}`).emit('voice:roomUpdate', {
        channelId,
        members: Array.from(room.values()),
      });
    });

    // Leave voice channel
    socket.on('voice:leave', ({ channelId, serverId }) => {
      leaveVoiceRoom(socket, userId, channelId, serverId, io);
    });

    // Mute/unmute
    socket.on('voice:mute', ({ channelId, muted }) => {
      const room = voiceRooms.get(channelId);
      if (!room || !room.has(userId)) return;
      room.get(userId).muted = muted;
      io.to(`voice:${channelId}`).emit('voice:stateChange', { channelId, userId, muted, deafened: room.get(userId).deafened });
    });

    // Deafen/undeafen
    socket.on('voice:deafen', ({ channelId, deafened }) => {
      const room = voiceRooms.get(channelId);
      if (!room || !room.has(userId)) return;
      const member = room.get(userId);
      member.deafened = deafened;
      if (deafened) member.muted = true; // auto-mute when deafened
      io.to(`voice:${channelId}`).emit('voice:stateChange', { channelId, userId, muted: member.muted, deafened });
    });

    // WebRTC signaling
    socket.on('voice:offer', ({ targetId, offer, channelId }) => {
      const targetSocketId = connectedUsers.get(targetId);
      if (targetSocketId) {
        io.to(targetSocketId).emit('voice:offer', { fromId: userId, offer, channelId });
      }
    });

    socket.on('voice:answer', ({ targetId, answer, channelId }) => {
      const targetSocketId = connectedUsers.get(targetId);
      if (targetSocketId) {
        io.to(targetSocketId).emit('voice:answer', { fromId: userId, answer, channelId });
      }
    });

    socket.on('voice:ice', ({ targetId, candidate, channelId }) => {
      const targetSocketId = connectedUsers.get(targetId);
      if (targetSocketId) {
        io.to(targetSocketId).emit('voice:ice', { fromId: userId, candidate, channelId });
      }
    });

    // ── Disconnect ──────────────────────────────────────────
    socket.on('disconnect', async () => {
      connectedUsers.delete(userId);
      // Leave any voice room
      if (socket.voiceChannelId) {
        leaveVoiceRoom(socket, userId, socket.voiceChannelId, null, io);
      }
      await User.findByIdAndUpdate(userId, { status: 'offline' });
      io.emit('user:statusChange', { userId, status: 'offline' });
      console.log(`❌ ${socket.user.username} disconnected`);
    });
  });
};

function leaveVoiceRoom(socket, userId, channelId, serverId, io) {
  const room = voiceRooms.get(channelId);
  if (!room) return;
  room.delete(userId);
  socket.leave(`voice:${channelId}`);
  if (socket.voiceChannelId === channelId) socket.voiceChannelId = null;

  io.to(`voice:${channelId}`).emit('voice:userLeft', { channelId, userId });

  if (room.size === 0) voiceRooms.delete(channelId);

  if (serverId) {
    io.to(`server:${serverId}`).emit('voice:roomUpdate', {
      channelId,
      members: room ? Array.from(room.values()) : [],
    });
  }
}

function leaveAllVoiceRooms(socket, userId, io) {
  if (socket.voiceChannelId) {
    leaveVoiceRoom(socket, userId, socket.voiceChannelId, null, io);
  }
}

module.exports = { initializeSocket, connectedUsers, voiceRooms };
