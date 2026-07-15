
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth }     from './context/AuthContext'
import { ServerListProvider }         from './context/ServerListContext'
import { DialogProvider }             from './components/ui/Dialog'
import { ToastProvider }              from './components/ui/Toast'
import AuthPage         from './pages/AuthPage'
import { DMProvider }    from './context/DMContext'
import FloatingDMPanel   from './components/dm/FloatingDMPanel'
import TopBar            from './components/ui/TopBar'
import MainPage      from './pages/MainPage'
import HomeDashboard from './pages/HomeDashboard'
import DMPage        from './pages/DMPage'
import UserProfile   from './pages/UserProfile'
import InvitePage    from './pages/InvitePage'
import BotAuthPage   from './pages/BotAuthPage'

const Loader = () => (
  <div className="loading-page">
    <div className="loading-logo">[ PASK ]</div>
    <div className="spinner" />
    <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--t2)' }}>initializing…</span>
  </div>
)

const Guard = ({ children }) => {
  const { user, loading } = useAuth()
  if (loading) return <Loader />
  return user ? children : <Navigate to="/login" replace />
}

const AppRoutes = () => (
  <Routes>
    <Route path="/login"                          element={<AuthPage />} />
    <Route path="/"                               element={<Guard><HomeDashboard /></Guard>} />
    <Route path="/channels/:serverId/:channelId?" element={<Guard><MainPage /></Guard>} />
    <Route path="/dm/:conversationId?"            element={<Guard><DMPage /></Guard>} />
    <Route path="/profile"                        element={<Guard><UserProfile /></Guard>} />
    <Route path="/profile/:userId"                element={<Guard><UserProfile /></Guard>} />
    <Route path="/invite/:code"                   element={<Guard><InvitePage /></Guard>} />
    <Route path="/bot/:botId"                     element={<Guard><BotAuthPage /></Guard>} />
    <Route path="*"                               element={<Navigate to="/" replace />} />
  </Routes>
)

const AuthenticatedExtras = () => {
  const { user, loading } = useAuth()
  if (loading || !user) return null
  return (
    <>
      <FloatingDMPanel />
      <TopBar />
    </>
  )
}

const App = () => (
  <AuthProvider>
    <ToastProvider>
      <DialogProvider>
        <ServerListProvider>
          <DMProvider>
            <AppRoutes />
            <AuthenticatedExtras />
          </DMProvider>
        </ServerListProvider>
      </DialogProvider>
    </ToastProvider>
  </AuthProvider>
)

export default App
