import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useServerList } from '../context/ServerListContext'
import api from '../utils/api'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
const toUrl = p => p ? (p.startsWith('http') ? p : `${API_URL}/${p.replace(/^\//, '')}`) : null

export default function BotAuthPage() {
  const { botId }   = useParams()
  const navigate    = useNavigate()
  const { user }    = useAuth()
  const { servers } = useServerList()

  const [bot,        setBot]        = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [adding,     setAdding]     = useState(false)
  const [error,      setError]      = useState('')
  const [success,    setSuccess]    = useState(false)
  const [selectedId, setSelectedId] = useState('')

  // Only servers where user is owner or admin
  const eligible = (servers || []).filter(s => {
    const me = s.members?.find(m =>
      (m.user?._id || m.user) === (user?._id)
    )
    return me && ['owner', 'admin'].includes(me.role)
  })

  useEffect(() => {
    if (!botId) return
    api.get(`/bots/${botId}/public`)
      .then(r => { setBot(r.data); setLoading(false) })
      .catch(() => { setError('Bot not found.'); setLoading(false) })
  }, [botId])

  // Auto-select first eligible server
  useEffect(() => {
    if (eligible.length > 0 && !selectedId) setSelectedId(eligible[0]._id)
  }, [eligible.length])

  const handleAdd = async () => {
    if (!selectedId) return
    setAdding(true)
    try {
      await api.post(`/bots/${botId}/add-to-server`, { serverId: selectedId })
      setSuccess(true)
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to add bot.')
    }
    setAdding(false)
  }

  const selectedServer = servers?.find(s => s._id === selectedId)

  /* ─── Permissions list ─── */
  const PERMS = [
    { icon: '💬', label: 'Read Messages'    },
    { icon: '📝', label: 'Send Messages'    },
    { icon: '🔔', label: 'Mention Members'  },
    { icon: '📎', label: 'Embed Links'      },
  ]

  return (
    <div style={{
      minHeight: '100vh',
      background: '#111214',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'IBM Plex Sans', system-ui, sans-serif",
      padding: '16px',
    }}>
      {/* Background glow */}
      <div style={{ position:'fixed', inset:0, background:'radial-gradient(ellipse at 50% 40%, rgba(88,101,242,.09) 0%, transparent 65%)', pointerEvents:'none' }}/>

      <div style={{
        position: 'relative', zIndex: 1,
        width: '100%', maxWidth: 460,
        borderRadius: 16,
        background: '#2b2d31',
        boxShadow: '0 32px 100px rgba(0,0,0,.7)',
        overflow: 'hidden',
        animation: 'fadeIn .22s ease',
      }}>
        <style>{`
          @keyframes fadeIn { from { opacity:0; transform:scale(.97) } to { opacity:1; transform:none } }
          @keyframes spin   { to   { transform:rotate(360deg) } }
          .server-option { transition: background .12s, border-color .12s; }
          .server-option:hover { background: rgba(255,255,255,.05) !important; }
          .server-option.selected { background: rgba(88,101,242,.18) !important; border-color: rgba(88,101,242,.5) !important; }
        `}</style>

        {/* Top accent bar */}
        <div style={{ height: 5, background: loading ? '#3a3c41' : error && !bot ? '#f23f43' : 'linear-gradient(90deg,#5865f2,#7289da)' }}/>

        <div style={{ padding: '32px 28px 28px' }}>

          {/* ── Loading ── */}
          {loading && (
            <div style={{ textAlign:'center', padding:'40px 0' }}>
              <div style={{ width:32, height:32, border:'3px solid rgba(255,255,255,.1)', borderTopColor:'#5865f2', borderRadius:'50%', animation:'spin .7s linear infinite', margin:'0 auto 14px' }}/>
              <div style={{ fontSize:14, color:'#949ba4' }}>Loading bot…</div>
            </div>
          )}

          {/* ── Error: bot not found ── */}
          {!loading && !bot && (
            <div style={{ textAlign:'center', padding:'16px 0' }}>
              <div style={{ fontSize:48, marginBottom:14 }}>🤖</div>
              <div style={{ fontSize:20, fontWeight:700, color:'#f2f3f5', marginBottom:8 }}>Bot Not Found</div>
              <div style={{ fontSize:14, color:'#949ba4', marginBottom:24 }}>{error}</div>
              <button onClick={() => navigate('/')} style={btnStyle('#5865f2')}>Go Home</button>
            </div>
          )}

          {/* ── Success ── */}
          {success && (
            <div style={{ textAlign:'center', padding:'16px 0' }}>
              <div style={{ fontSize:56, marginBottom:14 }}>🎉</div>
              <div style={{ fontSize:20, fontWeight:700, color:'#f2f3f5', marginBottom:8 }}>
                {bot?.name} was added!
              </div>
              <div style={{ fontSize:14, color:'#949ba4', marginBottom:24 }}>
                The bot has been successfully added to <strong style={{ color:'#f2f3f5' }}>{selectedServer?.name}</strong>.
              </div>
              <button onClick={() => navigate(`/channels/${selectedId}`)} style={btnStyle('#23a55a')}>
                Open Server
              </button>
              <button onClick={() => navigate('/')} style={{ ...btnStyle('transparent'), color:'#949ba4', marginTop:8 }}>
                Go Home
              </button>
            </div>
          )}

          {/* ── Main flow ── */}
          {!loading && bot && !success && (
            <>
              {/* Header */}
              <div style={{ textAlign:'center', marginBottom:24 }}>
                {/* Bot avatar */}
                <div style={{
                  width: 80, height: 80, borderRadius: '50%',
                  background: toUrl(bot.avatar) ? 'transparent' : 'linear-gradient(135deg,#5865f2,#7289da)',
                  border: '3px solid rgba(255,255,255,.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 32, fontWeight: 800, color: '#fff',
                  margin: '0 auto 14px', overflow: 'hidden',
                  boxShadow: '0 8px 32px rgba(88,101,242,.35)',
                }}>
                  {toUrl(bot.avatar)
                    ? <img src={toUrl(bot.avatar)} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                    : bot.name?.[0]?.toUpperCase()
                  }
                </div>

                {/* Bot name + BOT badge */}
                <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, marginBottom:6 }}>
                  <span style={{ fontSize:22, fontWeight:800, color:'#f2f3f5', letterSpacing:'-.02em' }}>{bot.name}</span>
                  <span style={{
                    fontSize: 10, fontWeight:700, padding:'2px 6px', borderRadius:4,
                    background:'rgba(88,101,242,.3)', color:'#7289da',
                    border:'1px solid rgba(88,101,242,.4)', letterSpacing:'.06em',
                  }}>BOT</span>
                </div>

                {bot.description && (
                  <div style={{ fontSize:13, color:'#949ba4', lineHeight:1.5, maxWidth:320, margin:'0 auto' }}>
                    {bot.description}
                  </div>
                )}

                <div style={{ fontSize:11, color:'#6d6f78', marginTop:6, fontFamily:'monospace' }}>
                  by {bot.owner?.username || 'Unknown'} · prefix: <span style={{ color:'#7289da' }}>{bot.prefix}</span>
                </div>
              </div>

              {/* Divider */}
              <div style={{ height:1, background:'rgba(255,255,255,.06)', margin:'0 -28px 22px' }}/>

              {/* Server selector */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize:11, fontWeight:700, color:'#949ba4', letterSpacing:'.09em', textTransform:'uppercase', marginBottom:12 }}>
                  Add to a Server
                </div>

                {eligible.length === 0 ? (
                  <div style={{ padding:'16px', background:'rgba(242,63,67,.1)', border:'1px solid rgba(242,63,67,.2)', borderRadius:10, fontSize:13, color:'#f23f43', textAlign:'center' }}>
                    You need to be an <strong>admin or owner</strong> of a server to add bots.
                  </div>
                ) : (
                  <div style={{ display:'flex', flexDirection:'column', gap:8, maxHeight:220, overflowY:'auto' }}>
                    {eligible.map(s => {
                      const alreadyIn = bot.guilds?.includes(s._id)
                      const isSelected = selectedId === s._id
                      return (
                        <div
                          key={s._id}
                          className={`server-option${isSelected ? ' selected' : ''}`}
                          onClick={() => !alreadyIn && setSelectedId(s._id)}
                          style={{
                            display:'flex', alignItems:'center', gap:12,
                            padding:'10px 12px', borderRadius:10,
                            background: isSelected ? 'rgba(88,101,242,.18)' : 'rgba(255,255,255,.03)',
                            border: `1px solid ${isSelected ? 'rgba(88,101,242,.5)' : 'rgba(255,255,255,.07)'}`,
                            cursor: alreadyIn ? 'default' : 'pointer',
                            opacity: alreadyIn ? 0.55 : 1,
                          }}
                        >
                          {/* Server icon */}
                          <div style={{
                            width:38, height:38, borderRadius:10, flexShrink:0,
                            background: toUrl(s.icon) ? 'transparent' : '#5865f2',
                            overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center',
                            fontSize:14, fontWeight:800, color:'#fff',
                          }}>
                            {toUrl(s.icon)
                              ? <img src={toUrl(s.icon)} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                              : s.name?.slice(0,2).toUpperCase()
                            }
                          </div>

                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:14, fontWeight:600, color:'#f2f3f5', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                              {s.name}
                            </div>
                            <div style={{ fontSize:11, color:'#6d6f78' }}>
                              {alreadyIn ? '✓ Already added' : `${s.members?.length || 0} members`}
                            </div>
                          </div>

                          {isSelected && !alreadyIn && (
                            <div style={{ width:18, height:18, borderRadius:'50%', background:'#5865f2', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="#fff"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Permissions */}
              <div style={{ marginBottom:22 }}>
                <div style={{ fontSize:11, fontWeight:700, color:'#949ba4', letterSpacing:'.09em', textTransform:'uppercase', marginBottom:10 }}>
                  Permissions Requested
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
                  {PERMS.map(p => (
                    <div key={p.label} style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 10px', background:'rgba(35,165,90,.07)', border:'1px solid rgba(35,165,90,.15)', borderRadius:8 }}>
                      <span style={{ fontSize:14 }}>{p.icon}</span>
                      <span style={{ fontSize:12, color:'#dbdee1' }}>{p.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Error inline */}
              {error && (
                <div style={{ padding:'10px 12px', background:'rgba(242,63,67,.1)', border:'1px solid rgba(242,63,67,.2)', borderRadius:8, fontSize:13, color:'#f23f43', marginBottom:14 }}>
                  {error}
                </div>
              )}

              {/* Divider */}
              <div style={{ height:1, background:'rgba(255,255,255,.06)', margin:'0 -28px 20px' }}/>

              {/* Logged in as */}
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:18, padding:'10px 12px', background:'rgba(255,255,255,.03)', borderRadius:10, border:'1px solid rgba(255,255,255,.06)' }}>
                <div style={{ width:32, height:32, borderRadius:'50%', background:'var(--s5,#36393f)', border:'2px solid rgba(255,255,255,.1)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, color:'#fff', overflow:'hidden' }}>
                  {user?.username?.[0]?.toUpperCase()}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12, color:'#6d6f78' }}>Logged in as</div>
                  <div style={{ fontSize:13, fontWeight:600, color:'#f2f3f5', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user?.username}</div>
                </div>
              </div>

              {/* Buttons */}
              <div style={{ display:'flex', gap:10 }}>
                <button onClick={() => navigate(-1)} style={{ ...btnStyle('transparent'), flex:1, border:'1px solid rgba(255,255,255,.12)', color:'#dbdee1' }}>
                  Cancel
                </button>
                <button
                  onClick={handleAdd}
                  disabled={adding || !selectedId || eligible.length === 0}
                  style={{ ...btnStyle('#5865f2'), flex:2, opacity: (!selectedId || eligible.length === 0) ? .55 : 1 }}
                  onMouseEnter={e => { if (selectedId && !adding) e.currentTarget.style.background = '#4752c4' }}
                  onMouseLeave={e => { if (selectedId && !adding) e.currentTarget.style.background = '#5865f2' }}
                >
                  {adding ? 'Adding…' : `Authorize`}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

const btnStyle = (bg) => ({
  display: 'block', width: '100%',
  padding: '11px', borderRadius: 8, border: 'none',
  background: bg, color: '#fff',
  fontSize: 14, fontWeight: 700,
  cursor: 'pointer', transition: 'background .13s',
  letterSpacing: '-.01em',
})