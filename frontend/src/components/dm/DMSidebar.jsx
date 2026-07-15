import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getSocket } from '../../utils/socket'
import api from '../../utils/api'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
const toUrl = p => p ? (p.startsWith('http') ? p : `${API_URL}/${p.replace(/^\//, '')}`) : null

const Av = ({ user, size = 32 }) => (
  <div style={{ position: 'relative', flexShrink: 0 }}>
    <div className="av" style={{
      width: size, height: size, fontSize: Math.round(size * .32),
      background: user?.bannerColor ? `${user.bannerColor}1a` : 'var(--a-lo)',
      borderColor: user?.bannerColor ? `${user.bannerColor}3a` : 'var(--bm)',
      color: user?.bannerColor || 'var(--a)',
    }}>
      {user?.avatar ? <img src={toUrl(user.avatar)} alt=""  onError={e=>e.target.style.display="none"}/> : user?.username?.slice(0, 2).toUpperCase()}
    </div>
    <div className={`sdot ${user?.status || 'offline'}`} style={{ borderColor: 'var(--s2)' }} />
  </div>
)

const DMSidebar = ({ activeConversationId, onSelectConversation }) => {
  const { user }  = useAuth()
  const navigate  = useNavigate()
  const [convos,   setConvos]   = useState([])
  const [q,        setQ]        = useState('')
  const [results,  setResults]  = useState([])
  const [unread,   setUnread]   = useState({})

  const load = useCallback(async () => {
    try { const r = await api.get('/dm'); setConvos(r.data) } catch {}
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const s = getSocket(); if (!s) return
    const onNotif = ({ conversationId }) => {
      setUnread(p => ({ ...p, [conversationId]: (p[conversationId] || 0) + 1 }))
      load()
    }
    s.on('dm:notification', onNotif)
    return () => s.off('dm:notification', onNotif)
  }, [load])

  useEffect(() => {
    if (!q.trim()) { setResults([]); return }
    const t = setTimeout(async () => {
      try { const r = await api.get(`/users/search?q=${encodeURIComponent(q)}`); setResults(r.data) } catch {}
    }, 280)
    return () => clearTimeout(t)
  }, [q])

  const openDM = async (userId) => {
    try {
      const r = await api.post(`/dm/open/${userId}`)
      setQ(''); setResults([])
      load()
      onSelectConversation(r.data)
      navigate(`/dm/${r.data._id}`)
    } catch {}
  }

  const getPartner = (c) => {
    if (c.isBotDM && c.botInfo) return { ...c.botInfo, username: c.botInfo.name, isBot: true }
    return c.participants?.find(p => (p._id || p) !== user?._id && (p._id || p).toString() !== user?._id?.toString())
  }

  return (
    <div className="dmsb">
      <div className="dmsb-head">
        <div style={{ position: 'relative' }}>
          <div className="dmsb-search-wrap">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--t2)" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input className="dmsb-search" value={q} onChange={e => setQ(e.target.value)} placeholder="Find or start a DM…" />
            {q && <button onClick={() => { setQ(''); setResults([]) }} style={{ color: 'var(--t2)', fontSize: 13 }}>✕</button>}
          </div>
          {results.length > 0 && (
            <div className="search-drop" style={{ top: '100%', left: 0, right: 0, marginTop: 2 }}>
              {results.map(u => (
                <div key={u._id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', cursor: 'pointer', transition: 'background .1s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--s3)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  onClick={() => openDM(u._id)}
                >
                  <Av user={u} size={26} />
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--t0)' }}>{u.username}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="dmsb-label">Direct Messages</div>

      <div className="dmsb-list">
        {convos.length === 0 && (
          <div style={{ padding: '32px 12px', textAlign: 'center', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--t2)' }}>
            — no conversations yet —
          </div>
        )}
        {convos.map(c => {
          const o = getPartner(c); if (!o) return null
          const isActive = c._id === activeConversationId
          const badge = unread[c._id] || 0
          return (
            <div
              key={c._id}
              className={`dmsb-row${isActive ? ' active' : ''}`}
              onClick={() => {
                onSelectConversation(c)
                setUnread(p => { const n = { ...p }; delete n[c._id]; return n })
                navigate(`/dm/${c._id}`)
              }}
            >
              {o.isBot ? (
                <div style={{ width:30, height:30, borderRadius:'50%', background:'rgba(88,101,242,.2)', border:'1px solid rgba(88,101,242,.3)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--mono)', fontSize:10, fontWeight:700, color:'#7289da', overflow:'hidden', flexShrink:0 }}>
                  {toUrl(o.avatar) ? <img src={toUrl(o.avatar)} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/> : (o.name||'B').slice(0,2).toUpperCase()}
                </div>
              ) : (
                <Av user={o} size={30} />
              )}
              <div className="dmsb-row-info">
                <div className="dmsb-row-name" style={{ display:'flex', alignItems:'center', gap:5 }}>
                  {o.username || o.name}
                  {o.isBot && <span style={{ fontSize:8, fontFamily:'var(--mono)', fontWeight:700, background:'rgba(88,101,242,.25)', color:'#7289da', padding:'1px 4px', borderRadius:3, border:'1px solid rgba(88,101,242,.3)', letterSpacing:'.05em' }}>BOT</span>}
                </div>
                {c.lastMessage && (
                  <div className="dmsb-row-last">{c.lastMessage.content}</div>
                )}
              </div>
              {badge > 0 && <span className="dmsb-badge">{badge}</span>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default DMSidebar