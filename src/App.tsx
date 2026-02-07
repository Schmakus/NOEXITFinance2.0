import { useEffect, useCallback } from 'react'
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
import Archive from '@/pages/Archive'
import Login from '@/pages/Login'
import Statement from '@/pages/Statement'

function App() {
  const { isAuthenticated, isLoading } = useAuth()

  const updateTitle = useCallback(async () => {
    try {
      const settings = await fetchSettings()
      const bandName = settings.bandname || 'NO EXIT'
      document.title = `${bandName} - Finanzverwaltung`
    } catch {
      document.title = 'NO EXIT - Finanzverwaltung'
    }
  }, [])

  useEffect(() => {
    updateTitle()

    const handleSettingsChanged = () => updateTitle()
    window.addEventListener('noexit-settings-changed', handleSettingsChanged)
    return () => window.removeEventListener('noexit-settings-changed', handleSettingsChanged)
  }, [updateTitle, isAuthenticated])

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
          <>
            <Route path="/statement/:musicianId" element={<Statement />} />
            <Route element={<Layout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/musicians" element={<Musicians />} />
              <Route path="/groups" element={<Groups />} />
              <Route path="/bookings" element={<Bookings />} />
              <Route path="/concerts" element={<Concerts />} />
              <Route path="/transactions" element={<Transactions />} />
              <Route path="/archive" element={<Archive />} />
              <Route path="/tags" element={<Tags />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Route>
          </>
        ) : (
          <Route path="*" element={<Navigate to="/login" replace />} />
        )}
      </Routes>
    </BrowserRouter>
  )
}

export default App

