import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/contexts/AuthContext'
import { Save, Mail, Lock } from 'lucide-react'

function Account() {
  const { user, updateEmail, updatePassword } = useAuth()

  const [newEmail, setNewEmail] = useState(user?.email ?? '')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
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
      <Card>
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
      <Card>
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
            />
          </div>
          <Button onClick={handleUpdateEmail} disabled={saving || newEmail === user?.email}>
            <Save className="w-4 h-4 mr-2" />
            E-Mail ändern
          </Button>
        </CardContent>
      </Card>

      {/* Passwort ändern */}
      <Card>
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
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <div>
            <Label htmlFor="confirm-password">Passwort bestätigen</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <Button onClick={handleUpdatePassword} disabled={saving || !newPassword}>
            <Save className="w-4 h-4 mr-2" />
            Passwort ändern
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

export default Account
