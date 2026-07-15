/**
 * TopBar — icon bar in the top-right corner of the screen
 * Friends · Messages · Notifications · Profile
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth }     from '../../context/AuthContext'
import api             from '../../utils/api'
import { getSocket }   from '../../utils/socket'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
const toUrl = p => p ? (p.startsWith('http') ? p : `${API_URL}/${p.replace(/^\//, '')}`) : null

const STATUS_COLOR = { online:'#23a55a', idle:'#f0b232', dnd:'#f23f43', offline:'#80848e' }

/* ── tiny avatar ── */
const Av = ({ src, name, size=32, status=null, isBot=false, color='var(--a)', bg='var(--a-lo)' }) => (
  <div style={{ position:'relative', flexShrink:0 }}>
    <div style={{
      width:size, height:size, borderRadius:'50%',
      background: isBot ? 'rgba(88,101,242,.2)' : (toUrl(src) ? 'transparent' : bg),
      border:`1.5px solid ${isBot ? 'rgba(88,101,242,.4)' : 'var(--bm)'}`,
      display:'flex', alignItems:'center', justifyContent:'center',
      fontFamily:'var(--mono)', fontSize:Math.round(size*.32), fontWeight:700,
      color: isBot ? '#7289da' : color, overflow:'hidden',
    }}>
      {toUrl(src)
        ? <img src={toUrl(src)} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}} onError={e=>e.target.style.display='none'}/>
        : (name||'?').slice(0,2).toUpperCase()
      }
    </div>
    {status && <div style={{ position:'absolute', bottom:-1, right:-1, width:9, height:9, borderRadius:'50%', background:STATUS_COLOR[status]||STATUS_COLOR.offline, border:'2px solid var(--s2)' }}/>}
  </div>
)

/* ══════════════ PANELS ══════════════ */

/* ── Friends panel ── */
const FriendsPanel = ({ onClose }) => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [friends,  setFriends]  = useState([])
  const [requests, setRequests] = useState([])
  const [q, setQ] = useState('')

  useEffect(() => {
    if (!user) return
    api.get('/friends').then(r=>setFriends(r.data)).catch(()=>{})
    api.get('/friends/requests').then(r=>setRequests(r.data.filter(x=>x.status==='pending'))).catch(()=>{})
  }, [user])

  const filtered = friends.filter(f => !q || f.username.toLowerCase().includes(q.toLowerCase()))

  return (
    <div style={panelStyle}>
      <div style={panelHeader}>
        <span style={panelTitle}>Friends</span>
        <div style={{display:'flex',gap:6}}>
          <button style={iconBtn} title="New Group" onClick={()=>{navigate('/dm');onClose()}}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
          </button>
          <button style={iconBtn} title="Add Friend">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
          </button>
        </div>
      </div>

      <div style={{padding:'8px 12px'}}>
        <div style={{display:'flex',alignItems:'center',gap:8,background:'var(--s1)',border:'1px solid var(--b)',borderRadius:'var(--r2)',padding:'7px 11px'}}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--t2)" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search friends" style={{flex:1,background:'none',border:'none',outline:'none',fontFamily:'var(--mono)',fontSize:12,color:'var(--t0)'}}/>
        </div>
      </div>

      {requests.length > 0 && (
        <div style={{padding:'4px 12px 0'}}>
          <div style={{fontFamily:'var(--mono)',fontSize:10,fontWeight:700,color:'var(--t2)',letterSpacing:'.08em',textTransform:'uppercase',marginBottom:6}}>
            Requests · {requests.length}
          </div>
          {requests.slice(0,3).map(r => (
            <div key={r._id} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 4px'}}>
              <Av src={r.from?.avatar} name={r.from?.username} size={28}/>
              <span style={{flex:1,fontFamily:'var(--mono)',fontSize:12,color:'var(--t0)'}}>{r.from?.username}</span>
              <button onClick={()=>api.post(`/friends/accept/${r._id}`).then(()=>setRequests(p=>p.filter(x=>x._id!==r._id)))} style={{...smallBtn,'--c':'#23a55a'}}>✓</button>
              <button onClick={()=>api.post(`/friends/decline/${r._id}`).then(()=>setRequests(p=>p.filter(x=>x._id!==r._id)))} style={{...smallBtn,'--c':'var(--err)'}}>✕</button>
            </div>
          ))}
          <div style={{height:1,background:'var(--b)',margin:'8px 0'}}/>
        </div>
      )}

      <div style={{flex:1,overflowY:'auto',padding:'4px 12px 12px'}}>
        <div style={{fontFamily:'var(--mono)',fontSize:10,fontWeight:700,color:'var(--t2)',letterSpacing:'.08em',textTransform:'uppercase',marginBottom:6}}>
          Friends ({filtered.length})
        </div>
        {filtered.length === 0
          ? <div style={{fontFamily:'var(--mono)',fontSize:11,color:'var(--t2)',textAlign:'center',padding:'24px 0'}}>— no friends yet —</div>
          : filtered.map(f => (
            <div key={f._id} style={{display:'flex',alignItems:'center',gap:9,padding:'7px 6px',borderRadius:'var(--r2)',cursor:'pointer',transition:'background .1s'}}
              onMouseEnter={e=>e.currentTarget.style.background='var(--s3)'}
              onMouseLeave={e=>e.currentTarget.style.background='transparent'}
              onClick={()=>{api.post(`/dm/open/${f._id}`).then(r=>navigate(`/dm/${r.data._id}`));onClose()}}
            >
              <Av src={f.avatar} name={f.username} size={32} status={f.status}/>
              <div>
                <div style={{fontFamily:'var(--mono)',fontSize:13,fontWeight:600,color:'var(--t0)'}}>{f.username}</div>
                <div style={{fontFamily:'var(--mono)',fontSize:10,color:STATUS_COLOR[f.status]||STATUS_COLOR.offline}}>{f.status||'offline'}</div>
              </div>
            </div>
          ))
        }
      </div>
    </div>
  )
}

/* ── Messages panel ── */
const MessagesPanel = ({ onClose }) => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [view,    setView]    = useState('list') // 'list' | 'new'
  const [convos,  setConvos]  = useState([])
  const [q,       setQ]       = useState('')
  const [results, setResults] = useState([])
  const [unread,  setUnread]  = useState({})

  useEffect(() => {
    if (!user) return
    api.get('/dm').then(r=>setConvos(r.data)).catch(()=>{})
  }, [user])

  useEffect(() => {
    const s = getSocket(); if (!s) return
    const h = ({conversationId}) => setUnread(p=>({...p,[conversationId]:(p[conversationId]||0)+1}))
    s.on('dm:notification', h)
    return () => s.off('dm:notification', h)
  }, [])

  useEffect(() => {
    if (!q.trim()) { setResults([]); return }
    const t = setTimeout(()=>api.get(`/users/search?q=${encodeURIComponent(q)}`).then(r=>setResults(r.data)).catch(()=>{}), 280)
    return ()=>clearTimeout(t)
  }, [q])

  const openDM = async (userId) => {
    try { const r = await api.post(`/dm/open/${userId}`); navigate(`/dm/${r.data._id}`); onClose() } catch {}
  }

  /* new DM view */
  if (view === 'new') return (
    <div style={panelStyle}>
      <div style={{...panelHeader, gap:8}}>
        <button onClick={()=>setView('list')} style={{background:'none',border:'1px solid var(--b)',borderRadius:'50%',width:26,height:26,cursor:'pointer',color:'var(--t1)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <span style={panelTitle}>Create direct message</span>
      </div>
      <div style={{padding:'12px'}}>
        <input autoFocus value={q} onChange={e=>setQ(e.target.value)} placeholder="Type username" style={{width:'100%',boxSizing:'border-box',background:'var(--s1)',border:'1px solid var(--b)',borderRadius:'var(--r2)',padding:'9px 12px',fontFamily:'var(--mono)',fontSize:12,color:'var(--t0)',outline:'none'}}/>
      </div>
      <div style={{flex:1,overflowY:'auto',padding:'0 12px'}}>
        {results.length === 0 && q.trim() === '' && (
          <div style={{textAlign:'center',padding:'40px 16px'}}>
            <div style={{width:64,height:64,borderRadius:16,background:'linear-gradient(135deg,#5865f2,#7289da)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 14px',boxShadow:'0 4px 20px rgba(88,101,242,.4)'}}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="white"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16" stroke="none"/><path d="M12 7v.01M12 11v6" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none"/></svg>
            </div>
            <div style={{fontFamily:'var(--mono)',fontSize:14,fontWeight:700,color:'var(--t0)',marginBottom:6}}>No friends found</div>
            <div style={{fontFamily:'var(--mono)',fontSize:11,color:'var(--t2)'}}>Connect with others to expand your network</div>
          </div>
        )}
        {results.map(u => (
          <div key={u._id} onClick={()=>openDM(u._id)} style={{display:'flex',alignItems:'center',gap:9,padding:'8px 6px',borderRadius:'var(--r2)',cursor:'pointer',transition:'background .1s'}}
            onMouseEnter={e=>e.currentTarget.style.background='var(--s3)'}
            onMouseLeave={e=>e.currentTarget.style.background='transparent'}
          >
            <Av src={u.avatar} name={u.username} size={30} status={u.status}/>
            <span style={{fontFamily:'var(--mono)',fontSize:13,fontWeight:600,color:'var(--t0)'}}>{u.username}</span>
          </div>
        ))}
      </div>
      <div style={{padding:'12px',borderTop:'1px solid var(--b)'}}>
        <button onClick={()=>results.length>0&&openDM(results[0]._id)} style={{width:'100%',padding:'10px',borderRadius:'var(--r2)',background:results.length>0?'var(--a)':'var(--s4)',border:'none',cursor:results.length>0?'pointer':'default',fontFamily:'var(--mono)',fontSize:13,fontWeight:700,color:results.length>0?'#fff':'var(--t2)',transition:'background .12s'}}>
          Create
        </button>
      </div>
    </div>
  )

  /* list view */
  return (
    <div style={panelStyle}>
      <div style={panelHeader}>
        <span style={panelTitle}>Messages</span>
        <button style={iconBtn} onClick={()=>setView('new')} title="New message">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>
      </div>
      <div style={{flex:1,overflowY:'auto',padding:'6px 8px'}}>
        {convos.length === 0
          ? <div style={{textAlign:'center',padding:'32px 16px',fontFamily:'var(--mono)',fontSize:11,color:'var(--t2)'}}>No conversations yet</div>
          : convos.map(c => {
            const partner = c.isBotDM && c.botInfo
              ? {username:c.botInfo.name, avatar:c.botInfo.avatar, status:c.botInfo.online?'online':'offline', isBot:true}
              : c.participants?.find(p=>p._id!==user?._id)
            if (!partner) return null
            const u = unread[c._id] || 0
            return (
              <div key={c._id} onClick={()=>{navigate(`/dm/${c._id}`);onClose()}} style={{display:'flex',alignItems:'center',gap:9,padding:'8px 8px',borderRadius:'var(--r2)',cursor:'pointer',transition:'background .1s'}}
                onMouseEnter={e=>e.currentTarget.style.background='var(--s3)'}
                onMouseLeave={e=>e.currentTarget.style.background='transparent'}
              >
                <Av src={partner.avatar} name={partner.username} size={32} status={partner.status} isBot={partner.isBot}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:'flex',alignItems:'center',gap:6}}>
                    <span style={{fontFamily:'var(--mono)',fontSize:13,fontWeight:600,color:'var(--t0)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{partner.username}</span>
                    {partner.isBot && <span style={{fontSize:7,fontFamily:'var(--mono)',fontWeight:700,background:'rgba(88,101,242,.25)',color:'#7289da',padding:'1px 4px',borderRadius:3,border:'1px solid rgba(88,101,242,.3)'}}>BOT</span>}
                  </div>
                  {c.lastMessage?.content && <div style={{fontFamily:'var(--mono)',fontSize:11,color:'var(--t2)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.lastMessage.content.slice(0,36)}</div>}
                </div>
                {u>0 && <span style={{background:'var(--err)',color:'#fff',fontFamily:'var(--mono)',fontSize:8,fontWeight:800,padding:'1px 5px',borderRadius:8}}>{u}</span>}
              </div>
            )
          })
        }
      </div>
    </div>
  )
}

/* ── Profile panel ── */
const ProfilePanel = ({ onClose }) => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [status, setStatus] = useState(user?.status || 'online')
  const [showStatusDrop, setShowStatusDrop] = useState(false)

  const STATUS_OPTS = [
    { key:'online',  icon:'🟢', label:'Online'          },
    { key:'idle',    icon:'🟡', label:'Away'             },
    { key:'dnd',     icon:'🔴', label:'Do Not Disturb'  },
    { key:'offline', icon:'⚫', label:'Invisible'        },
  ]

  const changeStatus = async (s) => {
    setStatus(s); setShowStatusDrop(false)
    await api.put('/users/me', { status: s }).catch(()=>{})
    getSocket()?.emit('status:change', s)
  }

  const cur = STATUS_OPTS.find(o=>o.key===status) || STATUS_OPTS[0]

  return (
    <div style={panelStyle}>
      {/* Avatar + name */}
      <div style={{display:'flex',flexDirection:'column',alignItems:'center',padding:'28px 16px 16px',gap:10}}>
        <div style={{position:'relative'}}>
          <Av src={user?.avatar} name={user?.username} size={68} status={status}/>
        </div>
        <div style={{fontFamily:'var(--mono)',fontSize:15,fontWeight:700,color:'var(--t0)'}}>{user?.username}</div>
        <button style={{background:'var(--s3)',border:'1px solid var(--b)',borderRadius:20,padding:'4px 14px',fontFamily:'var(--mono)',fontSize:11,color:'var(--t2)',cursor:'pointer'}}>
          Set a status
        </button>
      </div>

      <div style={{padding:'0 12px',display:'flex',flexDirection:'column',gap:6}}>
        {/* Status selector */}
        <div style={{position:'relative'}}>
          <button
            onClick={()=>setShowStatusDrop(p=>!p)}
            style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',background:'var(--s3)',border:'1px solid var(--b)',borderRadius:'var(--r2)',cursor:'pointer',fontFamily:'var(--mono)',fontSize:12,color:'var(--t0)'}}
          >
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <span style={{width:8,height:8,borderRadius:'50%',background:STATUS_COLOR[status],display:'inline-block'}}/>
              {cur.label}
            </div>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          {showStatusDrop && (
            <div style={{position:'absolute',top:'calc(100% + 4px)',left:0,right:0,background:'var(--s3)',border:'1px solid var(--bm)',borderRadius:'var(--r2)',overflow:'hidden',zIndex:10,boxShadow:'0 8px 24px rgba(0,0,0,.5)'}}>
              {STATUS_OPTS.map(o=>(
                <button key={o.key} onClick={()=>changeStatus(o.key)} style={{width:'100%',display:'flex',alignItems:'center',gap:9,padding:'9px 14px',background:status===o.key?'var(--a-lo)':'none',border:'none',cursor:'pointer',fontFamily:'var(--mono)',fontSize:12,color:status===o.key?'var(--a)':'var(--t1)',textAlign:'left',transition:'background .08s'}}
                  onMouseEnter={e=>{if(status!==o.key)e.currentTarget.style.background='var(--s4)'}}
                  onMouseLeave={e=>{if(status!==o.key)e.currentTarget.style.background='none'}}
                >
                  <span style={{width:8,height:8,borderRadius:'50%',background:STATUS_COLOR[o.key],display:'inline-block'}}/>
                  {o.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Settings */}
        <button onClick={()=>{navigate('/profile');onClose()}} style={menuItem}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          Settings
        </button>

        {/* Support */}
        <button style={menuItem}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          Support
        </button>
      </div>

      <div style={{flex:1}}/>

      {/* Sign out */}
      <div style={{padding:'12px',borderTop:'1px solid var(--b)'}}>
        <button onClick={()=>{logout();onClose()}} style={{...menuItem,color:'var(--err)',width:'100%',justifyContent:'flex-start'}}
          onMouseEnter={e=>e.currentTarget.style.background='rgba(242,63,67,.1)'}
          onMouseLeave={e=>e.currentTarget.style.background='transparent'}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          Sign out
        </button>
      </div>
    </div>
  )
}

/* ── shared styles ── */
const panelStyle = {
  width: 300,
  maxHeight: 480,
  background: 'var(--s2)',
  border: '1px solid var(--bm)',
  borderRadius: 'var(--r4)',
  boxShadow: '0 16px 48px rgba(0,0,0,.65)',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  animation: 'tb-drop .15s ease',
}
const panelHeader = {
  height: 46,
  borderBottom: '1px solid var(--b)',
  padding: '0 14px',
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  flexShrink: 0,
}
const panelTitle = {
  fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 700, color: 'var(--t0)',
}
const iconBtn = {
  background: 'none', border: '1px solid var(--b)', borderRadius: 'var(--r1)',
  width: 28, height: 28, cursor: 'pointer', color: 'var(--t2)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  transition: 'all .1s',
}
const smallBtn = {
  background: 'none', border: 'none', cursor: 'pointer',
  color: 'var(--c,var(--t1))', fontFamily: 'var(--mono)', fontSize: 14,
  width: 24, height: 24, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center',
}
const menuItem = {
  display: 'flex', alignItems: 'center', gap: 10,
  width: '100%', padding: '10px 12px',
  background: 'var(--s3)', border: '1px solid var(--b)',
  borderRadius: 'var(--r2)', cursor: 'pointer',
  fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--t1)',
  transition: 'all .1s', textAlign: 'left',
}

/* ══════════════ TOP BAR ══════════════ */
const TopBar = () => {
  const { user }   = useAuth()
  const [open, setOpen] = useState(null) // 'friends' | 'messages' | 'notifs' | 'profile'
  const barRef     = useRef(null)

  // close on outside click
  useEffect(() => {
    const h = e => { if (barRef.current && !barRef.current.contains(e.target)) setOpen(null) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const toggle = key => setOpen(p => p === key ? null : key)

  const BTNS = [
    {
      key: 'friends',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      ),
    },
    {
      key: 'messages',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      ),
    },
    {
      key: 'notifs',
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
      ),
    },
  ]

  return (
    <>
      <style>{`
        @keyframes tb-drop { from{opacity:0;transform:translateY(-8px) scale(.97)} to{opacity:1;transform:none} }
        .tb-btn { background:none; border:none; cursor:pointer; color:var(--t2); display:flex; align-items:center; justify-content:center; width:32px; height:32px; border-radius:var(--r2); transition:all .12s; position:relative; }
        .tb-btn:hover { color:var(--t0); background:var(--s4); }
        .tb-btn.active { color:var(--a); }
        .tb-btn.active::after { content:''; position:absolute; bottom:-4px; left:50%; transform:translateX(-50%); width:18px; height:2px; border-radius:2px; background:var(--a); }
      `}</style>

      <div
        ref={barRef}
        style={{
          position: 'fixed', top: 10, right: 16, zIndex: 2000,
          display: 'flex', alignItems: 'center', gap: 2,
          background: 'var(--s2)',
          border: '1px solid var(--bm)',
          borderRadius: 24,
          padding: '5px 8px',
          boxShadow: '0 4px 20px rgba(0,0,0,.45)',
        }}
      >
        {BTNS.map(b => (
          <button
            key={b.key}
            className={`tb-btn${open===b.key?' active':''}`}
            onClick={() => toggle(b.key)}
            title={b.key}
          >
            {b.icon}
          </button>
        ))}

        <div style={{width:1,height:20,background:'var(--b)',margin:'0 4px'}}/>

        {/* Profile avatar */}
        <button
          className={`tb-btn${open==='profile'?' active':''}`}
          onClick={() => toggle('profile')}
          style={{width:32,height:32,borderRadius:'50%',padding:0,overflow:'hidden',border:`2px solid ${open==='profile'?'var(--a)':'var(--bm)'}`}}
          title="Profile"
        >
          {toUrl(user?.avatar)
            ? <img src={toUrl(user.avatar)} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}} onError={e=>e.target.style.display='none'}/>
            : <div style={{width:'100%',height:'100%',background:'var(--a-lo)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'var(--mono)',fontSize:11,fontWeight:700,color:'var(--a)'}}>{user?.username?.slice(0,2).toUpperCase()}</div>
          }
          {/* status dot */}
          <div style={{position:'absolute',bottom:0,right:0,width:9,height:9,borderRadius:'50%',background:STATUS_COLOR[user?.status]||STATUS_COLOR.offline,border:'2px solid var(--s2)'}}/>
        </button>

        {/* Dropdown panel */}
        {open && (
          <div style={{ position:'absolute', top:'calc(100% + 10px)', right:0 }}>
            {open === 'friends'  && <FriendsPanel  onClose={()=>setOpen(null)}/>}
            {open === 'messages' && <MessagesPanel onClose={()=>setOpen(null)}/>}
            {open === 'notifs'   && (
              <div style={panelStyle}>
                <div style={panelHeader}><span style={panelTitle}>Notifications</span></div>
                <div style={{padding:'32px',textAlign:'center',fontFamily:'var(--mono)',fontSize:11,color:'var(--t2)'}}>No new notifications</div>
              </div>
            )}
            {open === 'profile'  && <ProfilePanel onClose={()=>setOpen(null)}/>}
          </div>
        )}
      </div>
    </>
  )
}

export default TopBar