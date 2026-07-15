import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatDistanceToNow, format } from 'date-fns'
import { getSocket } from '../../utils/socket'
import { useAuth } from '../../context/AuthContext'
import api from '../../utils/api'
import UserPopup from '../ui/UserPopup'
import { useDM }  from '../../context/DMContext'
import BotPopup  from '../ui/BotPopup'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
const toUrl = p => p ? (p.startsWith('http') ? p : `${API_URL}/${p.replace(/^\//, '')}`) : null

const Avatar = ({ user, size = 36, isBot = false, botData = null }) => {
  const src = isBot ? toUrl(botData?.avatar) : toUrl(user?.avatar)
  const initials = isBot
    ? (botData?.name || '??').slice(0, 2).toUpperCase()
    : (user?.username || '??').slice(0, 2).toUpperCase()
  const bg = isBot ? 'rgba(88,101,242,.22)' : (user?.bannerColor || 'var(--s5)')
  const borderCol = isBot ? 'rgba(88,101,242,.4)' : 'var(--bm)'
  const color = isBot ? '#7289da' : 'var(--t0)'
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.35, fontWeight: 700,
      color, flexShrink: 0, overflow: 'hidden',
      border: `1px solid ${borderCol}`,
    }}>
      {src
        ? <img src={src} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}
            onError={e => { e.target.style.display = 'none' }}/>
        : initials
      }
    </div>
  )
}

const EMOJIS = ['👍', '❤️', '😂', '🔥', '🎉', '😮', '😢', '👎']

/* ── Invite embed card ──────────────────────────────────── */
const InviteEmbed = ({ code }) => {
  const navigate = useNavigate()
  const [info,    setInfo]    = useState(null)
  const [joining, setJoining] = useState(false)
  const [joined,  setJoined]  = useState(false)

  useEffect(() => {
    api.get(`/servers/invite/${code}`)
      .then(r => setInfo(r.data))
      .catch(() => {})
  }, [code])

  const join = async () => {
    if (info?.isMember) { navigate(`/channels/${info._id}`); return }
    setJoining(true)
    try {
      const r = await api.post(`/servers/join/${code}`)
      setJoined(true)
      setInfo(p => ({ ...p, isMember: true }))
      setTimeout(() => navigate(`/channels/${r.data._id}`), 700)
    } catch {}
    setJoining(false)
  }

  if (!info) return (
    <div style={{ marginTop:8, padding:'12px 14px', background:'var(--s3)', border:'1px solid var(--bm)', borderRadius:8, width:380, display:'flex', alignItems:'center', gap:10 }}>
      <div style={{ width:14, height:14, border:'2px solid var(--bm)', borderTopColor:'var(--t1)', borderRadius:'50%', animation:'spin .7s linear infinite', flexShrink:0 }}/>
      <span style={{ fontSize:13, color:'var(--t2)' }}>Loading invite…</span>
    </div>
  )

  const iconUrl = toUrl(info.icon)

  return (
    <div style={{
      marginTop: 8,
      padding: '16px',
      background: 'var(--s3)',
      border: '1px solid var(--bm)',
      borderLeft: '4px solid #5865f2',
      borderRadius: '0 8px 8px 0',
      width: 420, maxWidth: '100%',
      display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      <div style={{ fontSize:11, fontWeight:700, color:'#7289da', letterSpacing:'.08em', textTransform:'uppercase' }}>
        Server Invite
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        <div style={{
          width:50, height:50, borderRadius:12, flexShrink:0,
          background: iconUrl ? 'transparent' : '#5865f2',
          overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:18, fontWeight:800, color:'#fff',
        }}>
          {iconUrl
            ? <img src={iconUrl} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={e=>e.target.style.display='none'}/>
            : info.name?.slice(0,2).toUpperCase()
          }
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:16, fontWeight:700, color:'var(--t0)', marginBottom:4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {info.name}
          </div>
          <div style={{ display:'flex', gap:10, fontSize:12 }}>
            <span style={{ color:'var(--t1)', display:'flex', alignItems:'center', gap:4 }}>
              <span style={{ width:8, height:8, borderRadius:'50%', background:'var(--ok)', display:'inline-block' }}/>
              {info.onlineCount} Online
            </span>
            <span style={{ color:'var(--t2)', display:'flex', alignItems:'center', gap:4 }}>
              <span style={{ width:8, height:8, borderRadius:'50%', background:'var(--t3)', display:'inline-block' }}/>
              {info.memberCount} Members
            </span>
          </div>
        </div>
        <button onClick={join} disabled={joining}
          style={{
            padding:'8px 18px', borderRadius:6, border:'none', flexShrink:0,
            background: joined ? 'var(--ok)' : info.isMember ? 'var(--s5)' : '#5865f2',
            color:'#fff', fontSize:14, fontWeight:600,
            cursor: joining ? 'not-allowed' : 'pointer',
            transition:'background .15s',
          }}
          onMouseEnter={e=>{ if(!joining&&!joined) e.currentTarget.style.background=info.isMember?'var(--s6)':'#4752c4' }}
          onMouseLeave={e=>{ if(!joining&&!joined) e.currentTarget.style.background=info.isMember?'var(--s5)':'#5865f2' }}
        >
          {joined ? 'Joined ✓' : joining ? '…' : info.isMember ? 'Open' : 'Join'}
        </button>
      </div>
    </div>
  )
}

const INVITE_RE = /(?:https?:\/\/\S+?\/invite\/|invite[\s:]+)([A-Z0-9]{6,12})/gi

const MessageContent = ({ content }) => {
  const parts = []
  let last = 0, m
  INVITE_RE.lastIndex = 0
  while ((m = INVITE_RE.exec(content)) !== null) {
    if (m.index > last) parts.push({ type:'text', text:content.slice(last, m.index) })
    parts.push({ type:'invite', code:m[1].toUpperCase(), raw:m[0] })
    last = m.index + m[0].length
  }
  if (last < content.length) parts.push({ type:'text', text:content.slice(last) })
  if (!parts.length) parts.push({ type:'text', text:content })

  return (
    <div>
      {parts.map((p,i) =>
        p.type === 'text'
          ? <span key={i} style={styles.msgText}>{p.text}</span>
          : <div key={i}>
              <span style={{ ...styles.msgText, color:'#7289da', cursor:'pointer' }}>{p.raw}</span>
              <InviteEmbed code={p.code}/>
            </div>
      )}
    </div>
  )
}

const StatusDot = ({ status }) => {
  const c = { online: '#3dd68c', idle: '#faa61a', dnd: '#f04747', offline: '#747f8d' }
  return <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: c[status] || c.offline, marginLeft: 6 }} />
}

const MessageItem = ({ msg, isOwn, onDelete, onEdit, onReact }) => {
  const [showActions, setShowActions] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editContent, setEditContent] = useState(msg.content)
  const [showEmoji, setShowEmoji] = useState(false)

  const handleEdit = async () => {
    if (editContent.trim() === msg.content) { setEditing(false); return }
    await onEdit(msg._id, editContent.trim())
    setEditing(false)
  }

  if (msg.isDeleted) {
    return (
      <div style={{ ...styles.msgRow, opacity: 0.4 }}>
        <div style={{ width: 36 }} />
        <div style={{ fontSize: 13, fontStyle: 'italic', color: 'var(--text-muted)', paddingLeft: 12 }}>
          Message deleted
        </div>
      </div>
    )
  }

  return (
    <div
      style={{ ...styles.msgRow, background: showActions ? 'var(--bg-hover)' : 'transparent' }}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => { setShowActions(false); setShowEmoji(false) }}
    >
      {msg.isBot ? (
        <BotPopup bot={msg.botAuthor || { name: msg.botName, avatar: msg.botAvatar }}>
          <Avatar user={msg.author} size={36} isBot={true} botData={msg.botAuthor || { name: msg.botName, avatar: msg.botAvatar }}/>
        </BotPopup>
      ) : (
        <Avatar user={msg.author} size={36}/>
      )}
      <div style={styles.msgContent}>
        <div style={styles.msgMeta}>
          {msg.isBot ? (
            <BotPopup bot={msg.botAuthor || { name: msg.botName, avatar: msg.botAvatar }}>
            <span style={{ display:'flex', alignItems:'center', gap:5 }}>
              <span style={styles.msgAuthor}>
                {msg.botAuthor?.name || msg.botName || 'Bot'}
              </span>
              <span style={{
                fontSize: 9, fontFamily: 'var(--mono)', fontWeight: 700,
                background: 'rgba(88,101,242,.25)', color: '#7289da',
                padding: '1px 5px', borderRadius: 3,
                border: '1px solid rgba(88,101,242,.35)',
                letterSpacing: '.05em',
              }}>BOT</span>
            </span>
            </BotPopup>
          ) : (
            <UserPopup userId={msg.author?._id}>
              <span style={styles.msgAuthor}>{msg.author?.username}</span>
            </UserPopup>
          )}
          {!msg.isBot && <StatusDot status={msg.author?.status} />}
          <span style={styles.msgTime}>
            {format(new Date(msg.createdAt), 'HH:mm')}
            {msg.editedAt && <span style={{ color: 'var(--text-muted)', fontSize: 11, marginLeft: 4 }}>(edited)</span>}
          </span>
        </div>

        {msg.replyTo && (
          <div style={styles.replyBar}>
            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>↩ {msg.replyTo.author?.username}: </span>
            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{msg.replyTo.content?.slice(0, 60)}...</span>
          </div>
        )}

        {editing ? (
          <div style={styles.editArea}>
            <input
              style={styles.editInput}
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleEdit()
                if (e.key === 'Escape') setEditing(false)
              }}
              autoFocus
            />
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Enter to save · Esc to cancel</span>
          </div>
        ) : (
          <MessageContent content={msg.content} />
        )}

        {/* Reactions */}
        {msg.reactions?.length > 0 && (
          <div style={styles.reactions}>
            {msg.reactions.map(r => (
              <button key={r.emoji} onClick={() => onReact(msg._id, r.emoji)} style={styles.reactionBtn}>
                {r.emoji} {r.users.length}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Action buttons */}
      {showActions && (
        <div style={styles.actions}>
          <div style={{ position: 'relative' }}>
            <button onClick={() => setShowEmoji(p => !p)} style={styles.actionBtn} title="React">
              😊
            </button>
            {showEmoji && (
              <div style={styles.emojiPicker}>
                {EMOJIS.map(e => (
                  <button key={e} onClick={() => { onReact(msg._id, e); setShowEmoji(false) }} style={styles.emojiBtn}>
                    {e}
                  </button>
                ))}
              </div>
            )}
          </div>
          {isOwn && (
            <>
              <button onClick={() => setEditing(true)} style={styles.actionBtn} title="Edit">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm17.71-10.21c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                </svg>
              </button>
              <button onClick={() => onDelete(msg._id)} style={{ ...styles.actionBtn, color: 'var(--danger)' }} title="Delete">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                </svg>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

const ChatArea = ({ channel, server }) => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { togglePanel, panelState } = useDM()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [typingUsers, setTypingUsers] = useState([])
  const [replyTo, setReplyTo] = useState(null)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const typingTimer = useRef(null)
  // Keep a ref to channelId so the reconnect handler always has the latest value
  const channelIdRef = useRef(null)

  useEffect(() => {
    if (!channel) return
    channelIdRef.current = channel._id

    setMessages([])
    setLoading(true)

    api.get(`/messages/channel/${channel._id}`)
      .then(res => setMessages(res.data))
      .catch(console.error)
      .finally(() => setLoading(false))

    const socket = getSocket()
    if (!socket) return

    // Join the channel room (and rejoin on reconnect)
    const joinChannel = () => {
      socket.emit('channel:join', channel._id)
    }
    joinChannel()
    socket.on('connect', joinChannel)

    const onNew     = (msg) => setMessages(p => [...p, msg])
    const onDeleted = ({ messageId }) => setMessages(p => p.map(m => m._id === messageId ? { ...m, isDeleted: true } : m))
    const onUpdated = (msg) => setMessages(p => p.map(m => m._id === msg._id ? msg : m))
    const onTyping  = ({ userId, username, isTyping }) => {
      if (userId === user._id) return
      setTypingUsers(p => isTyping ? [...new Set([...p, username])] : p.filter(u => u !== username))
    }

    socket.on('message:new',     onNew)
    socket.on('message:deleted', onDeleted)
    socket.on('message:updated', onUpdated)
    socket.on('typing:update',   onTyping)

    return () => {
      socket.emit('channel:leave', channel._id)
      socket.off('connect',          joinChannel)
      socket.off('message:new',      onNew)
      socket.off('message:deleted',  onDeleted)
      socket.off('message:updated',  onUpdated)
      socket.off('typing:update',    onTyping)
    }
  }, [channel?._id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = useCallback(() => {
    const content = input.trim()
    if (!content) return
    const socket = getSocket()
    if (!socket?.connected) return

    socket.emit('message:send', {
      content,
      channelId: channel._id,
      serverId: server._id,
      replyTo: replyTo?._id || null,
    })
    setInput('')
    setReplyTo(null)
  }, [input, channel, server, replyTo])

  const handleTyping = (e) => {
    setInput(e.target.value)
    const socket = getSocket()
    if (!socket?.connected) return
    socket.emit('typing:start', { channelId: channel._id })
    clearTimeout(typingTimer.current)
    typingTimer.current = setTimeout(() => {
      socket.emit('typing:stop', { channelId: channel._id })
    }, 2000)
  }

  const handleDelete = async (messageId) => {
    const socket = getSocket()
    socket?.emit('message:delete', { messageId })
  }

  const handleEdit = async (messageId, content) => {
    const socket = getSocket()
    socket?.emit('message:edit', { messageId, content })
  }

  const handleReact = async (messageId, emoji) => {
    try {
      const res = await api.post(`/messages/${messageId}/react`, { emoji })
      setMessages(p => p.map(m => m._id === messageId ? res.data : m))
    } catch (err) { console.error(err) }
  }

  if (!channel) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, background: 'var(--s2)' }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 28, fontWeight: 800, color: 'var(--a)', letterSpacing: '-.03em', opacity: .8 }}>
          [ PASK ]
        </div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--t2)', textAlign: 'center', lineHeight: 1.8 }}>
          Select a channel to start chatting
        </div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: 'var(--text-muted)' }}>
            {channel.type === 'voice' ? '🔊' : '#'}
          </span>
          <span style={styles.channelName}>{channel.name}</span>
          {channel.topic && (
            <>
              <div style={styles.headerDivider} />
              <span style={styles.channelTopic}>{channel.topic}</span>
            </>
          )}
        </div>
        {/* DM toggle */}
        <button
          onClick={togglePanel}
          title="Direct Messages"
          style={{
            display:'flex', alignItems:'center', gap:5,
            background: panelState !== 'closed' ? 'var(--a-lo)' : 'none',
            border:`1px solid ${panelState !== 'closed' ? 'var(--bh)' : 'var(--b)'}`,
            borderRadius:'var(--r2)', padding:'4px 10px',
            fontFamily:'var(--mono)', fontSize:11,
            color: panelState !== 'closed' ? 'var(--a)' : 'var(--t2)',
            cursor:'pointer', transition:'all .12s', flexShrink:0,
          }}
          onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--bh)';e.currentTarget.style.color='var(--t0)'}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor=panelState!=='closed'?'var(--bh)':'var(--b)';e.currentTarget.style.color=panelState!=='closed'?'var(--a)':'var(--t2)'}}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          DMs
        </button>
      </div>

      {/* Messages */}
      <div style={styles.messages}>
        {/* Channel welcome header */}
        {!loading && messages.length === 0 && (
          <div style={{ padding: '32px 20px 16px', borderBottom: '1px solid var(--b)' }}>
            <div style={{
              width: 48, height: 48, borderRadius: 'var(--r3)',
              background: 'var(--a-lo)', border: '1px solid var(--bm)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--mono)', fontSize: 20, color: 'var(--a)',
              marginBottom: 12,
            }}>
              #
            </div>
            <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 18, color: 'var(--t0)', marginBottom: 4 }}>
              Welcome to #{channel?.name}!
            </div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--t2)', lineHeight: 1.7 }}>
              {channel?.topic || 'This is the beginning of the channel. Say hi!'}
            </div>
          </div>
        )}
        {loading && (
          <div style={styles.loading}>
            <div style={styles.spinner} />
          </div>
        )}

        {messages.map((msg) => (
          <MessageItem
            key={msg._id}
            msg={msg}
            isOwn={msg.author?._id === user?._id || msg.author === user?._id}
            onDelete={handleDelete}
            onEdit={handleEdit}
            onReact={handleReact}
          />
        ))}

        {typingUsers.length > 0 && (
          <div style={styles.typing}>
            <div style={styles.typingDots}>
              <span /><span /><span />
            </div>
            <span style={styles.typingText}>
              {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
            </span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Reply bar */}
      {replyTo && (
        <div style={styles.replyBar}>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Replying to <strong style={{ color: 'var(--accent)' }}>{replyTo.author?.username}</strong>: {replyTo.content?.slice(0, 80)}
          </span>
          <button onClick={() => setReplyTo(null)} style={styles.replyClose}>×</button>
        </div>
      )}

      {/* Input */}
      <div style={styles.inputArea}>
        <div style={styles.inputWrapper}>
          <input
            ref={inputRef}
            style={styles.input}
            placeholder={`Message #${channel.name}`}
            value={input}
            onChange={handleTyping}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            style={{ ...styles.sendBtn, opacity: input.trim() ? 1 : 0.3 }}
            onMouseEnter={e => { if (input.trim()) e.currentTarget.style.background = 'var(--a)'; e.currentTarget.style.color = 'var(--s0)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--a-lo)'; e.currentTarget.style.color = 'var(--t0)' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

const styles = {
  container: {
    flex: 1, display: 'flex', flexDirection: 'column',
    height: '100%', overflow: 'hidden',
    background: 'var(--s5)',
  },
  header: {
    height: 56, borderBottom: '1px solid var(--b)',
    padding: '0 20px',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    flexShrink: 0, background: 'var(--s5)',
    boxShadow: '0 1px 0 rgba(0,0,0,.3)',
  },
  channelName: { fontWeight: 700, fontSize: 16, color: 'var(--t0)', letterSpacing: '-.015em' },
  headerDivider: { width: 1, height: 20, background: 'var(--s6)', margin: '0 10px' },
  channelTopic: { fontSize: 14, color: 'var(--t2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 340 },
  messages: {
    flex: 1, overflowY: 'auto', padding: '8px 0 4px',
    display: 'flex', flexDirection: 'column', gap: 0,
  },
  loading: { display: 'flex', justifyContent: 'center', padding: 32 },
  spinner: {
    width: 28, height: 28,
    border: '3px solid var(--bm)', borderTopColor: 'var(--t0)',
    borderRadius: '50%', animation: 'spin 0.7s linear infinite',
  },
  welcomeMsg: { padding: '32px 20px 20px', display: 'flex', flexDirection: 'column', gap: 8 },
  welcomeIcon: {
    width: 72, height: 72, borderRadius: '50%',
    background: 'var(--s4)', border: '2px solid var(--bm)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 32, fontWeight: 900, color: 'var(--t0)', marginBottom: 10,
  },
  welcomeTitle: { fontSize: 28, fontWeight: 700, color: 'var(--t0)', letterSpacing: '-.02em' },
  welcomeDesc: { fontSize: 15, color: 'var(--t2)', lineHeight: 1.55 },
  msgRow: {
    display: 'flex', alignItems: 'flex-start', gap: 14,
    padding: '2px 20px', position: 'relative',
    transition: 'background 0.08s',
  },
  msgContent: { flex: 1, minWidth: 0 },
  msgMeta: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 },
  msgAuthor: { fontWeight: 600, fontSize: 15, color: 'var(--t0)', letterSpacing: '-.015em', cursor: 'pointer' },
  msgTime: { fontSize: 11, color: 'var(--t3)', fontFamily: 'var(--mono)' },
  msgText: { fontSize: 15, color: 'var(--t1)', wordBreak: 'break-word', lineHeight: 1.55 },
  replyBar: {
    padding: '4px 20px 0', display: 'flex', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 2,
  },
  replyClose: {
    background: 'transparent', border: 'none',
    color: 'var(--t2)', cursor: 'pointer', fontSize: 18, padding: '0 6px',
  },
  reactions: { display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 5 },
  reactionBtn: {
    background: 'var(--s3)', border: '1px solid var(--bm)',
    borderRadius: 12, padding: '2px 8px',
    fontSize: 13, cursor: 'pointer', color: 'var(--t0)',
    transition: 'background .1s',
  },
  actions: {
    position: 'absolute', right: 20, top: -20,
    display: 'flex', gap: 1,
    background: 'var(--s3)', border: '1px solid var(--bm)',
    borderRadius: 8, padding: '3px', zIndex: 50,
    boxShadow: '0 4px 20px rgba(0,0,0,.5)',
  },
  actionBtn: {
    background: 'transparent', border: 'none',
    color: 'var(--t2)', cursor: 'pointer',
    width: 30, height: 30, borderRadius: 5,
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
    transition: 'all .1s',
  },
  emojiPicker: {
    position: 'absolute', right: 0, top: '100%',
    background: 'var(--s3)', border: '1px solid var(--bm)',
    borderRadius: 8, padding: 8,
    display: 'flex', gap: 4, zIndex: 100,
    boxShadow: '0 8px 24px rgba(0,0,0,.5)',
  },
  emojiBtn: {
    background: 'transparent', border: 'none',
    cursor: 'pointer', fontSize: 20, padding: '3px',
    borderRadius: 5, transition: 'background .1s',
  },
  typing: { display: 'flex', alignItems: 'center', gap: 8, padding: '0 20px 6px', minHeight: 24 },
  typingDots: { display: 'flex', gap: 3 },
  typingText: { fontSize: 12, color: 'var(--t2)', fontFamily: 'var(--mono)' },
  editArea: { display: 'flex', flexDirection: 'column', gap: 4 },
  editInput: {
    background: 'var(--s4)', border: '1px solid var(--bh)',
    borderRadius: 6, padding: '8px 12px',
    fontSize: 15, color: 'var(--t0)', outline: 'none', width: '100%',
    fontFamily: 'var(--sans)',
  },
  inputArea: { padding: '0 16px 18px', flexShrink: 0 },
  inputWrapper: {
    display: 'flex', alignItems: 'center', gap: 8,
    background: 'var(--s6)', borderRadius: 10,
    padding: '10px 16px', border: '1px solid var(--bm)',
    transition: 'border-color .15s',
  },
  input: {
    flex: 1, background: 'transparent', border: 'none', outline: 'none',
    fontSize: 15, color: 'var(--t0)', fontFamily: 'var(--sans)',
  },
  sendBtn: {
    background: 'var(--a-lo)', border: 'none',
    borderRadius: 6, color: 'var(--t0)',
    width: 32, height: 32,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', transition: 'all .14s', fontSize: 16,
  },
}

export default ChatArea
