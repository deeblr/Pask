import { useState, useEffect, useRef, useMemo } from 'react'
import { useAuth } from '../../context/AuthContext'
import api from '../../utils/api'
import ServerSettings from '../server/ServerSettings'
import InviteModal from '../server/InviteModal'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

/* ── Channel type icons ─────────────────────────────────── */
const HashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ opacity:.45, flexShrink:0 }}>
    <path d="M10.59 2H8.59L7.26 9H2v2h4.93L5.93 17H2v2h3.59l-1 5h2l1-5h7l-1 5h2l1-5H21v-2h-3.59l1-6H22V9h-4.26L18.59 2H16.59L15.26 9H8.26L9.59 2zM13.26 17H6.26l1-6h7l-1 6z"/>
  </svg>
)
const AnnIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ opacity:.45, flexShrink:0 }}>
    <path d="M18 11v2h4v-2h-4zm-2 6.61c.96.71 2.21 1.65 3.2 2.39.4-.53.8-1.07 1.2-1.6-.99-.74-2.24-1.68-3.2-2.4-.4.54-.8 1.08-1.2 1.61zM20.4 5.6c-.4-.53-.8-1.07-1.2-1.6-.99.74-2.24 1.68-3.2 2.4.4.53.8 1.07 1.2 1.6.96-.72 2.21-1.65 3.2-2.4zM4 9c-1.1 0-2 .9-2 2v2c0 1.1.9 2 2 2h1v4h2v-4h1l5 3V6L8 9H4zm11.5 3c0-1.33-.58-2.53-1.5-3.35v6.69c.92-.81 1.5-2.01 1.5-3.34z"/>
  </svg>
)
const TYPE_ICON = { text: <HashIcon/>, announcement: <AnnIcon/> }

/* ── Server dropdown ────────────────────────────────────── */
const ServerDropdown = ({ server, isOwner, canManageChannels, canManageServer, onInvite, onCreate, onCreateCat, onSettings, onLeave, onDelete, onClose }) => {
  const ref = useRef(null)
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [onClose])

  const managementItems = []
  if (canManageChannels) {
    managementItems.push(
      { label: 'Create Channel',   icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/></svg>, action: onCreate },
      { label: 'Create Category',  icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20 6h-8l-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z"/></svg>, action: onCreateCat },
    )
  }
  if (canManageServer) {
    managementItems.push({ label: 'Server Settings',  icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/></svg>, action: onSettings })
  }

  const sections = [
    [
      { label: 'Invite People', icon: '👥', action: onInvite, highlight: true },
    ],
    managementItems,
    [
      isOwner
        ? { label: 'Delete Server', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>, action: onDelete, danger: true }
        : { label: 'Leave Server',  icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M10.09 15.59L11.5 17l5-5-5-5-1.41 1.41L12.67 11H3v2h9.67l-2.58 2.59zM19 3H5c-1.11 0-2 .9-2 2v4h2V5h14v14H5v-4H3v4c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/></svg>, action: onLeave, danger: true },
    ],
  ]

  return (
    <div ref={ref} style={{
      position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 300,
      background: '#111214', border: '1px solid rgba(255,255,255,.08)',
      borderRadius: 8, boxShadow: '0 16px 48px rgba(0,0,0,.7)',
      overflow: 'hidden', marginTop: 4, padding: '4px',
    }}>
      {sections.map((group, gi) => (
        <div key={gi}>
          {gi > 0 && <div style={{ height: 1, background: 'rgba(255,255,255,.06)', margin: '4px 0' }}/>}
          {group.map((item, i) => (
            <button key={i} onClick={() => { item.action?.(); onClose() }}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 10px', background: 'none', border: 'none',
                color: item.danger ? '#f87171' : item.highlight ? '#c9d1f9' : '#dbdee1',
                cursor: 'pointer', fontSize: 14, fontWeight: 500,
                borderRadius: 5, transition: 'background .1s',
                letterSpacing: '-.01em',
              }}
              onMouseEnter={e => e.currentTarget.style.background = item.danger ? 'rgba(239,68,68,.15)' : item.highlight ? 'rgba(88,101,242,.3)' : 'rgba(255,255,255,.07)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              <span style={{ color: item.danger ? '#f87171' : item.highlight ? '#c9d1f9' : 'rgba(255,255,255,.4)', fontSize: typeof item.icon === 'string' ? 15 : 14, flexShrink: 0, width: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {item.icon}
              </span>
              {item.label}
            </button>
          ))}
        </div>
      ))}
    </div>
  )
}

/* ── Create channel modal ───────────────────────────────── */
const CreateChannelModal = ({ server, onClose, onCreated }) => {
  const [name, setName] = useState('')
  const [type, setType] = useState('text')
  const [category, setCategory] = useState('Text Channels')
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    if (!name.trim()) return
    setBusy(true)
    try {
      const clean = name.toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'')
      await api.post('/channels', { name: clean, type, serverId: server._id, category: category || 'General' })
      onCreated?.(); onClose()
    } catch {}
    setBusy(false)
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.75)', backdropFilter:'blur(6px)', zIndex:600, display:'flex', alignItems:'center', justifyContent:'center' }}
      onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{ background:'#2b2d31', borderRadius:10, padding:'28px 24px', width:460, boxShadow:'0 24px 80px rgba(0,0,0,.7)', animation:'slide-up .15s ease' }}>
        <div style={{ fontSize:20, fontWeight:700, color:'#f2f3f5', marginBottom:4, letterSpacing:'-.02em' }}>Create Channel</div>
        <div style={{ fontSize:13, color:'#949ba4', marginBottom:20 }}>In <span style={{ color:'#f2f3f5', fontWeight:600 }}>{server?.name}</span></div>

        <div style={{ marginBottom:16 }}>
          <label style={{ fontSize:12, fontWeight:700, color:'#b5bac1', display:'block', marginBottom:8, textTransform:'uppercase', letterSpacing:'.06em' }}>Channel Type</label>
          {['text','announcement'].map(t => (
            <div key={t} onClick={()=>setType(t)} style={{
              display:'flex', alignItems:'center', gap:12, padding:'12px 14px', borderRadius:6, marginBottom:4,
              background: type===t ? 'rgba(88,101,242,.15)' : '#232428',
              border: type===t ? '1px solid #5865f2' : '1px solid transparent',
              cursor:'pointer', transition:'all .12s',
            }}>
              <div style={{ width:36, height:36, borderRadius:'50%', background: type===t ? 'rgba(88,101,242,.2)' : 'rgba(255,255,255,.05)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                {t==='text' ? <HashIcon/> : <AnnIcon/>}
              </div>
              <div>
                <div style={{ fontSize:14, fontWeight:600, color:'#f2f3f5' }}>{t==='text' ? 'Text Channel' : 'Announcement'}</div>
                <div style={{ fontSize:12, color:'#949ba4' }}>{t==='text' ? 'Send messages, images and more' : 'Important updates for your server'}</div>
              </div>
              {type===t && (
                <div style={{ marginLeft:'auto', width:20, height:20, borderRadius:'50%', background:'#5865f2', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="white"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={{ marginBottom:16 }}>
          <label style={{ fontSize:12, fontWeight:700, color:'#b5bac1', display:'block', marginBottom:8, textTransform:'uppercase', letterSpacing:'.06em' }}>Channel Name</label>
          <div style={{ display:'flex', alignItems:'center', gap:8, background:'#1e1f22', border:'1px solid rgba(255,255,255,.08)', borderRadius:4, padding:'0 12px' }}>
            <span style={{ color:'#949ba4', fontSize:16, fontWeight:500 }}>#</span>
            <input autoFocus value={name} onChange={e=>setName(e.target.value)}
              onKeyDown={e=>{if(e.key==='Enter')submit();if(e.key==='Escape')onClose()}}
              placeholder="new-channel" style={{ flex:1, background:'none', border:'none', outline:'none', color:'#f2f3f5', fontSize:14, padding:'11px 0' }}/>
          </div>
        </div>

        <div style={{ marginBottom:24 }}>
          <label style={{ fontSize:12, fontWeight:700, color:'#b5bac1', display:'block', marginBottom:8, textTransform:'uppercase', letterSpacing:'.06em' }}>Category</label>
          <input value={category} onChange={e=>setCategory(e.target.value)}
            style={{ width:'100%', background:'#1e1f22', border:'1px solid rgba(255,255,255,.08)', borderRadius:4, padding:'11px 12px', color:'#f2f3f5', fontSize:14, outline:'none' }}/>
        </div>

        <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
          <button onClick={onClose} style={{ padding:'10px 20px', borderRadius:4, background:'none', border:'none', color:'#f2f3f5', fontSize:14, cursor:'pointer', transition:'color .12s' }}
            onMouseEnter={e=>e.currentTarget.style.textDecoration='underline'} onMouseLeave={e=>e.currentTarget.style.textDecoration='none'}>
            Cancel
          </button>
          <button onClick={submit} disabled={busy||!name.trim()} style={{ padding:'10px 20px', borderRadius:4, background: busy||!name.trim() ? '#3c4043' : '#5865f2', border:'none', color: busy||!name.trim() ? '#72767d' : '#fff', fontSize:14, fontWeight:600, cursor: busy||!name.trim() ? 'not-allowed' : 'pointer', transition:'background .12s' }}>
            {busy ? 'Creating…' : 'Create Channel'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Create category modal ──────────────────────────────── */
const CreateCategoryModal = ({ server, onClose, onCreated }) => {
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    if (!name.trim()) return
    setBusy(true)
    try {
      await api.post('/channels', { name:'general', type:'text', serverId:server._id, category:name.trim() })
      onCreated?.(); onClose()
    } catch {}
    setBusy(false)
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.75)', backdropFilter:'blur(6px)', zIndex:600, display:'flex', alignItems:'center', justifyContent:'center' }}
      onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{ background:'#2b2d31', borderRadius:10, padding:'28px 24px', width:460, boxShadow:'0 24px 80px rgba(0,0,0,.7)', animation:'slide-up .15s ease' }}>
        <div style={{ fontSize:20, fontWeight:700, color:'#f2f3f5', marginBottom:4 }}>Create Category</div>
        <div style={{ fontSize:13, color:'#949ba4', marginBottom:20 }}>A category groups related channels together.</div>
        <div style={{ marginBottom:24 }}>
          <label style={{ fontSize:12, fontWeight:700, color:'#b5bac1', display:'block', marginBottom:8, textTransform:'uppercase', letterSpacing:'.06em' }}>Category Name</label>
          <input autoFocus value={name} onChange={e=>setName(e.target.value)}
            onKeyDown={e=>{if(e.key==='Enter')submit();if(e.key==='Escape')onClose()}}
            placeholder="New Category" style={{ width:'100%', background:'#1e1f22', border:'1px solid rgba(255,255,255,.08)', borderRadius:4, padding:'11px 12px', color:'#f2f3f5', fontSize:14, outline:'none' }}/>
        </div>
        <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
          <button onClick={onClose} style={{ padding:'10px 20px', borderRadius:4, background:'none', border:'none', color:'#f2f3f5', fontSize:14, cursor:'pointer' }}
            onMouseEnter={e=>e.currentTarget.style.textDecoration='underline'} onMouseLeave={e=>e.currentTarget.style.textDecoration='none'}>
            Cancel
          </button>
          <button onClick={submit} disabled={busy||!name.trim()} style={{ padding:'10px 20px', borderRadius:4, background: busy||!name.trim() ? '#3c4043' : '#5865f2', border:'none', color: busy||!name.trim() ? '#72767d' : '#fff', fontSize:14, fontWeight:600, cursor: busy||!name.trim() ? 'not-allowed' : 'pointer' }}>
            {busy ? 'Creating…' : 'Create Category'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════ */
const ChannelSidebar = ({ server, channels, activeChannelId, onSelectChannel, onLeaveServer, onServerUpdated, onChannelsChanged }) => {
  const { user } = useAuth()
  const [dropOpen,      setDropOpen]      = useState(false)
  const [showInvite,    setShowInvite]    = useState(false)
  const [showCreateCh,  setShowCreateCh]  = useState(false)
  const [showCreateCat, setShowCreateCat] = useState(false)
  const [showSettings,  setShowSettings]  = useState(false)
  const [localServer,   setLocalServer]   = useState(null)

  const isOwner = (() => {
    if (!server || !user) return false
    return server.owner === user._id || server.owner?._id === user._id ||
      server.owner?._id?.toString() === user._id?.toString()
  })()

  const member = server?.members?.find(m => {
    const uid = m.user?._id?.toString() || m.user?.toString()
    return uid && user?._id && uid === user._id.toString()
  })

  const perms = useMemo(() => {
    if (!member) return {}
    if (member.role === 'owner') return { all: true, manageChannels: true, manageServer: true }

    const basePerms = {
      manageServer:    ['admin'].includes(member.role),
      manageRoles:     ['admin'].includes(member.role),
      manageChannels:  ['admin', 'moderator'].includes(member.role),
      kickMembers:     ['admin', 'moderator'].includes(member.role),
      banMembers:      ['admin'].includes(member.role),
      manageMessages:  ['admin', 'moderator'].includes(member.role),
      sendMessages:    true,
      readMessages:    true,
      mentionEveryone: ['admin'].includes(member.role),
      manageInvites:   ['admin', 'moderator'].includes(member.role),
    }
    if (!member.roles || member.roles.length === 0) return basePerms

    const merged = { ...basePerms }
    for (const role of member.roles) {
      if (!role || !role.permissions) continue
      for (const [perm, val] of Object.entries(role.permissions)) {
        if (val) merged[perm] = true
      }
    }
    return merged
  }, [member])

  const canManageChannels = isOwner || perms.all || perms.manageChannels
  const canManageServer   = isOwner || perms.all || perms.manageServer

  const grouped = (channels || [])
    .filter(ch => ch.type !== 'voice')
    .reduce((acc, ch) => {
      const cat = ch.category || 'General'
      if (!acc[cat]) acc[cat] = []
      acc[cat].push(ch)
      return acc
    }, {})

  const handleDelete = async () => {
    if (!window.confirm('Delete this server permanently?')) return
    try { await api.delete(`/servers/${server._id}`); onLeaveServer?.() } catch {}
  }
  const handleLeave = async () => {
    if (!window.confirm('Leave this server?')) return
    onLeaveServer?.()
  }

  return (
    <div className="csb">
      {/* Header */}
      <div className="csb-head" style={{ position:'relative' }} onClick={() => setDropOpen(o=>!o)}>
        <span className="csb-name">{server?.name}</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"
          style={{ color:'var(--t2)', flexShrink:0, transition:'transform .2s', transform: dropOpen?'rotate(180deg)':'rotate(0deg)' }}>
          <path d="M7 10l5 5 5-5z"/>
        </svg>
        {dropOpen && (
          <ServerDropdown
            server={server} isOwner={isOwner}
            canManageChannels={canManageChannels}
            canManageServer={canManageServer}
            onInvite={() => setShowInvite(true)}
            onCreate={() => setShowCreateCh(true)}
            onCreateCat={() => setShowCreateCat(true)}
            onSettings={() => setShowSettings(true)}
            onLeave={handleLeave}
            onDelete={handleDelete}
            onClose={() => setDropOpen(false)}
          />
        )}
      </div>

      {/* Channels */}
      <div className="csb-scroll">
        {Object.entries(grouped).map(([cat, chs]) => (
          <div key={cat}>
            <div className="csb-cat">
              <span>{cat}</span>
              <div className="csb-cat-line"/>
            </div>
            {chs.map(ch => (
              <div key={ch._id}
                className={`csb-ch${ch._id === activeChannelId ? ' active' : ''}`}
                onClick={() => onSelectChannel(ch)}>
                <span className="csb-ch-icon">{TYPE_ICON[ch.type] || TYPE_ICON.text}</span>
                <span className="csb-ch-name">{ch.name}</span>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Modals */}
      {showInvite && (
        <InviteModal server={localServer || server} onClose={() => setShowInvite(false)}/>
      )}
      {showCreateCh && (
        <CreateChannelModal server={server} onClose={() => setShowCreateCh(false)} onCreated={onChannelsChanged}/>
      )}
      {showCreateCat && (
        <CreateCategoryModal server={server} onClose={() => setShowCreateCat(false)} onCreated={onChannelsChanged}/>
      )}
      {showSettings && (
        <ServerSettings
          server={localServer || server}
          onClose={() => setShowSettings(false)}
          onUpdated={s => { setLocalServer(s); onServerUpdated?.(s) }}
          onDeleted={() => { setShowSettings(false); onLeaveServer?.() }}
        />
      )}
    </div>
  )
}

export default ChannelSidebar
