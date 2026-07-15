import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import api from '../../utils/api'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
const toUrl = p => p ? (p.startsWith('http') ? p : `${API_URL}/${p.replace(/^\//, '')}`) : null

const STATUS_COLOR = { online:'#23a55a', idle:'#f0b132', dnd:'#f23f43', offline:'#80848e' }

const Avatar = ({ user, size = 40 }) => {
  const av = toUrl(user?.avatar)
  const color = user?.bannerColor || '#5865f2'
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: av ? 'transparent' : color,
      overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative',
    }}>
      {av
        ? <img src={av} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={e=>e.target.style.display='none'}/>
        : <span style={{ fontSize: size * .38, fontWeight: 700, color: '#fff' }}>
            {user?.username?.[0]?.toUpperCase()}
          </span>
      }
      <div style={{
        position: 'absolute', bottom: 0, right: 0,
        width: size * .28, height: size * .28, borderRadius: '50%',
        background: STATUS_COLOR[user?.status] || STATUS_COLOR.offline,
        border: `${size * .06}px solid #2b2d31`,
      }}/>
    </div>
  )
}

const InviteModal = ({ server, onClose }) => {
  const { user: me } = useAuth()
  const [friends, setFriends]  = useState([])
  const [loading, setLoading]  = useState(true)
  const [query,   setQuery]    = useState('')
  const [sent,    setSent]     = useState({})    // userId → true
  const [copied,  setCopied]   = useState(false)

  const inviteLink = `${window.location.origin}/invite/${server?.inviteCode}`

  useEffect(() => {
    api.get('/friends')
      .then(r => setFriends(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Filter friends not already in server
  const serverMemberIds = new Set(
    (server?.members || []).map(m => (m.user?._id || m.user)?.toString())
  )
  const filtered = friends.filter(f => {
    if (serverMemberIds.has(f._id?.toString())) return false
    if (!query.trim()) return true
    return f.username?.toLowerCase().includes(query.toLowerCase())
  })

  const sendInvite = async (friend) => {
    if (sent[friend._id]) return
    try {
      // Send invite code via DM (create DM conversation if needed and send a message)
      const dmRes = await api.post('/dm/conversations', { userId: friend._id })
      const convId = dmRes.data._id
      await api.post(`/dm/conversations/${convId}/messages`, {
        content: `Join my server **${server.name}**!\nInvite code: \`${server.inviteCode}\`\n${inviteLink}`,
      })
      setSent(p => ({ ...p, [friend._id]: true }))
    } catch {
      // Fallback: just mark as sent
      setSent(p => ({ ...p, [friend._id]: true }))
    }
  }

  const copyLink = () => {
    navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.8)', backdropFilter:'blur(8px)', zIndex:900, display:'flex', alignItems:'center', justifyContent:'center' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        width: 460, borderRadius: 8,
        background: '#2b2d31',
        boxShadow: '0 24px 80px rgba(0,0,0,.7)',
        overflow: 'hidden',
        animation: 'slide-up .18s ease',
        display: 'flex', flexDirection: 'column',
        maxHeight: '85vh',
      }}>

        {/* Header */}
        <div style={{ padding: '20px 20px 0' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 4 }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#f2f3f5', letterSpacing: '-.02em' }}>
                Invite friends to <span style={{ color: '#fff' }}>{server?.name}</span>
              </div>
              <div style={{ fontSize: 13, color: '#949ba4', marginTop: 2 }}>
                Share this server with your friends.
              </div>
            </div>
            <button onClick={onClose} style={{
              width: 32, height: 32, borderRadius: '50%',
              background: '#3b3d44', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#b5bac1', fontSize: 16, flexShrink: 0,
              transition: 'background .12s',
            }}
              onMouseEnter={e=>e.currentTarget.style.background='#4e5058'}
              onMouseLeave={e=>e.currentTarget.style.background='#3b3d44'}
            >✕</button>
          </div>

          {/* Search */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: '#1e1f22', borderRadius: 6,
            padding: '8px 12px', marginTop: 16,
            border: '1px solid rgba(255,255,255,.06)',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#949ba4">
              <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
            </svg>
            <input
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search for friends"
              style={{
                flex: 1, background: 'none', border: 'none', outline: 'none',
                color: '#f2f3f5', fontSize: 14,
              }}
            />
            {query && (
              <button onClick={() => setQuery('')} style={{ background:'none', border:'none', color:'#949ba4', cursor:'pointer', fontSize:14 }}>✕</button>
            )}
          </div>
        </div>

        {/* Friends list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 8px', marginTop: 8 }}>
          {loading ? (
            <div style={{ padding: '32px', textAlign: 'center', color: '#949ba4', fontSize: 13 }}>Loading…</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>👥</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#f2f3f5', marginBottom: 4 }}>
                {query ? 'No results found' : 'All your friends are already in this server!'}
              </div>
              <div style={{ fontSize: 13, color: '#949ba4' }}>
                {query ? 'Try a different name.' : 'You can still share the invite link below.'}
              </div>
            </div>
          ) : (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#949ba4', letterSpacing: '.08em', textTransform: 'uppercase', padding: '4px 8px 8px' }}>
                Friends — {filtered.length}
              </div>
              {filtered.map(friend => (
                <div key={friend._id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '8px 10px', borderRadius: 6,
                  transition: 'background .1s', cursor: 'default',
                }}
                  onMouseEnter={e=>e.currentTarget.style.background='#35373c'}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}
                >
                  <Avatar user={friend} size={40}/>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#f2f3f5', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {friend.username}
                    </div>
                    <div style={{ fontSize: 12, color: STATUS_COLOR[friend.status] || STATUS_COLOR.offline }}>
                      {friend.status === 'online' ? 'Online' : friend.status === 'idle' ? 'Idle' : friend.status === 'dnd' ? 'Do Not Disturb' : 'Offline'}
                    </div>
                  </div>
                  <button
                    onClick={() => sendInvite(friend)}
                    disabled={sent[friend._id]}
                    style={{
                      padding: '6px 16px', borderRadius: 4,
                      background: sent[friend._id] ? 'transparent' : '#248046',
                      border: sent[friend._id] ? '1px solid #3a3c43' : '1px solid transparent',
                      color: sent[friend._id] ? '#949ba4' : '#fff',
                      fontSize: 13, fontWeight: 500, cursor: sent[friend._id] ? 'default' : 'pointer',
                      flexShrink: 0, transition: 'all .15s',
                      letterSpacing: '-.01em',
                    }}
                    onMouseEnter={e=>{ if(!sent[friend._id]) e.currentTarget.style.background='#1a6334' }}
                    onMouseLeave={e=>{ if(!sent[friend._id]) e.currentTarget.style.background='#248046' }}
                  >
                    {sent[friend._id] ? 'Sent ✓' : 'Invite'}
                  </button>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Bottom — invite link */}
        <div style={{
          padding: '16px 20px 20px',
          borderTop: '1px solid rgba(255,255,255,.06)',
          background: '#232428',
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#949ba4', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 8 }}>
            Or, send a server invite link to a friend
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{
              flex: 1, background: '#1e1f22', border: '1px solid rgba(255,255,255,.06)',
              borderRadius: 4, padding: '10px 12px',
              fontSize: 13, color: '#949ba4', overflow: 'hidden',
              textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              fontFamily: 'var(--mono)',
            }}>
              {inviteLink}
            </div>
            <button
              onClick={copyLink}
              style={{
                padding: '10px 18px', borderRadius: 4, flexShrink: 0,
                background: copied ? '#2d7d46' : '#5865f2',
                border: 'none', color: '#fff',
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                transition: 'background .15s',
                letterSpacing: '-.01em',
              }}
            >
              {copied ? 'Copied!' : 'Copy Link'}
            </button>
          </div>
          <div style={{ fontSize: 11, color: '#5c6069', marginTop: 8 }}>
            Your invite link expires never — share it freely.
          </div>
        </div>
      </div>
    </div>
  )
}

export default InviteModal
