import { io } from 'socket.io-client'


const BACKEND_ORIGIN = (() => {
  const url = import.meta.env.VITE_API_URL || 'http://localhost:8080'
  try { return new URL(url).origin } catch { return url }
})()

let socket = null

export const getSocket = () => socket

export const initSocket = (token) => {
  if (socket?.connected) return socket

  socket = io(BACKEND_ORIGIN, {
    auth: { token },
    transports: ['polling', 'websocket'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 10,
  })

  socket.on('connect',       () => console.log('🔌 Socket connected'))
  socket.on('disconnect',    () => console.log('🔌 Socket disconnected'))
  socket.on('connect_error', (err) => console.error('Socket error:', err.message))

  return socket
}

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}
