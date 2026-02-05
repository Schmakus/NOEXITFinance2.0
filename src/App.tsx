import { useEffect, useCallback, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { fetchSettings } from '@/lib/api-client'
import Layout from '@/components/Layout'
import Dashboard from '@/pages/Dashboard'
import Musicians from '@/pages/Musicians'
import Groups from '@/pages/Groups'
import Concerts from '@/pages/Concerts'
import Bookings from '@/pages/Bookings'
import Transactions from '@/pages/Transactions'
import Tags from '@/pages/Tags'
import Settings from '@/pages/Settings'
import Login from '@/pages/Login'

function App() {
  const { isAuthenticated, isLoading } = useAuth()
  const [faviconSet, setFaviconSet] = useState(false)

  const updateTitleAndFavicon = useCallback(async () => {
    try {
      const settings = await fetchSettings()
      const bandName = settings.bandname || 'NO EXIT'
      const logo = settings.logo ?? null

      document.title = `${bandName} - Finanzverwaltung`

      let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null
      if (logo) {
        if (!link) {
          link = document.createElement('link')
          link.rel = 'icon'
          document.head.appendChild(link)
        }
        link.type = 'image/png'
        link.href = logo
      } else if (link) {
        link.type = 'image/svg+xml'
        link.href = '/vite.svg'
      }
      setFaviconSet(true)
    } catch {
      document.title = 'NO EXIT - Finanzverwaltung'
    }
  }, [])

  useEffect(() => {
    updateTitleAndFavicon()

    const handleSettingsChanged = () => updateTitleAndFavicon()
    window.addEventListener('noexit-settings-changed', handleSettingsChanged)
    return () => window.removeEventListener('noexit-settings-changed', handleSettingsChanged)
  }, [updateTitleAndFavicon, isAuthenticated])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <p className="text-muted-foreground">Lade...</p>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />} />
        
        {isAuthenticated ? (
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/musicians" element={<Musicians />} />
            <Route path="/groups" element={<Groups />} />
            <Route path="/bookings" element={<Bookings />} />
            <Route path="/concerts" element={<Concerts />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/tags" element={<Tags />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        ) : (
          <Route path="*" element={<Navigate to="/login" replace />} />
        )}
      </Routes>
    </BrowserRouter>
  )
}

export default App

