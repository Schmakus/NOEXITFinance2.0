import { Link, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
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
  UserRound,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { fetchPendingPayoutRequestCount } from '@/lib/api-client'
import { useSettings } from '@/contexts/SettingsContext'

function Layout() {
  const { user, logout, isAdmin, isSuperuser, canManageBookings, canManageMusicians, canAccessSettings, canAccessArchive } = useAuth()
  const [showAccountDialog, setShowAccountDialog] = useState(false)
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
  const { icon, bandName } = useSettings()
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

  // Settings werden jetzt über SettingsContext geladen

  // Load pending payout request count for admins and superusers
  useEffect(() => {
    if (!(isAdmin || isSuperuser)) return
    const loadCount = async () => {
      const count = await fetchPendingPayoutRequestCount()
      setPendingPayoutCount(count)
    }
    loadCount()
    // Refresh count every 30 seconds
    const interval = setInterval(loadCount, 30_000)
    return () => clearInterval(interval)
  }, [isAdmin, isSuperuser, location.pathname])



  const menuItems = [
    { icon: BarChart3, label: 'Dashboard', path: '/dashboard' },
    ...(canManageBookings ? [{ icon: DollarSign, label: 'Buchung', path: '/bookings' }] : []),
    ...(canManageBookings ? [{ icon: Calendar, label: 'Konzerte', path: '/concerts' }] : []),
    ...(canManageBookings ? [{ icon: DollarSign, label: 'Transaktionen', path: '/transactions' }] : []),
    ...(canManageMusicians ? [{ icon: Users, label: 'Musiker', path: '/musicians' }] : []),
    ...(isAdmin ? [{ icon: Music, label: 'Gruppen', path: '/groups' }] : []),
    ...((isAdmin || isSuperuser) ? [{ icon: HandCoins, label: 'Auszahlungen', path: '/payout-requests', badge: pendingPayoutCount }] : []),
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
            {icon ? (
              <img
                src={icon}
                alt="Icon"
                className="w-10 h-10 rounded-lg object-contain"
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
                  className={`w-full justify-start relative${isActive ? ' btn-amber' : ''}`}
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
          {(isAdmin || isSuperuser) && (
            <button
              type="button"
              onClick={() => setShowAccountDialog(true)}
              className="flex items-center gap-2 px-2 py-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer transition-colors mb-2"
              style={{ fontWeight: 500 }}
            >
              <UserRound className="w-4 h-4" />
              <span>Profil editieren</span>
            </button>
          )}
                {/* Account Dialog für Admin/Superuser */}
                {(isAdmin || isSuperuser) && (
                  <Dialog open={showAccountDialog} onOpenChange={setShowAccountDialog}>
                    <DialogContent
                      aria-describedby="account-dialog-desc"
                      className="[&>div[data-radix-dialog-overlay]]:bg-black/80"
                      style={{ backgroundColor: '#18181b', boxShadow: '0 8px 32px 0 rgba(0,0,0,0.37)' }}
                    >
                      <DialogHeader>
                        <DialogTitle>Mein Konto</DialogTitle>
                      </DialogHeader>
                      <DialogDescription id="account-dialog-desc" className="sr-only">
                        Hier kannst du deine Kontodaten und dein Passwort ändern.
                      </DialogDescription>
                      <div className="space-y-6 px-1">
                        {/* E-Mail ändern */}
                        <div className="space-y-3">
                          <h3 className="text-sm font-semibold flex items-center gap-2"><UserRound className="w-4 h-4" /> E-Mail ändern</h3>
                          <div className="grid gap-2">
                            <Label htmlFor="account-email">Neue E-Mail-Adresse</Label>
                            <Input
                              id="account-email"
                              type="email"
                              value={user?.email ?? ''}
                              readOnly
                            />
                          </div>
                          {/* Button für E-Mail-Änderung kann hier ergänzt werden, falls Admins/Superuser das dürfen */}
                        </div>
                        {/* Passwort ändern */}
                        <div className="space-y-3">
                          <h3 className="text-sm font-semibold flex items-center gap-2"><UserRound className="w-4 h-4" /> Passwort ändern</h3>
                          <div className="grid gap-2">
                            <Label htmlFor="account-password">Neues Passwort</Label>
                            <Input id="account-password" type="password" placeholder="••••••••" />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="account-confirm">Passwort bestätigen</Label>
                            <Input id="account-confirm" type="password" placeholder="••••••••" />
                          </div>
                          {/* Button für Passwort-Änderung kann hier ergänzt werden */}
                        </div>
                      </div>
                      <DialogFooter className="mt-6">
                        <Button variant="outline" onClick={() => setShowAccountDialog(false)}>Schließen</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
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
          <nav
            className="fixed bottom-0 left-0 right-0 z-50 flex justify-around items-center border-t border-border md:hidden"
            style={{ backgroundColor: '#18181b', boxShadow: '0 8px 32px 0 rgba(0,0,0,0.37)' }}
          >
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
