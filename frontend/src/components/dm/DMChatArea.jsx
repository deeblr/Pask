import { useState, useEffect, useRef, useCallback } from 'react'
import { format } from 'date-fns'
import { useAuth } from '../../context/AuthContext'
import { getSocket } from '../../utils/socket'
import api from '../../utils/api'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
const toUrl = p => p ? (p.startsWith('http') ? p : `${API_URL}/${p.replace(/^\//, '')}`) : null

const Avatar = ({ user, size = 36 }) => (
  <div style={{
    width: size, height: size, borderRadius: '50%',
    background: 'var(--accent-dim)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 700, fontSize: size * 0.35, color: 'var(--accent)',
    overflow: 'hidden', flexShrink: 0,
  }}>
    {user?.avatar
      ? <img src={toUrl(user.avatar)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}  onError={e=>e.target.style.display="none"}/>
      : user?.username?.slice(0, 2).toUpperCase()}
  </div>
)

const DMChatArea = ({ conversation }) => {
  const { user } = useAuth()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [typingUsers, setTypingUsers] = useState([])
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef(null)
  const typingTimer = useRef(null)

  const other = conversation?.isBotDM && conversation?.botInfo
    ? { ...conversation.botInfo, username: conversation.botInfo.name, isBot: true }
    : conversation?.participants?.find(p => p._id !== user?._id)

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })

  // Load messages
  useEffect(() => {
    if (!conversation?._id) return
    setMessages([])
    api.get(`/dm/${conversation._id}/messages`)
      .then(res => { setMessages(res.data); scrollToBottom() })
      .catch(() => {})
  }, [conversation?._id])

  // Socket events
  useEffect(() => {
    if (!conversation?._id) return
    const socket = getSocket()
    if (!socket) return

    socket.emit('dm:join', conversation._id)

    const onNew = (msg) => {
      setMessages(p => [...p, msg])
      scrollToBottom()
    }
    const onTyping = ({ userId, username, isTyping: typing }) => {
      if (userId === user?._id) return
      setTypingUsers(p =>
        typing ? [...p.filter(u => u.userId !== userId), { userId, username }]
               : p.filter(u => u.userId !== userId)
      )
    }
    socket.on('dm:new', onNew)
    socket.on('dm:typing:update', onTyping)
    socket.emit('dm:read', conversation._id)

    return () => {
      socket.emit('dm:leave', conversation._id)
      socket.off('dm:new', onNew)
      socket.off('dm:typing:update', onTyping)
    }
  }, [conversation?._id, user?._id])

  useEffect(() => { scrollToBottom() }, [messages])

  const handleTyping = () => {
    const socket = getSocket()
    if (!isTyping) {
      setIsTyping(true)
      socket?.emit('dm:typing:start', conversation._id)
    }
    clearTimeout(typingTimer.current)
    typingTimer.current = setTimeout(() => {
      setIsTyping(false)
      socket?.emit('dm:typing:stop', conversation._id)
    }, 2000)
  }

  const sendMessage = useCallback(() => {
    if (!input.trim() || !conversation?._id) return
    const socket = getSocket()
    socket?.emit('dm:send', { conversationId: conversation._id, content: input.trim() })
    setInput('')
    setIsTyping(false)
    socket?.emit('dm:typing:stop', conversation._id)
  }, [input, conversation?._id])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  if (!conversation) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, color: 'var(--text-muted)' }}>
        <div style={{ fontSize: 48 }}>💬</div>
        <h3 style={{ color: 'var(--text-secondary)', fontSize: 18 }}>Your Direct Messages</h3>
        <p style={{ fontSize: 14, maxWidth: 280, textAlign: 'center' }}>Search for a friend to start a conversation</p>
      </div>
    )
  }

  const groupedMessages = messages.reduce((groups, msg, i) => {
    const prev = messages[i - 1]
    const isCompact = prev &&
      prev.author?._id === msg.author?._id &&
      new Date(msg.createdAt) - new Date(prev.createdAt) < 5 * 60 * 1000
    groups.push({ ...msg, isCompact })
    return groups
  }, [])

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: 'var(--bg-tertiary)' }}>
      {/* Header */}
      <div style={{
        height: 52, padding: '0 16px', display: 'flex', alignItems: 'center', gap: 10,
        borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)', flexShrink: 0,
      }}>
        {other?.isBot ? (
          <div style={{ width:32, height:32, borderRadius:'50%', background:'rgba(88,101,242,.2)', border:'1px solid rgba(88,101,242,.3)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--mono)', fontSize:11, fontWeight:700, color:'#7289da', overflow:'hidden', flexShrink:0 }}>
            {toUrl(other.avatar) ? <img src={toUrl(other.avatar)} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/> : (other.name||'B').slice(0,2).toUpperCase()}
          </div>
        ) : (
          <Avatar user={other} size={32} />
        )}
        <span style={{ fontSize: 15, fontWeight: 600 }}>{other?.username}</span>
        {other?.isBot && <span style={{ fontSize:9, fontFamily:'var(--mono)', fontWeight:700, background:'rgba(88,101,242,.25)', color:'#7289da', padding:'2px 6px', borderRadius:3, border:'1px solid rgba(88,101,242,.35)', letterSpacing:'.05em' }}>BOT</span>}
        <span style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'capitalize' }}>
          · {other?.status || 'offline'}
        </span>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 0', display: 'flex', flexDirection: 'column' }}>
        {messages.length === 0 && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--text-muted)' }}>
            {other?.isBot ? (
              <div style={{ width:64, height:64, borderRadius:'50%', background:'rgba(88,101,242,.2)', border:'1px solid rgba(88,101,242,.35)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, fontWeight:800, color:'#7289da', overflow:'hidden' }}>
                {toUrl(other.avatar) ? <img src={toUrl(other.avatar)} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/> : (other.name||'B').slice(0,2).toUpperCase()}
              </div>
            ) : (
              <Avatar user={other} size={64} />
            )}
            <p style={{ fontSize: 14, marginTop: 8 }}>Start your conversation with <strong>{other?.username}</strong>{other?.isBot && <span style={{ marginLeft:5, fontSize:9, fontFamily:'var(--mono)', fontWeight:700, background:'rgba(88,101,242,.25)', color:'#7289da', padding:'1px 5px', borderRadius:3, border:'1px solid rgba(88,101,242,.35)' }}>BOT</span>}</p>
          </div>
        )}
        {groupedMessages.map(msg => (
          <div
            key={msg._id}
            style={{
              display: 'flex', gap: 12, padding: msg.isCompact ? '1px 16px' : '4px 16px',
              position: 'relative',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            <div style={{ visibility: msg.isCompact ? 'hidden' : 'visible', flexShrink: 0 }}>
              <Avatar user={msg.author} size={36} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              {!msg.isCompact && (
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 2 }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{msg.author?.username}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {format(new Date(msg.createdAt), 'HH:mm')}
                  </span>
                </div>
              )}
              <p style={{
  fontSize: 14,
  lineHeight: 1.55,
  wordBreak: 'break-word',
  whiteSpace: 'pre-wrap',
  margin: 0,
  fontStyle: msg.isDeleted ? 'italic' : 'normal',
  color: msg.isDeleted ? 'var(--text-muted)' : 'var(--text-primary)',
}}>
  {msg.isDeleted ? 'This message was deleted.' : msg.content}
  {msg.editedAt && (
    <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 4 }}>
      (edited)
    </span>
  )}
</p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing indicator */}
      <div style={{ padding: '0 16px 4px', fontSize: 12, color: 'var(--text-muted)', minHeight: 20 }}>
        {typingUsers.length > 0 && (
          <>
            <span style={{ display: 'inline-flex', gap: 3, marginRight: 4, verticalAlign: 'middle' }}>
              {[0,1,2].map(i => (
                <span key={i} style={{
                  width: 4, height: 4, background: 'var(--text-muted)', borderRadius: '50%',
                  display: 'inline-block',
                  animation: `typing 1.4s ${i * 0.2}s infinite`,
                }} />
              ))}
            </span>
            {typingUsers.map(u => u.username).join(', ')} is typing...
          </>
        )}
      </div>

      {/* Input */}
      <div style={{ padding: '0 16px 16px', flexShrink: 0 }}>
        <div style={{
          background: 'var(--bg-input)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'flex-end',
          gap: 8, padding: '8px 12px', transition: 'border-color 0.2s',
        }}
          onFocus={e => e.currentTarget.style.borderColor = 'var(--accent)'}
          onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
        >
          <textarea
            value={input}
            onChange={e => { setInput(e.target.value); handleTyping() }}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${other?.isBot ? (other?.name || 'Bot') : (other?.username || '…')}`}
            rows={1}
            style={{
              flex: 1, background: 'none', border: 'none', outline: 'none',
              resize: 'none', color: 'var(--text-primary)', fontSize: 14,
              lineHeight: 1.5, maxHeight: 200, overflowY: 'auto',
              fontFamily: 'var(--font)',
            }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim()}
            style={{
              width: 32, height: 32, background: input.trim() ? 'var(--accent)' : 'var(--bg-hover)',
              borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 16, color: input.trim() ? '#fff' : 'var(--text-muted)',
              transition: 'background 0.15s, color 0.15s', flexShrink: 0, cursor: input.trim() ? 'pointer' : 'not-allowed',
            }}
          >
            ↑
          </button>
        </div>
      </div>
    </div>
  )
}

export default DMChatArea
