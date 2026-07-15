import { useState } from 'react'
import api from '../../utils/api'

const CreateServerModal = ({ onClose, onCreated }) => {
  const [tab, setTab] = useState('create')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [inviteCode, setInviteCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await api.post('/servers', { name, description, isPublic })
      onCreated(res.data)
      onClose()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create server')
    } finally {
      setLoading(false)
    }
  }

  const handleJoin = async (e) => {
    e.preventDefault()
    if (!inviteCode.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await api.post(`/servers/join/${inviteCode.trim().toUpperCase()}`)
      onCreated(res.data)
      onClose()
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid invite code')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={styles.modal} className="fade-in">
        <button onClick={onClose} style={styles.closeBtn}>×</button>
        <h2 style={styles.title}>Add a Server</h2>
        <p style={styles.subtitle}>Create your own server or join one with an invite code</p>

        <div style={styles.tabs}>
          <button
            style={{ ...styles.tab, ...(tab === 'create' ? styles.activeTab : {}) }}
            onClick={() => setTab('create')}
          >
            Create Server
          </button>
          <button
            style={{ ...styles.tab, ...(tab === 'join' ? styles.activeTab : {}) }}
            onClick={() => setTab('join')}
          >
            Join Server
          </button>
        </div>

        {error && <div style={styles.error}>{error}</div>}

        {tab === 'create' ? (
          <form onSubmit={handleCreate} style={styles.form}>
            <div style={styles.field}>
              <label style={styles.label}>Server Name *</label>
              <input
                style={styles.input}
                placeholder="My Awesome Server"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                maxLength={100}
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Description</label>
              <textarea
                style={{ ...styles.input, height: 80, resize: 'vertical' }}
                placeholder="What's this server about?"
                value={description}
                onChange={e => setDescription(e.target.value)}
                maxLength={500}
              />
            </div>
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={isPublic}
                onChange={e => setIsPublic(e.target.checked)}
                style={{ marginRight: 8 }}
              />
              Make server public
            </label>
            <div style={styles.btnRow}>
              <button type="button" onClick={onClose} style={styles.cancelBtn}>Cancel</button>
              <button type="submit" style={styles.submitBtn} disabled={loading || !name.trim()}>
                {loading ? 'Creating...' : 'Create Server'}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleJoin} style={styles.form}>
            <div style={styles.field}>
              <label style={styles.label}>Invite Code</label>
              <input
                style={styles.input}
                placeholder="Enter invite code (e.g. ABC12345)"
                value={inviteCode}
                onChange={e => setInviteCode(e.target.value)}
                required
              />
            </div>
            <div style={styles.btnRow}>
              <button type="button" onClick={onClose} style={styles.cancelBtn}>Cancel</button>
              <button type="submit" style={styles.submitBtn} disabled={loading || !inviteCode.trim()}>
                {loading ? 'Joining...' : 'Join Server'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-xl)',
    padding: '32px',
    width: '100%',
    maxWidth: '440px',
    position: 'relative',
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 20,
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    fontSize: 24,
    cursor: 'pointer',
    lineHeight: 1,
  },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 6 },
  subtitle: { fontSize: 14, color: 'var(--text-secondary)', marginBottom: 20 },
  tabs: {
    display: 'flex',
    gap: 4,
    marginBottom: 20,
    background: 'var(--bg-tertiary)',
    padding: 4,
    borderRadius: 'var(--radius-md)',
  },
  tab: {
    flex: 1,
    padding: '8px',
    background: 'transparent',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'var(--font)',
  },
  activeTab: {
    background: 'var(--bg-active)',
    color: 'var(--text-primary)',
  },
  error: {
    background: '#f0474718',
    border: '1px solid #f0474740',
    color: '#f04747',
    borderRadius: 'var(--radius-md)',
    padding: '10px 14px',
    fontSize: 13,
    marginBottom: 16,
  },
  form: { display: 'flex', flexDirection: 'column', gap: 16 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  input: {
    background: 'var(--bg-primary)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    padding: '10px 14px',
    fontSize: 15,
    color: 'var(--text-primary)',
    outline: 'none',
    fontFamily: 'var(--font)',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    fontSize: 14,
    color: 'var(--text-secondary)',
    cursor: 'pointer',
  },
  btnRow: { display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 },
  cancelBtn: {
    background: 'transparent',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    padding: '10px 20px',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    fontSize: 14,
    fontFamily: 'var(--font)',
  },
  submitBtn: {
    background: 'var(--accent)',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    padding: '10px 24px',
    color: '#fff',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'var(--font)',
  },
}

export default CreateServerModal
