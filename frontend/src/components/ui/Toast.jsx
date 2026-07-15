import { createContext, useContext, useState, useCallback } from 'react'

const ToastCtx = createContext(null)
export const useToast = () => useContext(ToastCtx)

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([])

  const show = useCallback((message, type = 'success', duration = 3000) => {
    const id = Date.now()
    setToasts(p => [...p, { id, message, type }])
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), duration)
  }, [])

  const success = useCallback((msg)   => show(msg, 'success'), [show])
  const error   = useCallback((msg)   => show(msg, 'error'),   [show])
  const info    = useCallback((msg)   => show(msg, 'info'),    [show])

  return (
    <ToastCtx.Provider value={{ show, success, error, info }}>
      {children}
      {toasts.length > 0 && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex', flexDirection: 'column', gap: 6,
          zIndex: 10000, alignItems: 'center',
        }}>
          {toasts.map(t => (
            <div
              key={t.id}
              style={{
                padding: '9px 16px',
                background: t.type === 'error'   ? '#2a1515'
                          : t.type === 'info'    ? '#151e2a'
                          : '#152215',
                border: `1px solid ${
                  t.type === 'error'  ? 'rgba(201,95,95,0.4)'
                : t.type === 'info'  ? 'rgba(106,159,192,0.4)'
                : 'rgba(76,175,125,0.4)'}`,
                color: t.type === 'error'  ? '#f09595'
                     : t.type === 'info'   ? '#8ec6e0'
                     : '#7dd4a0',
                borderRadius: 'var(--r3)',
                fontSize: 12, fontWeight: 600,
                fontFamily: 'var(--mono)',
                whiteSpace: 'nowrap',
                animation: 'slideUp 0.2s ease',
                boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
              }}
            >
              {t.type === 'error' ? '✗ ' : t.type === 'info' ? '• ' : '✓ '}
              {t.message}
            </div>
          ))}
        </div>
      )}
    </ToastCtx.Provider>
  )
}
