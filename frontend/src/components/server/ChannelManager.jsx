import { useState, useRef } from 'react'
import { useDialog } from '../ui/Dialog'
import { useToast }  from '../ui/Toast'
import api from '../../utils/api'

const ICONS = { text: '#', voice: '▷', announcement: '⚡' }

const ChannelManager = ({ server, channels, onClose, onChannelsChange }) => {
  const { confirm } = useDialog()
  const toast = useToast()
  const [list, setList] = useState([...channels].sort((a, b) => a.position - b.position))
  const [editing, setEditing] = useState(null)   // channel id being renamed
  const [editVal, setEditVal] = useState('')
  const [saving,  setSaving]  = useState(false)
  const dragItem = useRef(null)
  const dragOver = useRef(null)

  /* ── Drag-to-reorder ──────────────────────────────── */
  const onDragStart = (i) => { dragItem.current = i }
  const onDragEnter = (i) => { dragOver.current = i }
  const onDragEnd   = async () => {
    if (dragItem.current === null || dragOver.current === null) return
    const updated = [...list]
    const [moved] = updated.splice(dragItem.current, 1)
    updated.splice(dragOver.current, 0, moved)
    const withPos = updated.map((c, i) => ({ ...c, position: i }))
    setList(withPos)
    dragItem.current = null; dragOver.current = null

    try {
      await api.put(`/channels/reorder/${server._id}`, {
        order: withPos.map(c => ({ id: c._id, position: c.position })),
      })
      onChannelsChange(withPos)
    } catch { toast.error('Failed to reorder') }
  }

  /* ── Rename ───────────────────────────────────────── */
  const startEdit = (ch) => { setEditing(ch._id); setEditVal(ch.name) }
  const saveEdit  = async (ch) => {
    if (!editVal.trim() || editVal === ch.name) { setEditing(null); return }
    setSaving(true)
    try {
      const r = await api.put(`/channels/${ch._id}`, { name: editVal.trim().toLowerCase().replace(/\s+/g, '-') })
      setList(p => p.map(c => c._id === ch._id ? r.data : c))
      onChannelsChange(list.map(c => c._id === ch._id ? r.data : c))
      toast.success('Channel renamed')
    } catch { toast.error('Failed to rename') }
    setEditing(null); setSaving(false)
  }

  /* ── Delete ───────────────────────────────────────── */
  const deleteChannel = async (ch) => {
    const ok = await confirm({
      title: `Delete #${ch.name}`,
      message: 'This will permanently delete the channel and all its messages.',
      confirmLabel: 'Delete',
      danger: true,
    })
    if (!ok) return
    try {
      await api.delete(`/channels/${ch._id}`)
      const updated = list.filter(c => c._id !== ch._id)
      setList(updated)
      onChannelsChange(updated)
      toast.success('Channel deleted')
    } catch { toast.error('Failed to delete') }
  }

  /* ── Group by category ────────────────────────────── */
  const grouped = list.reduce((acc, ch) => {
    const cat = ch.category || 'General'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(ch)
    return acc
  }, {})

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 800,
      background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(2px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: 'fadeIn 0.12s ease',
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: 'var(--bg-1)', border: '1px solid var(--bmd)',
        borderRadius: 'var(--radius-xl)', width: 480,
        maxHeight: '75vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
        animation: 'slideUp 0.15s ease',
      }}>
        {/* Header */}
        <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 14, color: 'var(--amber)' }}>
              Manage Channels
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-2)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
              Drag to reorder · click to rename · delete to remove
            </div>
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-2)', fontSize: 18, padding: '0 4px', fontFamily: 'var(--font-mono)' }}>✕</button>
        </div>

        {/* List */}
        <div style={{ overflowY: 'auto', padding: '8px 12px 16px' }}>
          {Object.entries(grouped).map(([category, chs]) => (
            <div key={category} style={{ marginBottom: 16 }}>
              <div style={{
                fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 700,
                color: 'var(--text-2)', letterSpacing: '0.1em', textTransform: 'uppercase',
                padding: '6px 4px 4px', display: 'flex', alignItems: 'center', gap: 8,
              }}>
                {category}
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              </div>

              {chs.map((ch, i) => {
                const globalIdx = list.indexOf(ch)
                return (
                  <div
                    key={ch._id}
                    draggable
                    onDragStart={() => onDragStart(globalIdx)}
                    onDragEnter={() => onDragEnter(globalIdx)}
                    onDragEnd={onDragEnd}
                    onDragOver={e => e.preventDefault()}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '7px 8px',
                      background: 'var(--bg-2)', border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)', marginBottom: 4,
                      cursor: 'grab', transition: 'border-color 0.1s',
                      userSelect: 'none',
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--bmd)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                  >
                    {/* Drag handle */}
                    <span style={{ color: 'var(--text-2)', fontSize: 12, flexShrink: 0, opacity: 0.5 }}>⠿</span>

                    {/* Type icon */}
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--amber)', opacity: 0.7, flexShrink: 0 }}>
                      {ICONS[ch.type] || '#'}
                    </span>

                    {/* Name / edit input */}
                    {editing === ch._id ? (
                      <input
                        autoFocus
                        value={editVal}
                        onChange={e => setEditVal(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') saveEdit(ch)
                          if (e.key === 'Escape') setEditing(null)
                        }}
                        onBlur={() => saveEdit(ch)}
                        style={{
                          flex: 1, background: 'var(--bg-0)', border: '1px solid var(--amber)',
                          borderRadius: 'var(--radius-sm)', padding: '2px 6px',
                          color: 'var(--text-0)', fontSize: 12, fontFamily: 'var(--font-mono)',
                          outline: 'none',
                        }}
                      />
                    ) : (
                      <span
                        style={{ flex: 1, fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-1)', cursor: 'text' }}
                        onClick={e => { e.stopPropagation(); startEdit(ch) }}
                      >
                        {ch.name}
                      </span>
                    )}

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                      <button
                        onClick={e => { e.stopPropagation(); startEdit(ch) }}
                        title="Rename"
                        style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-sm)', color: 'var(--text-2)', fontSize: 11, cursor: 'pointer' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-4)'; e.currentTarget.style.color = 'var(--amber)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-2)' }}
                      >
                        ✎
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); deleteChannel(ch) }}
                        title="Delete"
                        style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-sm)', color: 'var(--text-2)', fontSize: 12, cursor: 'pointer' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(201,95,95,0.15)'; e.currentTarget.style.color = 'var(--red)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-2)' }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default ChannelManager
