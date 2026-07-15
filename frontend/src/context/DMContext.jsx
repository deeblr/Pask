import { createContext, useContext, useState, useCallback } from 'react'

const DMContext = createContext(null)

export const DMProvider = ({ children }) => {
  // 'closed' | 'open' | 'mini'
  const [panelState,   setPanelState]   = useState('closed')
  const [activeConvo,  setActiveConvo]  = useState(null)   // conversation object

  const openPanel  = useCallback((convo = null) => {
    if (convo) setActiveConvo(convo)
    setPanelState('open')
  }, [])

  const miniPanel  = useCallback(() => setPanelState('mini'),   [])
  const closePanel = useCallback(() => { setPanelState('closed'); setActiveConvo(null) }, [])
  const togglePanel = useCallback(() => {
    setPanelState(p => p === 'closed' ? 'open' : p === 'open' ? 'mini' : 'open')
  }, [])

  const selectConvo = useCallback((convo) => {
    setActiveConvo(convo)
    setPanelState('open')
  }, [])

  return (
    <DMContext.Provider value={{ panelState, activeConvo, openPanel, miniPanel, closePanel, togglePanel, selectConvo }}>
      {children}
    </DMContext.Provider>
  )
}

export const useDM = () => useContext(DMContext)