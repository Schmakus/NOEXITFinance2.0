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
    Download,
    FileJson,
    FileSpreadsheet,
  } from 'lucide-react'
import {
  fetchSettings,
  upsertSetting,
  deleteSetting,
  deleteAllConcertsAndTransactions,
  deleteAllBookingsAndTransactions,
  deleteAllTransactions,
  deleteAllData,
    exportBackup,
    exportTransactionsCSV,
  importBackup,
  validateBackup,
} from '@/lib/api-client'

function Settings() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'administrator'
  const canExportCsv = isAdmin || user?.role === 'superuser'

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

    if (file.size > 2_000_000) {
      showMessage('Logo darf max. 2 MB groß sein', 'error')
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
        console.error('Logo upload error:', err)
        showMessage('Fehler beim Speichern des Logos: ' + String(err), 'error')
      }
    }
    reader.onerror = () => {
      showMessage('Fehler beim Lesen der Datei', 'error')
    }
    reader.readAsDataURL(file)
    // Reset input so same file can be selected again
    e.target.value = ''
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

    const handleExportBackup = async () => {
      try {
        const data = await exportBackup()
        const json = JSON.stringify(data, null, 2)
        const blob = new Blob([json], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `noexit-backup-${new Date().toISOString().split('T')[0]}.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        showMessage('Backup erfolgreich erstellt', 'success')
      } catch (err) {
        console.error(err)
        showMessage('Fehler beim Erstellen des Backups: ' + String(err), 'error')
      }
    }

    const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      e.target.value = ''
      if (!file) return
      if (!confirm('Restore startet das Überschreiben ALLER Daten. Fortfahren?')) return
      if (!confirm('Bist du wirklich sicher? Dieser Vorgang ist irreversibel.')) return

      try {
        const text = await file.text()
        const data = JSON.parse(text)
        validateBackup(data)
        await importBackup(data)
        window.dispatchEvent(new Event('noexit-settings-changed'))
        showMessage('Restore erfolgreich abgeschlossen', 'success')
      } catch (err) {
        console.error(err)
        showMessage('Fehler beim Restore: ' + String(err), 'error')
      }
    }

    const handleExportCSV = async () => {
      try {
        const csv = await exportTransactionsCSV()
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `noexit-kontoauszuege-${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        showMessage('CSV erfolgreich exportiert', 'success')
      } catch (err) {
        console.error(err)
        showMessage('Fehler beim CSV-Export: ' + String(err), 'error')
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById('logo-upload')?.click()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Logo hochladen
                </Button>
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById('logo-replace')?.click()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Ersetzen
                </Button>
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

      {/* Datenverwaltung */}
      {canExportCsv && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="w-5 h-5" />
              Datenverwaltung
            </CardTitle>
            <CardDescription>
              Exportiere und sichere deine Daten
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3">
              {isAdmin && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
                  <div>
                    <p className="font-medium text-sm">Backup erstellen</p>
                    <p className="text-xs text-muted-foreground">
                      Exportiert alle Daten als JSON-Datei
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportBackup}
                  >
                    <FileJson className="w-4 h-4 mr-2" />
                    Backup (JSON)
                  </Button>
                </div>
              )}

              {isAdmin && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
                  <div>
                    <p className="font-medium text-sm">Backup wiederherstellen</p>
                    <p className="text-xs text-muted-foreground">
                      Überschreibt ALLE Daten mit einem JSON-Backup
                    </p>
                  </div>
                  <div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById('restore-backup')?.click()}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Restore (JSON)
                    </Button>
                    <input
                      id="restore-backup"
                      type="file"
                      accept="application/json"
                      className="hidden"
                      onChange={handleImportBackup}
                    />
                  </div>
                </div>
              )}

              {canExportCsv && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
                  <div>
                    <p className="font-medium text-sm">Kontoauszüge exportieren</p>
                    <p className="text-xs text-muted-foreground">
                      Alle Transaktionen als CSV-Datei herunterladen
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportCSV}
                  >
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    CSV Export
                  </Button>
                </div>
              )}
            </div>
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
