import { createContext, useContext, useState, useCallback } from 'react'

const DialogCtx = createContext(null)

export const useDialog = () => useContext(DialogCtx)

let resolveRef = null

export const DialogProvider = ({ children }) => {
  const [dialog, setDialog] = useState(null)

  const confirm = useCallback(({ title, message, confirmLabel = 'Confirm', danger = false }) => {
    return new Promise(resolve => {
      resolveRef = resolve
      setDialog({ title, message, confirmLabel, danger })
    })
  }, [])

  const handleClose = (result) => {
    setDialog(null)
    resolveRef?.(result)
    resolveRef = null
  }

  return (
    <DialogCtx.Provider value={{ confirm }}>
      {children}
      {dialog && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(2px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'fadeIn 0.12s ease',
          }}
          onClick={e => e.target === e.currentTarget && handleClose(false)}
        >
          <div style={{
            background: 'var(--s2)', border: '1px solid var(--bmd)',
            borderRadius: 'var(--r4)', padding: '28px 28px 24px',
            width: '100%', maxWidth: 380,
            animation: 'slideUp 0.15s ease',
            boxShadow: '0 24px 48px rgba(0,0,0,0.5)',
          }}>
            {/* Icon */}
            <div style={{
              width: 40, height: 40, borderRadius: 'var(--r3)',
              background: dialog.danger ? 'rgba(201,95,95,0.12)' : 'var(--a-lo)',
              border: `1px solid ${dialog.danger ? 'rgba(201,95,95,0.25)' : 'var(--bm)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, marginBottom: 16,
            }}>
              {dialog.danger ? '⚠' : 'ℹ'}
            </div>

            <h3 style={{
              fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 600,
              color: dialog.danger ? 'var(--err)' : 'var(--t0)',
              marginBottom: 8,
            }}>
              {dialog.title}
            </h3>

            <p style={{
              fontSize: 13, color: 'var(--t1)', lineHeight: 1.6,
              marginBottom: 24, fontFamily: 'var(--font)',
            }}>
              {dialog.message}
            </p>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => handleClose(false)}
                style={{
                  padding: '8px 18px', fontSize: 12, fontWeight: 600,
                  fontFamily: 'var(--font-mono)',
                  background: 'var(--s4)', color: 'var(--t1)',
                  border: '1px solid var(--border)', borderRadius: 'var(--r2)',
                  cursor: 'pointer', transition: 'background 0.1s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--s5)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--s4)'}
              >
                Cancel
              </button>
              <button
                onClick={() => handleClose(true)}
                style={{
                  padding: '8px 18px', fontSize: 12, fontWeight: 700,
                  fontFamily: 'var(--font-mono)',
                  background: dialog.danger ? 'var(--err)' : 'var(--a)',
                  color: dialog.danger ? '#fff' : 'var(--bg-0)',
                  border: 'none', borderRadius: 'var(--r2)',
                  cursor: 'pointer', transition: 'opacity 0.1s',
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              >
                {dialog.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </DialogCtx.Provider>
  )
}
