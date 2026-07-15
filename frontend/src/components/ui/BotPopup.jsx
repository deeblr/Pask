/**
 * BotPopup — mini bot profile card (click/hover on bot avatar or name)
 * Shows bot info + "Add to Server" modal + "Message" button (DM)
 */
import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useServerList } from '../../context/ServerListContext'
import { useAuth } from '../../context/AuthContext'
import api from '../../utils/api'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
const toUrl = p => p ? (p.startsWith('http') ? p : `${API_URL}/${p.replace(/^\//, '')}`) : null

/* ── Bot Avatar ─────────────────────────────────────────── */
const BotAv = ({ bot, size = 44 }) => {
  const src = toUrl(bot?.avatar)
  return (
    <div style={{
      width: size, height: size, borderRadius: 'var(--r2)',
      background: src ? 'transparent' : 'rgba(88,101,242,.2)',
      border: '1px solid rgba(88,101,242,.35)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--mono)', fontSize: Math.round(size * .33), fontWeight: 700,
      color: '#7289da', overflow: 'hidden', flexShrink: 0,
    }}>
      {src
        ? <img src={src} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={e=>e.target.style.display='none'}/>
        : (bot?.name || '??').slice(0, 2).toUpperCase()
      }
    </div>
  )
}

/* ── Add to Server Modal ────────────────────────────────── */
const AddToServerModal = ({ bot, onClose }) => {
  const { servers }  = useServerList()
  const { user }     = useAuth()
  const [selected,   setSelected]   = useState('')
  const [adding,     setAdding]     = useState(false)
  const [error,      setError]      = useState('')
  const [success,    setSuccess]    = useState(false)
  const navigate     = useNavigate()

  const eligible = (servers || []).filter(s => {
    const me = s.members?.find(m => (m.user?._id || m.user) === user?._id)
    return me && ['owner', 'admin'].includes(me.role)
  })

  useEffect(() => {
    if (eligible.length > 0 && !selected) setSelected(eligible[0]._id)
  }, [eligible.length])

  const handleAdd = async () => {
    if (!selected) return
    setAdding(true); setError('')
    try {
      await api.post(`/bots/${bot._id}/add-to-server`, { serverId: selected })
      setSuccess(true)
    } catch (e) { setError(e.response?.data?.message || 'Failed') }
    setAdding(false)
  }

  const selectedServer = servers?.find(s => s._id === selected)

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,.7)',
      }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        width: 420, borderRadius: 'var(--r4)',
        background: 'var(--s2)', border: '1px solid var(--bm)',
        boxShadow: '0 24px 64px rgba(0,0,0,.7)',
        overflow: 'hidden',
        animation: 'popIn .15s ease',
      }}>
        <style>{`@keyframes popIn{from{opacity:0;transform:scale(.95)}to{opacity:1;transform:none}}`}</style>

        {/* Top bar */}
        <div style={{ height: 4, background: 'linear-gradient(90deg,#5865f2,#7289da)' }}/>

        <div style={{ padding: '24px 22px 20px' }}>

          {success ? (
            <div style={{ textAlign:'center', padding:'16px 0' }}>
              <div style={{ fontSize:44, marginBottom:10 }}>🎉</div>
              <div style={{ fontSize:17, fontWeight:700, color:'var(--t0)', marginBottom:6 }}>
                {bot.name} added!
              </div>
              <div style={{ fontSize:13, color:'var(--t2)', marginBottom:20 }}>
                Successfully added to <strong style={{ color:'var(--t1)' }}>{selectedServer?.name}</strong>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button
                  className="btn btn-amber"
                  style={{ flex:1 }}
                  onClick={() => { navigate(`/channels/${selected}`); onClose() }}
                >
                  Open Server
                </button>
                <button className="btn btn-ghost" style={{ flex:1 }} onClick={onClose}>Close</button>
              </div>
            </div>
          ) : (
            <>
              {/* Bot header */}
              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:18 }}>
                <BotAv bot={bot} size={48}/>
                <div>
                  <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                    <span style={{ fontFamily:'var(--mono)', fontWeight:700, fontSize:16, color:'var(--t0)' }}>{bot.name}</span>
                    <span style={{ fontSize:9, fontFamily:'var(--mono)', fontWeight:700, padding:'2px 6px', borderRadius:4, background:'rgba(88,101,242,.25)', color:'#7289da', border:'1px solid rgba(88,101,242,.35)', letterSpacing:'.05em' }}>BOT</span>
                  </div>
                  {bot.description && <div style={{ fontSize:12, color:'var(--t2)', marginTop:2 }}>{bot.description}</div>}
                </div>
              </div>

              {/* Server selector */}
              <div style={{ marginBottom:16 }}>
                <div style={{ fontSize:10, fontWeight:700, color:'var(--t2)', letterSpacing:'.09em', textTransform:'uppercase', marginBottom:10 }}>
                  Add to a Server
                </div>
                {eligible.length === 0 ? (
                  <div style={{ padding:'12px', background:'rgba(242,63,67,.1)', border:'1px solid rgba(242,63,67,.2)', borderRadius:'var(--r2)', fontSize:12, color:'var(--err)', textAlign:'center' }}>
                    You need to be an admin or owner to add bots.
                  </div>
                ) : (
                  <div style={{ display:'flex', flexDirection:'column', gap:6, maxHeight:200, overflowY:'auto' }}>
                    {eligible.map(s => {
                      const alreadyIn = bot.guilds?.includes(s._id) || bot.guilds?.some(g => g.toString?.() === s._id)
                      const isSel = selected === s._id
                      const iconUrl = toUrl(s.icon)
                      return (
                        <div
                          key={s._id}
                          onClick={() => !alreadyIn && setSelected(s._id)}
                          style={{
                            display:'flex', alignItems:'center', gap:10,
                            padding:'9px 11px', borderRadius:'var(--r2)',
                            background: isSel ? 'rgba(88,101,242,.15)' : 'var(--s3)',
                            border: `1px solid ${isSel ? 'rgba(88,101,242,.45)' : 'var(--b)'}`,
                            cursor: alreadyIn ? 'default' : 'pointer',
                            opacity: alreadyIn ? .5 : 1,
                            transition: 'all .12s',
                          }}
                        >
                          <div style={{ width:32, height:32, borderRadius:'var(--r1)', background: iconUrl ? 'transparent' : '#5865f2', overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:800, color:'#fff', flexShrink:0 }}>
                            {iconUrl ? <img src={iconUrl} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/> : s.name?.slice(0,2).toUpperCase()}
                          </div>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:13, fontWeight:600, color:'var(--t0)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.name}</div>
                            <div style={{ fontSize:10, color:'var(--t3)', fontFamily:'var(--mono)' }}>{alreadyIn ? '✓ Already added' : `${s.members?.length || 0} members`}</div>
                          </div>
                          {isSel && !alreadyIn && (
                            <div style={{ width:16, height:16, borderRadius:'50%', background:'#5865f2', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                              <svg width="9" height="9" viewBox="0 0 24 24" fill="#fff"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {error && (
                <div style={{ padding:'8px 10px', background:'rgba(242,63,67,.1)', border:'1px solid rgba(242,63,67,.2)', borderRadius:'var(--r2)', fontSize:12, color:'var(--err)', marginBottom:12 }}>
                  {error}
                </div>
              )}

              <div style={{ display:'flex', gap:8 }}>
                <button className="btn btn-ghost" style={{ flex:1 }} onClick={onClose}>Cancel</button>
                <button
                  className="btn btn-amber"
                  style={{ flex:2 }}
                  disabled={adding || !selected || eligible.length === 0}
                  onClick={handleAdd}
                >
                  {adding ? 'Adding…' : 'Authorize'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Bot Profile Card (popup) ───────────────────────────── */
const BotCard = ({ bot, anchorRect, onClose }) => {
  const navigate  = useNavigate()
  const cardRef   = useRef(null)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const [showAddModal, setShowAddModal] = useState(false)

  useEffect(() => {
    if (!cardRef.current || !anchorRect) return
    const vw  = window.innerWidth
    const vh  = window.innerHeight
    let left  = anchorRect.right + 8
    let top   = anchorRect.top
    if (left + 260 > vw) left = anchorRect.left - 268
    if (left < 0)        left = 8
    if (top + 340 > vh)  top  = vh - 344
    if (top < 0)         top  = 8
    setPos({ top, left })
  }, [anchorRect])

  useEffect(() => {
    const h = (e) => { if (cardRef.current && !cardRef.current.contains(e.target)) onClose() }
    setTimeout(() => document.addEventListener('mousedown', h), 0)
    return () => document.removeEventListener('mousedown', h)
  }, [onClose])

  const openDM = async () => {
    try {
      const r = await api.post(`/dm/bot/${bot._id}`)
      navigate(`/dm/${r.data._id}`)
    } catch {}
    onClose()
  }

  return (
    <>
      <div
        ref={cardRef}
        style={{
          position: 'fixed',
          top: pos.top, left: pos.left,
          width: 256, zIndex: 2000,
          background: 'var(--s2)',
          border: '1px solid var(--bm)',
          borderRadius: 'var(--r4)',
          overflow: 'hidden',
          boxShadow: '0 16px 48px rgba(0,0,0,.65)',
          animation: 'slide-up .14s ease',
        }}
      >
        {/* Banner — bot color */}
        <div style={{ height: 56, background: 'linear-gradient(135deg, rgba(88,101,242,.4), rgba(114,137,218,.25))', position: 'relative' }}>
          <div style={{ position: 'absolute', bottom: -18, left: 12 }}>
            <BotAv bot={bot} size={40}/>
          </div>
          {/* Online dot */}
          <div style={{
            position: 'absolute', bottom: -20, left: 44,
            width: 10, height: 10, borderRadius: '50%',
            background: bot?.online ? '#23a55a' : '#80848e',
            border: '2px solid var(--s2)',
          }}/>
        </div>

        <div style={{ padding: '26px 12px 12px' }}>
          {/* Name + BOT badge */}
          <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom: bot?.description ? 4 : 8 }}>
            <span style={{ fontFamily:'var(--mono)', fontWeight:700, fontSize:14, color:'var(--t0)' }}>{bot?.name}</span>
            <span style={{
              fontSize: 9, fontFamily:'var(--mono)', fontWeight:700,
              background:'rgba(88,101,242,.25)', color:'#7289da',
              padding:'1px 5px', borderRadius:3,
              border:'1px solid rgba(88,101,242,.35)',
              letterSpacing:'.05em',
            }}>BOT</span>
          </div>

          {/* Status */}
          <div style={{ display:'flex', alignItems:'center', gap:5, fontFamily:'var(--mono)', fontSize:10, color: bot?.online ? '#23a55a' : '#80848e', marginBottom: 6 }}>
            <span style={{ width:5, height:5, borderRadius:'50%', background: bot?.online ? '#23a55a' : '#80848e', display:'inline-block' }}/>
            {bot?.online ? 'Online' : 'Offline'}
          </div>

          {/* Description */}
          {bot?.description && (
            <div style={{
              fontSize: 11, color: 'var(--t1)', lineHeight: 1.5,
              background: 'var(--s3)', border: '1px solid var(--b)',
              borderRadius: 'var(--r1)', padding: '6px 8px', marginBottom: 8,
            }}>
              {bot.description}
            </div>
          )}

          {/* Prefix */}
          {bot?.prefix && (
            <div style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--t2)', marginBottom:10 }}>
              Prefix: <span style={{ color:'#7289da' }}>{bot.prefix}</span>
            </div>
          )}

          {/* Actions */}
          <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
            <button className="btn btn-sm btn-amber" onClick={openDM}>
              Message
            </button>
            <button
              className="btn btn-sm btn-ghost"
              onClick={() => { setShowAddModal(true) }}
              style={{ color:'#7289da', borderColor:'rgba(88,101,242,.3)' }}
            >
              + Add to Server
            </button>
          </div>
        </div>
      </div>

      {showAddModal && (
        <AddToServerModal bot={bot} onClose={() => { setShowAddModal(false); onClose() }}/>
      )}
    </>
  )
}

/* ── Main export ─────────────────────────────────────────── */
const BotPopup = ({ bot, children }) => {
  const [open,       setOpen]       = useState(false)
  const [anchorRect, setAnchorRect] = useState(null)
  const hoverTimer  = useRef(null)
  const wrapRef     = useRef(null)

  const handleMouseEnter = () => {
    hoverTimer.current = setTimeout(() => {
      setAnchorRect(wrapRef.current?.getBoundingClientRect())
      setOpen(true)
    }, 400)
  }

  const handleMouseLeave = () => clearTimeout(hoverTimer.current)

  const handleClick = (e) => {
    e.stopPropagation()
    setAnchorRect(wrapRef.current?.getBoundingClientRect())
    setOpen(true)
  }

  if (!bot) return <>{children}</>

  return (
    <>
      <span
        ref={wrapRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        style={{ cursor: 'pointer' }}
      >
        {children}
      </span>
      {open && (
        <BotCard
          bot={bot}
          anchorRect={anchorRect}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}

export default BotPopup