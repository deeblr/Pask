import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const AuthPage = () => {
  const [mode, setMode]   = useState('login')
  const [form, setForm]   = useState({ username: '', email: '', password: '' })
  const [err,  setErr]    = useState('')
  const [busy, setBusy]   = useState(false)
  const { login, register } = useAuth()
  const navigate = useNavigate()

  const submit = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true)
    try {
      const email = form.email.trim().toLowerCase()
      if (mode === 'login') await login(email, form.password)
      else await register(form.username.trim(), email, form.password)
      navigate('/')
    } catch (e) { setErr(e.response?.data?.message || 'Something went wrong') }
    finally { setBusy(false) }
  }

  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-logo">PASK</div>
        <div className="auth-title">{mode === 'login' ? 'Welcome back' : 'Create account'}</div>
        <div className="auth-sub">{mode === 'login' ? '$ auth --mode login' : '$ auth --mode register'}</div>

        {err && <div className="err-msg">{err}</div>}

        <form onSubmit={submit}>
          {mode === 'register' && (
            <div className="field">
              <label>Username</label>
              <input type="text" value={form.username} onChange={f('username')} placeholder="cooluser" required minLength={3} maxLength={32} />
            </div>
          )}
          <div className="field">
            <label>Email</label>
            <input type="email" value={form.email} onChange={f('email')} placeholder="you@example.com" required />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" value={form.password} onChange={f('password')} placeholder="••••••••" required minLength={6} />
          </div>
          <div style={{ marginTop: 18 }}>
            <button type="submit" className="btn-pri" disabled={busy}>
              {busy ? '…' : mode === 'login' ? '→ Sign In' : '→ Create Account'}
            </button>
          </div>
        </form>

        <div className="auth-switch">
          {mode === 'login'
            ? <>No account? <span onClick={() => { setMode('register'); setErr('') }}>Register</span></>
            : <>Have an account? <span onClick={() => { setMode('login'); setErr('') }}>Sign in</span></>}
        </div>
      </div>
    </div>
  )
}

export default AuthPage
