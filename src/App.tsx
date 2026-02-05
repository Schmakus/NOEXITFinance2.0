import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
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

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading...</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return children
}

function App() {
  const { isAuthenticated, isLoading } = useAuth()

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

