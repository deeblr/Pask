import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/ui/Toast'
import ServerListSidebar from '../components/sidebar/ServerListSidebar'
import { useServerList } from '../context/ServerListContext'
import CreateServerModal from '../components/server/CreateServerModal'
import FriendsList from '../components/friends/FriendsList'
import api from '../utils/api'
import { useDM } from '../context/DMContext'
import { getSocket } from '../utils/socket'
import UserProfile from './UserProfile'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
const resolveUrl = (url) => {
  if (!url) return null
  return url.startsWith('http') ? url : `${API_URL}/${url.replace(/^\//, '')}`
}

const HomeDashboard = () => {
  const { user, logout } = useAuth()
  const navigate  = useNavigate()
  const toast     = useToast()
  const { servers, addServer } = useServerList()
  const [showCreate, setShowCreate] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [status, setStatus] = useState(user?.status || 'online')
  const { togglePanel, panelState } = useDM()


  const changeStatus = async (s) => {
    setStatus(s)
    await api.put('/users/me', { status: s }).catch(() => {})
    getSocket()?.emit('status:change', s)
  }

  return (
    <div className="app-layout">
      <ServerListSidebar
        servers={servers}
        activeServerId={null}
        onSelectServer={id => navigate(`/channels/${id}`)}
        onCreateServer={() => setShowCreate(true)}
        onProfileClick={() => setShowProfile(true)}
      />

      {/* Friends panel */}
      <div style={{ width: 260, background: 'var(--s2)', borderRight: '1px solid var(--b)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <FriendsList />
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--s1)' }}>
        {/* Top bar */}
        <div style={{ height: 48, borderBottom: '1px solid var(--b)', padding: '0 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600, color: 'var(--a)' }}>/ home</span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              className={`btn btn-sm${panelState !== 'closed' ? ' btn-amber' : ' btn-ghost'}`}
              onClick={togglePanel}
              title="Direct Messages"
              style={{ display:'flex', alignItems:'center', gap:5, fontSize:11 }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              DMs
            </button>
            <select value={status} onChange={e => changeStatus(e.target.value)} className="form-select" style={{ width: 'auto', fontSize: 11, padding: '4px 8px' }}>
              <option value="online">● Online</option>
              <option value="idle">● Idle</option>
              <option value="dnd">● Do Not Disturb</option>
              <option value="offline">● Invisible</option>
            </select>
            <button className="btn btn-sm btn-ghost" onClick={logout}
              style={{ borderColor: 'transparent' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--err)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--t1)'}>
              Sign Out
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24, maxWidth: 640, width: '100%' }}>
          {/* User card */}
          <div style={{ background: 'var(--s2)', border: '1px solid var(--bm)', borderRadius: 'var(--r4)', overflow: 'hidden', marginBottom: 24 }}>
            <div style={{ height: 52, background: user?.bannerColor || 'var(--a-lo)', position: 'relative' }}>
              <div style={{ position: 'absolute', bottom: -18, left: 14 }}>
                <div style={{ position: 'relative' }}>
                  <div className="av" style={{ width: 40, height: 40, fontSize: 13, background: user?.bannerColor ? `${user.bannerColor}22` : 'var(--a-lo)', borderColor: 'var(--s2)', borderWidth: 2, color: user?.bannerColor || 'var(--a)' }}>
                    {user?.avatar ? <img src={resolveUrl(user.avatar)} alt="" onError={e => e.target.style.display='none'} /> : user?.username?.slice(0, 2).toUpperCase()}
                  </div>
                </div>
              </div>
            </div>
            <div style={{ padding: '24px 14px 14px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 14, color: 'var(--t0)' }}>{user?.username}</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t2)', marginTop: 1 }}>{user?.email}</div>
              </div>
              <button className="btn btn-sm btn-ghost" onClick={() => navigate('/profile')}>Edit Profile</button>
            </div>
          </div>

          {/* Servers */}
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 600, color: 'var(--t2)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
            Your Servers
            <div style={{ flex: 1, height: 1, background: 'var(--b)' }} />
          </div>

          {servers.length === 0 ? (
            <div className="empty-state" style={{ background: 'var(--s2)', border: '1px dashed var(--bm)', borderRadius: 'var(--r4)', padding: 36, flex: 'none' }}>
              <p>No servers yet</p>
              <button className="btn btn-amber btn-sm" onClick={() => setShowCreate(true)}>Create or Join</button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
              {servers.map(s => (
                <button
                  key={s._id}
                  onClick={() => navigate(`/channels/${s._id}`)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--s2)', border: '1px solid var(--b)', borderRadius: 'var(--r3)', padding: 11, cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--sans)', color: 'var(--t0)', transition: 'border-color .14s' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--bm)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--b)'}
                >
                  <div className="av" style={{ width: 38, height: 38, fontSize: 12, flexShrink: 0, overflow: 'hidden', padding: 0 }}>
                    {s.icon ? <img src={resolveUrl(s.icon)} alt={s.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display='none' }} /> : s.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.description || '—'}</div>
                  </div>
                </button>
              ))}
              <button
                onClick={() => setShowCreate(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'transparent', border: '1px dashed var(--bm)', borderRadius: 'var(--r3)', padding: 11, cursor: 'pointer', transition: 'border-color .14s, background .14s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--a)'; e.currentTarget.style.background = 'var(--a-lo)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--bm)'; e.currentTarget.style.background = 'transparent' }}
              >
                <div className="av" style={{ width: 38, height: 38, fontSize: 20, fontFamily: 'inherit', background: 'var(--s3)', borderColor: 'var(--b)', color: 'var(--t2)', flexShrink: 0 }}>+</div>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--t2)' }}>Add Server</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {showCreate && (
        <CreateServerModal
          onClose={() => setShowCreate(false)}
          onCreated={s => { addServer(s); navigate(`/channels/${s._id}`) }}
        />
      )}
      {showProfile && <UserProfile modal onClose={() => setShowProfile(false)} />}
    </div>
  )
}

export default HomeDashboard