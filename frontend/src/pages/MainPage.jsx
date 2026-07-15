import { useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ServerProvider, useServer } from '../context/ServerContext'
import ServerListSidebar from '../components/sidebar/ServerListSidebar'
import ChannelSidebar    from '../components/sidebar/ChannelSidebar'
import ChatArea          from '../components/chat/ChatArea'
import MembersSidebar    from '../components/server/MembersSidebar'
import CreateServerModal from '../components/server/CreateServerModal'
import { useServerList } from '../context/ServerListContext'
import api from '../utils/api'
import { useDM } from '../context/DMContext'
import UserProfile from './UserProfile'

const Inner = () => {
  const { serverId } = useParams()
  const navigate = useNavigate()
  const { servers, addServer } = useServerList()
  const { server, channels, active, selectChannel, updateServer, reloadChannels } = useServer()
  const [showCreate, setShowCreate] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const { togglePanel, totalUnread } = useDM()

  const handleLeave = useCallback(async () => {
    try { await api.post(`/servers/${serverId}/leave`) } catch {}
    navigate('/')
  }, [serverId, navigate])

  return (
    <div className="app-layout">
      <ServerListSidebar
        servers={servers}
        activeServerId={serverId}
        onSelectServer={id => navigate(`/channels/${id}`)}
        onCreateServer={() => setShowCreate(true)}
        onProfileClick={() => setShowProfile(true)}
      />

      {server && (
        <ChannelSidebar
          server={server}
          channels={channels}
          activeChannelId={active?._id}
          onSelectChannel={selectChannel}
          onLeaveServer={handleLeave}
          onServerUpdated={updateServer}
          onChannelsChanged={reloadChannels}
        />
      )}

      <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0, height:'100%', overflow:'hidden' }}>
        {/* DM toggle button in chat topbar is inside ChatArea header — injected globally */}
        <ChatArea channel={active} server={server}/>
      </div>

      {server && <MembersSidebar members={server.members || []} bots={server.bots || []}/>}

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

const MainPage = () => {
  const { serverId, channelId } = useParams()
  return (
    <ServerProvider serverId={serverId} channelId={channelId}>
      <Inner/>
    </ServerProvider>
  )
}

export default MainPage