import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useToast }  from '../ui/Toast'
import { useDialog } from '../ui/Dialog'
import api from '../../utils/api'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
const toUrl = p => p ? (p.startsWith('http') ? p : `${API_URL}/${p.replace(/^\//, '')}`) : null

/* ── Shared small components ────────────────────────────── */
const Section = ({ title, danger, children }) => (
  <div style={{
    background: danger ? 'rgba(201,95,95,.06)' : 'var(--s3)',
    border: `1px solid ${danger ? 'rgba(201,95,95,.22)' : 'var(--b)'}`,
    borderRadius: 'var(--r3)', padding: '14px 16px', marginBottom: 14,
  }}>
    {title && <div style={{ fontSize: 11, fontWeight: 700, color: danger ? 'var(--err)' : 'var(--t2)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 10 }}>{title}</div>}
    {children}
  </div>
)

const Btn = ({ onClick, disabled, danger, ghost, sm, children, style: sx }) => (
  <button onClick={onClick} disabled={disabled}
    className={`btn${sm ? ' btn-sm' : ''}${danger ? ' btn-danger' : ghost ? ' btn-ghost' : ' btn-amber'}`}
    style={{ opacity: disabled ? .45 : 1, ...sx }}>
    {children}
  </button>
)

/* ── Icon preview ───────────────────────────────────────── */
const IconPreview = ({ server, preview, size = 64 }) => (
  <div style={{
    width: size, height: size, borderRadius: 'var(--r3)',
    background: 'var(--a-lo)', border: '1px solid var(--bm)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'var(--mono)', fontSize: Math.round(size * .28), fontWeight: 700,
    color: 'var(--a)', overflow: 'hidden', flexShrink: 0,
  }}>
    {(preview || server?.icon)
      ? <img src={preview || toUrl(server?.icon)} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
      : server?.name?.slice(0, 2).toUpperCase()}
  </div>
)

/* ══════════ TAB: GENERAL ═══════════════════════════════════ */
const GeneralTab = ({ server, onUpdated }) => {
  const toast   = useToast()
  const fileRef = useRef(null)
  const [name,      setName]      = useState(server?.name || '')
  const [desc,      setDesc]      = useState(server?.description || '')
  const [preview,   setPreview]   = useState(null)
  const [iconFile,  setIconFile]  = useState(null)
  const [saving,    setSaving]    = useState(false)
  const [uploading, setUploading] = useState(false)

  const handleFile = (e) => {
    const f = e.target.files[0]
    if (!f) return
    if (f.size > 4 * 1024 * 1024) { toast.error('Max 4 MB'); return }
    setIconFile(f); setPreview(URL.createObjectURL(f))
  }

  const save = async () => {
    setSaving(true)
    try {
      const r = await api.put(`/servers/${server._id}`, { name: name.trim(), description: desc })
      let updated = r.data
      if (iconFile) {
        setUploading(true)
        const fd = new FormData(); fd.append('icon', iconFile)
        const ir = await api.post(`/servers/${server._id}/icon`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
        setIconFile(null); setUploading(false)
        updated = { ...updated, icon: ir.data.icon }
      }
      onUpdated(updated); toast.success('Saved!')
    } catch (e) { toast.error(e.response?.data?.message || 'Failed') }
    setSaving(false)
  }

  const removeIcon = async () => {
    try {
      const r = await api.delete(`/servers/${server._id}/icon`)
      setPreview(null); setIconFile(null)
      onUpdated(r.data.server); toast.success('Icon removed')
    } catch { toast.error('Failed') }
  }

  return (
    <>
      <Section title="Server Icon">
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ position:'relative' }}>
            <IconPreview server={server} preview={preview} size={64}/>
            {uploading && (
              <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,.5)', borderRadius:'var(--r3)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <div className="spinner" style={{ width:20, height:20 }}/>
              </div>
            )}
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display:'none' }}/>
            <Btn sm onClick={() => fileRef.current?.click()}>Upload Image</Btn>
            {(preview || server?.icon) && <Btn sm danger onClick={removeIcon}>Remove</Btn>}
            <span style={{ fontSize:10, color:'var(--t2)', fontFamily:'var(--mono)' }}>JPG, PNG, WebP · max 4 MB</span>
          </div>
        </div>
      </Section>

      <Section title="Server Name">
        <input className="form-input" value={name} onChange={e => setName(e.target.value)} maxLength={100}/>
      </Section>

      <Section title="Description">
        <textarea className="form-textarea" value={desc} onChange={e => setDesc(e.target.value)} rows={3} maxLength={500}/>
        <div className="form-hint">{desc.length}/500</div>
      </Section>

      <Section title="Invite Code">
        <div style={{ display:'flex', gap:8 }}>
          <div className="invite-box" style={{ flex:1, fontSize:14, letterSpacing:3, padding:'8px 12px', margin:0 }}>
            {server?.inviteCode}
          </div>
          <Btn sm ghost onClick={() => navigator.clipboard.writeText(server?.inviteCode || '')}>Copy</Btn>
        </div>
      </Section>

      <div style={{ display:'flex', justifyContent:'flex-end', marginTop:4 }}>
        <Btn onClick={save} disabled={saving || !name.trim()}>{saving ? 'Saving…' : 'Save Changes'}</Btn>
      </div>
    </>
  )
}

/* ══════════ TAB: CHANNELS ══════════════════════════════════ */
const ChannelsTab = ({ server, onChannelsChanged }) => {
  const toast       = useToast()
  const { confirm } = useDialog()
  const [channels, setChannels] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [dragging, setDragging] = useState(null)
  const [dragOver, setDragOver] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await api.get(`/channels/server/${server._id}`)
      setChannels(r.data.filter(c => c.type !== 'voice'))
    } catch {}
    setLoading(false)
  }, [server._id])

  useEffect(() => { load() }, [load])

  const deleteChannel = async (ch) => {
    const ok = await confirm({
      title: `Delete #${ch.name}`,
      message: 'All messages will be permanently deleted. This cannot be undone.',
      confirmLabel: 'Delete', danger: true,
    })
    if (!ok) return
    try {
      await api.delete(`/channels/${ch._id}`)
      setChannels(p => p.filter(c => c._id !== ch._id))
      onChannelsChanged?.()
      toast.success(`#${ch.name} deleted`)
    } catch (e) { toast.error(e.response?.data?.message || 'Failed') }
  }

  // Drag-to-reorder
  const onDragStart = (e, idx) => { setDragging(idx); e.dataTransfer.effectAllowed = 'move' }
  const onDragEnter = (_, idx) => setDragOver(idx)
  const onDragEnd   = () => { setDragging(null); setDragOver(null) }
  const onDrop      = async (e, targetIdx) => {
    e.preventDefault()
    if (dragging === null || dragging === targetIdx) return
    const reordered = [...channels]
    const [moved] = reordered.splice(dragging, 1)
    reordered.splice(targetIdx, 0, moved)
    setChannels(reordered)
    setDragging(null); setDragOver(null)
    // Persist order
    try {
      await api.put(`/channels/reorder/${server._id}`, {
        order: reordered.map((c, i) => ({ id: c._id, position: i })),
      })
      onChannelsChanged?.()
    } catch { toast.error('Failed to save order'); load() }
  }

  const grouped = channels.reduce((acc, ch) => {
    const cat = ch.category || 'General'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(ch)
    return acc
  }, {})

  if (loading) return <div style={{ padding:20, textAlign:'center', color:'var(--t2)' }}>Loading…</div>

  return (
    <>
      <div style={{ fontSize:11, color:'var(--t2)', marginBottom:12, fontFamily:'var(--mono)' }}>
        Drag to reorder · {channels.length} channel{channels.length !== 1 ? 's' : ''}
      </div>
      {Object.entries(grouped).map(([cat, chs]) => (
        <div key={cat} style={{ marginBottom:16 }}>
          <div style={{ fontSize:10, fontWeight:700, color:'var(--t2)', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:6, paddingLeft:4 }}>
            {cat}
          </div>
          {chs.map((ch, idx) => {
            const globalIdx = channels.indexOf(ch)
            const isDragging = dragging === globalIdx
            const isOver     = dragOver === globalIdx
            return (
              <div
                key={ch._id}
                draggable
                onDragStart={e => onDragStart(e, globalIdx)}
                onDragEnter={e => { e.preventDefault(); onDragEnter(e, globalIdx) }}
                onDragOver={e => e.preventDefault()}
                onDragEnd={onDragEnd}
                onDrop={e => onDrop(e, globalIdx)}
                style={{
                  display:'flex', alignItems:'center', gap:10,
                  padding:'8px 10px', marginBottom:3, borderRadius:'var(--r2)',
                  background: isOver ? 'var(--a-lo)' : isDragging ? 'var(--s4)' : 'var(--s3)',
                  border: isOver ? '1px solid var(--a)' : '1px solid var(--b)',
                  cursor:'grab', opacity: isDragging ? .5 : 1,
                  transition:'background .12s, border-color .12s',
                }}
              >
                {/* drag handle */}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style={{ color:'var(--t2)', flexShrink:0 }}>
                  <path d="M8 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm0 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm0 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm8-16a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm0 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm0 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/>
                </svg>
                {/* type badge */}
                <span style={{ fontSize:10, fontFamily:'var(--mono)', color:'var(--t2)', background:'var(--s5)', padding:'1px 5px', borderRadius:'var(--r1)' }}>
                  {ch.type === 'announcement' ? 'ANN' : 'TXT'}
                </span>
                {/* name */}
                <span style={{ flex:1, fontSize:12, fontWeight:600, color:'var(--t0)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  #{ch.name}
                </span>
                {/* delete */}
                <button
                  onClick={() => deleteChannel(ch)}
                  style={{ background:'none', border:'none', cursor:'pointer', color:'var(--t2)', padding:'2px 4px', borderRadius:'var(--r1)', transition:'color .12s', flexShrink:0 }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--err)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--t2)'}
                  title="Delete channel"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                  </svg>
                </button>
              </div>
            )
          })}
        </div>
      ))}
      {channels.length === 0 && (
        <div style={{ textAlign:'center', padding:'32px 0', color:'var(--t2)', fontSize:13 }}>No channels yet</div>
      )}
    </>
  )
}

/* ══════════ TAB: ROLES ═════════════════════════════════════ */
const PERMS = [
  { key:'manageServer',    label:'Manage Server',    desc:'Edit name, icon, description' },
  { key:'manageRoles',     label:'Manage Roles',     desc:'Create, edit, delete roles' },
  { key:'manageChannels',  label:'Manage Channels',  desc:'Create, edit, delete channels' },
  { key:'kickMembers',     label:'Kick Members',     desc:'Remove members from server' },
  { key:'banMembers',      label:'Ban Members',      desc:'Permanently ban members' },
  { key:'manageMessages',  label:'Manage Messages',  desc:'Delete or pin any message' },
  { key:'sendMessages',    label:'Send Messages',    desc:'Send messages in channels' },
  { key:'readMessages',    label:'Read Messages',    desc:'View channels and messages' },
  { key:'mentionEveryone', label:'Mention Everyone', desc:'Use @everyone' },
  { key:'manageInvites',   label:'Manage Invites',   desc:'Create and revoke invites' },
]

const PRESETS = ['#e5a245','#4caf7d','#6a9fc0','#c95f5f','#9b59b6','#e67e22','#e91e63','#1abc9c','#3498db','#607d8b']

const Toggle = ({ on, onChange }) => (
  <div onClick={() => onChange(!on)} style={{
    width:34, height:18, borderRadius:9, flexShrink:0,
    background: on ? 'var(--a)' : 'var(--s5)',
    border:'1px solid ' + (on ? 'var(--a)' : 'var(--bm)'),
    position:'relative', cursor:'pointer',
    transition:'background .18s, border-color .18s',
  }}>
    <div style={{ position:'absolute', top:2, left: on ? 17 : 2, width:12, height:12, borderRadius:'50%', background:'#fff', transition:'left .18s' }}/>
  </div>
)

const RolesTab = ({ server }) => {
  const toast       = useToast()
  const { confirm } = useDialog()
  const [roles,    setRoles]    = useState([])
  const [sel,      setSel]      = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [creating, setCreating] = useState(false)
  const [newName,  setNewName]  = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try { const r = await api.get(`/roles/server/${server._id}`); setRoles(r.data) } catch {}
    setLoading(false)
  }, [server._id])

  useEffect(() => { load() }, [load])

  const selectRole = (r) => setSel(JSON.parse(JSON.stringify(r)))

  const createRole = async () => {
    if (!newName.trim()) return
    try {
      const r = await api.post('/roles', { name: newName.trim(), serverId: server._id, color: PRESETS[roles.length % PRESETS.length] })
      setRoles(p => [...p, r.data]); setNewName(''); setCreating(false)
    } catch (e) { toast.error(e.response?.data?.message || 'Failed') }
  }

  const saveRole = async () => {
    if (!sel) return
    setSaving(true)
    try {
      const r = await api.put(`/roles/${sel._id}`, { name: sel.name, color: sel.color, permissions: sel.permissions })
      setRoles(p => p.map(x => x._id === r.data._id ? r.data : x))
      setSel(JSON.parse(JSON.stringify(r.data)))
      toast.success('Role saved')
    } catch (e) { toast.error(e.response?.data?.message || 'Failed') }
    setSaving(false)
  }

  const deleteRole = async () => {
    const ok = await confirm({ title:`Delete "${sel?.name}"?`, message:'Members with this role will lose it.', confirmLabel:'Delete', danger:true })
    if (!ok) return
    try {
      await api.delete(`/roles/${sel._id}`)
      setRoles(p => p.filter(x => x._id !== sel._id)); setSel(null)
      toast.success('Role deleted')
    } catch (e) { toast.error(e.response?.data?.message || 'Failed') }
  }

  if (loading) return <div style={{ padding:20, textAlign:'center', color:'var(--t2)' }}>Loading…</div>

  return (
    <div style={{ display:'flex', gap:14, height:'100%' }}>
      {/* Role list */}
      <div style={{ width:140, flexShrink:0 }}>
        <div style={{ fontSize:10, fontWeight:700, color:'var(--t2)', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:8 }}>Roles</div>
        {roles.map(r => (
          <button key={r._id} onClick={() => selectRole(r)} style={{
            width:'100%', display:'flex', alignItems:'center', gap:7,
            padding:'6px 8px', marginBottom:2, borderRadius:'var(--r2)',
            background: sel?._id === r._id ? 'var(--a-lo)' : 'none',
            border: sel?._id === r._id ? '1px solid var(--bm)' : '1px solid transparent',
            color: sel?._id === r._id ? 'var(--t0)' : 'var(--t1)',
            cursor:'pointer', fontSize:12, textAlign:'left',
            transition:'background .1s',
          }}
            onMouseEnter={e => { if (sel?._id !== r._id) e.currentTarget.style.background = 'var(--s3)' }}
            onMouseLeave={e => { if (sel?._id !== r._id) e.currentTarget.style.background = 'none' }}
          >
            <span style={{ width:8, height:8, borderRadius:'50%', background:r.color || 'var(--t2)', flexShrink:0 }}/>
            <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.name}</span>
          </button>
        ))}
        {creating ? (
          <div style={{ display:'flex', flexDirection:'column', gap:4, marginTop:6 }}>
            <input autoFocus className="form-input" style={{ fontSize:11, padding:'4px 6px' }}
              value={newName} onChange={e=>setNewName(e.target.value)}
              onKeyDown={e=>{if(e.key==='Enter')createRole();if(e.key==='Escape')setCreating(false)}}
              placeholder="Role name"/>
            <div style={{ display:'flex', gap:4 }}>
              <Btn sm onClick={createRole} disabled={!newName.trim()} style={{ flex:1 }}>Add</Btn>
              <Btn sm ghost onClick={()=>setCreating(false)}>✕</Btn>
            </div>
          </div>
        ) : (
          <button onClick={()=>setCreating(true)} style={{
            width:'100%', display:'flex', alignItems:'center', gap:6, marginTop:6,
            padding:'5px 8px', borderRadius:'var(--r2)', background:'none',
            border:'1px dashed var(--b)', color:'var(--t2)', cursor:'pointer', fontSize:11,
            transition:'all .12s',
          }}
            onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--bm)';e.currentTarget.style.color='var(--a)'}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--b)';e.currentTarget.style.color='var(--t2)'}}
          >
            <span style={{ fontSize:14, lineHeight:1 }}>+</span> New Role
          </button>
        )}
      </div>

      {/* Role editor */}
      <div style={{ flex:1, overflowY:'auto' }}>
        {!sel ? (
          <div style={{ padding:'32px 0', textAlign:'center', color:'var(--t2)', fontSize:13 }}>Select a role to edit</div>
        ) : (
          <>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
              <span style={{ width:12, height:12, borderRadius:'50%', background:sel.color||'var(--t2)', flexShrink:0 }}/>
              <input className="form-input" value={sel.name} onChange={e=>setSel(p=>({...p,name:e.target.value}))} style={{ flex:1, fontSize:13 }}/>
            </div>

            {/* Color */}
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:10, fontWeight:700, color:'var(--t2)', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:6 }}>Color</div>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                {PRESETS.map(c => (
                  <div key={c} onClick={()=>setSel(p=>({...p,color:c}))}
                    style={{ width:22, height:22, borderRadius:'50%', background:c, cursor:'pointer', border: sel.color===c ? '2.5px solid var(--t0)' : '2px solid transparent', boxSizing:'border-box', transition:'border .12s' }}/>
                ))}
                <input type="color" value={sel.color||'#888888'} onChange={e=>setSel(p=>({...p,color:e.target.value}))}
                  style={{ width:22, height:22, borderRadius:'50%', border:'none', background:'none', cursor:'pointer', padding:0 }}/>
              </div>
            </div>

            {/* Permissions */}
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:10, fontWeight:700, color:'var(--t2)', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:8 }}>Permissions</div>
              {PERMS.map(p => (
                <div key={p.key} style={{ display:'flex', alignItems:'center', gap:10, padding:'6px 0', borderBottom:'1px solid var(--b)' }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:12, fontWeight:600, color:'var(--t0)' }}>{p.label}</div>
                    <div style={{ fontSize:10, color:'var(--t2)', marginTop:1 }}>{p.desc}</div>
                  </div>
                  <Toggle on={!!sel.permissions?.[p.key]} onChange={v => setSel(pr=>({...pr, permissions:{...pr.permissions,[p.key]:v}}))}/>
                </div>
              ))}
            </div>

            <div style={{ display:'flex', gap:8 }}>
              <Btn onClick={saveRole} disabled={saving} style={{ flex:1 }}>{saving ? 'Saving…' : 'Save Role'}</Btn>
              {!sel.isDefault && <Btn danger sm onClick={deleteRole}>Delete</Btn>}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/* ══════════ TAB: DANGER ════════════════════════════════════ */
const DangerTab = ({ server, onUpdated, onDeleted, onClose }) => {
  const toast       = useToast()
  const { confirm } = useDialog()
  const { user }    = useAuth()
  const navigate    = useNavigate()
  const [newOwner, setNewOwner] = useState(null)

  const transfer = async () => {
    if (!newOwner) { toast.error('Select a member first'); return }
    const ok = await confirm({ title:'Transfer Ownership', message:`"${newOwner.user?.username}" will become the new owner. You will become an admin.`, confirmLabel:'Transfer', danger:true })
    if (!ok) return
    try {
      const r = await api.post(`/servers/${server._id}/transfer`, { newOwnerId: newOwner.user?._id || newOwner.user })
      toast.success('Ownership transferred')
      onUpdated(r.data.server); onClose()
    } catch (e) { toast.error(e.response?.data?.message || 'Failed') }
  }

  const deleteServer = async () => {
    const ok = await confirm({ title:`Delete "${server?.name}"`, message:'This permanently deletes the server and all data. No going back.', confirmLabel:'Delete Server', danger:true })
    if (!ok) return
    try {
      await api.delete(`/servers/${server._id}`)
      toast.success('Server deleted'); onDeleted(server._id); onClose(); navigate('/')
    } catch (e) { toast.error(e.response?.data?.message || 'Failed') }
  }

  return (
    <>
      <Section title="Transfer Ownership">
        <div style={{ fontSize:11, color:'var(--t2)', marginBottom:10 }}>Pass ownership to another member. You'll become an admin.</div>
        <div style={{ maxHeight:180, overflowY:'auto', display:'flex', flexDirection:'column', gap:3, marginBottom:10 }}>
          {server?.members?.filter(m => m.role !== 'owner').map(m => {
            const u = m.user
            if (!u) return null
            const sel = newOwner?.user?._id === (u._id || u)
            return (
              <div key={u._id || m._id} onClick={() => setNewOwner(m)}
                style={{ display:'flex', alignItems:'center', gap:10, padding:'7px 10px', cursor:'pointer', borderRadius:'var(--r2)', background: sel ? 'var(--a-lo)' : 'transparent', border:`1px solid ${sel ? 'var(--bm)' : 'transparent'}`, transition:'background .1s' }}
                onMouseEnter={e => { if (!sel) e.currentTarget.style.background = 'var(--s4)' }}
                onMouseLeave={e => { if (!sel) e.currentTarget.style.background = 'transparent' }}
              >
                <div style={{ width:28, height:28, borderRadius:'var(--r2)', background:'var(--a-lo)', border:'1px solid var(--bm)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--mono)', fontSize:10, fontWeight:700, color:'var(--a)', overflow:'hidden', flexShrink:0 }}>
                  {u.avatar ? <img src={toUrl(u.avatar)} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/> : u.username?.slice(0,2).toUpperCase()}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:12, fontWeight:600, color: sel ? 'var(--a)' : 'var(--t0)' }}>{u.username}</div>
                  <div style={{ fontSize:10, color:'var(--t2)', textTransform:'capitalize' }}>{m.role}</div>
                </div>
                <div style={{ width:16, height:16, borderRadius:'50%', border:`2px solid ${sel ? 'var(--a)' : 'var(--bm)'}`, background: sel ? 'var(--a)' : 'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  {sel && <div style={{ width:6, height:6, borderRadius:'50%', background:'var(--s0)' }}/>}
                </div>
              </div>
            )
          })}
        </div>
        <Btn onClick={transfer} disabled={!newOwner} style={{ opacity: newOwner ? 1 : .4 }}>
          Transfer to {newOwner?.user?.username || '…'}
        </Btn>
      </Section>

      <Section title="Delete Server" danger>
        <div style={{ fontSize:11, color:'var(--t2)', marginBottom:12 }}>Permanently deletes the server, all channels, and all messages. There is no going back.</div>
        <Btn danger onClick={deleteServer}>Delete "{server?.name}"</Btn>
      </Section>
    </>
  )
}

/* ══════════ MAIN ═══════════════════════════════════════════ */
const ServerSettings = ({ server, onClose, onUpdated, onDeleted }) => {
  const { user } = useAuth()
  const [tab, setTab] = useState('general')
  const [localServer, setLocalServer] = useState(server)

  const isOwner = server?.owner?._id?.toString() === user?._id?.toString()
               || server?.owner?.toString()        === user?._id?.toString()

  const handleUpdated = (s) => { setLocalServer(s); onUpdated?.(s) }

  const TABS = [
    { key:'general',  label:'General',  icon:'⚙' },
    { key:'channels', label:'Channels', icon:'#' },
    { key:'roles',    label:'Roles',    icon:'◉' },
    ...(isOwner ? [{ key:'danger', label:'Danger', icon:'⚠', danger:true }] : []),
  ]

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth:640, padding:0, display:'flex', flexDirection:'column', maxHeight:'88vh' }}>

        {/* Header */}
        <div className="modal-head" style={{ padding:'14px 20px' }}>
          <span className="modal-title">Server Settings — {localServer?.name}</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div style={{ display:'flex', flex:1, overflow:'hidden' }}>

          {/* Sidebar */}
          <div style={{ width:150, borderRight:'1px solid var(--b)', padding:'10px 0', flexShrink:0, background:'var(--s1)' }}>
            {TABS.map(t => (
              <button key={t.key} onClick={()=>setTab(t.key)} style={{
                width:'100%', display:'flex', alignItems:'center', gap:8,
                padding:'8px 14px', background: tab===t.key ? 'var(--a-lo)' : 'none',
                borderRight: tab===t.key ? '2px solid var(--a)' : '2px solid transparent',
                color: tab===t.key ? 'var(--a)' : t.danger ? 'var(--err)' : 'var(--t2)',
                cursor:'pointer', fontSize:12, fontWeight:600, textAlign:'left',
                transition:'background .1s, color .1s', border:'none',
              }}
                onMouseEnter={e=>{ if(tab!==t.key) e.currentTarget.style.background='var(--s3)' }}
                onMouseLeave={e=>{ if(tab!==t.key) e.currentTarget.style.background='none' }}
              >
                <span style={{ fontSize:13, opacity:.7 }}>{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div style={{ flex:1, overflowY:'auto', padding:'18px 20px' }}>
            {tab==='general'  && <GeneralTab server={localServer} onUpdated={handleUpdated}/>}
            {tab==='channels' && <ChannelsTab server={localServer} onChannelsChanged={()=>{}}/>}
            {tab==='roles'    && <RolesTab server={localServer}/>}
            {tab==='danger'   && <DangerTab server={localServer} onUpdated={handleUpdated} onDeleted={onDeleted} onClose={onClose}/>}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ServerSettings
