import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useServerList } from '../context/ServerListContext'
import api from '../utils/api'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
const toUrl = p => p ? (p.startsWith('http') ? p : `${API_URL}/${p.replace(/^\//, '')}`) : null

export default function InvitePage() {
  const { code }    = useParams()
  const navigate    = useNavigate()
  const { user }    = useAuth()
  const { addServer } = useServerList()

  const [info,    setInfo]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [error,   setError]   = useState('')

  useEffect(() => {
    if (!code) return
    api.get(`/servers/invite/${code}`)
      .then(r => setInfo(r.data))
      .catch(() => setError('Invalid or expired invite link.'))
      .finally(() => setLoading(false))
  }, [code])

  const join = async () => {
    if (info?.isMember) {
      navigate(`/channels/${info._id}`)
      return
    }
    setJoining(true)
    try {
      const r = await api.post(`/servers/join/${code}`)
      addServer?.(r.data)
      navigate(`/channels/${r.data._id}`)
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to join server.')
      setJoining(false)
    }
  }

  const iconUrl = toUrl(info?.icon)

  return (
    <div style={{
      minHeight: '100vh', background: '#111214',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'IBM Plex Sans', system-ui, sans-serif",
    }}>
      {/* Subtle background */}
      <div style={{ position:'fixed', inset:0, background:'radial-gradient(ellipse at 50% 40%, rgba(88,101,242,.08) 0%, transparent 60%)', pointerEvents:'none' }}/>

      <div style={{
        position: 'relative', zIndex: 1,
        width: 460, borderRadius: 16,
        background: '#2b2d31',
        boxShadow: '0 32px 100px rgba(0,0,0,.7)',
        overflow: 'hidden',
        animation: 'fadeIn .2s ease',
      }}>
        <style>{`@keyframes fadeIn{from{opacity:0;transform:scale(.97)}to{opacity:1;transform:none}}`}</style>

        {/* Top bar */}
        <div style={{ height: 6, background: loading ? '#3a3c41' : error ? '#f23f43' : 'linear-gradient(90deg,#5865f2,#7289da)' }}/>

        <div style={{ padding: '36px 32px 32px' }}>

          {loading ? (
            <div style={{ textAlign:'center', padding:'32px 0' }}>
              <div style={{ width:32, height:32, border:'3px solid rgba(255,255,255,.1)', borderTopColor:'#5865f2', borderRadius:'50%', animation:'spin .7s linear infinite', margin:'0 auto 16px' }}/>
              <div style={{ fontSize:15, color:'#949ba4' }}>Loading invite…</div>
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
          ) : error ? (
            <div style={{ textAlign:'center', padding:'16px 0' }}>
              <div style={{ fontSize:48, marginBottom:16 }}>🔗</div>
              <div style={{ fontSize:20, fontWeight:700, color:'#f2f3f5', marginBottom:8 }}>Invalid Invite</div>
              <div style={{ fontSize:14, color:'#949ba4', marginBottom:24 }}>{error}</div>
              <button onClick={() => navigate('/')} style={{ padding:'10px 24px', borderRadius:6, background:'#5865f2', border:'none', color:'#fff', fontSize:15, fontWeight:600, cursor:'pointer' }}>
                Go Home
              </button>
            </div>
          ) : (
            <>
              {/* You were invited header */}
              <div style={{ fontSize:11, fontWeight:700, color:'#949ba4', letterSpacing:'.1em', textTransform:'uppercase', textAlign:'center', marginBottom:20 }}>
                {user?.username} — You've been invited to join a server!
              </div>

              {/* Server card */}
              <div style={{
                display:'flex', alignItems:'center', gap:16,
                padding:'20px', marginBottom:20,
                background:'#232428', borderRadius:12,
                border:'1px solid rgba(255,255,255,.06)',
              }}>
                {/* Server icon */}
                <div style={{
                  width:64, height:64, borderRadius:16, flexShrink:0,
                  background: iconUrl ? 'transparent' : '#5865f2',
                  overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:24, fontWeight:800, color:'#fff',
                  boxShadow:'0 4px 20px rgba(0,0,0,.4)',
                }}>
                  {iconUrl
                    ? <img src={iconUrl} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                    : info?.name?.slice(0,2).toUpperCase()
                  }
                </div>

                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:20, fontWeight:700, color:'#f2f3f5', marginBottom:4, letterSpacing:'-.02em', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {info?.name}
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:12, fontSize:13 }}>
                    <span style={{ display:'flex', alignItems:'center', gap:5, color:'#f2f3f5' }}>
                      <span style={{ width:8, height:8, borderRadius:'50%', background:'#23a55a', display:'inline-block' }}/>
                      {info?.onlineCount || 0} Online
                    </span>
                    <span style={{ display:'flex', alignItems:'center', gap:5, color:'#949ba4' }}>
                      <span style={{ width:8, height:8, borderRadius:'50%', background:'#80848e', display:'inline-block' }}/>
                      {info?.memberCount || 0} Members
                    </span>
                  </div>
                </div>
              </div>

              {/* Already member badge */}
              {info?.isMember && (
                <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 14px', background:'rgba(35,165,90,.1)', border:'1px solid rgba(35,165,90,.2)', borderRadius:8, marginBottom:16 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#23a55a"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                  <span style={{ fontSize:13, color:'#23a55a', fontWeight:600 }}>You're already a member of this server.</span>
                </div>
              )}

              {/* Join button */}
              <button
                onClick={join}
                disabled={joining}
                style={{
                  width:'100%', padding:'13px',
                  borderRadius:8, border:'none',
                  background: joining ? '#4752c4' : '#5865f2',
                  color:'#fff', fontSize:15, fontWeight:700,
                  cursor: joining ? 'not-allowed' : 'pointer',
                  transition:'background .15s',
                  letterSpacing:'-.01em',
                }}
                onMouseEnter={e=>{ if(!joining) e.currentTarget.style.background='#4752c4' }}
                onMouseLeave={e=>{ if(!joining) e.currentTarget.style.background='#5865f2' }}
              >
                {joining ? 'Joining…' : info?.isMember ? 'Open Server' : 'Accept Invite & Join Server'}
              </button>

              <button onClick={() => navigate('/')} style={{ width:'100%', padding:'10px', marginTop:8, background:'none', border:'none', color:'#949ba4', fontSize:13, cursor:'pointer', transition:'color .12s' }}
                onMouseEnter={e=>e.currentTarget.style.color='#f2f3f5'}
                onMouseLeave={e=>e.currentTarget.style.color='#949ba4'}
              >
                Not now
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
