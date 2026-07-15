import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import ServerListSidebar from '../components/sidebar/ServerListSidebar'
import DMSidebar   from '../components/dm/DMSidebar'
import DMChatArea  from '../components/dm/DMChatArea'
import CreateServerModal from '../components/server/CreateServerModal'
import { useServerList } from '../context/ServerListContext'
import api from '../utils/api'
import UserProfile from './UserProfile'

const DMPage = () => {
  const { conversationId } = useParams()
  const navigate  = useNavigate()
  const { servers, addServer } = useServerList()
  const [activeConversation, setActiveConversation] = useState(null)
  const [showCreate,         setShowCreate]         = useState(false)
  const [showProfile,        setShowProfile]        = useState(false)

  // Load conversation from URL param on mount / param change
  useEffect(() => {
    if (!conversationId) return
    api.get('/dm').then(res => {
      const found = res.data.find(c => c._id === conversationId)
      if (found) setActiveConversation(found)
    }).catch(() => {})
  }, [conversationId])

  return (
    <div className="app-layout">
      <ServerListSidebar
        servers={servers}
        activeServerId={null}
        onSelectServer={id => navigate(`/channels/${id}`)}
        onCreateServer={() => setShowCreate(true)}
        onProfileClick={() => setShowProfile(true)}
      />

      <DMSidebar
        activeConversationId={activeConversation?._id}
        onSelectConversation={setActiveConversation}
      />

      <DMChatArea conversation={activeConversation} />

      {showCreate && (
        <CreateServerModal
          onClose={() => setShowCreate(false)}
          onCreated={s => { addServer(s); navigate(`/channels/${s._id}`) }}
        />
      )}
      {showProfile && <UserProfile modal onClose={() => setShowProfile(false)} />}
    </div>
  )
}

export default DMPage
