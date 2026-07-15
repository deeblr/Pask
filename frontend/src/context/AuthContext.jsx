import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../utils/api'
import { initSocket, disconnectSocket } from '../utils/socket'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('pask_token')
    if (token) {
      api.get('/auth/me')
        .then(res => {
          setUser(res.data)
          initSocket(token)
        })
        .catch((err) => {
          // Only clear the token if the error is 401 (unauthorized)
          // Don't clear the token for other errors (e.g. network issues)
          if (err.response?.status === 401) {
            localStorage.removeItem('pask_token')
          }
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = useCallback(async (email, password) => {
    const res = await api.post('/auth/login', { email, password })
    localStorage.setItem('pask_token', res.data.token)
    setUser(res.data.user)
    initSocket(res.data.token)
    return res.data
  }, [])

  const register = useCallback(async (username, email, password) => {
    const res = await api.post('/auth/register', { username, email, password })
    localStorage.setItem('pask_token', res.data.token)
    setUser(res.data.user)
    initSocket(res.data.token)
    return res.data
  }, [])

  const logout = useCallback(async () => {
    await api.post('/auth/logout').catch(() => {})
    localStorage.removeItem('pask_token')
    disconnectSocket()
    setUser(null)
  }, [])

  const updateUser = useCallback((updates) => {
    setUser(prev => ({ ...prev, ...updates }))
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
