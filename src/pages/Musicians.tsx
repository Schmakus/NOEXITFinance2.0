import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Plus, Edit2, Trash2, Mail, User, Users, RotateCcw } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import {
  fetchMusicians,
  fetchArchivedMusicians,
  createMusician,
  updateMusician,
  archiveMusician,
  restoreMusician,
  createAuthUser,
  deleteAuthUser,
} from '@/lib/api-client'
import type { DbMusician } from '@/lib/database.types'
import { useAuth } from '@/contexts/AuthContext'

function Musicians() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'administrator'
  const [musicians, setMusicians] = useState<DbMusician[]>([])
  const [loading, setLoading] = useState(true)
  const [showArchived, setShowArchived] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    balance: '',
    role: 'user' as 'administrator' | 'superuser' | 'user',
  })

  const loadMusicians = async () => {
    try {
      const data = showArchived ? await fetchArchivedMusicians() : await fetchMusicians()
      setMusicians(data)
    } catch (err) {
      console.error('Musiker laden fehlgeschlagen:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setLoading(true)
    loadMusicians()
  }, [showArchived])

  const handleAdd = () => {
    setEditingId(null)
    setFormData({ name: '', email: '', password: '', balance: '', role: 'user' })
    setIsOpen(true)
  }

  const handleEdit = (musician: DbMusician) => {
    setEditingId(musician.id)
    setFormData({
      name: musician.name,
      email: musician.email,
      password: '',
      balance: musician.balance.toString(),
      role: musician.role,
    })
    setIsOpen(true)
  }

  const handleDelete = async (id: string) => {
    const musician = musicians.find((m) => m.id === id)
    if (!musician) return
    if (Math.abs(musician.balance) > 0.01) {
      alert('Musiker kann nur archiviert werden, wenn der Kontostand 0,00€ ist.')
      return
    }
    if (!confirm('Musiker ins Archiv verschieben?')) return
    try {
      await archiveMusician(id)
      setMusicians((prev) => prev.filter((m) => m.id !== id))
    } catch (err) {
      console.error('Musiker löschen fehlgeschlagen:', err)
      alert(err instanceof Error ? err.message : 'Musiker konnte nicht archiviert werden.')
    }
  }

  const handleRestore = async (id: string) => {
    if (!confirm('Musiker aus dem Archiv wiederherstellen?')) return
    try {
      await restoreMusician(id)
      setMusicians((prev) => prev.filter((m) => m.id !== id))
    } catch (err) {
      console.error('Musiker wiederherstellen fehlgeschlagen:', err)
      alert(err instanceof Error ? err.message : 'Musiker konnte nicht wiederhergestellt werden.')
    }
  }

  const handleSave = async () => {
    if (!formData.name || !formData.email) return
    // Require password for new musicians
    if (!editingId && !formData.password) {
      alert('Bitte ein Passwort für den neuen Musiker eingeben.')
      return
    }
    if (!editingId && formData.password.length < 6) {
      alert('Das Passwort muss mindestens 6 Zeichen lang sein.')
      return
    }

    try {
      if (editingId) {
        const updated = await updateMusician(editingId, {
          name: formData.name,
          email: formData.email,
          balance: parseFloat(formData.balance || '0'),
          role: formData.role,
        })
        setMusicians((prev) => prev.map((m) => (m.id === editingId ? updated : m)))
      } else {
        // 1. Create Supabase Auth user
        const authUserId = await createAuthUser(formData.email, formData.password)
        try {
          // 2. Create musician record linked to auth user
          const created = await createMusician({
            name: formData.name,
            email: formData.email,
            balance: parseFloat(formData.balance || '0'),
            role: formData.role,
            user_id: authUserId,
          })
          setMusicians((prev) => [...prev, created])
        } catch (err) {
          // Rollback: delete auth user if musician creation fails
          try { await deleteAuthUser(authUserId) } catch { /* ignore */ }
          throw err
        }
      }

      setIsOpen(false)
      setFormData({ name: '', email: '', password: '', balance: '', role: 'user' })
    } catch (err: any) {
      console.error('Musiker speichern fehlgeschlagen:', err)
      alert(err?.message || 'Musiker konnte nicht gespeichert werden.')
    }
  }

  const roleLabel = (role: string) => {
    switch (role) {
      case 'administrator': return 'Administrator'
      case 'superuser': return 'Superuser'
      default: return 'Benutzer'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Musiker werden geladen...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Musiker</h1>
          <p className="text-muted-foreground mt-2">Verwalte Bandmitglieder</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={showArchived ? 'outline' : 'secondary'}
            size="sm"
            onClick={() => setShowArchived(false)}
          >
            Aktiv
          </Button>
          <Button
            variant={showArchived ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setShowArchived(true)}
          >
            Archiv
          </Button>
          {isAdmin && !showArchived && (
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleAdd}>
                  <Plus className="w-4 h-4 mr-2" />
                  Musiker hinzufuegen
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editingId ? 'Musiker bearbeiten' : 'Neuen Musiker hinzufügen'}
              </DialogTitle>
              <DialogDescription>
                {editingId
                  ? 'Musikerinformationen aktualisieren'
                  : 'Füge ein neues Bandmitglied zu deinem Team hinzu'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">E-Mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="max@beispiel.de"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              {!editingId && (
                <div className="grid gap-2">
                  <Label htmlFor="password">Passwort</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Min. 6 Zeichen"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Login-Passwort für den Supabase-Account des Musikers
                  </p>
                </div>
              )}
              <div className="grid gap-2">
                <Label htmlFor="balance">Anfänglicher Kontostand (€)</Label>
                <Input
                  id="balance"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.balance}
                  onChange={(e) => setFormData({ ...formData, balance: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="role">Rolle</Label>
                <select
                  id="role"
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      role: e.target.value as 'administrator' | 'superuser' | 'user',
                    })
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="user">Benutzer</option>
                  <option value="superuser">Superuser</option>
                  <option value="administrator">Administrator</option>
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Abbrechen
              </Button>
              <Button onClick={handleSave}>
                {editingId ? 'Aktualisieren' : 'Hinzufügen'}
              </Button>
            </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Musicians List */}
      <div className="grid grid-cols-1 gap-4">
        {musicians.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">
                {showArchived
                  ? 'Keine archivierten Musiker vorhanden.'
                  : 'Noch keine Musiker hinzugefuegt. Klick auf "Musiker hinzufuegen" um zu beginnen.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          musicians.map((musician) => (
            <Card key={musician.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-semibold">{musician.name}</h3>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                        {roleLabel(musician.role)}
                      </span>
                    </div>
                    <div className="flex flex-col gap-2 mt-3 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        {musician.email}
                      </div>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Init-Wert: <span className="font-semibold text-foreground">{formatCurrency(musician.balance)}</span>
                      </div>
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="flex gap-2">
                      {!showArchived ? (
                        <>
                          <Button variant="outline" size="sm" onClick={() => handleEdit(musician)}>
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDelete(musician.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRestore(musician.id)}
                        >
                          <RotateCcw className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}

export default Musicians
