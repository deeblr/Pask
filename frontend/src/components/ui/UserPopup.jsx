/**
 * UserPopup — mini profile card that appears on hover or click.
 * Shown next to the triggering element.
 *
 * Usage:
 *   <UserPopup userId="abc123" anchor={<span>username</span>} />
 */
import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../utils/api'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
const toUrl = p => p ? (p.startsWith('http') ? p : `${API_URL}/${p.replace(/^\//, '')}`) : null

const STATUS = {
  online:  { color: '#4caf7d', label: 'Online' },
  idle:    { color: '#d4a843', label: 'Idle' },
  dnd:     { color: '#c95f5f', label: 'Do Not Disturb' },
  offline: { color: '#5c5a52', label: 'Offline' },
}

const Av = ({ user, size }) => (
  <div style={{
    width: size, height: size, borderRadius: 'var(--r2)',
    background: user?.bannerColor ? `${user.bannerColor}1a` : 'var(--a-lo)',
    border: `1px solid ${user?.bannerColor ? `${user.bannerColor}3a` : 'var(--bm)'}`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'var(--mono)', fontSize: Math.round(size * .33), fontWeight: 700,
    color: user?.bannerColor || 'var(--a)', overflow: 'hidden', flexShrink: 0,
  }}>
    {user?.avatar
      ? <img src={toUrl(user.avatar)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e=>e.target.style.display='none'}/>
      : user?.username?.slice(0, 2).toUpperCase()}
  </div>
)

const Card = ({ profile, anchorRect, onClose }) => {
  const navigate  = useNavigate()
  const { user: me } = useAuth()
  const cardRef   = useRef(null)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const s = STATUS[profile?.status] || STATUS.offline
  const isMe = profile?._id === me?._id

  // position card smart — try right of anchor, flip if overflows
  useEffect(() => {
    if (!cardRef.current || !anchorRect) return
    const card  = cardRef.current.getBoundingClientRect()
    const vw    = window.innerWidth
    const vh    = window.innerHeight
    let left    = anchorRect.right + 8
    let top     = anchorRect.top

    if (left + 260 > vw)  left  = anchorRect.left - 268
    if (left < 0)         left  = 8
    if (top + 320 > vh)   top   = vh - 324
    if (top < 0)          top   = 8
    setPos({ top, left })
  }, [anchorRect])

  useEffect(() => {
    const h = (e) => {
      if (cardRef.current && !cardRef.current.contains(e.target)) onClose()
    }
    setTimeout(() => document.addEventListener('mousedown', h), 0)
    return () => document.removeEventListener('mousedown', h)
  }, [onClose])

  const openDM = async () => {
    try { const r = await api.post(`/dm/open/${profile._id}`); navigate(`/dm/${r.data._id}`) }
    catch {}
    onClose()
  }

  const addFriend = async () => {
    try { await api.post(`/friends/request/${profile._id}`) }
    catch {}
    onClose()
  }

  return (
    <div
      ref={cardRef}
      style={{
        position: 'fixed',
        top: pos.top, left: pos.left,
        width: 256, zIndex: 2000,
        background: 'var(--s2)',
        border: '1px solid var(--bm)',
        borderRadius: 'var(--r4)',
        overflow: 'hidden',
        boxShadow: '0 16px 48px rgba(0,0,0,.65)',
        animation: 'slide-up .14s ease',
      }}
    >
      {/* Banner */}
      <div style={{ height: 56, background: profile?.bannerColor || 'var(--a-lo)', position: 'relative' }}>
        <div style={{ position: 'absolute', bottom: -18, left: 12 }}>
          <Av user={profile} size={40} />
        </div>
        {/* Status dot on avatar */}
        <div style={{
          position: 'absolute', bottom: -20, left: 44,
          width: 10, height: 10, borderRadius: '50%',
          background: s.color, border: '2px solid var(--s2)',
        }} />
      </div>

      <div style={{ padding: '24px 12px 12px' }}>
        {/* Name row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 }}>
          <div>
            <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 13, color: 'var(--t0)' }}>
              {profile?.username}
            </div>
            {profile?.pronouns && (
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t2)', marginTop: 1 }}>
                {profile.pronouns}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--mono)', fontSize: 10, color: s.color }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.color, display: 'inline-block' }} />
            {s.label}
          </div>
        </div>

        {/* Bio */}
        {profile?.bio && (
          <div style={{
            fontSize: 11, color: 'var(--t1)', lineHeight: 1.5,
            background: 'var(--s3)', border: '1px solid var(--b)',
            borderRadius: 'var(--r1)', padding: '6px 8px', marginBottom: 8,
          }}>
            {profile.bio}
          </div>
        )}

        {/* Member since */}
        {profile?.createdAt && (
          <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t2)', marginBottom: 10 }}>
            Member since {new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {isMe ? (
            <button className="btn btn-sm btn-amber" onClick={() => { navigate('/profile'); onClose() }}>
              Edit Profile
            </button>
          ) : (
            <>
              <button className="btn btn-sm btn-amber" onClick={openDM}>Message</button>
              {!profile?.isFriend && !profile?.requestSent && (
                <button className="btn btn-sm btn-ghost" onClick={addFriend}>Add Friend</button>
              )}
            </>
          )}
          <button
            className="btn btn-sm btn-ghost"
            onClick={() => { navigate(`/profile/${profile?._id}`); onClose() }}
          >
            Profile ↗
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Main export ─────────────────────────────────────────── */
const UserPopup = ({ userId, children }) => {
  const [profile,    setProfile]    = useState(null)
  const [open,       setOpen]       = useState(false)
  const [anchorRect, setAnchorRect] = useState(null)
  const hoverTimer  = useRef(null)
  const wrapRef     = useRef(null)

  const loadProfile = useCallback(async () => {
    if (profile) return
    try { const r = await api.get(`/users/${userId}`); setProfile(r.data) } catch {}
  }, [userId, profile])

  const handleMouseEnter = (e) => {
    hoverTimer.current = setTimeout(() => {
      setAnchorRect(wrapRef.current?.getBoundingClientRect())
      loadProfile()
      setOpen(true)
    }, 500)
  }

  const handleMouseLeave = () => clearTimeout(hoverTimer.current)

  const handleClick = (e) => {
    e.stopPropagation()
    setAnchorRect(wrapRef.current?.getBoundingClientRect())
    loadProfile()
    setOpen(true)
  }

  return (
    <>
      <span
        ref={wrapRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        style={{ cursor: 'pointer' }}
      >
        {children}
      </span>
      {open && profile && (
        <Card
          profile={profile}
          anchorRect={anchorRect}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}

export default UserPopup
