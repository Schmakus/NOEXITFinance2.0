import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/contexts/AuthContext'
import { Save, Mail, Lock } from 'lucide-react'
import { Eye, EyeOff } from 'lucide-react'

function Account() {
  const { user, updateEmail, updatePassword } = useAuth()

  const [newEmail, setNewEmail] = useState(user?.email ?? '')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  const showMessage = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type })
    setTimeout(() => setMessage(null), 5000)
  }

  const handleUpdateEmail = async () => {
    if (!newEmail.trim() || newEmail === user?.email) return
    setSaving(true)
    try {
      await updateEmail(newEmail.trim())
      showMessage('E-Mail Änderung angefordert. Bitte bestätige die neue E-Mail-Adresse.', 'success')
    } catch (err: any) {
      showMessage('Fehler: ' + (err?.message ?? String(err)), 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdatePassword = async () => {
    if (!newPassword) return
    if (newPassword.length < 6) {
      showMessage('Passwort muss mindestens 6 Zeichen lang sein', 'error')
      return
    }
    if (newPassword !== confirmPassword) {
      showMessage('Passwörter stimmen nicht überein', 'error')
      return
    }
    setSaving(true)
    try {
      await updatePassword(newPassword)
      setNewPassword('')
      setConfirmPassword('')
      showMessage('Passwort erfolgreich geändert', 'success')
    } catch (err: any) {
      showMessage('Fehler: ' + (err?.message ?? String(err)), 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-8">
      <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Mein Konto</h1>
          <p className="text-muted-foreground mt-1 sm:mt-2 text-sm sm:text-base">E-Mail und Passwort ändern</p>
      </div>

      {message && (
        <div
          className={`p-3 rounded-lg text-sm font-medium ${
            message.type === 'success'
              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
              : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Profil-Info */}
      <Card style={{ backgroundColor: '#18181b', boxShadow: '0 8px 32px 0 rgba(0,0,0,0.37)' }}>
        <CardHeader>
          <CardTitle>Profil</CardTitle>
          <CardDescription>Deine Kontoinformationen</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Name</p>
              <p className="font-medium">{user?.name}</p>
            </div>
            <div>
              <p className="text-muted-foreground">E-Mail</p>
              <p className="font-medium break-all">{user?.email}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Rolle</p>
              <p className="font-medium capitalize">{user?.role}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* E-Mail ändern */}
      <Card style={{ backgroundColor: '#18181b', boxShadow: '0 8px 32px 0 rgba(0,0,0,0.37)' }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            E-Mail ändern
          </CardTitle>
          <CardDescription>
            Nach der Änderung musst du die neue E-Mail-Adresse bestätigen
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="new-email">Neue E-Mail-Adresse</Label>
            <Input
              id="new-email"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="neue@email.de"
              variant="amber"
            />
          </div>
          <Button onClick={handleUpdateEmail} disabled={saving || newEmail === user?.email} variant="amber">
            <Save className="w-4 h-4 mr-2" />
            E-Mail ändern
          </Button>
        </CardContent>
      </Card>

      {/* Passwort ändern */}
      <Card style={{ backgroundColor: '#18181b', boxShadow: '0 8px 32px 0 rgba(0,0,0,0.37)' }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Passwort ändern
          </CardTitle>
          <CardDescription>Mindestens 6 Zeichen</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="new-password">Neues Passwort</Label>
            <div className="relative">
              <Input
                id="new-password"
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="pr-10"
                variant="amber"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-amber-500 focus:outline-none"
                tabIndex={-1}
                aria-label={showPassword ? 'Passwort verbergen' : 'Passwort anzeigen'}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>
          {!showPassword && (
            <div>
              <Label htmlFor="confirm-password">Passwort bestätigen</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                variant="amber"
              />
            </div>
          )}
          <Button onClick={handleUpdatePassword} disabled={saving || !newPassword} className="btn-amber">
            <Save className="w-4 h-4 mr-2" />
            Passwort ändern
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

export default Account
