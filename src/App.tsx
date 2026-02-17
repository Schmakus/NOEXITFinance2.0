import { useEffect, useCallback } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { fetchSettings } from '@/lib/api-client'
import { Spinner } from '@/components/ui/spinner'
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
import Account from '@/pages/Account'
import PayoutRequests from '@/pages/PayoutRequests'

// Route guard: redirects to dashboard if user doesn't have permission
function ProtectedRoute({ allowed, children }: { allowed: boolean; children: React.ReactNode }) {
  return allowed ? <>{children}</> : <Navigate to="/dashboard" replace />
}

function App() {
  const { isAuthenticated, isLoading, isAdmin, canManageBookings, canManageMusicians, canAccessSettings, canAccessArchive } = useAuth()

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
    return <Spinner text="Lade..." size="lg" fullScreen />
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
              <Route path="/musicians" element={<ProtectedRoute allowed={canManageMusicians}><Musicians /></ProtectedRoute>} />
              <Route path="/groups" element={<ProtectedRoute allowed={isAdmin}><Groups /></ProtectedRoute>} />
              <Route path="/bookings" element={<ProtectedRoute allowed={canManageBookings}><Bookings /></ProtectedRoute>} />
              <Route path="/concerts" element={<ProtectedRoute allowed={canManageBookings}><Concerts /></ProtectedRoute>} />
              <Route path="/transactions" element={<ProtectedRoute allowed={canManageBookings}><Transactions /></ProtectedRoute>} />
              <Route path="/archive" element={<ProtectedRoute allowed={canAccessArchive}><Archive /></ProtectedRoute>} />
              <Route path="/payout-requests" element={<ProtectedRoute allowed={isAdmin}><PayoutRequests /></ProtectedRoute>} />
              <Route path="/tags" element={<ProtectedRoute allowed={isAdmin}><Tags /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute allowed={canAccessSettings}><Settings /></ProtectedRoute>} />
              <Route path="/account" element={<Account />} />
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

