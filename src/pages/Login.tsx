import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Moon, Sun } from 'lucide-react'

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const { login } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const navigate = useNavigate()

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
      navigate('/dashboard')
    } catch (err: any) {
      const msg = err?.message || ''
      if (msg.includes('Invalid login credentials')) {
        setError('Ungültige Anmeldedaten. Bitte überprüfe E-Mail und Passwort.')
      } else {
        setError('Anmeldung fehlgeschlagen. Bitte versuche es erneut.')
      }
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={`flex items-center justify-center min-h-screen bg-gradient-to-br ${
      isDark 
        ? 'from-slate-900 via-blue-900 to-slate-900' 
        : 'from-blue-50 via-cyan-50 to-blue-50'
    }`}>
      {/* Theme Toggle */}
      <Button
        variant="outline"
        size="icon"
        onClick={toggleTheme}
        className="absolute top-6 right-6"
        title={isDark ? 'Hell' : 'Dunkel'}
      >
        {isDark ? (
          <Sun className="w-5 h-5" />
        ) : (
          <Moon className="w-5 h-5" />
        )}
      </Button>

      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-primary to-blue-600 rounded-lg flex items-center justify-center text-primary-foreground font-bold text-lg">
              NE
            </div>
            <div>
              <CardTitle className="text-xl">NOEXIT Finance</CardTitle>
              <CardDescription className="text-xs">Finanzverwaltung</CardDescription>
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
              className="w-full bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-700 transition-all"
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
