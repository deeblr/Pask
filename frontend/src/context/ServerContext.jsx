/**
 * ServerContext — single source of truth for the active server.
 * Real-time updates via socket — no manual refresh needed.
 */
import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../utils/api'
import { getSocket } from '../utils/socket'

const ServerCtx = createContext(null)
export const useServer = () => useContext(ServerCtx)

export const ServerProvider = ({ serverId, channelId, children }) => {
  const navigate = useNavigate()

  const [server,   setServer]   = useState(null)
  const [channels, setChannels] = useState([])
  const [active,   setActive]   = useState(null)
  const [loading,  setLoading]  = useState(false)

  /* ── Helpers ─────────────────────────────────────── */
  const reloadServer = useCallback(async () => {
    if (!serverId) return
    try {
      const r = await api.get(`/servers/${serverId}`)
      setServer(r.data)
    } catch { navigate('/') }
  }, [serverId, navigate])

  const reloadChannels = useCallback(async () => {
    if (!serverId) return
    try {
      const r = await api.get(`/channels/server/${serverId}`)
      setChannels(r.data)
      return r.data
    } catch {}
  }, [serverId])

  /* ── Initial load ─────────────────────────────────── */
  useEffect(() => {
    if (!serverId) { setServer(null); setChannels([]); return }
    setLoading(true)
    Promise.all([
      api.get(`/servers/${serverId}`),
      api.get(`/channels/server/${serverId}`),
    ]).then(([sr, cr]) => {
      setServer(sr.data)
      setChannels(cr.data)
      if (!channelId && cr.data.length > 0) {
        const first = cr.data.find(c => c.type === 'text') || cr.data[0]
        navigate(`/channels/${serverId}/${first._id}`, { replace:true })
      }
    }).catch(() => navigate('/')).finally(() => setLoading(false))
  }, [serverId])

  /* ── Active channel from URL ──────────────────────── */
  useEffect(() => {
    if (!channelId || channels.length === 0) return
    const ch = channels.find(c => c._id === channelId)
    if (ch) setActive(ch)
  }, [channelId, channels])

  /* ── Socket — real-time updates ───────────────────── */
  useEffect(() => {
    if (!serverId) return
    const socket = getSocket()
    socket?.emit('server:join', serverId)

    // Member status change — patch in place (instant, no API call)
    const onStatus = ({ userId, status }) => {
      setServer(prev => prev ? {
        ...prev,
        members: prev.members.map(m => {
          const uid = m.user?._id || m.user
          return uid?.toString() === userId
            ? { ...m, user: { ...m.user, status } }
            : m
        })
      } : prev)
    }

    // Member join/leave — reload full server for accurate member list
    const onMemberJoin  = () => reloadServer()
    const onMemberLeave = () => reloadServer()

    // Channel CRUD — reload channels list instantly
    const onChannelCreated = () => reloadChannels()
    const onChannelDeleted = ({ channelId: cid }) => {
      setChannels(prev => prev.filter(c => c._id !== cid))
      // if deleted channel was active, go to first text channel
      setActive(prev => {
        if (!prev || prev._id !== cid) return prev
        return null
      })
      reloadChannels()
    }
    const onChannelUpdated = ({ channel }) => {
      setChannels(prev => prev.map(c => c._id === channel._id ? channel : c))
    }

    // Server updated (name, icon, etc)
    const onServerUpdated = ({ server: s }) => {
      if (s._id === serverId) setServer(s)
    }

    socket?.on('user:statusChange',   onStatus)
    socket?.on('server:memberJoin',   onMemberJoin)
    socket?.on('server:memberLeave',  onMemberLeave)
    socket?.on('channel:created',     onChannelCreated)
    socket?.on('channel:deleted',     onChannelDeleted)
    socket?.on('channel:updated',     onChannelUpdated)
    socket?.on('server:updated',      onServerUpdated)

    return () => {
      socket?.off('user:statusChange',  onStatus)
      socket?.off('server:memberJoin',  onMemberJoin)
      socket?.off('server:memberLeave', onMemberLeave)
      socket?.off('channel:created',    onChannelCreated)
      socket?.off('channel:deleted',    onChannelDeleted)
      socket?.off('channel:updated',    onChannelUpdated)
      socket?.off('server:updated',     onServerUpdated)
    }
  }, [serverId, reloadServer, reloadChannels])

  const updateServer   = useCallback((s) => setServer(s), [])
  const updateChannels = useCallback((ch) => setChannels(ch), [])
  const selectChannel  = useCallback((ch) => {
    if (!ch) return
    navigate(`/channels/${serverId}/${ch._id}`)
  }, [serverId, navigate])

  return (
    <ServerCtx.Provider value={{
      server, channels, active, loading,
      reloadServer, reloadChannels,
      updateServer, updateChannels, selectChannel,
    }}>
      {children}
    </ServerCtx.Provider>
  )
}
