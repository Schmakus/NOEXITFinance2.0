import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { fetchPublicSettings } from '@/lib/api-client'

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [logo, setLogo] = useState<string | null>(null)
  const [bandName, setBandName] = useState('NO EXIT')
  const { login } = useAuth()

  useEffect(() => {
    fetchPublicSettings()
      .then(({ logo, bandname }) => {
        setLogo(logo)
        setBandName(bandname)
      })
      .catch(() => {})
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      setError('Bitte E-Mail und Passwort eingeben')
      return
    }
    setIsLoading(true)
    setError('')

    try {
      await login(email, password)
      // login() now loads the profile directly — isAuthenticated will be true
      // App.tsx will redirect to /dashboard automatically
    } catch (err: any) {
      const msg = err?.message || ''
      if (msg.includes('Invalid login credentials')) {
        setError('Ungültige Anmeldedaten. Bitte überprüfe E-Mail und Passwort.')
      } else if (msg.includes('Kein Musiker-Profil')) {
        setError(msg)
      } else {
        setError('Anmeldung fehlgeschlagen. Bitte versuche es erneut.')
      }
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-amber-950 to-slate-900">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="space-y-2">
          <div className="flex items-center gap-3">
            {logo ? (
              <img
                src={logo}
                alt="Logo"
                className="w-12 h-12 rounded-lg object-contain brightness-0 invert"
              />
            ) : (
              <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
                NE
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold">{bandName}</h1>
              <p className="text-xs text-muted-foreground">Finanzverwaltung</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive text-destructive text-sm rounded-md">
                {error}
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email">E-Mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="deine@email.de"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Passwort</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white transition-all"
              disabled={isLoading}
            >
              {isLoading ? 'Wird angemeldet...' : 'Anmelden'}
            </Button>

            <div className="text-center text-sm text-muted-foreground border-t pt-4">
              Melde dich mit deinen Zugangsdaten an.
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default Login
