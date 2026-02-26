import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { ReactNode } from 'react'
import { fetchSettings } from '@/lib/api-client'

interface SettingsContextProps {
  logo: string | null
  icon: string | null
  bandName: string
  reloadSettings: () => Promise<void>
}

const SettingsContext = createContext<SettingsContextProps | undefined>(undefined)

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [logo, setLogo] = useState<string | null>(null)
  const [icon, setIcon] = useState<string | null>(null)
  const [bandName, setBandName] = useState<string>('NO EXIT')

  const reloadSettings = useCallback(async () => {
    try {
      const settings = await fetchSettings()
      setLogo(settings.logo ?? null)
      setIcon(settings.icon ?? null)
      setBandName(settings.bandname ?? 'NO EXIT')
    } catch {
      setLogo(null)
      setIcon(null)
      setBandName('NO EXIT')
    }
  }, [])

  useEffect(() => {
    reloadSettings()
    const handler = () => reloadSettings()
    window.addEventListener('noexit-settings-changed', handler)
    return () => window.removeEventListener('noexit-settings-changed', handler)
  }, [reloadSettings])

  return (
    <SettingsContext.Provider value={{ logo, icon, bandName, reloadSettings }}>
      {children}
    </SettingsContext.Provider>
  )
}

export const useSettings = () => {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used within a SettingsProvider')
  return ctx
}
