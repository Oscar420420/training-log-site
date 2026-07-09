import { createContext, useContext, useEffect, useState } from 'react'

const ModeContext = createContext(null)
const STORAGE_KEY = 'training-log.mode'

export function ModeProvider({ children }) {
  const [mode, setMode] = useState(() => localStorage.getItem(STORAGE_KEY) === 'coach' ? 'coach' : 'train')

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, mode)
  }, [mode])

  return <ModeContext.Provider value={{ mode, setMode }}>{children}</ModeContext.Provider>
}

export function useMode() {
  return useContext(ModeContext)
}
