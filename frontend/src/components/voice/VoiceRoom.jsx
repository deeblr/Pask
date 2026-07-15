import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { getSocket } from '../../utils/socket'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

// Fix avatar URL — avatar stored as "/uploads/avatars/x.jpg"
const toUrl = (p) => {
  if (!p) return null
  if (p.startsWith('http')) return p
  return `${API_URL}/${p.replace(/^\//, '')}`  // remove leading slash then join
}

/* ── CSS injected once ──────────────────────────────────── */
const CSS = `
@keyframes vrPulse1{0%{transform:scale(1);opacity:.7}100%{transform:scale(1.55);opacity:0}}
@keyframes vrPulse2{0%{transform:scale(1);opacity:.4}100%{transform:scale(1.9);opacity:0}}
@keyframes vrBarA{0%,100%{height:4px}50%{height:18px}}
@keyframes vrBarB{0%,100%{height:8px}50%{height:26px}}
@keyframes vrBarC{0%,100%{height:3px}50%{height:14px}}
@keyframes vrCardIn{from{opacity:0;transform:scale(.92) translateY(10px)}to{opacity:1;transform:none}}
@keyframes vrBlink{0%,100%{opacity:1}50%{opacity:.4}}
.vr-card{animation:vrCardIn .35s cubic-bezier(.22,.68,0,1.2) both}
.vr-card:hover{transform:scale(1.03);transition:transform .2s}
`

/* ── Ring SVG ───────────────────────────────────────────── */
const Ring = ({ sz, vol }) => {
  const r    = (sz - 10) / 2
  const circ = 2 * Math.PI * r
  const arc  = circ * Math.min(vol * 3, 1)
  return (
    <svg width={sz} height={sz} style={{ position:'absolute', inset:0, pointerEvents:'none' }}>
      <circle cx={sz/2} cy={sz/2} r={r} fill="none" stroke="rgba(74,222,128,.07)" strokeWidth="4.5"/>
      {arc > 1 && (
        <circle cx={sz/2} cy={sz/2} r={r} fill="none"
          stroke="#4ade80" strokeWidth="4.5" strokeLinecap="round"
          strokeDasharray={`${arc} ${circ - arc}`}
          strokeDashoffset={circ * 0.25}
          style={{
            transition:'stroke-dasharray 70ms linear',
            filter:'drop-shadow(0 0 5px rgba(74,222,128,.7))',
          }}
        />
      )}
    </svg>
  )
}

/* ── Member card ────────────────────────────────────────── */
const Card = ({ m, isMe, vol }) => {
  const talking = vol > 0.06 && !m.muted
  const avatarUrl = toUrl(m.avatar)
  const SZ = 96
  const [imgErr, setImgErr] = useState(false)

  return (
    <div className="vr-card" style={{
      display:'flex', flexDirection:'column', alignItems:'center', gap:14,
      padding:'26px 20px 18px',
      borderRadius:22,
      background: talking
        ? 'linear-gradient(145deg,rgba(74,222,128,.1) 0%,rgba(10,14,10,.97) 100%)'
        : 'rgba(255,255,255,.04)',
      border: talking
        ? '1.5px solid rgba(74,222,128,.4)'
        : '1.5px solid rgba(255,255,255,.08)',
      minWidth:120, maxWidth:150,
      cursor:'default', position:'relative',
      boxShadow: talking
        ? '0 8px 32px rgba(74,222,128,.12), inset 0 1px 0 rgba(74,222,128,.1)'
        : '0 4px 16px rgba(0,0,0,.4)',
      transition:'border-color .3s, background .3s, box-shadow .3s',
    }}>

      {/* ── Avatar + rings ── */}
      <div style={{ position:'relative', width:SZ, height:SZ }}>

        {/* Double pulse rings */}
        {talking && <>
          <div style={{
            position:'absolute', inset:-12, borderRadius:'50%',
            border:'1.5px solid rgba(74,222,128,.2)',
            animation:'vrPulse2 2.2s ease-out infinite',
          }}/>
          <div style={{
            position:'absolute', inset:-5, borderRadius:'50%',
            border:'2px solid rgba(74,222,128,.45)',
            animation:'vrPulse1 1.5s ease-out infinite',
          }}/>
        </>}

        {/* SVG volume arc */}
        <Ring sz={SZ} vol={talking ? vol : 0}/>

        {/* Photo circle */}
        <div style={{
          position:'absolute', inset:8,
          borderRadius:'50%', overflow:'hidden',
          background:'#181c17',
          border: talking
            ? '2.5px solid rgba(74,222,128,.85)'
            : '2px solid rgba(255,255,255,.12)',
          boxShadow: talking ? '0 0 18px rgba(74,222,128,.35)' : 'none',
          display:'flex', alignItems:'center', justifyContent:'center',
          transition:'border-color .3s, box-shadow .3s',
        }}>
          {avatarUrl && !imgErr ? (
            <img
              src={avatarUrl}
              alt={m.username}
              onError={() => setImgErr(true)}
              style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }}
            />
          ) : (
            /* Fallback: colored initial */
            <div style={{
              width:'100%', height:'100%',
              display:'flex', alignItems:'center', justifyContent:'center',
              background: talking
                ? 'linear-gradient(135deg,#1a4d2e,#0d2218)'
                : 'linear-gradient(135deg,#1e1e18,#141410)',
              fontSize:28, fontWeight:800,
              color: talking ? '#4ade80' : '#c9b98a',
              fontFamily:'var(--mono)',
              letterSpacing:'-.02em',
              transition:'color .3s',
            }}>
              {(m.username || '?')[0].toUpperCase()}
            </div>
          )}
        </div>

        {/* Sound bars — bottom-right */}
        {talking && (
          <div style={{
            position:'absolute', bottom:8, right:8,
            display:'flex', gap:3, alignItems:'flex-end',
            background:'rgba(5,8,4,.9)', borderRadius:8,
            padding:'4px 7px', backdropFilter:'blur(6px)',
            border:'1px solid rgba(74,222,128,.2)',
          }}>
            {[
              { a:'vrBarA', d:.55 },
              { a:'vrBarB', d:.68 },
              { a:'vrBarC', d:.48 },
            ].map(({ a, d }, i) => (
              <div key={i} style={{
                width:3.5, borderRadius:2.5,
                background:'#4ade80',
                boxShadow:'0 0 4px #4ade80',
                animation:`${a} ${d}s ease-in-out infinite`,
              }}/>
            ))}
          </div>
        )}

        {/* Muted badge */}
        {m.muted && (
          <div style={{
            position:'absolute', bottom:8, right:8,
            background:'rgba(201,95,95,.95)', borderRadius:'50%',
            width:24, height:24,
            display:'flex', alignItems:'center', justifyContent:'center',
            boxShadow:'0 0 0 2.5px #0e100d, 0 2px 8px rgba(0,0,0,.5)',
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
              <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c.57-.08 1.12-.24 1.64-.46l4.3 4.3 1.27-1.27L4.27 3z"/>
            </svg>
          </div>
        )}
      </div>

      {/* ── Name + tag ── */}
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
        <div style={{
          fontSize:14, fontWeight:700,
          color: talking ? '#4ade80' : '#ede4cc',
          transition:'color .3s',
          maxWidth:130, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
          letterSpacing:'.01em',
        }}>
          {isMe ? 'You' : m.username}
        </div>

        {/* status tag */}
        <div style={{
          fontSize:10, fontFamily:'var(--mono)',
          color: talking ? 'rgba(74,222,128,.7)' : 'rgba(255,255,255,.25)',
          letterSpacing:'.06em',
        }}>
          {m.deafened ? '🔕 Deafened' : m.muted ? '🎙 Muted' : talking ? '◉ Speaking' : '○ Silent'}
        </div>
      </div>
    </div>
  )
}

/* ── Control pill button ────────────────────────────────── */
const Pill = ({ onClick, active, danger, label, iconOn, iconOff }) => {
  const [h, setH] = useState(false)
  const isRed = active || danger
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        display:'flex', flexDirection:'column', alignItems:'center', gap:4,
        padding:'10px 16px', borderRadius:14, border:'none', cursor:'pointer',
        background: danger
          ? (h ? 'rgba(239,68,68,.3)' : 'rgba(239,68,68,.15)')
          : active
            ? (h ? 'rgba(239,68,68,.3)' : 'rgba(239,68,68,.18)')
            : (h ? 'rgba(255,255,255,.1)' : 'rgba(255,255,255,.05)'),
        color: isRed ? '#fca5a5' : (h ? '#ede4cc' : '#9e9484'),
        outline:'none',
        border: isRed ? '1px solid rgba(239,68,68,.35)' : '1px solid rgba(255,255,255,.08)',
        transition:'all .18s',
        minWidth:58,
      }}
    >
      <span style={{ fontSize:20, lineHeight:1 }}>
        {active ? iconOff : iconOn}
      </span>
      <span style={{ fontSize:10, fontFamily:'var(--mono)', letterSpacing:'.04em', whiteSpace:'nowrap' }}>
        {label}
      </span>
    </button>
  )
}

/* ── Audio output elements ──────────────────────────────── */
const AudioOut = ({ streams }) => (
  <div style={{ display:'none' }}>
    {Object.entries(streams).map(([pid, stream]) => (
      <audio key={pid} autoPlay playsInline
        ref={el => { if (el && el.srcObject !== stream) el.srcObject = stream }}
      />
    ))}
  </div>
)

/* ══════════════════════════════════════════════════════════ */
const VoiceRoom = ({ channel, server, onLeave }) => {
  const { user }  = useAuth()
  const socket    = getSocket()
  const myId      = user?._id?.toString()

  const [members,  setMembers]  = useState([])
  const [muted,    setMuted]    = useState(false)
  const [deafened, setDeafened] = useState(false)
  const [volumes,  setVolumes]  = useState({})
  const [streams,  setStreams]  = useState({})

  const localRef = useRef(null)
  const peersRef = useRef({})
  const ctxRef   = useRef({})
  const rafRef   = useRef(null)

  /* inject CSS */
  useEffect(() => {
    if (document.getElementById('vr-css')) return
    const el = document.createElement('style')
    el.id = 'vr-css'; el.textContent = CSS
    document.head.appendChild(el)
  }, [])

  /* local mic + VAD */
  const setupMic = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      localRef.current = stream
      const ctx = new AudioContext()
      const ana = ctx.createAnalyser(); ana.fftSize = 256
      ctx.createMediaStreamSource(stream).connect(ana)
      ctxRef.current['__local'] = ctx
      const buf = new Uint8Array(ana.frequencyBinCount)
      const tick = () => {
        ana.getByteFrequencyData(buf)
        const vol = Math.min(buf.reduce((a,b)=>a+b,0)/buf.length/80, 1)
        setVolumes(p => ({ ...p, [myId]: vol }))
        rafRef.current = requestAnimationFrame(tick)
      }
      rafRef.current = requestAnimationFrame(tick)
    } catch(e) { console.error('[Voice] mic:', e) }
  }, [myId])

  /* remote VAD */
  const remoteVAD = useCallback((peerId, stream) => {
    try {
      const ctx = new AudioContext()
      const ana = ctx.createAnalyser(); ana.fftSize = 256
      ctx.createMediaStreamSource(stream).connect(ana)
      ctxRef.current[peerId] = ctx
      const buf = new Uint8Array(ana.frequencyBinCount)
      const tick = () => {
        ana.getByteFrequencyData(buf)
        setVolumes(p => ({ ...p, [peerId]: Math.min(buf.reduce((a,b)=>a+b,0)/buf.length/80, 1) }))
        requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    } catch {}
  }, [])

  /* create peer */
  const mkPeer = useCallback((peerId) => {
    const pc = new RTCPeerConnection({
      iceServers:[{urls:'stun:stun.l.google.com:19302'},{urls:'stun:stun1.l.google.com:19302'}]
    })
    peersRef.current[peerId] = pc
    localRef.current?.getTracks().forEach(t => pc.addTrack(t, localRef.current))
    pc.ontrack = (e) => {
      const s = e.streams[0]
      setStreams(p => ({ ...p, [peerId]: s }))
      remoteVAD(peerId, s)
    }
    pc.onicecandidate = (e) => {
      if (e.candidate)
        socket.emit('voice:ice', { targetId:peerId, candidate:e.candidate, channelId:channel._id })
    }
    return pc
  }, [channel._id, socket, remoteVAD])

  /* socket lifecycle */
  useEffect(() => {
    if (!channel || !socket) return
    let alive = true
    setupMic().then(() => {
      if (alive) socket.emit('voice:join', { channelId: channel._id, serverId: server._id })
    })

    socket.on('voice:members', ({ channelId, members: m }) => {
      if (channelId === channel._id) setMembers(m)
    })
    socket.on('voice:existingPeers', async ({ channelId, peerIds }) => {
      if (channelId !== channel._id) return
      for (const pid of peerIds) {
        const pc = mkPeer(pid)
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)
        socket.emit('voice:offer', { targetId:pid, offer, channelId })
      }
    })
    socket.on('voice:offer', async ({ fromId, offer, channelId }) => {
      if (channelId !== channel._id) return
      const pc = mkPeer(fromId)
      await pc.setRemoteDescription(new RTCSessionDescription(offer))
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      socket.emit('voice:answer', { targetId:fromId, answer, channelId })
    })
    socket.on('voice:answer', async ({ fromId, answer }) => {
      const pc = peersRef.current[fromId]
      if (pc) await pc.setRemoteDescription(new RTCSessionDescription(answer))
    })
    socket.on('voice:ice', async ({ fromId, candidate }) => {
      const pc = peersRef.current[fromId]
      if (pc) await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(()=>{})
    })
    socket.on('voice:userJoined', ({ channelId, member }) => {
      if (channelId === channel._id)
        setMembers(p => [...p.filter(m => m.userId !== member.userId), member])
    })
    socket.on('voice:userLeft', ({ channelId, userId }) => {
      if (channelId !== channel._id) return
      setMembers(p => p.filter(m => m.userId !== userId))
      peersRef.current[userId]?.close(); delete peersRef.current[userId]
      ctxRef.current[userId]?.close();   delete ctxRef.current[userId]
      setStreams(p => { const n={...p}; delete n[userId]; return n })
      setVolumes(p => { const n={...p}; delete n[userId]; return n })
    })
    socket.on('voice:stateChange', ({ channelId, userId, muted:m, deafened:d }) => {
      if (channelId === channel._id)
        setMembers(p => p.map(x => x.userId === userId ? {...x, muted:m, deafened:d} : x))
    })

    return () => {
      alive = false
      ;['voice:members','voice:existingPeers','voice:offer','voice:answer',
        'voice:ice','voice:userJoined','voice:userLeft','voice:stateChange']
        .forEach(ev => socket.off(ev))
    }
  }, [channel._id, server._id])

  useEffect(() => () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    Object.values(ctxRef.current).forEach(c => c.close().catch(()=>{}))
  }, [])

  const toggleMute = () => {
    const v = !muted; setMuted(v)
    localRef.current?.getAudioTracks().forEach(t => { t.enabled = !v })
    socket.emit('voice:mute', { channelId: channel._id, muted: v })
  }
  const toggleDeafen = () => {
    const v = !deafened; setDeafened(v)
    if (v) {
      setMuted(true)
      localRef.current?.getAudioTracks().forEach(t => { t.enabled = false })
      socket.emit('voice:mute', { channelId: channel._id, muted: true })
    }
    Object.values(streams).forEach(s => s.getAudioTracks().forEach(t => { t.enabled = !v }))
    socket.emit('voice:deafen', { channelId: channel._id, deafened: v })
  }
  const handleLeave = () => {
    socket.emit('voice:leave', { channelId: channel._id, serverId: server._id })
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    localRef.current?.getTracks().forEach(t => t.stop())
    Object.values(peersRef.current).forEach(pc => pc.close())
    Object.values(ctxRef.current).forEach(c => c.close().catch(()=>{}))
    peersRef.current = {}; ctxRef.current = {}
    onLeave?.()
  }

  const myVol = muted ? 0 : (volumes[myId] || 0)

  return (
    <div style={{
      flex:1, display:'flex', flexDirection:'column', minWidth:0,
      height:'100%', overflow:'hidden',
      background:'#0c0e0b',
      position:'relative',
    }}>
      <AudioOut streams={streams}/>

      {/* Radial bg */}
      <div style={{
        position:'absolute', inset:0, pointerEvents:'none',
        background:'radial-gradient(ellipse 70% 45% at 50% 0%, rgba(74,222,128,.04) 0%, transparent 100%)',
      }}/>
      {/* Grid pattern overlay */}
      <div style={{
        position:'absolute', inset:0, pointerEvents:'none', opacity:.015,
        backgroundImage:'linear-gradient(rgba(255,255,255,.3) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.3) 1px,transparent 1px)',
        backgroundSize:'40px 40px',
      }}/>

      {/* ─── Header ─────────────────────────────────────────── */}
      <div style={{
        display:'flex', alignItems:'center', gap:12,
        padding:'0 24px', height:56,
        borderBottom:'1px solid rgba(255,255,255,.06)',
        background:'rgba(0,0,0,.35)',
        backdropFilter:'blur(12px)',
        flexShrink:0, zIndex:2, position:'relative',
      }}>
        {/* icon */}
        <div style={{
          width:32, height:32, borderRadius:10,
          background:'rgba(74,222,128,.08)',
          border:'1px solid rgba(74,222,128,.18)',
          display:'flex', alignItems:'center', justifyContent:'center',
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="#4ade80">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
          </svg>
        </div>

        {/* channel name */}
        <span style={{ fontWeight:700, fontSize:15, color:'#ede4cc', letterSpacing:'.01em' }}>
          {channel.name}
        </span>

        {/* LIVE badge */}
        <div style={{
          display:'flex', alignItems:'center', gap:5,
          background:'rgba(74,222,128,.08)',
          border:'1px solid rgba(74,222,128,.2)',
          borderRadius:20, padding:'3px 10px',
        }}>
          <div style={{
            width:6, height:6, borderRadius:'50%',
            background:'#4ade80', boxShadow:'0 0 6px #4ade80',
            animation:'vrBlink 2s ease-in-out infinite',
          }}/>
          <span style={{ fontSize:10, color:'#4ade80', fontFamily:'var(--mono)', fontWeight:700, letterSpacing:'.08em' }}>
            LIVE
          </span>
        </div>

        <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:6 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="rgba(255,255,255,.25)">
            <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
          </svg>
          <span style={{ fontSize:12, color:'rgba(255,255,255,.3)', fontFamily:'var(--mono)' }}>
            {members.length}
          </span>
        </div>
      </div>

      {/* ─── Members area ───────────────────────────────────── */}
      <div style={{
        flex:1, overflowY:'auto', padding:'32px 28px',
        display:'flex', flexWrap:'wrap', gap:20, alignContent:'flex-start',
        position:'relative', zIndex:1,
      }}>
        {members.length === 0 ? (
          <div style={{
            width:'100%', display:'flex', flexDirection:'column',
            alignItems:'center', justifyContent:'center',
            gap:18, paddingTop:80,
          }}>
            <div style={{
              width:88, height:88, borderRadius:'50%',
              border:'2px dashed rgba(74,222,128,.12)',
              display:'flex', alignItems:'center', justifyContent:'center',
              background:'rgba(74,222,128,.03)',
            }}>
              <svg width="34" height="34" viewBox="0 0 24 24" fill="rgba(74,222,128,.2)">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
              </svg>
            </div>
            <div style={{ textAlign:'center', lineHeight:1.8 }}>
              <div style={{ fontSize:15, fontWeight:600, color:'rgba(255,255,255,.3)' }}>Empty room</div>
              <div style={{ fontSize:12, color:'rgba(255,255,255,.15)', marginTop:4 }}>Invite someone to talk</div>
            </div>
          </div>
        ) : members.map(m => (
          <Card
            key={m.userId}
            m={m}
            isMe={m.userId === myId}
            vol={m.userId === myId ? myVol : (volumes[m.userId] || 0)}
          />
        ))}
      </div>

      {/* ─── Controls ───────────────────────────────────────── */}
      <div style={{
        display:'flex', alignItems:'center', gap:8,
        padding:'12px 24px',
        borderTop:'1px solid rgba(255,255,255,.06)',
        background:'rgba(0,0,0,.5)',
        backdropFilter:'blur(20px)',
        flexShrink:0, zIndex:2, position:'relative',
      }}>
        {/* My info pill */}
        <div style={{
          display:'flex', alignItems:'center', gap:10,
          background:'rgba(255,255,255,.04)',
          border:'1px solid rgba(255,255,255,.08)',
          borderRadius:14, padding:'8px 14px',
          marginRight:'auto',
        }}>
          {/* mini avatar */}
          <div style={{
            width:30, height:30, borderRadius:'50%', overflow:'hidden',
            background:'#1e2218', flexShrink:0,
            border: muted ? '2px solid rgba(239,68,68,.5)' : '2px solid rgba(74,222,128,.3)',
            display:'flex', alignItems:'center', justifyContent:'center',
          }}>
            {user?.avatar && !false ? (
              <img src={toUrl(user.avatar)} alt=""
                style={{ width:'100%', height:'100%', objectFit:'cover' }}
                onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex' }}
              />
            ) : null}
            <span style={{
              fontSize:13, fontWeight:700, color:'#c9b98a', fontFamily:'var(--mono)',
              display: user?.avatar ? 'none' : 'flex',
            }}>
              {user?.username?.[0]?.toUpperCase()}
            </span>
          </div>
          <div>
            <div style={{ fontSize:12, fontWeight:600, color:'#ede4cc' }}>{user?.username}</div>
            <div style={{
              fontSize:10, fontFamily:'var(--mono)', letterSpacing:'.05em',
              color: muted ? '#f87171' : deafened ? '#fb923c' : '#4ade80',
            }}>
              {muted ? '● Muted' : deafened ? '● Deafened' : '● Active'}
            </div>
          </div>
        </div>

        {/* Mic */}
        <Pill
          onClick={toggleMute} active={muted}
          iconOn="🎙️" iconOff="🔇"
          label={muted ? 'Unmute' : 'Mute'}
        />

        {/* Deafen */}
        <Pill
          onClick={toggleDeafen} active={deafened}
          iconOn="🎧" iconOff="🔕"
          label={deafened ? 'Undeafen' : 'Deafened'}
        />

        {/* Leave */}
        <Pill
          onClick={handleLeave} danger
          iconOn="📵" label="Leave"
        />
      </div>
    </div>
  )
}

export default VoiceRoom
