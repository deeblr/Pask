import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast }  from '../components/ui/Toast'
import api from '../utils/api'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
const toUrl = p => p ? (p.startsWith('http') ? p : `${API_URL}/${p.replace(/^\//, '')}`) : null

/* ── constants ─────────────────────────────────────────── */
const STATUS_META = {
  online:  { color: '#4caf7d', label: 'Online'         },
  idle:    { color: '#d4a843', label: 'Idle'            },
  dnd:     { color: '#c95f5f', label: 'Do Not Disturb' },
  offline: { color: '#5c5a52', label: 'Offline'        },
}
const BANNER_PRESETS = [
  '#e5a245','#4caf7d','#6a9fc0','#c95f5f',
  '#9b59b6','#e67e22','#1abc9c','#e91e63',
]

/* ── shared sub-components ─────────────────────────────── */
const Av = ({ user, size = 64 }) => (
  <div style={{
    width: size, height: size, borderRadius: 'var(--r3)',
    background: user?.bannerColor ? `${user.bannerColor}1a` : 'var(--a-lo)',
    border: `2px solid ${user?.bannerColor ? `${user.bannerColor}44` : 'var(--bm)'}`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'var(--mono)', fontSize: Math.round(size * .3), fontWeight: 700,
    color: user?.bannerColor || 'var(--a)', overflow: 'hidden', flexShrink: 0,
  }}>
    {user?.avatar
      ? <img src={toUrl(user.avatar)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}  onError={e=>e.target.style.display="none"}/>
      : user?.username?.slice(0, 2).toUpperCase()}
  </div>
)

const Field = ({ label, value, onChange, type = 'text', placeholder, maxLen, multiline, hint }) => (
  <div className="form-field">
    <label className="form-label">{label}</label>
    {multiline
      ? <textarea className="form-textarea" value={value} onChange={e => onChange(e.target.value)}
          placeholder={placeholder} maxLength={maxLen} rows={3} />
      : <input className="form-input" type={type} value={value} onChange={e => onChange(e.target.value)}
          placeholder={placeholder} maxLength={maxLen} />}
    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
      {hint && <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t2)' }}>{hint}</span>}
      {maxLen && <span className="form-hint" style={{ marginTop: 0 }}>{value?.length || 0}/{maxLen}</span>}
    </div>
  </div>
)

/* ════════════════════════════════════════════════════════
   BOTS TAB
════════════════════════════════════════════════════════ */
const BotsTab = () => {
  const [bots,      setBots]      = useState([])
  const [loading,   setLoading]   = useState(true)
  const [creating,  setCreating]  = useState(false)
  const [newBot,    setNewBot]    = useState({ name: '', prefix: '!', description: '' })
  const [busy,      setBusy]      = useState(false)
  const [revealed,  setRevealed]  = useState({})   // botId → token string
  const [showNew,   setShowNew]   = useState(false)
  const toast = useToast()

  const load = async () => {
    setLoading(true)
    try { const r = await api.get('/bots'); setBots(r.data) } catch {}
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const create = async () => {
    if (!newBot.name.trim()) return
    setBusy(true)
    try {
      const r = await api.post('/bots', newBot)
      setBots(p => [...p, r.data])
      setRevealed(p => ({ ...p, [r.data._id]: r.data.token }))
      setNewBot({ name: '', prefix: '!', description: '' })
      setShowNew(false)
      toast.success(`Bot "${r.data.name}" created!`)
    } catch (e) { toast.error(e.response?.data?.message || 'Failed') }
    setBusy(false)
  }

  const deleteBot = async (bot) => {
    if (!window.confirm(`Delete bot "${bot.name}"? This cannot be undone.`)) return
    try {
      await api.delete(`/bots/${bot._id}`)
      setBots(p => p.filter(b => b._id !== bot._id))
      toast.success('Bot deleted')
    } catch { toast.error('Failed') }
  }

  const regenToken = async (bot) => {
    if (!window.confirm('Regenerate token? The old token will stop working immediately.')) return
    try {
      const r = await api.post(`/bots/${bot._id}/regen`)
      setRevealed(p => ({ ...p, [bot._id]: r.data.token }))
      toast.success('Token regenerated')
    } catch { toast.error('Failed') }
  }

  const copyToken = (token) => {
    navigator.clipboard.writeText(token)
    toast.success('Token copied!')
  }

  const downloadSDK = (bot) => {
    const token = revealed[bot._id]
    const code = generateSDK(bot, token)
    const blob = new Blob([code], { type: 'text/javascript' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${bot.name.replace(/\s+/g, '_')}_bot.js`
    a.click()
  }

  const generateSDK = (bot, token) => `/**
 * ${bot.name} — PASK Bot
 * Auto-generated bot file
 *
 * Install dependencies:
 *   npm install socket.io-client
 *
 * Run:
 *   node ${bot.name.replace(/\s+/g, '_')}_bot.js
 *
 * Commands use prefix: ${bot.prefix}
 */

const { io } = require('socket.io-client')

// ── Config ─────────────────────────────────────────────
const TOKEN   = '${token || 'YOUR_BOT_TOKEN_HERE'}'
const PREFIX  = '${bot.prefix}'
const GATEWAY = process.env.PASK_URL || 'http://localhost:5000'

// ── Connect to PASK Gateway ────────────────────────────
const bot = io(\`\${GATEWAY}/bot-gateway\`, {
  auth: { token: TOKEN },
  transports: ['websocket'],
  reconnection: true,
  reconnectionDelay: 3000,
  reconnectionAttempts: Infinity,
})

// ── Helpers ────────────────────────────────────────────
const send = (channelId, content) => {
  bot.emit('SEND_MESSAGE', { channelId, content })
}

// ── Events ────────────────────────────────────────────
bot.on('connect', () => {
  console.log('🔌 Connected to PASK gateway')
})

bot.on('connect_error', (err) => {
  console.error('❌ Connection error:', err.message)
})

bot.on('disconnect', (reason) => {
  console.log('🔌 Disconnected:', reason)
})

bot.on('READY', (data) => {
  console.log(\`✅ \${data.name} is online! Listening with prefix "\${PREFIX}"\`)
})

bot.on('ERROR', (data) => {
  console.error('⛔ Gateway error:', data.code, data.message)
  if (data.code === 4004) process.exit(1)
})

// ── Command Handler ────────────────────────────────────
bot.on('MESSAGE_CREATE', (msg) => {
  // Ignore non-commands
  if (!msg.isCommand) return

  const { commandName, args, channelId, author } = msg

  switch (commandName?.toLowerCase()) {

    case 'ping':
      send(channelId, \`🏓 Pong! Hello **\${author.username}**!\`)
      break

    case 'hello':
      send(channelId, \`👋 Hello, **\${author.username}**! I'm \${bot.id ? '${bot.name}' : 'a bot'}.\`)
      break

    case 'echo':
      if (!args.length) {
        send(channelId, '⚠️ Usage: \`${bot.prefix}echo <text>\`')
      } else {
        send(channelId, args.join(' '))
      }
      break

    case 'roll': {
      const sides = parseInt(args[0]) || 6
      const result = Math.floor(Math.random() * sides) + 1
      send(channelId, \`🎲 Rolling a d\${sides}... **\${result}**!\`)
      break
    }

    case 'flip':
      send(channelId, \`🪙 \${Math.random() > 0.5 ? '**Heads!**' : '**Tails!**'}\`)
      break

    case 'help':
      send(channelId, [
        '**Available Commands:**',
        \`\\\`\${PREFIX}ping\\\` — Check if bot is alive\`,
        \`\\\`\${PREFIX}hello\\\` — Greet the bot\`,
        \`\\\`\${PREFIX}echo <text>\\\` — Echo your message\`,
        \`\\\`\${PREFIX}roll [sides]\\\` — Roll a dice (default d6)\`,
        \`\\\`\${PREFIX}flip\\\` — Flip a coin\`,
        \`\\\`\${PREFIX}help\\\` — Show this list\`,
      ].join('\\n'))
      break

    default:
      // Unknown command — silently ignore or uncomment below:
      // send(channelId, \`❓ Unknown command. Try \\\`\${PREFIX}help\\\`\`)
      break
  }
})

console.log(\`🤖 Starting ${bot.name} (prefix: "\${PREFIX}")...\`)
`

  const copyInvite = (bot) => {
    const link = `${window.location.origin}/bot/${bot._id}`
    navigator.clipboard.writeText(link)
    toast.success('Invite link copied!')
  }

  const openInviteLink = (bot) => {
    window.open(`/bot/${bot._id}`, '_blank')
  }

  if (loading) return (
    <div style={{ padding:'32px 0', textAlign:'center' }}>
      <div className="spinner" style={{ margin:'0 auto' }}/>
    </div>
  )

  return (
    <div>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:20 }}>
        <div>
          <div style={{ fontSize:16, fontWeight:700, color:'var(--t0)', marginBottom:4 }}>My Bots</div>
          <div style={{ fontSize:13, color:'var(--t2)' }}>
            Create bots for your servers. Bots use prefix commands (e.g. <code style={{ fontFamily:'var(--mono)', background:'var(--s4)', padding:'1px 5px', borderRadius:3 }}>!ping</code>).
          </div>
        </div>
        <button className="btn btn-amber" onClick={() => setShowNew(v=>!v)} style={{ flexShrink:0 }}>
          + New Bot
        </button>
      </div>

      {/* Create form */}
      {showNew && (
        <div style={{ background:'var(--s3)', border:'1px solid var(--bm)', borderRadius:'var(--r3)', padding:16, marginBottom:16 }}>
          <div style={{ fontSize:13, fontWeight:700, color:'var(--t0)', marginBottom:12 }}>Create a New Bot</div>
          <Field label="Bot Name" value={newBot.name} onChange={v=>setNewBot(p=>({...p,name:v}))} placeholder="My Awesome Bot" maxLen={32}/>
          <Field label="Command Prefix" value={newBot.prefix} onChange={v=>setNewBot(p=>({...p,prefix:v}))} placeholder="!" maxLen={8} hint="e.g. !, ?, $, >"/>
          <Field label="Description (optional)" value={newBot.description} onChange={v=>setNewBot(p=>({...p,description:v}))} placeholder="What does this bot do?" maxLen={256}/>
          <div style={{ display:'flex', gap:8, marginTop:4 }}>
            <button className="btn btn-amber" onClick={create} disabled={busy||!newBot.name.trim()} style={{ flex:1 }}>
              {busy ? 'Creating…' : 'Create Bot'}
            </button>
            <button className="btn btn-ghost" onClick={()=>setShowNew(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Bot list */}
      {bots.length === 0 && !showNew ? (
        <div style={{ padding:'48px 0', textAlign:'center' }}>
          <div style={{ fontSize:40, marginBottom:12 }}>🤖</div>
          <div style={{ fontSize:15, fontWeight:600, color:'var(--t1)', marginBottom:6 }}>No bots yet</div>
          <div style={{ fontSize:13, color:'var(--t2)' }}>Create your first bot to get started.</div>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {bots.map(bot => (
            <div key={bot._id} style={{ background:'var(--s3)', border:'1px solid var(--b)', borderRadius:'var(--r3)', overflow:'hidden' }}>
              {/* Bot header */}
              <div style={{ padding:'14px 16px', display:'flex', alignItems:'center', gap:12, borderBottom:'1px solid var(--b)' }}>
                {/* Avatar — clickable to upload */}
                <label htmlFor={`bot-av-${bot._id}`} style={{ cursor:'pointer', flexShrink:0 }} title="Change avatar">
                  <div style={{ width:44, height:44, borderRadius:'50%', background: bot.avatar ? 'transparent' : 'rgba(88,101,242,.18)', border:'1px solid rgba(88,101,242,.35)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--mono)', fontSize:16, fontWeight:700, color:'#7289da', overflow:'hidden', position:'relative' }}>
                    {bot.avatar
                      ? <img src={toUrl(bot.avatar)} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={e=>e.target.style.display='none'}/>
                      : bot.name?.[0]?.toUpperCase()
                    }
                    <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, opacity:0, transition:'all .15s' }}
                      onMouseEnter={e=>{ e.currentTarget.style.background='rgba(0,0,0,.55)'; e.currentTarget.style.opacity=1 }}
                      onMouseLeave={e=>{ e.currentTarget.style.background='rgba(0,0,0,0)'; e.currentTarget.style.opacity=0 }}>
                      📷
                    </div>
                  </div>
                  <input id={`bot-av-${bot._id}`} type="file" accept="image/*" style={{ display:'none' }}
                    onChange={async (e) => {
                      const file = e.target.files[0]; if (!file) return
                      if (file.size > 5*1024*1024) { toast.error('Max 5 MB'); return }
                      try {
                        const fd = new FormData(); fd.append('avatar', file)
                        const r = await api.post(`/bots/${bot._id}/avatar`, fd, { headers:{'Content-Type':'multipart/form-data'} })
                        setBots(p => p.map(b => b._id === bot._id ? { ...b, avatar: r.data.avatar } : b))
                        toast.success('Bot avatar updated!')
                      } catch { toast.error('Upload failed') }
                    }}
                  />
                </label>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ fontSize:15, fontWeight:700, color:'var(--t0)' }}>{bot.name}</span>
                    <span style={{
                      fontSize:10, fontFamily:'var(--mono)', fontWeight:700, padding:'1px 6px', borderRadius:4,
                      background: bot.online ? 'rgba(35,165,90,.15)' : 'var(--s4)',
                      color: bot.online ? 'var(--ok)' : 'var(--t2)',
                      border: `1px solid ${bot.online ? 'rgba(35,165,90,.3)' : 'var(--b)'}`,
                    }}>
                      {bot.online ? '● ONLINE' : '○ OFFLINE'}
                    </span>
                  </div>
                  <div style={{ fontSize:12, color:'var(--t2)', marginTop:2 }}>
                    Prefix: <code style={{ fontFamily:'var(--mono)', background:'var(--s4)', padding:'1px 4px', borderRadius:3, color:'var(--t1)' }}>{bot.prefix}</code>
                    {bot.description && <span style={{ marginLeft:8 }}>· {bot.description}</span>}
                  </div>
                </div>
                <div style={{ display:'flex', gap:6 }}>
                  <button className="btn btn-amber btn-sm" onClick={() => openInviteLink(bot)} title="Add to Server">
                    + Add to Server
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => copyInvite(bot)} title="Copy invite link" style={{ fontSize:13 }}>
                    🔗
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => deleteBot(bot)} style={{ color:'var(--err)', borderColor:'rgba(242,63,67,.2)' }}>
                    Delete
                  </button>
                </div>
              </div>

              {/* Token section */}
              <div style={{ padding:'12px 16px', background:'var(--s2)' }}>
                <div style={{ fontSize:10, fontWeight:700, color:'var(--t2)', letterSpacing:'.08em', textTransform:'uppercase', marginBottom:8 }}>
                  Bot Token
                </div>
                <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                  <div style={{
                    flex:1, background:'var(--s1)', border:'1px solid var(--b)', borderRadius:'var(--r2)',
                    padding:'8px 12px', fontFamily:'var(--mono)', fontSize:12, color:'var(--t1)',
                    overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
                    letterSpacing: revealed[bot._id] ? '.02em' : '.1em',
                  }}>
                    {revealed[bot._id] || '•'.repeat(36)}
                  </div>
                  {revealed[bot._id] ? (
                    <button className="btn btn-ghost btn-sm" onClick={() => copyToken(revealed[bot._id])}>Copy</button>
                  ) : (
                    <button className="btn btn-ghost btn-sm" onClick={async () => {
                      try { const r = await api.get(`/bots/${bot._id}`); setRevealed(p=>({...p,[bot._id]:r.data.token})) }
                      catch { toast.error('Failed to fetch token') }
                    }}>Reveal</button>
                  )}
                  <button className="btn btn-ghost btn-sm" onClick={() => regenToken(bot)} title="Regenerate token">↺</button>
                </div>
                <div style={{ fontSize:10, color:'var(--t3)', fontFamily:'var(--mono)', marginTop:6 }}>
                  ⚠ Never share your token. Treat it like a password.
                </div>

                {/* Bot ID */}
                <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:10 }}>
                  <span style={{ fontSize:10, fontWeight:700, color:'var(--t2)', letterSpacing:'.08em', textTransform:'uppercase' }}>Bot ID</span>
                  <code style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--t1)', background:'var(--s1)', padding:'2px 8px', borderRadius:4, flex:1 }}>{bot._id}</code>
                  <button className="btn btn-ghost btn-sm" onClick={() => { navigator.clipboard.writeText(bot._id); toast.success('ID copied!') }}>Copy</button>
                </div>

                {/* Download SDK */}
                <div style={{ marginTop:12, paddingTop:12, borderTop:'1px solid var(--b)', display:'flex', gap:8, alignItems:'center' }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:12, fontWeight:600, color:'var(--t1)', marginBottom:2 }}>Download Bot Starter File</div>
                    <div style={{ fontSize:11, color:'var(--t2)' }}>
                      JavaScript file with {bot.prefix}ping, {bot.prefix}echo, {bot.prefix}roll and more.
                      {!revealed[bot._id] && ' Reveal token first to embed it in the file.'}
                    </div>
                  </div>
                  <button
                    className="btn btn-amber btn-sm"
                    onClick={() => downloadSDK(bot)}
                    disabled={!revealed[bot._id]}
                    title={!revealed[bot._id] ? 'Reveal token first' : 'Download bot.js'}
                  >
                    ↓ Download
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick setup guide */}
      <div style={{ marginTop:20, padding:14, background:'var(--s3)', border:'1px solid var(--b)', borderRadius:'var(--r3)' }}>
        <div style={{ fontSize:11, fontWeight:700, color:'var(--t2)', letterSpacing:'.08em', textTransform:'uppercase', marginBottom:10 }}>Quick Setup</div>
        {[
          ['1', 'Create a bot above and copy its token'],
          ['2', 'Download the starter .js file'],
          ['3', 'Run: npm install socket.io-client'],
          ['4', 'Run: node your_bot.js'],
          ['5', 'Copy the invite link (🔗) and share it — anyone who clicks will see the Add to Server page'],
        ].map(([n, txt]) => (
          <div key={n} style={{ display:'flex', gap:10, marginBottom:6, alignItems:'flex-start' }}>
            <span style={{ width:20, height:20, borderRadius:'50%', background:'var(--s5)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--mono)', fontSize:10, fontWeight:700, color:'var(--t0)', flexShrink:0, marginTop:1 }}>{n}</span>
            <span style={{ fontSize:12, color:'var(--t1)' }}>{txt}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════════════════
   EDIT PAGE — my own settings
════════════════════════════════════════════════════════ */
const EditProfile = ({ profile, onSaved, modal, onClose }) => {
  const { updateUser } = useAuth()
  const toast  = useToast()
  const fileRef = useRef(null)
  const navigate = useNavigate()

  const [tab,  setTab]  = useState('profile')
  const [form, setForm] = useState({
    username:    profile.username    || '',
    bio:         profile.bio         || '',
    pronouns:    profile.pronouns    || '',
    bannerColor: profile.bannerColor || '#e5a245',
  })
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' })
  const [avatarPreview, setAvatarPreview] = useState(profile.avatar || null)
  const [uploading, setUploading] = useState(false)
  const [saving,    setSaving]    = useState(false)

  const f = k => v => setForm(p => ({ ...p, [k]: v }))

  /* ── Avatar ──────────────────────────────────────────── */
  const onFile = async (e) => {
    const file = e.target.files[0]; if (!file) return
    if (file.size > 5 * 1024 * 1024) { toast.error('Max 5 MB'); return }
    setAvatarPreview(URL.createObjectURL(file))
    setUploading(true)
    try {
      const fd = new FormData(); fd.append('avatar', file)
      const r = await api.post('/upload/avatar', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      updateUser(r.data.user)
      toast.success('Avatar updated!')
    } catch { toast.error('Upload failed'); setAvatarPreview(profile.avatar) }
    setUploading(false)
  }

  const removeAvatar = async () => {
    setUploading(true)
    try { const r = await api.delete('/upload/avatar'); setAvatarPreview(null); updateUser(r.data.user); toast.success('Removed') }
    catch { toast.error('Failed') }
    setUploading(false)
  }

  /* ── Save profile ────────────────────────────────────── */
  const saveProfile = async () => {
    setSaving(true)
    try {
      const r = await api.put('/users/me', form)
      updateUser(r.data); onSaved(r.data); toast.success('Profile saved!')
    } catch (e) { toast.error(e.response?.data?.message || 'Failed') }
    setSaving(false)
  }

  /* ── Change password ─────────────────────────────────── */
  const savePassword = async () => {
    if (pw.next !== pw.confirm) { toast.error('Passwords do not match'); return }
    if (pw.next.length < 6) { toast.error('Min 6 characters'); return }
    setSaving(true)
    try {
      await api.put('/users/me/password', { currentPassword: pw.current, newPassword: pw.next })
      toast.success('Password changed!'); setPw({ current: '', next: '', confirm: '' })
    } catch (e) { toast.error(e.response?.data?.message || 'Incorrect password') }
    setSaving(false)
  }

  const TABS = [
    { key: 'profile',  label: 'Profile'  },
    { key: 'avatar',   label: 'Avatar'   },
    { key: 'security', label: 'Security' },
    { key: 'bots',     label: 'My Bots'  },
  ]

  return (
    <div style={modal ? { background: 'transparent', display: 'flex', justifyContent: 'center', padding: '40px 12px' } : { minHeight: '100vh', background: 'var(--s0)', display: 'flex', backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 39px,var(--b) 39px,var(--b) 40px),repeating-linear-gradient(90deg,transparent,transparent 39px,var(--b) 39px,var(--b) 40px)' }}>
      {/* Back button */}
      <button
        onClick={() => modal ? onClose?.() : navigate(-1)}
        style={{ position: 'fixed', top: 16, left: 16, display: 'flex', alignItems: 'center', gap: 5, background: 'var(--s2)', border: '1px solid var(--b)', borderRadius: 'var(--r2)', padding: '6px 12px', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--t2)', cursor: 'pointer', transition: 'border-color .14s, color .14s', zIndex: 10 }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--bm)'; e.currentTarget.style.color = 'var(--a)' }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--b)'; e.currentTarget.style.color = 'var(--t2)' }}
      >
        ← {modal ? 'Close' : 'Back'}
      </button>

      <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '56px 16px 32px' }}>
        <div style={{ width: '100%', maxWidth: 660, display: 'flex', gap: 20 }}>

          {/* ── Sidebar nav ── */}
          <div style={{ width: 160, flexShrink: 0 }}>
            {/* Profile mini-card */}
            <div style={{ background: 'var(--s2)', border: '1px solid var(--bm)', borderRadius: 'var(--r3)', overflow: 'hidden', marginBottom: 14 }}>
              <div style={{ height: 44, background: form.bannerColor || 'var(--a-lo)' }} />
              <div style={{ padding: '0 10px 12px', marginTop: -20 }}>
                <Av user={{ ...profile, avatar: avatarPreview, bannerColor: form.bannerColor }} size={40} />
                <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 12, color: 'var(--t0)', marginTop: 8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {form.username || profile.username}
                </div>
                {form.pronouns && (
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t2)' }}>{form.pronouns}</div>
                )}
              </div>
            </div>

            {/* Nav links */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {TABS.map(t => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  style={{
                    padding: '7px 10px', textAlign: 'left', width: '100%',
                    fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 600,
                    background: tab === t.key ? 'var(--a-lo)' : 'transparent',
                    borderLeft: `2px solid ${tab === t.key ? 'var(--a)' : 'transparent'}`,
                    color: tab === t.key ? 'var(--a)' : 'var(--t2)',
                    border: 'none', borderRadius: 0, cursor: 'pointer',
                    transition: 'background .1s, color .1s',
                  }}
                  onMouseEnter={e => { if (tab !== t.key) { e.currentTarget.style.background = 'var(--s3)'; e.currentTarget.style.color = 'var(--t1)' } }}
                  onMouseLeave={e => { if (tab !== t.key) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--t2)' } }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Main panel ── */}
          <div style={{ flex: 1, background: 'var(--s2)', border: '1px solid var(--bm)', borderRadius: 'var(--r3)', padding: '20px 24px' }}>

            {/* ── Profile tab ── */}
            {tab === 'profile' && (
              <>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, color: 'var(--t2)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 16 }}>
                  Profile Info
                </div>

                <Field label="Username"  value={form.username}  onChange={f('username')}  placeholder="cooluser"  maxLen={32} />
                <Field label="Pronouns"  value={form.pronouns}  onChange={f('pronouns')}  placeholder="he/him"    maxLen={40} />
                <Field label="About Me"  value={form.bio}       onChange={f('bio')}        placeholder="Tell people something about yourself…" maxLen={190} multiline />

                {/* Banner Color */}
                <div className="form-field">
                  <label className="form-label">Banner Color</label>
                  <div style={{ height: 32, borderRadius: 'var(--r2)', background: form.bannerColor, marginBottom: 8, border: '1px solid var(--b)' }} />
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                    {BANNER_PRESETS.map(c => (
                      <div key={c} onClick={() => f('bannerColor')(c)} style={{
                        width: 22, height: 22, borderRadius: '50%', background: c, cursor: 'pointer', flexShrink: 0,
                        border: form.bannerColor === c ? '2px solid #fff' : '2px solid transparent',
                        outline: form.bannerColor === c ? `2px solid ${c}` : 'none', outlineOffset: 1,
                        boxShadow: `0 0 6px ${c}55`,
                      }} />
                    ))}
                    <label style={{ cursor: 'pointer' }}>
                      <input type="color" value={form.bannerColor} onChange={e => f('bannerColor')(e.target.value)} style={{ width: 22, height: 22, borderRadius: '50%', border: 'none', padding: 0, display: 'block' }} />
                    </label>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                  <button className="btn btn-amber" onClick={saveProfile} disabled={saving}>
                    {saving ? 'Saving…' : 'Save Changes'}
                  </button>
                </div>
              </>
            )}

            {/* ── Avatar tab ── */}
            {tab === 'avatar' && (
              <>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, color: 'var(--t2)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 16 }}>
                  Profile Avatar
                </div>

                {/* Current avatar */}
                <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', marginBottom: 24 }}>
                  <div style={{ position: 'relative' }}>
                    <Av user={{ ...profile, avatar: avatarPreview }} size={80} />
                    {uploading && (
                      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.55)', borderRadius: 'var(--r3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div className="spinner" style={{ width: 24, height: 24 }} />
                      </div>
                    )}
                  </div>
                  <div>
                    <div style={{ fontFamily: 'var(--mono)', fontWeight: 600, fontSize: 14, color: 'var(--t0)', marginBottom: 4 }}>
                      {profile.username}
                    </div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t2)', marginBottom: 12, lineHeight: 1.6 }}>
                      JPG, PNG, WebP, GIF supported.<br />Max file size: 5 MB
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input ref={fileRef} type="file" accept="image/*" onChange={onFile} style={{ display: 'none' }} />
                      <button className="btn btn-amber" onClick={() => fileRef.current?.click()} disabled={uploading}>
                        {uploading ? 'Uploading…' : 'Upload Image'}
                      </button>
                      {avatarPreview && (
                        <button className="btn btn-danger" onClick={removeAvatar} disabled={uploading}>
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ background: 'var(--s3)', border: '1px solid var(--b)', borderRadius: 'var(--r2)', padding: '10px 12px', fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t2)', lineHeight: 1.7 }}>
                  Your avatar is visible to all members on PASK. Keep it appropriate.
                </div>
              </>
            )}

            {/* ── Security tab ── */}
            {tab === 'security' && (
              <>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, color: 'var(--t2)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 16 }}>
                  Change Password
                </div>
                <div style={{ background: 'var(--s3)', border: '1px solid var(--b)', borderRadius: 'var(--r2)', padding: '10px 12px', fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t2)', marginBottom: 16, lineHeight: 1.7 }}>
                  You'll need your current password to confirm changes.
                </div>
                <Field label="Current Password" value={pw.current} onChange={v => setPw(p => ({ ...p, current: v }))} type="password" placeholder="••••••••" />
                <Field label="New Password"     value={pw.next}    onChange={v => setPw(p => ({ ...p, next:    v }))} type="password" placeholder="••••••••" hint="Minimum 6 characters" />
                <Field label="Confirm Password" value={pw.confirm} onChange={v => setPw(p => ({ ...p, confirm: v }))} type="password" placeholder="••••••••" />
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                  <button className="btn btn-amber" onClick={savePassword} disabled={saving || !pw.current || !pw.next}>
                    {saving ? 'Updating…' : 'Change Password'}
                  </button>
                </div>
              </>
            )}

            {/* ── Bots tab ── */}
            {tab === 'bots' && <BotsTab />}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════════════════
   VIEW PAGE — someone else's profile
════════════════════════════════════════════════════════ */
const ViewProfile = ({ profile, isMe, onEdit, modal, onClose }) => {
  const navigate = useNavigate()
  const toast    = useToast()
  const s = STATUS_META[profile.status] || STATUS_META.offline

  const openDM = async () => {
    try { const r = await api.post(`/dm/open/${profile._id}`); navigate(`/dm/${r.data._id}`) }
    catch { toast.error('Could not open DM') }
  }

  const addFriend = async () => {
    try { await api.post(`/friends/request/${profile._id}`); toast.success('Friend request sent!') }
    catch (e) { toast.error(e.response?.data?.message || 'Failed') }
  }

  return (
    <div style={modal ? { background: 'transparent', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '24px 16px' } : { minHeight: '100vh', background: 'var(--s0)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '48px 16px', backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 39px,var(--b) 39px,var(--b) 40px),repeating-linear-gradient(90deg,transparent,transparent 39px,var(--b) 39px,var(--b) 40px)' }}>
      <button
        onClick={() => modal ? onClose?.() : navigate(-1)}
        style={{ position: 'fixed', top: 16, left: 16, background: 'var(--s2)', border: '1px solid var(--b)', borderRadius: 'var(--r2)', padding: '6px 12px', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--t2)', cursor: 'pointer', transition: 'border-color .14s' }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--bm)'; e.currentTarget.style.color = 'var(--a)' }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--b)'; e.currentTarget.style.color = 'var(--t2)' }}>
        ← {modal ? 'Close' : 'Back'}
      </button>

      <div style={{ width: '100%', maxWidth: 440, background: 'var(--s2)', border: '1px solid var(--bm)', borderRadius: 'var(--r4)', overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,.5)' }}>
        {/* Banner */}
        <div style={{ height: 88, background: profile.bannerColor || 'var(--a-lo)', position: 'relative' }}>
          <div style={{ position: 'absolute', bottom: -24, left: 18 }}>
            <Av user={profile} size={52} />
          </div>
        </div>

        <div style={{ padding: '32px 18px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <div style={{ fontFamily: 'var(--mono)', fontWeight: 800, fontSize: 16, color: 'var(--t0)' }}>{profile.username}</div>
              {profile.pronouns && <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t2)', marginTop: 1 }}>{profile.pronouns}</div>}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 5, fontFamily: 'var(--mono)', fontSize: 10, color: s.color }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.color, display: 'inline-block' }} />
                {s.label}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 5, marginTop: 2 }}>
              {isMe
                ? <button className="btn btn-sm btn-amber" onClick={onEdit}>Edit Profile</button>
                : <>
                    {!profile.isFriend && !profile.requestSent && <button className="btn btn-sm btn-amber" onClick={addFriend}>Add Friend</button>}
                    {profile.requestSent && <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--t2)', padding: '4px 0' }}>Request sent</span>}
                    {profile.isFriend && <button className="btn btn-sm btn-amber" onClick={openDM}>Message</button>}
                  </>
              }
            </div>
          </div>

          {profile.bio && (
            <div style={{ fontSize: 12, color: 'var(--t1)', lineHeight: 1.6, background: 'var(--s3)', border: '1px solid var(--b)', borderRadius: 'var(--r2)', padding: '9px 11px', marginBottom: 10 }}>
              {profile.bio}
            </div>
          )}

          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t2)', marginBottom: 12 }}>
            Member since {new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </div>

          {!profile.isMe && profile.mutualServers?.length > 0 && (
            <div style={{ background: 'var(--s3)', border: '1px solid var(--b)', borderRadius: 'var(--r2)', padding: '9px 11px' }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 700, color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 7 }}>
                {profile.mutualServers.length} Mutual Server{profile.mutualServers.length !== 1 ? 's' : ''}
              </div>
              {profile.mutualServers.map(s => (
                <button key={s._id} onClick={() => navigate(`/channels/${s._id}`)} style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0', fontFamily: 'var(--sans)', color: 'var(--t0)', width: '100%' }}>
                  <div style={{ width: 20, height: 20, borderRadius: 'var(--r1)', background: 'var(--a-lo)', border: '1px solid var(--bm)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--mono)', fontSize: 8, fontWeight: 700, color: 'var(--a)', flexShrink: 0 }}>
                    {s.name.slice(0, 2).toUpperCase()}
                  </div>
                  <span style={{ fontSize: 12 }}>{s.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════════════════
   Main routing
════════════════════════════════════════════════════════ */
const UserProfile = ({ modal, onClose }) => {
  const { userId } = useParams()
  const { user: me } = useAuth()
  const toast = useToast()
  const [profile,  setProfile]  = useState(null)
  const [editing,  setEditing]  = useState(false)
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)
  const targetId = userId || me?._id

  useEffect(() => {
    if (!targetId) return
    setLoading(true); setEditing(false)
    api.get(`/users/${targetId}`)
      .then(r => { setProfile(r.data); setLoading(false) })
      .catch(() => { setError('User not found'); setLoading(false) })
  }, [targetId])

  if (loading) return (
    <div className="loading-page">
      <div className="loading-logo">[ PASK ]</div>
      <div className="spinner" />
    </div>
  )

  if (error || !profile) return (
    <div className="loading-page">
      <p style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--t2)' }}>{error || 'Not found'}</p>
    </div>
  )

  const isMe = profile._id === me?._id || profile.isMe

  if (isMe && editing) {
    const content = <EditProfile profile={profile} onSaved={p => { setProfile(p); setEditing(false) }} modal={modal} onClose={onClose} />
    return modal ? (
      <div className="overlay" onClick={e => e.target === e.currentTarget && onClose?.()}>
        <div style={{ maxWidth: 980, width: '100%', margin: '32px auto', position: 'relative' }}>{content}</div>
      </div>
    ) : content
  }

  const content = <ViewProfile profile={profile} isMe={isMe} onEdit={() => setEditing(true)} modal={modal} onClose={onClose} />
  return modal ? (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose?.()}>
      <div style={{ maxWidth: 980, width: '100%', margin: '32px auto', position: 'relative' }}>{content}</div>
    </div>
  ) : content
}

export default UserProfile