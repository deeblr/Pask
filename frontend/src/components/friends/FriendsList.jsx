import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDialog } from '../ui/Dialog'
import { useToast }  from '../ui/Toast'
import api from '../../utils/api'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
const toUrl = p => p ? (p.startsWith('http') ? p : `${API_URL}/${p.replace(/^\//, '')}`) : null

/* ── constants ──────────────────────────────────────────── */
const STATUS = {
  online:  { color: 'var(--ok)',   label: 'Online',          dim: false },
  idle:    { color: 'var(--warn)', label: 'Idle',            dim: false },
  dnd:     { color: 'var(--err)',  label: 'Do Not Disturb',  dim: false },
  offline: { color: 'var(--t2)',   label: 'Offline',         dim: true  },
}

const SORT = [
  { key: 'az',     label: 'A → Z' },
  { key: 'status', label: 'Status' },
  { key: 'recent', label: 'Recent' },
]

/* ── Avatar ─────────────────────────────────────────────── */
const Av = ({ user, size = 34, dimmed = false }) => (
  <div style={{ position: 'relative', flexShrink: 0, opacity: dimmed ? 0.45 : 1 }}>
    <div
      className="av"
      style={{
        width: size, height: size,
        fontSize: Math.round(size * .32),
        background: user?.bannerColor ? `${user.bannerColor}1a` : 'var(--a-lo)',
        borderColor: user?.bannerColor ? `${user.bannerColor}3a` : 'var(--bm)',
        color: user?.bannerColor || 'var(--a)',
        borderStyle: dimmed ? 'dashed' : 'solid',
      }}
    >
      {user?.avatar ? <img src={toUrl(user.avatar)} alt=""  onError={e=>e.target.style.display="none"}/> : user?.username?.slice(0, 2).toUpperCase()}
    </div>
    <div className={`sdot ${user?.status || 'offline'}`} style={{ borderColor: 'var(--s2)' }} />
  </div>
)

/* ── Status row helper ──────────────────────────────────── */
const StatusLine = ({ user, lastSeen }) => {
  const s = STATUS[user?.status] || STATUS.offline
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 1 }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
      <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: s.color }}>
        {s.label}
        {s.dim && lastSeen && (
          <span style={{ color: 'var(--t2)', marginLeft: 4 }}>· {lastSeen}</span>
        )}
      </span>
    </div>
  )
}

/* ── Profile card popup ─────────────────────────────────── */
const ProfileCard = ({ user, mutuals = 0, onClose, onMessage, onViewProfile, onRemove, onBlock }) => {
  const s = STATUS[user.status] || STATUS.offline
  return (
    <div className="pcard-overlay">
      <div className="pcard-bg" onClick={onClose} />
      <div className="pcard">
        <div className="pcard-banner" style={{ background: user.bannerColor || 'var(--a-lo)' }} />
        <div className="pcard-inner">
          <div className="pcard-av-row">
            <Av user={user} size={52} />
            <button className="modal-close" onClick={onClose} style={{ marginBottom: 4 }}>✕</button>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="pcard-username">{user.username}</div>
              {user.pronouns && <div className="pcard-pronouns">{user.pronouns}</div>}
            </div>
            {/* View full profile link */}
            <button
              onClick={onViewProfile}
              style={{
                fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--a)', background: 'none',
                border: 'none', cursor: 'pointer', padding: '2px 0', marginTop: 2, opacity: .7,
                textDecoration: 'underline', textUnderlineOffset: 2, whiteSpace: 'nowrap',
              }}
            >
              Full profile ↗
            </button>
          </div>

          <div className="pcard-status-row">
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.color, display: 'inline-block', flexShrink: 0 }} />
            <span style={{ color: s.color }}>{s.label}</span>
          </div>

          {/* Mutual servers badge */}
          {mutuals > 0 && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              background: 'var(--s3)', border: '1px solid var(--b)',
              borderRadius: 'var(--r1)', padding: '3px 8px', marginTop: 8,
              fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t2)',
            }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              {mutuals} mutual server{mutuals !== 1 ? 's' : ''}
            </div>
          )}

          {user.bio && (
            <div className="pcard-bio" style={{ marginTop: 10 }}>{user.bio}</div>
          )}

          <div className="pcard-since">
            Member since {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
          </div>

          <div className="pcard-btns">
            <button className="btn btn-sm btn-amber"  onClick={onMessage}>Message</button>
            <button className="btn btn-sm btn-ghost"  onClick={onRemove}>Remove</button>
            <button className="btn btn-sm btn-danger" onClick={onBlock}>Block</button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Context menu (··· button) ──────────────────────────── */
const ContextMenu = ({ x, y, onMessage, onProfile, onRemove, onBlock, onClose }) => {
  const ref = useRef(null)

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [onClose])

  const Item = ({ label, color, onClick, icon }) => (
    <button
      onClick={() => { onClick(); onClose() }}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        width: '100%', padding: '7px 12px',
        background: 'none', border: 'none', cursor: 'pointer',
        fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 500,
        color: color || 'var(--t1)',
        transition: 'background .08s',
        textAlign: 'left',
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--s4)'}
      onMouseLeave={e => e.currentTarget.style.background = 'none'}
    >
      <span style={{ opacity: .7, width: 14, textAlign: 'center' }}>{icon}</span>
      {label}
    </button>
  )

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed', zIndex: 1000,
        left: x, top: y,
        background: 'var(--s3)', border: '1px solid var(--bm)',
        borderRadius: 'var(--r3)', padding: '4px 0',
        minWidth: 160,
        boxShadow: '0 8px 28px rgba(0,0,0,.55)',
        animation: 'slide-up .1s ease',
      }}
    >
      <Item label="Send Message"    icon="💬" onClick={onMessage} />
      <Item label="View Profile"    icon="👤" onClick={onProfile}  />
      <div style={{ height: 1, background: 'var(--b)', margin: '3px 0' }} />
      <Item label="Remove Friend"   icon="✕"  onClick={onRemove}  color="var(--t2)" />
      <Item label="Block"           icon="🚫" onClick={onBlock}   color="var(--err)" />
    </div>
  )
}

/* ── Unread badge ───────────────────────────────────────── */
const UnreadBadge = ({ count }) =>
  count > 0 ? (
    <span style={{
      background: 'var(--err)', color: '#fff',
      fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 800,
      padding: '1px 5px', borderRadius: 8, flexShrink: 0,
    }}>
      {count > 99 ? '99+' : count}
    </span>
  ) : null

/* ── Main component ─────────────────────────────────────── */
const FriendsList = () => {
  const navigate    = useNavigate()
  const { confirm } = useDialog()
  const toast       = useToast()
  const dropRef     = useRef(null)

  const [tab,      setTab]      = useState('all')
  const [sort,     setSort]     = useState('az')
  const [friends,  setFriends]  = useState([])
  const [requests, setRequests] = useState([])
  const [blocked,  setBlocked]  = useState([])
  const [q,        setQ]        = useState('')
  const [results,  setResults]  = useState([])
  const [selected, setSelected] = useState(null)   // friend for profile card
  const [menu,     setMenu]     = useState(null)   // { user, x, y }
  const [unreadDMs, setUnreadDMs] = useState({})   // userId → count (placeholder)
  const [showFilter, setShowFilter] = useState(false)
  const filterRef   = useRef(null)

  const load = useCallback(async () => {
    const [f, r, b] = await Promise.all([
      api.get('/friends').catch(() => ({ data: [] })),
      api.get('/friends/requests').catch(() => ({ data: [] })),
      api.get('/friends/blocked').catch(() => ({ data: [] })),
    ])
    setFriends(f.data)
    setRequests(r.data.filter(x => x.status === 'pending'))
    setBlocked(b.data)
  }, [])

  useEffect(() => { load() }, [load])

  // Search debounce
  useEffect(() => {
    if (!q.trim()) { setResults([]); return }
    const t = setTimeout(async () => {
      try { const r = await api.get(`/users/search?q=${encodeURIComponent(q)}`); setResults(r.data) } catch {}
    }, 280)
    return () => clearTimeout(t)
  }, [q])

  // Close search dropdown on outside click
  useEffect(() => {
    const h = e => { if (dropRef.current && !dropRef.current.contains(e.target)) setResults([]) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  // Close filter dropdown on outside click
  useEffect(() => {
    const h = e => { if (filterRef.current && !filterRef.current.contains(e.target)) setShowFilter(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  /* ── actions ──────────────────────────────────────────── */
  const sendReq = async (userId) => {
    try { await api.post(`/friends/request/${userId}`); toast.success('Friend request sent!'); setQ(''); setResults([]) }
    catch (e) { toast.error(e.response?.data?.message || 'Failed') }
  }

  const accept = async (reqId) => {
    try { await api.post(`/friends/accept/${reqId}`); toast.success('Friend added!'); load() }
    catch { toast.error('Failed') }
  }

  const decline = async (reqId) => {
    try { await api.post(`/friends/decline/${reqId}`); setRequests(p => p.filter(r => r._id !== reqId)) }
    catch { toast.error('Failed') }
  }

  const remove = async (userId) => {
    const ok = await confirm({ title: 'Remove Friend', message: 'Remove this person from your friends list?', confirmLabel: 'Remove', danger: true })
    if (!ok) return
    try {
      await api.delete(`/friends/${userId}`)
      setFriends(p => p.filter(f => f._id !== userId))
      setSelected(null)
      toast.success('Friend removed')
    } catch { toast.error('Failed') }
  }

  const block = async (userId) => {
    const ok = await confirm({ title: 'Block User', message: "They won't be able to message you or send friend requests.", confirmLabel: 'Block', danger: true })
    if (!ok) return
    try {
      await api.post(`/friends/block/${userId}`)
      setFriends(p => p.filter(f => f._id !== userId))
      setSelected(null)
      load()
      toast.success('User blocked')
    } catch { toast.error('Failed') }
  }

  const unblock = async (userId) => {
    try { await api.delete(`/friends/block/${userId}`); setBlocked(p => p.filter(b => b._id !== userId)); toast.success('Unblocked') }
    catch { toast.error('Failed') }
  }

  const openDM = async (userId) => {
    try { const r = await api.post(`/dm/open/${userId}`); navigate(`/dm/${r.data._id}`) }
    catch { toast.error('Could not open DM') }
  }

  const openMenu = (e, user) => {
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    // flip left if near right edge
    const x = rect.right + 4 > window.innerWidth - 180
      ? rect.left - 168
      : rect.right + 4
    setMenu({ user, x, y: Math.min(rect.top, window.innerHeight - 180) })
  }

  /* ── sort + filter ────────────────────────────────────── */
  const applySort = (list) => {
    const copy = [...list]
    if (sort === 'az')     return copy.sort((a, b) => a.username.localeCompare(b.username))
    if (sort === 'status') {
      const order = { online: 0, idle: 1, dnd: 2, offline: 3 }
      return copy.sort((a, b) => (order[a.status] ?? 3) - (order[b.status] ?? 3))
    }
    return copy // 'recent' — keep server order (most recently added first if backend sorts)
  }

  const onlineCount = friends.filter(f => f.status === 'online').length

  const visible = applySort(
    friends
      .filter(f => tab === 'online' ? f.status === 'online' : true)
      .filter(f => !q || f.username.toLowerCase().includes(q.toLowerCase()))
  )

  /* ── render ───────────────────────────────────────────── */
  return (
    <div className="friends-wrap">
      {/* ── Header ── */}
      <div className="friends-top">
        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 0 }} ref={dropRef}>
          <div className="friends-search-wrap">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--t2)" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              className="friends-search"
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Find or add friend…"
            />
            {q && (
              <button
                onClick={() => { setQ(''); setResults([]) }}
                style={{ color: 'var(--t2)', fontSize: 13, lineHeight: 1, flexShrink: 0 }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Search dropdown */}
          {results.length > 0 && (
            <div className="search-drop" style={{ top: '100%', left: 0, right: 0, marginTop: 2 }}>
              {results.map(u => (
                <div key={u._id} className="search-drop-row">
                  <Av user={u} size={26} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--t0)', fontWeight: 600 }}>
                      {u.username}
                    </div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: STATUS[u.status]?.color || 'var(--t2)' }}>
                      {STATUS[u.status]?.label || 'Offline'}
                    </div>
                  </div>
                  <button className="btn btn-sm btn-amber" onClick={() => sendReq(u._id)}>Add</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Filter button */}
        <div style={{ position: 'relative' }}>
          <button
            className={`btn btn-sm${tab !== 'all' ? ' btn-amber' : ' btn-ghost'}`}
            style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, padding:'4px 10px' }}
            onClick={() => setShowFilter(p => !p)}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/>
            </svg>
            Filter
            {tab !== 'all' && (
              <span style={{ width:6, height:6, borderRadius:'50%', background:'var(--a)', flexShrink:0 }}/>
            )}
            {tab === 'requests' && requests.length > 0 && (
              <span style={{ background:'var(--err)', color:'#fff', fontFamily:'var(--mono)', fontSize:8, fontWeight:800, padding:'1px 4px', borderRadius:8 }}>{requests.length}</span>
            )}
          </button>

          {showFilter && (
            <div
              ref={filterRef}
              style={{
                position:'absolute', top:'calc(100% + 4px)', left:0, zIndex:500,
                background:'var(--s3)', border:'1px solid var(--bm)',
                borderRadius:'var(--r3)', padding:'4px 0',
                minWidth:160, boxShadow:'0 8px 28px rgba(0,0,0,.55)',
                animation:'slide-up .1s ease',
              }}
            >
              {[
                { key:'all',      icon:'👥', label:'All Friends',         count: friends.length },
                { key:'online',   icon:'🟢', label:'Online',              count: friends.filter(f=>f.status==='online').length },
                { key:'requests', icon:'📨', label:'Friend Requests',      count: requests.length },
                { key:'blocked',  icon:'🚫', label:'Blocked',             count: blocked.length },
              ].map(o => (
                <button
                  key={o.key}
                  onClick={() => { setTab(o.key); setShowFilter(false) }}
                  style={{
                    display:'flex', alignItems:'center', gap:9,
                    width:'100%', padding:'8px 12px',
                    background: tab === o.key ? 'var(--a-lo)' : 'none',
                    border:'none', cursor:'pointer',
                    fontFamily:'var(--mono)', fontSize:11, fontWeight: tab===o.key ? 700 : 500,
                    color: tab === o.key ? 'var(--a)' : 'var(--t1)',
                    textAlign:'left', transition:'background .08s',
                  }}
                  onMouseEnter={e => { if (tab!==o.key) e.currentTarget.style.background='var(--s4)' }}
                  onMouseLeave={e => { if (tab!==o.key) e.currentTarget.style.background='none' }}
                >
                  <span style={{ opacity:.75 }}>{o.icon}</span>
                  <span style={{ flex:1 }}>{o.label}</span>
                  {o.count > 0 && (
                    <span style={{ fontFamily:'var(--mono)', fontSize:9, background:'var(--s5)', color:'var(--t2)', padding:'1px 6px', borderRadius:10 }}>
                      {o.count}
                    </span>
                  )}
                  {tab===o.key && (
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="var(--a)"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Sort bar (only on all/online tabs) ── */}
      {(tab === 'all' || tab === 'online') && visible.length > 1 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '5px 12px',
          background: 'var(--s1)',
          borderBottom: '1px solid var(--b)',
          flexShrink: 0,
        }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t2)', letterSpacing: '.08em', textTransform: 'uppercase', marginRight: 2 }}>Sort</span>
          {SORT.map(s => (
            <button
              key={s.key}
              onClick={() => setSort(s.key)}
              style={{
                fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 600,
                padding: '2px 8px', borderRadius: 20,
                border: '1px solid',
                borderColor: sort === s.key ? 'var(--bh)' : 'var(--b)',
                background: sort === s.key ? 'var(--a-lo)' : 'transparent',
                color: sort === s.key ? 'var(--a)' : 'var(--t2)',
                cursor: 'pointer', transition: 'all .12s',
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      {/* ── List ── */}
      <div className="friends-list">
        {/* All / Online */}
        {(tab === 'all' || tab === 'online') && (
          visible.length === 0 ? (
            <div className="friends-empty">
              {tab === 'online' ? '— nobody online right now —' : '— no friends yet —'}
            </div>
          ) : visible.map(f => {
            const isOffline = !f.status || f.status === 'offline'
            const unread    = unreadDMs[f._id] || 0
            return (
              <div
                key={f._id}
                className="friend-row"
                style={{ opacity: isOffline ? .7 : 1 }}
                onClick={() => setSelected(f)}
              >
                <Av user={f} size={34} dimmed={isOffline} />

                <div className="friend-info">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className="friend-name">{f.username}</span>
                    <UnreadBadge count={unread} />
                  </div>
                  <StatusLine user={f} />
                </div>

                {/* Hover actions */}
                <div className="friend-actions" onClick={e => e.stopPropagation()}>
                  <button
                    className="btn btn-sm btn-amber"
                    onClick={() => openDM(f._id)}
                    title="Send message"
                  >
                    Msg
                  </button>
                  <button
                    className="btn btn-sm btn-ghost"
                    onClick={e => openMenu(e, f)}
                    title="More options"
                    style={{ padding: '3px 6px', letterSpacing: 2 }}
                  >
                    ···
                  </button>
                </div>
              </div>
            )
          })
        )}

        {/* Requests */}
        {tab === 'requests' && (
          requests.length === 0 ? (
            <div className="friends-empty">— no pending requests —</div>
          ) : requests.map(req => (
            <div
              key={req._id}
              className="friend-row"
              style={{ cursor: 'default', alignItems: 'flex-start', padding: '10px 12px', gap: 10 }}
            >
              <Av user={req.from} size={36} />
              <div className="friend-info">
                <div className="friend-name">{req.from?.username}</div>
                {/* Mutual servers count on the request */}
                <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t2)', marginTop: 1, marginBottom: 8 }}>
                  Incoming friend request
                </div>
                <div style={{ display: 'flex', gap: 5 }}>
                  <button className="btn btn-sm btn-amber"  onClick={() => accept(req._id)}>Accept</button>
                  <button className="btn btn-sm btn-ghost"  onClick={() => decline(req._id)}>Decline</button>
                  <button className="btn btn-sm btn-danger" onClick={() => block(req.from?._id)}>Block</button>
                </div>
              </div>
            </div>
          ))
        )}

        {/* Blocked */}
        {tab === 'blocked' && (
          blocked.length === 0 ? (
            <div className="friends-empty">— no blocked users —</div>
          ) : blocked.map(u => (
            <div key={u._id} className="friend-row" style={{ cursor: 'default' }}>
              <div
                className="av"
                style={{ width: 34, height: 34, fontSize: 11, opacity: .35, flexShrink: 0, borderStyle: 'dashed' }}
              >
                {u.username?.slice(0, 2).toUpperCase()}
              </div>
              <div className="friend-info">
                <div className="friend-name" style={{ color: 'var(--t2)' }}>{u.username}</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t2)', marginTop: 1 }}>Blocked</div>
              </div>
              <button className="btn btn-sm btn-ghost" onClick={() => unblock(u._id)}>Unblock</button>
            </div>
          ))
        )}
      </div>

      {/* ── Profile card popup ── */}
      {selected && (
        <ProfileCard
          user={selected}
          mutuals={0}
          onClose={() => setSelected(null)}
          onMessage={() => { openDM(selected._id); setSelected(null) }}
          onViewProfile={() => { navigate(`/profile/${selected._id}`); setSelected(null) }}
          onRemove={() => remove(selected._id)}
          onBlock={() => block(selected._id)}
        />
      )}

      {/* ── Context menu ── */}
      {menu && (
        <ContextMenu
          x={menu.x} y={menu.y}
          onMessage={() => openDM(menu.user._id)}
          onProfile={() => navigate(`/profile/${menu.user._id}`)}
          onRemove={() => remove(menu.user._id)}
          onBlock={() => block(menu.user._id)}
          onClose={() => setMenu(null)}
        />
      )}
    </div>
  )
}

export default FriendsList