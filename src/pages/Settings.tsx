import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/contexts/AuthContext'
import {
  Save,
  Upload,
  Trash2,
  AlertTriangle,
  Image,
  X,
  Info,
} from 'lucide-react'
import {
  fetchSettings,
  upsertSetting,
  deleteSetting,
  deleteAllConcertsAndTransactions,
  deleteAllBookingsAndTransactions,
  deleteAllTransactions,
  deleteAllData,
} from '@/lib/api-client'

function Settings() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'administrator'

  const [bandName, setBandName] = useState('NO EXIT')
  const [logo, setLogo] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const settings = await fetchSettings()
        if (settings.bandname) setBandName(settings.bandname)
        if (settings.logo) setLogo(settings.logo)
      } catch (err) {
        console.error('Einstellungen laden fehlgeschlagen:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const showMessage = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type })
    setTimeout(() => setMessage(null), 3000)
  }

  const handleSaveBandName = async () => {
    setSaving(true)
    try {
      await upsertSetting('bandname', bandName.trim() || 'NO EXIT')
      window.dispatchEvent(new Event('noexit-settings-changed'))
      showMessage('Bandname gespeichert', 'success')
    } catch (err) {
      console.error(err)
      showMessage('Fehler beim Speichern', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 512_000) {
      showMessage('Logo darf max. 500 KB groß sein', 'error')
      return
    }

    const reader = new FileReader()
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string
      try {
        await upsertSetting('logo', dataUrl)
        setLogo(dataUrl)
        window.dispatchEvent(new Event('noexit-settings-changed'))
        showMessage('Logo gespeichert', 'success')
      } catch (err) {
        console.error(err)
        showMessage('Fehler beim Speichern des Logos', 'error')
      }
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveLogo = async () => {
    try {
      await deleteSetting('logo')
      setLogo(null)
      window.dispatchEvent(new Event('noexit-settings-changed'))
      showMessage('Logo entfernt', 'success')
    } catch (err) {
      console.error(err)
      showMessage('Fehler beim Entfernen', 'error')
    }
  }

  const handleDangerAction = async (
    label: string,
    action: () => Promise<void>
  ) => {
    if (!confirm(`${label}? Diese Aktion kann nicht rückgängig gemacht werden!`)) return
    if (!confirm('Bist du wirklich sicher?')) return
    try {
      await action()
      showMessage(`${label} erfolgreich`, 'success')
    } catch (err) {
      console.error(err)
      showMessage('Fehler: ' + String(err), 'error')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Einstellungen werden geladen...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Einstellungen</h1>
        <p className="text-muted-foreground mt-2">Konfiguriere die Anwendung</p>
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

      {/* Profil */}
      <Card>
        <CardHeader>
          <CardTitle>Profil</CardTitle>
          <CardDescription>Deine Kontoinformationen</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Name</p>
              <p className="font-medium">{user?.name}</p>
            </div>
            <div>
              <p className="text-muted-foreground">E-Mail</p>
              <p className="font-medium">{user?.email}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Rolle</p>
              <p className="font-medium capitalize">{user?.role}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bandname (admin only) */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Bandname</CardTitle>
            <CardDescription>Der angezeigte Name der Band</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <div className="flex-1">
                <Label htmlFor="bandname">Name</Label>
                <Input
                  id="bandname"
                  value={bandName}
                  onChange={(e) => setBandName(e.target.value)}
                  placeholder="Bandname"
                />
              </div>
              <div className="flex items-end">
                <Button onClick={handleSaveBandName} disabled={saving}>
                  <Save className="w-4 h-4 mr-2" />
                  Speichern
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Logo (admin only) */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Logo</CardTitle>
            <CardDescription>Logo der Band (max. 500 KB)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {logo ? (
              <div className="flex items-center gap-4">
                <img
                  src={logo}
                  alt="Logo"
                  className="w-20 h-20 object-contain rounded-lg border"
                />
                <Button variant="destructive" size="sm" onClick={handleRemoveLogo}>
                  <X className="w-4 h-4 mr-2" />
                  Entfernen
                </Button>
              </div>
            ) : (
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                <Image className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-2">Kein Logo hochgeladen</p>
                <label htmlFor="logo-upload">
                  <Button variant="outline" size="sm" asChild>
                    <span>
                      <Upload className="w-4 h-4 mr-2" />
                      Logo hochladen
                    </span>
                  </Button>
                </label>
                <input
                  id="logo-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
              </div>
            )}
            {logo && (
              <div>
                <label htmlFor="logo-replace">
                  <Button variant="outline" size="sm" asChild>
                    <span>
                      <Upload className="w-4 h-4 mr-2" />
                      Ersetzen
                    </span>
                  </Button>
                </label>
                <input
                  id="logo-replace"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* App-Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="w-5 h-5" />
            App-Informationen
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Version</p>
              <p className="font-medium">2.0</p>
            </div>
            <div>
              <p className="text-muted-foreground">Speicherort</p>
              <p className="font-medium">Supabase (Cloud)</p>
            </div>
            <div>
              <p className="text-muted-foreground">Framework</p>
              <p className="font-medium">React + TypeScript</p>
            </div>
            <div>
              <p className="text-muted-foreground">Styling</p>
              <p className="font-medium">Tailwind CSS</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone (admin only) */}
      {isAdmin && (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Gefahrenzone
            </CardTitle>
            <CardDescription>
              Diese Aktionen können nicht rückgängig gemacht werden!
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                <div>
                  <p className="font-medium text-sm">Konzerte & zugehörige Transaktionen löschen</p>
                  <p className="text-xs text-muted-foreground">Entfernt alle Konzerte und deren Transaktionen</p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDangerAction('Konzerte & Transaktionen löschen', deleteAllConcertsAndTransactions)}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Löschen
                </Button>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                <div>
                  <p className="font-medium text-sm">Buchungen & zugehörige Transaktionen löschen</p>
                  <p className="text-xs text-muted-foreground">Entfernt alle Buchungen und deren Transaktionen</p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDangerAction('Buchungen & Transaktionen löschen', deleteAllBookingsAndTransactions)}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Löschen
                </Button>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                <div>
                  <p className="font-medium text-sm">Alle Transaktionen löschen</p>
                  <p className="text-xs text-muted-foreground">Entfernt alle Transaktionen (Konzerte & Buchungen bleiben)</p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDangerAction('Alle Transaktionen löschen', deleteAllTransactions)}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Löschen
                </Button>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                <div>
                  <p className="font-medium text-sm text-destructive">Alle Daten löschen</p>
                  <p className="text-xs text-muted-foreground">Entfernt ALLE Daten (Musiker, Gruppen, Konzerte, Buchungen, Transaktionen)</p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDangerAction('ALLE Daten löschen', deleteAllData)}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Alles löschen
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default Settings
