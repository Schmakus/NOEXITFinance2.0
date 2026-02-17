import { Link, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import {
  BarChart3,
  Users,
  Music,
  Calendar,
  DollarSign,
  Tag,
  Settings,
  LogOut,
  Menu,
  X,
  Archive,
  HandCoins,
} from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'
import { fetchSettings, fetchPendingPayoutRequestCount } from '@/lib/api-client'

function Layout() {
  const { user, logout, isAdmin, canManageBookings, canManageMusicians, canAccessSettings, canAccessArchive } = useAuth()
  const location = useLocation()
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 768 : false)
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    // Sidebar auf Desktop für Admin/Superuser standardmäßig offen
    if (typeof window !== 'undefined' && window.innerWidth >= 768 && (user?.role === 'administrator' || user?.role === 'superuser')) {
      return true
    }
    return false
  })
  // Sidebar auf Desktop für Admin/Superuser nach Login/Reload automatisch öffnen
  useEffect(() => {
    if (!isMobile && (user?.role === 'administrator' || user?.role === 'superuser')) {
      setSidebarOpen(true)
    }
  }, [isMobile, user?.role])
  const [bandName, setBandName] = useState<string>('NO EXIT')
  const [logo, setLogo] = useState<string | null>(null)
  const [pendingPayoutCount, setPendingPayoutCount] = useState(0)

  // Track screen size
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      if (mobile) setSidebarOpen(false)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const loadSettingsFromSupabase = useCallback(async () => {
    try {
      const settings = await fetchSettings()
      if (settings.bandname) setBandName(settings.bandname)
      else setBandName('NO EXIT')
      setLogo(settings.logo ?? null)
    } catch {
      setBandName('NO EXIT')
    }
  }, [])

  useEffect(() => {
    loadSettingsFromSupabase()

    // Listen for same-window settings changes (dispatched by Settings page)
    const handleSettingsChanged = () => {
      loadSettingsFromSupabase()
    }
    window.addEventListener('noexit-settings-changed', handleSettingsChanged)
    return () => {
      window.removeEventListener('noexit-settings-changed', handleSettingsChanged)
    }
  }, [loadSettingsFromSupabase])

  // Load pending payout request count for admins
  useEffect(() => {
    if (!isAdmin) return
    const loadCount = async () => {
      const count = await fetchPendingPayoutRequestCount()
      setPendingPayoutCount(count)
    }
    loadCount()
    // Refresh count every 30 seconds
    const interval = setInterval(loadCount, 30_000)
    return () => clearInterval(interval)
  }, [isAdmin, location.pathname])



  const menuItems = [
    { icon: BarChart3, label: 'Dashboard', path: '/dashboard' },
    ...(canManageBookings ? [{ icon: DollarSign, label: 'Buchung', path: '/bookings' }] : []),
    ...(canManageBookings ? [{ icon: Calendar, label: 'Konzerte', path: '/concerts' }] : []),
    ...(canManageBookings ? [{ icon: DollarSign, label: 'Transaktionen', path: '/transactions' }] : []),
    ...(canManageMusicians ? [{ icon: Users, label: 'Musiker', path: '/musicians' }] : []),
    ...(isAdmin ? [{ icon: Music, label: 'Gruppen', path: '/groups' }] : []),
    ...(isAdmin ? [{ icon: HandCoins, label: 'Auszahlungen', path: '/payout-requests', badge: pendingPayoutCount }] : []),
    ...(isAdmin ? [{ icon: Tag, label: 'Tags', path: '/tags' }] : []),
    ...(canAccessSettings ? [{ icon: Settings, label: 'Einstellungen', path: '/settings' }] : []),
    ...(canAccessArchive ? [{ icon: Archive, label: 'Archiv', path: '/archive' }] : []),
    // User always sees "Mein Konto" for email/pw changes
    ...(!canAccessSettings ? [{ icon: Settings, label: 'Mein Konto', path: '/account' }] : []),
  ]

  // Bottom nav: show max 5 items on mobile
  const bottomNavItems = menuItems.slice(0, 5)

  return (
    <div className="flex h-screen bg-background">
      {/* Mobile Overlay Backdrop */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — Desktop: always visible; Mobile: overlay drawer */}
      <aside
        className={`
          ${isMobile
            ? `fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`
            : `${sidebarOpen ? 'w-64' : 'w-20'} transition-all duration-300`
          }
          bg-card border-r border-border flex flex-col shadow-lg
        `}
      >
        {/* Logo */}
        <div className="p-4 md:p-6 border-b border-border">
          <Link to="/dashboard" className="flex items-center gap-2" onClick={() => isMobile && setSidebarOpen(false)}>
            {logo ? (
              <img
                src={logo}
                alt="Logo"
                className="w-10 h-10 rounded-lg object-contain brightness-0 invert"
              />
            ) : (
              <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg flex items-center justify-center text-white font-bold shrink-0">
                NE
              </div>
            )}
            {(sidebarOpen || isMobile) && (
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-sm truncate">{bandName}</span>
                <span className="text-xs text-muted-foreground">Finanzverwaltung</span>
              </div>
            )}
          </Link>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {menuItems.map(({ icon: Icon, label, path, badge }) => {
            const isActive = location.pathname === path
            return (
              <Link key={path} to={path} onClick={() => isMobile && setSidebarOpen(false)}>
                <Button
                  variant={isActive ? 'secondary' : 'ghost'}
                  className="w-full justify-start relative"
                  title={!sidebarOpen && !isMobile ? label : undefined}
                >
                  <div className="relative">
                    <Icon className="w-5 h-5 shrink-0" />
                    {!!(badge && badge > 0 && !sidebarOpen && !isMobile) && (
                      <span className="absolute -top-2 -right-2 w-4 h-4 text-[10px] font-bold rounded-full bg-amber-500 text-white flex items-center justify-center">
                        {badge}
                      </span>
                    )}
                  </div>
                  {(sidebarOpen || isMobile) && (
                    <span className="flex items-center gap-2">
                      {label}
                      {!!(badge && badge > 0) && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500 text-white leading-none">
                          {badge}
                        </span>
                      )}
                    </span>
                  )}
                </Button>
              </Link>
            )
          })}
        </nav>

        {/* User Section */}
        <div className="p-4 border-t border-border space-y-2">
          {(sidebarOpen || isMobile) && (
            <div className="px-2 py-1">
              <p className="text-sm font-medium truncate">{user?.name || user?.email}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start"
            onClick={() => { logout(); isMobile && setSidebarOpen(false) }}
          >
            <LogOut className="w-4 h-4" />
            {(sidebarOpen || isMobile) && <span>Logout</span>}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Header */}
        <header className="bg-card border-b border-border px-4 md:px-6 py-3 md:py-4 flex items-center shadow-sm">
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen && !isMobile ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </Button>
        </header>

        {/* Page Content — with bottom padding on mobile for nav bar */}
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto px-4 py-4 md:p-6 pb-20 md:pb-6">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Bottom Navigation Bar — Mobile only */}
      {isMobile && (
        <nav className="fixed bottom-0 left-0 right-0 z-30 bg-card border-t border-border shadow-lg safe-area-bottom">
          <div className="flex items-center justify-around h-16">
            {bottomNavItems.map(({ icon: Icon, label, path }) => {
              const isActive = location.pathname === path
              return (
                <Link
                  key={path}
                  to={path}
                  className={`flex flex-col items-center justify-center gap-0.5 px-2 py-1 rounded-lg transition-colors min-w-0 flex-1 ${
                    isActive
                      ? 'text-amber-500'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-[10px] leading-tight truncate">{label}</span>
                </Link>
              )
            })}
            {/* More button for remaining items (opens sidebar) */}
            {menuItems.length > 5 && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="flex flex-col items-center justify-center gap-0.5 px-2 py-1 rounded-lg text-muted-foreground hover:text-foreground transition-colors flex-1"
              >
                <Menu className="w-5 h-5" />
                <span className="text-[10px] leading-tight">Mehr</span>
              </button>
            )}
          </div>
        </nav>
      )}
    </div>
  )
}

export default Layout
