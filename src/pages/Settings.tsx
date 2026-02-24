
import React, { useState, useEffect } from 'react'
import { APP_VERSION } from '@/lib/version'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Save, Upload, Trash2, AlertTriangle, Image, X, FileJson, FileSpreadsheet } from 'lucide-react'
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  fetchSettings,
  upsertSetting,
  deleteSetting,
  deleteAllData,
  deleteAllConcertsAndTransactions,
  deleteAllBookingsAndTransactions,
  exportBackup,
  exportTransactionsCSV,
  importBackup,
  validateBackup,
} from '@/lib/api-client'
import { Spinner } from '@/components/ui/spinner'
import { fetchLogs } from '@/lib/fetch-logs'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

function Settings() {
  const { user } = useAuth()
  // --- Logfile Dialog State ---
  const [logDialogOpen, setLogDialogOpen] = useState(false)
  const [logs, setLogs] = useState<any[]>([])
  const [logsLoading, setLogsLoading] = useState(false)
  const [logsError, setLogsError] = useState<string | null>(null)

  // --- Settings State ---
  const [bandName, setBandName] = useState('NO EXIT')
  const [logo, setLogo] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  // const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null) // removed, not used in JSX

  useEffect(() => {
    if (logDialogOpen) {
      setLogsLoading(true)
      setLogsError(null)
      fetchLogs(50)
        .then((data) => setLogs(data))
        .catch(() => setLogsError('Fehler beim Laden der Logs'))
        .finally(() => setLogsLoading(false))
    }
  }, [logDialogOpen])

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

  // showMessage removed (no message state in UI)

  const handleSaveBandName = async () => {
    setSaving(true)
    try {
      await upsertSetting('bandname', bandName.trim() || 'NO EXIT')
      // Logging-Aufruf
      if (user) {
        await supabase.from('logs').insert({
          type: 'settings',
          action: 'update',
          label: 'bandname',
          description: `Bandname geändert auf "${bandName.trim() || 'NO EXIT'}"`,
          user_id: user.id,
          user_name: user.name,
        })
      }
      window.dispatchEvent(new Event('noexit-settings-changed'))
      // Optionally: show a toast here
    } catch (err) {
       
      console.error(err)
      // Optionally: show a toast here
    } finally {
      setSaving(false)
    }
  }

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2_000_000) {
      // Optionally: show a toast here
      return
    }
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string
      try {
        await upsertSetting('logo', dataUrl)
        setLogo(dataUrl)
        // Logging-Aufruf
        if (user) {
          await supabase.from('logs').insert({
            type: 'settings',
            action: 'update',
            label: 'logo',
            description: 'Logo geändert',
            user_id: user.id,
            user_name: user.name,
          })
        }
        window.dispatchEvent(new Event('noexit-settings-changed'))
        // Optionally: show a toast here
      } catch (err) {
         
        console.error('Logo upload error:', err)
        // Optionally: show a toast here
      }
    }
    reader.onerror = () => {
      // Optionally: show a toast here
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const handleRemoveLogo = async () => {
    try {
      await deleteSetting('logo')
      setLogo(null)
      // Logging-Aufruf
      if (user) {
        await supabase.from('logs').insert({
          type: 'settings',
          action: 'delete',
          label: 'logo',
          description: 'Logo entfernt',
          user_id: user.id,
          user_name: user.name,
        })
      }
      window.dispatchEvent(new Event('noexit-settings-changed'))
      // Optionally: show a toast here
    } catch (err) {
       
      console.error(err)
      // Optionally: show a toast here
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
      // Optionally: show a toast here
    } catch (err) {
       
      console.error(err)
      // Optionally: show a toast here
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
      // Logging-Aufruf
      if (user) {
        await supabase.from('logs').insert({
          type: 'settings',
          action: 'import',
          label: 'backup',
          description: 'Backup importiert',
          user_id: user.id,
          user_name: user.name,
        })
      }
      window.dispatchEvent(new Event('noexit-settings-changed'))
      // Optionally: show a toast here
    } catch (err) {
       
      console.error(err)
      // Optionally: show a toast here
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
      // Optionally: show a toast here
    } catch (err) {
       
      console.error(err)
      // Optionally: show a toast here
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
      // Logging für Admin-Löschaktionen
      if (user && user.role === 'administrator') {
        const logType = 'settings';
        const logAction = 'delete';
        let logLabel = '';
        let logDescription = '';
        if (label.includes('Konzerte')) {
          logLabel = 'Konzerte & Transaktionen';
          logDescription = 'Alle Konzerte und zugehörige Transaktionen gelöscht';
        } else if (label.includes('Buchungen')) {
          logLabel = 'Buchungen & Transaktionen';
          logDescription = 'Alle Buchungen und zugehörige Transaktionen gelöscht';
        } else if (label.includes('ALLE Daten')) {
          logLabel = 'Alle Daten';
          logDescription = 'Alle Daten im System gelöscht';
        } else {
          logLabel = label;
          logDescription = `${label} gelöscht`;
        }
        await supabase.from('logs').insert({
          type: logType,
          action: logAction,
          label: logLabel,
          description: logDescription,
          user_id: user.id,
          user_name: user.name,
        });
      }
      // Optionally: show a toast here
    } catch (err) {
       
      console.error(err)
      // Optionally: show a toast here
    }
  }

  // Dangerzone Handler für gezieltes Löschen
  // Hinweis: deleteAllMusicians gibt es nicht als Bulk-Delete, daher Button entfernen oder Funktion ergänzen
  const handleDeleteAllConcerts = () => handleDangerAction('Alle Konzerte & zugehörige Transaktionen löschen', deleteAllConcertsAndTransactions)
  const handleDeleteAllBookings = () => handleDangerAction('Alle Buchungen & zugehörige Transaktionen löschen', deleteAllBookingsAndTransactions)
  const handleDeleteAllData = () => handleDangerAction('ALLE Daten löschen', deleteAllData)

  if (loading) {
    return <Spinner text="Einstellungen werden geladen..." />
  }

  return (
    <div className="space-y-8">
      {/* Logfile Button und Dialog ganz oben */}
      <div className="flex justify-end mb-4">
        <Dialog open={logDialogOpen} onOpenChange={setLogDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" onClick={() => setLogDialogOpen(true)}>
              Aktivitätsprotokoll anzeigen
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl" aria-describedby="settings-dialog-desc" style={{ backgroundColor: '#18181b', boxShadow: '0 8px 32px 0 rgba(0,0,0,0.37)' }}>
            <DialogHeader>
              <DialogTitle>Aktivitätsprotokoll</DialogTitle>
            <DialogDescription id="settings-dialog-desc" className="sr-only">
              Zeigt das Aktivitätsprotokoll dieser Anwendung an.
            </DialogDescription>
            </DialogHeader>
            <div className="overflow-x-auto max-h-[60vh]">
              {logsLoading ? (
                <div className="p-4 text-center text-muted-foreground">Lade Logdaten...</div>
              ) : logsError ? (
                <div className="p-4 text-center text-destructive">{logsError}</div>
              ) : logs.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">Keine Logeinträge gefunden.</div>
              ) : (
                <table className="min-w-full text-sm border">
                  <thead>
                    <tr className="bg-muted">
                      <th className="p-2 border">Typ</th>
                      <th className="p-2 border">Aktion</th>
                      <th className="p-2 border">Beschreibung</th>
                      <th className="p-2 border">User</th>
                      <th className="p-2 border">Datum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.id}>
                        <td className="p-2 border">{log.type}</td>
                        <td className="p-2 border">{log.action}</td>
                        <td className="p-2 border">{log.description}</td>
                        <td className="p-2 border">{log.user_name}</td>
                        <td className="p-2 border">{log.created_at ? new Date(log.created_at).toLocaleString() : ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Bandname */}
      <Card style={{ backgroundColor: '#18181b', boxShadow: '0 8px 32px 0 rgba(0,0,0,0.37)' }}>
        <CardHeader>
          <CardTitle>Bandname</CardTitle>
          <CardDescription></CardDescription>
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
              <button onClick={handleSaveBandName} disabled={saving} className="btn btn-primary">
                <Save className="w-4 h-4 mr-2" />
                Speichern
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logo */}
      <Card style={{ backgroundColor: '#18181b', boxShadow: '0 8px 32px 0 rgba(0,0,0,0.37)' }}>
        <CardHeader>
          <CardTitle>Logo</CardTitle>
          <CardDescription>(max. 2 MB)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {logo ? (
            <div className="flex items-center gap-4">
              <img
                src={logo ?? undefined}
                alt="Logo"
                className="w-20 h-20 object-contain rounded-lg border"
              />
              <button className="btn btn-danger" onClick={handleRemoveLogo}>
                <X className="w-4 h-4 mr-2" />
                Entfernen
              </button>
            </div>
          ) : (
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
              <Image className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-2">Kein Logo hochgeladen</p>
              <button
                className="btn btn-outline"
                onClick={() => document.getElementById('logo-upload')?.click()}
              >
                <Upload className="w-4 h-4 mr-2" />
                Logo hochladen
              </button>
              <input
                id="logo-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoUpload}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Export/Import Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-primary/60 shadow-sm" style={{ backgroundColor: '#18181b', boxShadow: '0 8px 32px 0 rgba(0,0,0,0.37)' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary"><FileJson className="w-5 h-5" /> Export</CardTitle>
            <CardDescription>Exportiere deine Daten als Backup oder CSV</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              <button className="btn btn-primary" onClick={handleExportBackup}>
                <FileJson className="w-4 h-4 mr-2" /> Backup (JSON)
              </button>
              <button className="btn btn-primary" onClick={handleExportCSV}>
                <FileSpreadsheet className="w-4 h-4 mr-2" /> CSV Export
              </button>
            </div>
          </CardContent>
        </Card>
        <Card className="border-primary/60 shadow-sm" style={{ backgroundColor: '#18181b', boxShadow: '0 8px 32px 0 rgba(0,0,0,0.37)' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary"><Upload className="w-5 h-5" /> Import</CardTitle>
            <CardDescription>Stelle deine Daten aus einem Backup wieder her</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              <input
                id="restore-backup"
                type="file"
                accept="application/json"
                className="hidden"
                onChange={handleImportBackup}
              />
              <button
                className="btn btn-primary"
                onClick={() => document.getElementById('restore-backup')?.click()}
              >
                <Upload className="w-4 h-4 mr-2" /> Restore (JSON)
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Danger Zone */}
      <Card className="border-destructive/60 shadow-sm" style={{ backgroundColor: '#18181b', boxShadow: '0 8px 32px 0 rgba(0,0,0,0.37)' }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" /> Gefahrenzone
          </CardTitle>
          <CardDescription>Diese Aktionen können nicht rückgängig gemacht werden!</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3">
            {/* Musiker löschen Button entfernt, da keine Bulk-Funktion vorhanden */}
            <button className="btn btn-danger" onClick={handleDeleteAllConcerts}>
              <Trash2 className="w-4 h-4 mr-2" /> Konzerte & Transaktionen löschen
            </button>
            <button className="btn btn-danger" onClick={handleDeleteAllBookings}>
              <Trash2 className="w-4 h-4 mr-2" /> Buchungen & Transaktionen löschen
            </button>
            <button className="btn btn-danger" onClick={handleDeleteAllData}>
              <Trash2 className="w-4 h-4 mr-2" /> Alles löschen
            </button>
          </div>
        </CardContent>
      </Card>

      {/* App-Informationen */}
      <Card className="mt-8 border-muted-foreground/30" style={{ backgroundColor: '#18181b', boxShadow: '0 8px 32px 0 rgba(0,0,0,0.37)' }}>
        <CardContent>
          <div className="text-xs text-muted-foreground flex flex-col gap-1 items-center py-2">
            <div>NOEXIT Finance&nbsp;2.0</div>
            <div>Version: {APP_VERSION}</div>
            <div>© 2022–2026 Schmakus</div>
            <div>Maintainer: markus@noexit-liverock.de</div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default Settings
