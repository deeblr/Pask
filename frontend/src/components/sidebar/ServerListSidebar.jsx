import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
const resolveUrl = (url) => {
  if (!url) return null
  return url.startsWith('http') ? url : `${API_URL}/${url.replace(/^\//, '')}`
}

const StatusDot = ({ status }) => {
  const c = { online: 'var(--ok)', idle: 'var(--warn)', dnd: 'var(--err)', offline: 'var(--t2)' }
  return (
    <div style={{
      position: 'absolute', bottom: -2, right: -2,
      width: 8, height: 8, borderRadius: '50%',
      background: c[status] || c.offline,
      border: '2px solid var(--s1)',
    }} />
  )
}

const ServerListSidebar = ({ servers, activeServerId, onSelectServer, onCreateServer, onProfileClick }) => {
  const { user }   = useAuth()
  const navigate   = useNavigate()
  const { pathname } = useLocation()

  const isHome = !activeServerId && !pathname.startsWith('/dm')
  const isDM   = pathname.startsWith('/dm')

  return (
    <div className="rail">
      <div className="rail-mark">PSK</div>
      <div className="rail-sep" />

      {/* Home */}
      <button
        className={`rail-btn${isHome ? ' active' : ''}`}
        onClick={() => navigate('/')}
        title="Home"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
        </svg>
      </button>

      {/* DMs */}
      <button
        className={`rail-btn${isDM ? ' active' : ''}`}
        onClick={() => navigate('/dm')}
        title="Direct Messages"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
        </svg>
      </button>

      {servers.length > 0 && <div className="rail-sep" />}

      {/* Servers */}
      {servers.map(s => (
        <button
          key={s._id}
          className={`rail-btn${s._id === activeServerId ? ' active' : ''}`}
          onClick={() => onSelectServer(s._id)}
          title={s.name}
        >
          {s.icon ? <img src={resolveUrl(s.icon)} alt={s.name} onError={e => { e.target.style.display='none'; e.target.parentNode.dataset.fallback = s.name.slice(0,2).toUpperCase() }} /> : s.name.slice(0, 2).toUpperCase()}
        </button>
      ))}

      {/* Add server */}
      <button className="rail-add" onClick={onCreateServer} title="Add Server">+</button>

      <div className="rail-spacer" />

      {/* My profile */}
      <div
        className="rail-me"
        onClick={() => onProfileClick ? onProfileClick() : navigate('/profile')}
        title="My Profile"
      >
        {user?.avatar
          ? <img src={resolveUrl(user.avatar)} alt="" onError={e => { e.target.style.display='none' }} />
          : user?.username?.slice(0, 2).toUpperCase()}
        <StatusDot status={user?.status || 'online'} />
      </div>
    </div>
  )
}

export default ServerListSidebar
