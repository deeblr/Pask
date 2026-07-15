import { useState, useEffect, useRef } from 'react'
import { useToast }  from '../ui/Toast'
import { useDialog } from '../ui/Dialog'
import api from '../../utils/api'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
const toUrl = p => p ? (p.startsWith('http') ? p : `${API_URL}/${p.replace(/^\//, '')}`) : null

/* ── constants ─────────────────────────────────────────── */
const PERMS = [
  { key: 'manageServer',    label: 'Manage Server',    desc: 'Edit name, icon, description' },
  { key: 'manageRoles',     label: 'Manage Roles',     desc: 'Create, edit, delete and assign roles' },
  { key: 'manageChannels',  label: 'Manage Channels',  desc: 'Create, edit and delete channels' },
  { key: 'kickMembers',     label: 'Kick Members',     desc: 'Remove members from the server' },
  { key: 'banMembers',      label: 'Ban Members',      desc: 'Permanently ban members' },
  { key: 'manageMessages',  label: 'Manage Messages',  desc: 'Delete or pin any message' },
  { key: 'sendMessages',    label: 'Send Messages',    desc: 'Send messages in text channels' },
  { key: 'readMessages',    label: 'Read Messages',    desc: 'View channels' },
  { key: 'mentionEveryone', label: 'Mention Everyone', desc: 'Use @everyone and @here' },
  { key: 'manageInvites',   label: 'Manage Invites',   desc: 'Create and revoke invite links' },
]

const PRESETS = [
  '#e5a245','#4caf7d','#6a9fc0','#c95f5f','#9b59b6',
  '#e67e22','#e91e63','#1abc9c','#3498db','#607d8b',
]

/* ── Toggle switch ─────────────────────────────────────── */
const Toggle = ({ on, onChange }) => (
  <div
    onClick={() => onChange(!on)}
    style={{
      width: 34, height: 18, borderRadius: 9, flexShrink: 0,
      background: on ? 'var(--a)' : 'var(--s5)',
      border: '1px solid ' + (on ? 'var(--a)' : 'var(--bm)'),
      position: 'relative', cursor: 'pointer',
      transition: 'background .18s, border-color .18s',
    }}
  >
    <div style={{
      position: 'absolute', top: 2, left: on ? 17 : 2,
      width: 12, height: 12, borderRadius: '50%',
      background: '#fff', transition: 'left .18s',
    }} />
  </div>
)

/* ── Avatar ─────────────────────────────────────────────── */
const Av = ({ user, size = 28 }) => (
  <div className="av" style={{
    width: size, height: size, fontSize: Math.round(size * .32), flexShrink: 0,
    background: user?.bannerColor ? `${user.bannerColor}1a` : 'var(--a-lo)',
    borderColor: user?.bannerColor ? `${user.bannerColor}3a` : 'var(--bm)',
    color: user?.bannerColor || 'var(--a)',
  }}>
    {user?.avatar ? <img src={toUrl(user?.avatar)} alt="" /> : user?.username?.slice(0, 2).toUpperCase()}
  </div>
)

/* ── RolesManager ──────────────────────────────────────── */
const RolesManager = ({ server, onClose }) => {
  const toast       = useToast()
  const { confirm } = useDialog()

  const [roles,    setRoles]    = useState([])
  const [selected, setSelected] = useState(null)
  const [tab,      setTab]      = useState('perms')  // 'perms' | 'members'
  const [newName,  setNewName]  = useState('')
  const [saving,   setSaving]   = useState(false)
  const [members,  setMembers]  = useState([])

  // drag state
  const dragIdx = useRef(null)
  const overIdx = useRef(null)

  /* load */
  useEffect(() => {
    loadRoles()
    setMembers(server?.members || [])
  }, [server?._id])

  const loadRoles = async () => {
    try {
      const r = await api.get(`/roles/server/${server._id}`)
      const sorted = r.data.sort((a, b) => b.position - a.position)
      setRoles(sorted)
      if (sorted.length > 0 && !selected) setSelected(sorted[0])
    } catch { toast.error('Failed to load roles') }
  }

  /* create */
  const createRole = async () => {
    if (!newName.trim()) return
    try {
      const r = await api.post(`/roles/server/${server._id}`, { name: newName.trim() })
      const updated = [r.data, ...roles]
      setRoles(updated)
      setSelected(r.data)
      setNewName('')
    } catch (e) { toast.error(e.response?.data?.message || 'Failed') }
  }

  /* save current role */
  const saveRole = async () => {
    if (!selected) return
    setSaving(true)
    try {
      const r = await api.put(`/roles/${selected._id}`, {
        name: selected.name,
        color: selected.color,
        hoist: selected.hoist,
        permissions: selected.permissions,
      })
      setRoles(p => p.map(ro => ro._id === r.data._id ? r.data : ro))
      setSelected(r.data)
      toast.success('Saved')
    } catch { toast.error('Failed to save') }
    setSaving(false)
  }

  /* delete role */
  const deleteRole = async (roleId) => {
    const ok = await confirm({ title: 'Delete Role', message: 'This role will be removed from all members.', confirmLabel: 'Delete', danger: true })
    if (!ok) return
    try {
      await api.delete(`/roles/${roleId}`)
      const remaining = roles.filter(r => r._id !== roleId)
      setRoles(remaining)
      setSelected(remaining[0] || null)
      toast.success('Role deleted')
    } catch { toast.error('Failed') }
  }

  /* drag-to-reorder */
  const onDragStart = (i) => { dragIdx.current = i }
  const onDragEnter = (i) => { overIdx.current = i }
  const onDragEnd   = async () => {
    if (dragIdx.current === null || overIdx.current === null || dragIdx.current === overIdx.current) return
    const updated = [...roles]
    const [moved] = updated.splice(dragIdx.current, 1)
    updated.splice(overIdx.current, 0, moved)
    // assign position: highest index = highest position (position desc = high priority)
    const withPos = updated.map((r, i) => ({ ...r, position: updated.length - 1 - i }))
    setRoles(withPos)
    dragIdx.current = null; overIdx.current = null

    try {
      await api.put(`/roles/reorder/${server._id}`, {
        order: withPos.map(r => ({ id: r._id, position: r.position })),
      })
    } catch { toast.error('Failed to reorder') }
  }

  /* assign / remove role from member */
  const toggleMemberRole = async (memberId, roleId, hasIt) => {
    try {
      if (hasIt) await api.delete(`/roles/${roleId}/assign/${memberId}`)
      else       await api.post(`/roles/${roleId}/assign/${memberId}`)
      // refresh members
      const r = await api.get(`/servers/${server._id}`)
      setMembers(r.data.members || [])
      toast.success(hasIt ? 'Role removed' : 'Role assigned')
    } catch { toast.error('Failed') }
  }

  const togglePerm = (key) => {
    if (!selected) return
    setSelected(p => ({
      ...p,
      permissions: { ...p.permissions, [key]: !p.permissions[key] },
    }))
  }

  /* ── render ─────────────────────────────────────────── */
  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 700, height: '80vh', display: 'flex', flexDirection: 'column', padding: 0 }}>

        {/* Header */}
        <div className="modal-head">
          <span className="modal-title">Roles — {server?.name}</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

          {/* ── Left: role list ── */}
          <div style={{
            width: 200, borderRight: '1px solid var(--b)',
            display: 'flex', flexDirection: 'column', flexShrink: 0,
          }}>
            {/* New role input */}
            <div style={{ padding: '10px 10px 8px', borderBottom: '1px solid var(--b)' }}>
              <div style={{ display: 'flex', gap: 4 }}>
                <input
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && createRole()}
                  placeholder="New role name…"
                  className="form-input"
                  style={{ flex: 1, fontSize: 11, padding: '5px 8px' }}
                />
                <button
                  className="btn btn-sm btn-amber"
                  onClick={createRole}
                  disabled={!newName.trim()}
                  style={{ padding: '5px 10px' }}
                >
                  +
                </button>
              </div>
            </div>

            {/* Role list (drag-to-reorder) */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
              {roles.length === 0 && (
                <div style={{ padding: '24px 12px', textAlign: 'center', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--t2)' }}>
                  No roles yet
                </div>
              )}
              {roles.map((role, i) => (
                <div
                  key={role._id}
                  draggable
                  onDragStart={() => onDragStart(i)}
                  onDragEnter={() => onDragEnter(i)}
                  onDragEnd={onDragEnd}
                  onDragOver={e => e.preventDefault()}
                  onClick={() => { setSelected(role); setTab('perms') }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 7,
                    padding: '7px 10px',
                    background: selected?._id === role._id ? 'var(--a-lo)' : 'transparent',
                    borderRight: selected?._id === role._id ? '2px solid var(--a)' : '2px solid transparent',
                    cursor: 'pointer', transition: 'background .1s',
                    userSelect: 'none',
                  }}
                  onMouseEnter={e => { if (selected?._id !== role._id) e.currentTarget.style.background = 'var(--s3)' }}
                  onMouseLeave={e => { if (selected?._id !== role._id) e.currentTarget.style.background = 'transparent' }}
                >
                  {/* Drag handle */}
                  <span style={{ color: 'var(--t2)', fontSize: 11, opacity: .5, cursor: 'grab', flexShrink: 0 }}>⠿</span>

                  {/* Color swatch */}
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: role.color || '#99aab5', flexShrink: 0,
                    boxShadow: `0 0 4px ${role.color || '#99aab5'}66`,
                  }} />

                  {/* Name */}
                  <span style={{
                    flex: 1, fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 600,
                    color: selected?._id === role._id ? 'var(--a)' : 'var(--t1)',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {role.name}
                  </span>

                  {/* Position badge */}
                  <span style={{
                    fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t2)',
                    background: 'var(--s4)', padding: '1px 4px', borderRadius: 3, flexShrink: 0,
                  }}>
                    {role.position}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Right: editor ── */}
          {selected ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

              {/* Tabs */}
              <div style={{ display: 'flex', borderBottom: '1px solid var(--b)', flexShrink: 0 }}>
                {[
                  { key: 'perms',   label: 'Permissions' },
                  { key: 'members', label: `Members (${members.length})` },
                ].map(t => (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    style={{
                      padding: '8px 16px', fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 600,
                      background: 'none', border: 'none', cursor: 'pointer',
                      borderBottom: tab === t.key ? '2px solid var(--a)' : '2px solid transparent',
                      color: tab === t.key ? 'var(--a)' : 'var(--t2)',
                      transition: 'color .14s',
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px' }}>

                {/* ── Permissions tab ── */}
                {tab === 'perms' && (
                  <>
                    {/* Name */}
                    <div className="form-field">
                      <label className="form-label">Role Name</label>
                      <input
                        className="form-input"
                        value={selected.name}
                        onChange={e => setSelected(p => ({ ...p, name: e.target.value }))}
                      />
                    </div>

                    {/* Color */}
                    <div className="form-field">
                      <label className="form-label">Color</label>
                      {/* Preview */}
                      <div style={{
                        height: 28, borderRadius: 'var(--r2)',
                        background: selected.color || '#99aab5',
                        marginBottom: 8, border: '1px solid var(--b)',
                        display: 'flex', alignItems: 'center', paddingLeft: 10,
                      }}>
                        <span style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,.5)' }}>
                          {selected.name}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                        {PRESETS.map(c => (
                          <div
                            key={c}
                            onClick={() => setSelected(p => ({ ...p, color: c }))}
                            style={{
                              width: 22, height: 22, borderRadius: '50%', background: c,
                              cursor: 'pointer', flexShrink: 0,
                              border: selected.color === c ? '2px solid #fff' : '2px solid transparent',
                              outline: selected.color === c ? `2px solid ${c}` : 'none',
                              outlineOffset: 1,
                              boxShadow: `0 0 6px ${c}55`,
                            }}
                          />
                        ))}
                        <label style={{ cursor: 'pointer', flexShrink: 0 }}>
                          <input
                            type="color"
                            value={selected.color || '#99aab5'}
                            onChange={e => setSelected(p => ({ ...p, color: e.target.value }))}
                            style={{ width: 22, height: 22, borderRadius: '50%', border: 'none', padding: 0, display: 'block' }}
                          />
                        </label>
                      </div>
                    </div>

                    {/* Hoist */}
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 0', borderBottom: '1px solid var(--b)', marginBottom: 12,
                    }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--t0)' }}>Display separately</div>
                        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t2)', marginTop: 1 }}>
                          Show this role above regular members in the sidebar
                        </div>
                      </div>
                      <Toggle on={!!selected.hoist} onChange={v => setSelected(p => ({ ...p, hoist: v }))} />
                    </div>

                    {/* Permissions */}
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 600, color: 'var(--t2)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 8 }}>
                      Permissions
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {PERMS.map(({ key, label, desc }) => (
                        <div
                          key={key}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '8px 10px', borderRadius: 'var(--r2)',
                            background: selected.permissions?.[key] ? 'var(--a-lo)' : 'transparent',
                            border: `1px solid ${selected.permissions?.[key] ? 'var(--bm)' : 'transparent'}`,
                            transition: 'background .12s',
                          }}
                        >
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--t0)' }}>{label}</div>
                            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t2)', marginTop: 1 }}>{desc}</div>
                          </div>
                          <Toggle on={!!selected.permissions?.[key]} onChange={() => togglePerm(key)} />
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* ── Members tab ── */}
                {tab === 'members' && (
                  <>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 600, color: 'var(--t2)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 10 }}>
                      Assign "{selected.name}" to members
                    </div>
                    {members.length === 0 ? (
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--t2)', textAlign: 'center', padding: 32 }}>No members</div>
                    ) : members.map(m => {
                      const u = m.user
                      if (!u) return null
                      const hasRole = (m.roles || []).some(r =>
                        (r?._id || r)?.toString() === selected._id
                      )
                      return (
                        <div
                          key={m.user?._id || m._id}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '7px 4px', borderBottom: '1px solid var(--b)',
                          }}
                        >
                          <Av user={u} size={30} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600, color: 'var(--t0)' }}>
                              {u?.username}
                            </div>
                            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t2)', textTransform: 'capitalize' }}>
                              {m.role}
                            </div>
                          </div>
                          {/* Role badge if they have it */}
                          {hasRole && (
                            <span style={{
                              fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 700,
                              padding: '2px 7px', borderRadius: 3,
                              background: `${selected.color}22`,
                              color: selected.color,
                              border: `1px solid ${selected.color}44`,
                            }}>
                              {selected.name}
                            </span>
                          )}
                          <Toggle
                            on={hasRole}
                            onChange={() => toggleMemberRole(u._id || u, selected._id, hasRole)}
                          />
                        </div>
                      )
                    })}
                  </>
                )}
              </div>

              {/* Footer */}
              {tab === 'perms' && (
                <div style={{
                  padding: '10px 18px', borderTop: '1px solid var(--b)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  flexShrink: 0,
                }}>
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => deleteRole(selected._id)}
                  >
                    Delete Role
                  </button>
                  <button
                    className="btn btn-sm btn-amber"
                    onClick={saveRole}
                    disabled={saving}
                  >
                    {saving ? 'Saving…' : 'Save Changes'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--t2)' }}>
              Select a role to edit
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default RolesManager
