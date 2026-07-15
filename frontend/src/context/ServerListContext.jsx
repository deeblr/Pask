/**
 * ServerListContext — keeps the rail server list in sync globally
 * so any page (Home, MainPage, DMPage) shares the same list.
 */
import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../utils/api'
import { getSocket } from '../utils/socket'
import { useAuth } from './AuthContext'

const Ctx = createContext(null)
export const useServerList = () => useContext(Ctx)

export const ServerListProvider = ({ children }) => {
  const { user } = useAuth()
  const [servers, setServers] = useState([])

  const reload = useCallback(async () => {
    if (!user) return
    try { const r = await api.get('/servers'); setServers(r.data) } catch {}
  }, [user])

  useEffect(() => { reload() }, [reload])

  // Socket: refresh list when server details change
  useEffect(() => {
    const socket = getSocket(); if (!socket) return
    socket.on('server:updated', reload)
    socket.on('server:deleted', reload)
    return () => { socket.off('server:updated', reload); socket.off('server:deleted', reload) }
  }, [reload])

  const addServer    = useCallback((s) => setServers(p => [...p, s]), [])
  const removeServer = useCallback((id) => setServers(p => p.filter(s => s._id !== id)), [])
  const patchServer  = useCallback((s) => setServers(p => p.map(x => x._id === s._id ? { ...x, ...s } : x)), [])

  return (
    <Ctx.Provider value={{ servers, reload, addServer, removeServer, patchServer }}>
      {children}
    </Ctx.Provider>
  )
}
