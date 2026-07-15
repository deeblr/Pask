import { useNavigate } from 'react-router-dom'
import UserPopup from '../ui/UserPopup'
import BotPopup  from '../ui/BotPopup'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
const toUrl = (p) => {
  if (!p) return null
  return p.startsWith('http') ? p : `${API_URL}/${p.replace(/^\//, '')}`
}

const ROLE_STYLE = {
  owner:     { bg:'rgba(212,168,67,.13)',  color:'#d4a843', label:'Owner' },
  admin:     { bg:'rgba(201,95,95,.13)',   color:'#c95f5f', label:'Admin' },
  moderator: { bg:'rgba(76,175,125,.13)',  color:'#4caf7d', label:'Mod'  },
}

const Av = ({ user, size = 28 }) => {
  const avatarUrl = toUrl(user?.avatar)
  return (
    <div style={{ position:'relative', flexShrink:0 }}>
      <div className="av" style={{
        width:size, height:size, fontSize:Math.round(size*.32),
        background: user?.bannerColor ? `${user.bannerColor}1a` : 'var(--a-lo)',
        borderColor: user?.bannerColor ? `${user.bannerColor}3a` : 'var(--bm)',
        color: user?.bannerColor || 'var(--a)',
      }}>
        {avatarUrl
          ? <img src={avatarUrl} alt="" onError={e=>e.target.style.display='none'}/>
          : user?.username?.slice(0,2).toUpperCase()
        }
      </div>
      <div className={`sdot ${user?.status || 'offline'}`} style={{ borderColor:'var(--s2)' }}/>
    </div>
  )
}

/* ── Bot Avatar ─────────────────────────────────────────── */
const BotAv = ({ bot, size = 28 }) => {
  const avatarUrl = toUrl(bot?.avatar)
  return (
    <div style={{ position:'relative', flexShrink:0 }}>
      <div className="av" style={{
        width:size, height:size, fontSize:Math.round(size*.32),
        background: 'rgba(88,101,242,.18)',
        borderColor: 'rgba(88,101,242,.35)',
        color: '#7289da',
      }}>
        {avatarUrl
          ? <img src={avatarUrl} alt="" onError={e=>e.target.style.display='none'}/>
          : bot?.name?.slice(0,2).toUpperCase()
        }
      </div>
      {/* Bot online dot — always green if online */}
      <div style={{
        position:'absolute', bottom:-1, right:-1,
        width:9, height:9, borderRadius:'50%',
        background: bot?.online ? '#23a55a' : '#80848e',
        border:'2px solid var(--s2)',
      }}/>
    </div>
  )
}

const MembersSidebar = ({ members = [], bots = [] }) => {
  const online  = members.filter(m => m.user?.status && m.user.status !== 'offline')
  const offline = members.filter(m => !m.user?.status || m.user.status === 'offline')
  const botsOnline  = bots.filter(b => b.online)
  const botsOffline = bots.filter(b => !b.online)

  const renderMember = (m, i) => {
    const u = m.user
    const role = ROLE_STYLE[m.role]

    return (
      <UserPopup key={u?._id || i} userId={u?._id}>
        <div className="msb-member" style={{ cursor:'pointer' }}>
          <Av user={u} size={28}/>
          <div style={{ flex:1, minWidth:0 }}>
            <div className="msb-member-name" style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {u?.username}
            </div>
            {role && (
              <div style={{ fontSize:10, fontFamily:'var(--mono)', color:role.color, opacity:.8, marginTop:1 }}>
                {role.label}
              </div>
            )}
          </div>
          {role && (
            <span style={{
              fontSize:9, fontFamily:'var(--mono)', fontWeight:700,
              background:role.bg, color:role.color,
              padding:'2px 6px', borderRadius:4,
              border:`1px solid ${role.color}30`,
              flexShrink:0, letterSpacing:'.04em',
            }}>
              {role.label}
            </span>
          )}
        </div>
      </UserPopup>
    )
  }

  const renderBot = (bot) => (
    <BotPopup key={bot._id} bot={bot}>
    <div className="msb-member" style={{ cursor:'pointer', opacity: bot.online ? 1 : 0.55 }}>
      <BotAv bot={bot} size={28}/>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:5, overflow:'hidden' }}>
          <span className="msb-member-name" style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {bot.name}
          </span>
          <span style={{
            fontSize:8, fontFamily:'var(--mono)', fontWeight:700,
            background:'rgba(88,101,242,.25)', color:'#7289da',
            padding:'1px 5px', borderRadius:3,
            border:'1px solid rgba(88,101,242,.35)',
            flexShrink:0, letterSpacing:'.05em',
          }}>
            BOT
          </span>
        </div>
        {bot.description && (
          <div style={{ fontSize:10, fontFamily:'var(--mono)', color:'var(--t3)', opacity:.7, marginTop:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {bot.description}
          </div>
        )}
      </div>
    </div>
    </BotPopup>
  )

  const totalBots = bots.length
  const totalMembers = members.length + totalBots

  return (
    <div className="msb">
      <div className="msb-head">Members — {totalMembers}</div>
      <div className="msb-scroll">

        {/* Online members */}
        {online.length > 0 && (
          <>
            <div className="msb-group-label">Online — {online.length + botsOnline.length}</div>
            {online.map(renderMember)}
            {botsOnline.map(renderBot)}
          </>
        )}

        {/* Offline members */}
        {offline.length > 0 && (
          <>
            <div className="msb-group-label" style={{ marginTop:12 }}>Offline — {offline.length + botsOffline.length}</div>
            {offline.map(renderMember)}
            {botsOffline.map(renderBot)}
          </>
        )}

        {/* If no online members but bots are online */}
        {online.length === 0 && botsOnline.length > 0 && (
          <>
            <div className="msb-group-label">Online — {botsOnline.length}</div>
            {botsOnline.map(renderBot)}
          </>
        )}

        {/* Offline bots when no offline members */}
        {offline.length === 0 && botsOffline.length > 0 && (
          <>
            <div className="msb-group-label" style={{ marginTop:12 }}>Offline — {botsOffline.length}</div>
            {botsOffline.map(renderBot)}
          </>
        )}

      </div>
    </div>
  )
}

export default MembersSidebar