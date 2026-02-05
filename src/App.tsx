import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import Layout from '@/components/Layout'
import Dashboard from '@/pages/Dashboard'
import Musicians from '@/pages/Musicians'
import Groups from '@/pages/Groups'
import Concerts from '@/pages/Concerts'
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
  const { isAuthenticated } = useAuth()

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        {isAuthenticated && (
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/musicians" element={<Musicians />} />
            <Route path="/groups" element={<Groups />} />
            <Route path="/concerts" element={<Concerts />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/tags" element={<Tags />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        )}
        
        <Route path="/" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App

