/**
 * FloatingDMPanel — floats on the right side across all pages
 * States: closed → open (full list) → mini (compact bar)
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth }      from '../../context/AuthContext'
import { useDM }        from '../../context/DMContext'
import { getSocket }    from '../../utils/socket'
import api              from '../../utils/api'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
const toUrl = p => p ? (p.startsWith('http') ? p : `${API_URL}/${p.replace(/^\//, '')}`) : null

/* ── Avatar ─────────────────────────────────────────────── */
const Av = ({ src, name, size = 32, color = 'var(--a)', bg = 'var(--a-lo)', border = 'var(--bm)', status = null, isBot = false }) => (
  <div style={{ position:'relative', flexShrink:0 }}>
    <div style={{
      width:size, height:size, borderRadius:'50%',
      background: isBot ? 'rgba(88,101,242,.2)' : bg,
      border:`1px solid ${isBot ? 'rgba(88,101,242,.35)' : border}`,
      display:'flex', alignItems:'center', justifyContent:'center',
      fontFamily:'var(--mono)', fontSize:Math.round(size*.32), fontWeight:700,
      color: isBot ? '#7289da' : color,
      overflow:'hidden', flexShrink:0,
    }}>
      {toUrl(src)
        ? <img src={toUrl(src)} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={e=>e.target.style.display='none'}/>
        : (name||'?').slice(0,2).toUpperCase()
      }
    </div>
    {status !== null && (
      <div style={{
        position:'absolute', bottom:-1, right:-1,
        width:9, height:9, borderRadius:'50%',
        background: status==='online' ? '#23a55a' : status==='idle' ? '#f0b232' : status==='dnd' ? '#f23f43' : '#80848e',
        border:'2px solid var(--s2)',
      }}/>
    )}
  </div>
)

/* ── Single convo row ───────────────────────────────────── */
const ConvoRow = ({ convo, active, unread, onClick, onClose }) => {
  const { user } = useAuth()
  const partner  = convo.isBotDM && convo.botInfo
    ? { username: convo.botInfo.name, avatar: convo.botInfo.avatar, status: convo.botInfo.online ? 'online' : 'offline', isBot: true }
    : convo.participants?.find(p => p._id !== user?._id)
  if (!partner) return null

  const lastMsg = convo.lastMessage?.content || ''
  const isBot   = partner.isBot

  return (
    <div
      onClick={onClick}
      style={{
        display:'flex', alignItems:'center', gap:9,
        padding:'7px 10px', margin:'1px 6px', borderRadius:'var(--r2)',
        background: active ? 'var(--s4)' : 'transparent',
        border:`1px solid ${active ? 'var(--bm)' : 'transparent'}`,
        cursor:'pointer', transition:'all .1s', position:'relative',
      }}
      onMouseEnter={e => { if (!active) { e.currentTarget.style.background='var(--s3)'; e.currentTarget.style.borderColor='var(--b)' }}}
      onMouseLeave={e => { if (!active) { e.currentTarget.style.background='transparent'; e.currentTarget.style.borderColor='transparent' }}}
    >
      <Av
        src={partner.avatar}
        name={partner.username}
        size={30}
        status={isBot ? (partner.status === 'online' ? 'online' : 'offline') : (partner.status || 'offline')}
        isBot={isBot}
      />
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:5 }}>
          <span style={{ fontSize:13, fontWeight:600, color:'var(--t0)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1 }}>
            {partner.username}
          </span>
          {isBot && (
            <span style={{ fontSize:7, fontFamily:'var(--mono)', fontWeight:700, background:'rgba(88,101,242,.25)', color:'#7289da', padding:'1px 4px', borderRadius:3, border:'1px solid rgba(88,101,242,.3)', letterSpacing:'.04em', flexShrink:0 }}>BOT</span>
          )}
          {unread > 0 && (
            <span style={{ background:'var(--err)', color:'#fff', fontFamily:'var(--mono)', fontSize:8, fontWeight:800, padding:'1px 5px', borderRadius:8, flexShrink:0 }}>{unread > 99 ? '99+' : unread}</span>
          )}
        </div>
        {lastMsg && (
          <div style={{ fontSize:11, color:'var(--t2)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', marginTop:1 }}>
            {lastMsg.slice(0, 40)}{lastMsg.length > 40 ? '…' : ''}
          </div>
        )}
      </div>
      {/* close individual chat */}
      <button
        onClick={e => { e.stopPropagation(); onClose() }}
        style={{ opacity:0, position:'absolute', right:6, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'var(--t2)', fontSize:12, lineHeight:1, padding:'2px 4px', borderRadius:4, transition:'opacity .1s' }}
        className="fdm-close-btn"
      >✕</button>
    </div>
  )
}

/* ── Main panel ─────────────────────────────────────────── */
const FloatingDMPanel = () => {
  const { user }                        = useAuth()
  const { panelState, activeConvo, closePanel, miniPanel, openPanel, selectConvo } = useDM()
  const navigate                        = useNavigate()

  const [convos,    setConvos]    = useState([])
  const [unread,    setUnread]    = useState({})
  const [q,         setQ]         = useState('')
  const [results,   setResults]   = useState([])
  const [showSearch, setShowSearch] = useState(false)
  const searchRef   = useRef(null)

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

  // Clear unread when opening a convo
  useEffect(() => {
    if (activeConvo?._id) setUnread(p => ({ ...p, [activeConvo._id]: 0 }))
  }, [activeConvo?._id])

  // Search debounce
  useEffect(() => {
    if (!q.trim()) { setResults([]); return }
    const t = setTimeout(async () => {
      try { const r = await api.get(`/users/search?q=${encodeURIComponent(q)}`); setResults(r.data) } catch {}
    }, 280)
    return () => clearTimeout(t)
  }, [q])

  // Close search on outside click
  useEffect(() => {
    const h = e => { if (searchRef.current && !searchRef.current.contains(e.target)) { setShowSearch(false); setQ(''); setResults([]) }}
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const totalUnread = Object.values(unread).reduce((a, b) => a + b, 0)

  const openDM = async (userId) => {
    try {
      const r = await api.post(`/dm/open/${userId}`)
      setConvos(p => {
        const exists = p.find(c => c._id === r.data._id)
        return exists ? p : [r.data, ...p]
      })
      selectConvo(r.data)
      navigate(`/dm/${r.data._id}`)
      setShowSearch(false); setQ(''); setResults([])
    } catch {}
  }

  const removeConvo = (id) => {
    setConvos(p => p.filter(c => c._id !== id))
    if (activeConvo?._id === id) selectConvo(null)
  }

  if (panelState === 'closed') return null

  /* ─── MINI mode ─── compact pill at bottom-right */
  if (panelState === 'mini') {
    return (
      <div style={{
        position:'fixed', bottom:20, right:20, zIndex:1500,
        display:'flex', flexDirection:'column', alignItems:'flex-end', gap:8,
        animation:'fdm-in .2s ease',
      }}>
        <style>{`
          @keyframes fdm-in { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:none} }
          @keyframes fdm-slide { from{opacity:0;transform:translateX(18px)} to{opacity:1;transform:none} }
          .fdm-close-btn { opacity:0!important; }
          .fdm-row:hover .fdm-close-btn { opacity:1!important; }
        `}</style>

        {/* Active convo bubble if any */}
        {activeConvo && (() => {
          const partner = activeConvo.isBotDM && activeConvo.botInfo
            ? { username: activeConvo.botInfo.name, avatar: activeConvo.botInfo.avatar, isBot: true, status: activeConvo.botInfo.online ? 'online' : 'offline' }
            : activeConvo.participants?.find(p => p._id !== user?._id)
          return partner ? (
            <div
              onClick={() => { openPanel(activeConvo); navigate(`/dm/${activeConvo._id}`) }}
              style={{
                display:'flex', alignItems:'center', gap:8,
                background:'var(--s2)', border:'1px solid var(--bm)',
                borderRadius:24, padding:'6px 12px 6px 6px',
                boxShadow:'0 4px 20px rgba(0,0,0,.5)',
                cursor:'pointer', transition:'transform .12s',
                animation:'fdm-slide .2s ease',
              }}
              onMouseEnter={e=>e.currentTarget.style.transform='scale(1.03)'}
              onMouseLeave={e=>e.currentTarget.style.transform='none'}
            >
              <Av src={partner.avatar} name={partner.username} size={26} status={partner.status} isBot={partner.isBot}/>
              <span style={{ fontFamily:'var(--mono)', fontSize:12, fontWeight:600, color:'var(--t0)' }}>{partner.username}</span>
              {unread[activeConvo._id] > 0 && (
                <span style={{ background:'var(--err)', color:'#fff', fontFamily:'var(--mono)', fontSize:8, fontWeight:800, padding:'1px 5px', borderRadius:8 }}>{unread[activeConvo._id]}</span>
              )}
            </div>
          ) : null
        })()}

        {/* Main mini pill */}
        <div style={{
          display:'flex', alignItems:'center', gap:6,
          background:'var(--s2)', border:'1px solid var(--bm)',
          borderRadius:24, padding:'6px 10px',
          boxShadow:'0 4px 24px rgba(0,0,0,.55)',
        }}>
          {/* DM icon + unread */}
          <button
            onClick={() => openPanel()}
            style={{ display:'flex', alignItems:'center', gap:6, background:'none', border:'none', cursor:'pointer', padding:'2px 4px', borderRadius:12 }}
            title="Open DMs"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--a)" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            {totalUnread > 0 && (
              <span style={{ background:'var(--err)', color:'#fff', fontFamily:'var(--mono)', fontSize:8, fontWeight:800, padding:'1px 5px', borderRadius:8 }}>{totalUnread}</span>
            )}
            <span style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--t1)' }}>DMs</span>
          </button>

          <div style={{ width:1, height:16, background:'var(--b)' }}/>

          <button onClick={closePanel} title="Close" style={{ background:'none', border:'none', cursor:'pointer', color:'var(--t2)', fontSize:13, lineHeight:1, padding:'2px 2px' }}>✕</button>
        </div>
      </div>
    )
  }

  /* ─── OPEN mode ─── full panel */
  return (
    <div style={{
      position:'fixed', right:0, top:0, bottom:0,
      width:260, zIndex:1400,
      background:'var(--s2)',
      borderLeft:'1px solid var(--bm)',
      display:'flex', flexDirection:'column',
      boxShadow:'-8px 0 32px rgba(0,0,0,.45)',
      animation:'fdm-slide .18s ease',
    }}>
      <style>{`
        @keyframes fdm-in    { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:none} }
        @keyframes fdm-slide { from{opacity:0;transform:translateX(18px)} to{opacity:1;transform:none} }
        .fdm-row:hover .fdm-close-btn { opacity:1!important; }
      `}</style>

      {/* Header */}
      <div style={{
        height:48, borderBottom:'1px solid var(--b)',
        display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'0 12px', flexShrink:0,
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:7 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--a)" strokeWidth="2.2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          <span style={{ fontFamily:'var(--mono)', fontSize:11, fontWeight:700, color:'var(--t0)', letterSpacing:'.06em', textTransform:'uppercase' }}>
            Direct Messages
          </span>
          {totalUnread > 0 && (
            <span style={{ background:'var(--err)', color:'#fff', fontFamily:'var(--mono)', fontSize:8, fontWeight:800, padding:'1px 5px', borderRadius:8 }}>{totalUnread}</span>
          )}
        </div>

        <div style={{ display:'flex', gap:4 }}>
          {/* New DM */}
          <button
            onClick={() => setShowSearch(p => !p)}
            title="New message"
            style={{ background:'none', border:'none', cursor:'pointer', color:'var(--t2)', padding:'4px', borderRadius:6, lineHeight:1, transition:'color .12s' }}
            onMouseEnter={e=>e.currentTarget.style.color='var(--t0)'}
            onMouseLeave={e=>e.currentTarget.style.color='var(--t2)'}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>

          {/* Minimize */}
          <button
            onClick={miniPanel}
            title="Minimize"
            style={{ background:'none', border:'none', cursor:'pointer', color:'var(--t2)', padding:'4px', borderRadius:6, lineHeight:1, transition:'color .12s' }}
            onMouseEnter={e=>e.currentTarget.style.color='var(--t0)'}
            onMouseLeave={e=>e.currentTarget.style.color='var(--t2)'}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>

          {/* Close */}
          <button
            onClick={closePanel}
            title="Close"
            style={{ background:'none', border:'none', cursor:'pointer', color:'var(--t2)', padding:'4px', borderRadius:6, lineHeight:1, transition:'color .12s' }}
            onMouseEnter={e=>e.currentTarget.style.color='var(--err)'}
            onMouseLeave={e=>e.currentTarget.style.color='var(--t2)'}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Search new DM */}
      {showSearch && (
        <div ref={searchRef} style={{ padding:'8px 10px', borderBottom:'1px solid var(--b)', flexShrink:0, background:'var(--s3)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:7, background:'var(--s1)', border:'1px solid var(--b)', borderRadius:'var(--r2)', padding:'6px 10px' }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--t2)" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              autoFocus
              value={q}
              onChange={e=>setQ(e.target.value)}
              placeholder="Find a user…"
              style={{ flex:1, background:'none', border:'none', outline:'none', fontFamily:'var(--mono)', fontSize:12, color:'var(--t0)' }}
            />
            {q && <button onClick={()=>{setQ('');setResults([])}} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--t2)', fontSize:12 }}>✕</button>}
          </div>
          {results.length > 0 && (
            <div style={{ marginTop:6, background:'var(--s2)', border:'1px solid var(--bm)', borderRadius:'var(--r2)', overflow:'hidden' }}>
              {results.map(u => (
                <div key={u._id} onClick={() => openDM(u._id)} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 10px', cursor:'pointer', transition:'background .1s' }}
                  onMouseEnter={e=>e.currentTarget.style.background='var(--s3)'}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}
                >
                  <Av src={u.avatar} name={u.username} size={26} status={u.status}/>
                  <span style={{ fontFamily:'var(--mono)', fontSize:12, color:'var(--t0)', fontWeight:600 }}>{u.username}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Convo list */}
      <div style={{ flex:1, overflowY:'auto', paddingTop:4 }}>
        {convos.length === 0 ? (
          <div style={{ padding:'32px 16px', textAlign:'center' }}>
            <div style={{ fontSize:28, marginBottom:8 }}>💬</div>
            <div style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--t2)' }}>No conversations yet</div>
          </div>
        ) : convos.map(c => (
          <div key={c._id} className="fdm-row" style={{ position:'relative' }}>
            <ConvoRow
              convo={c}
              active={activeConvo?._id === c._id}
              unread={unread[c._id] || 0}
              onClick={() => { selectConvo(c); navigate(`/dm/${c._id}`) }}
              onClose={() => removeConvo(c._id)}
            />
            <button
              className="fdm-close-btn"
              onClick={e => { e.stopPropagation(); removeConvo(c._id) }}
              style={{
                opacity:0, position:'absolute', right:10, top:'50%', transform:'translateY(-50%)',
                background:'none', border:'none', cursor:'pointer', color:'var(--t2)',
                fontSize:11, lineHeight:1, padding:'2px 4px', borderRadius:4,
                transition:'opacity .1s',
              }}
            >✕</button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default FloatingDMPanel