import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Plus, Edit2, Trash2, Users } from 'lucide-react'
import {
  fetchMusicians,
  fetchGroupsWithMembers,
  createGroup,
  updateGroup,
  deleteGroup as apiDeleteGroup,
} from '@/lib/api-client'
import type { DbMusician, GroupWithMembers } from '@/lib/database.types'
import { Spinner } from '@/components/ui/spinner'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

function Groups() {
  const { user } = useAuth()
  const [groups, setGroups] = useState<GroupWithMembers[]>([])
  const [musicians, setMusicians] = useState<DbMusician[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [selected, setSelected] = useState<Record<string, string>>({}) // musicianId -> percent string
  const [error, setError] = useState<string | null>(null)

  const loadData = async () => {
    try {
      const [g, m] = await Promise.all([fetchGroupsWithMembers(), fetchMusicians()])
      setGroups(g)
      setMusicians(m)
    } catch (err) {
      console.error('Daten laden fehlgeschlagen:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const resetForm = () => {
    setName('')
    setSelected({})
    setEditingId(null)
    setError(null)
  }

  const openAdd = () => {
    resetForm()
    setOpen(true)
  }

  const openEdit = (group: GroupWithMembers) => {
    setEditingId(group.id)
    setName(group.name)
    const map: Record<string, string> = {}
    group.members.forEach((m) => (map[m.musician_id] = m.percent.toFixed(2)))
    setSelected(map)
    setOpen(true)
  }

  const toggleSelectChecked = (id: string, checked: boolean) => {
    setSelected((s) => {
      const copy = { ...s }
      if (checked) copy[id] = copy[id] ?? ''
      else delete copy[id]
      return copy
    })
  }

  const setPercent = (id: string, value: string) => {
    const cleaned = value.replace(/[^0-9.,-]/g, '').replace(',', '.')
    setSelected((s) => ({ ...s, [id]: cleaned }))
  }

  const distributeEven = () => {
    const ids = Object.keys(selected)
    if (ids.length === 0) return
    const raw = 100 / ids.length
    const base = Number(raw.toFixed(2))
    const total = base * ids.length
    const diff = Number((100 - total).toFixed(2))
    const result: Record<string, string> = {}
    ids.forEach((id) => {
      result[id] = base.toFixed(2)
    })
    result[ids[0]] = (Number(result[ids[0]]) + diff).toFixed(2)
    setSelected(result)
  }

  const calculateSum = () => {
    return Object.values(selected).reduce(
      (s, v) => s + (Number(parseFloat(v || '0').toFixed(2)) || 0),
      0
    )
  }

  const saveGroup = async () => {
    if (!name.trim()) return

    const members = Object.entries(selected)
      .filter(([, percentStr]) => percentStr !== undefined)
      .map(([musicianId, percentStr]) => ({
        musician_id: musicianId,
        percent: Number(parseFloat(percentStr || '0').toFixed(2)),
      }))

    const sum = members.reduce((s, m) => s + m.percent, 0)
    if (Math.abs(sum - 100) > 0.001) {
      setError('Die Summe der Prozentsätze muss 100% ergeben.')
      return
    }

    try {
      let action: 'create' | 'update' = 'create';
      let logDesc = '';
      if (editingId) {
        const oldGroup = groups.find((g) => g.id === editingId);
        await updateGroup(editingId, name.trim(), members);
        action = 'update';
        if (oldGroup) {
          const changes: string[] = [];
          if (name.trim() !== oldGroup.name) changes.push(`Name von "${oldGroup.name}" auf "${name.trim()}"`);
          // Mitglieder vergleichen
          const oldMembers = oldGroup.members.map(m => `${m.musician_name} (${m.percent.toFixed(2)}%)`).sort().join(', ');
          const newMembers = members.map(m => {
            const mu = musicians.find(x => x.id === m.musician_id);
            return `${mu?.name || m.musician_id} (${m.percent.toFixed(2)}%)`;
          }).sort().join(', ');
          if (oldMembers !== newMembers) changes.push(`Mitglieder geändert: alt=[${oldMembers}], neu=[${newMembers}]`);
          logDesc = `Gruppe: ${oldGroup.name}, ${changes.length ? changes.join(', ') : 'keine Änderung'}`;
        } else {
          logDesc = `Gruppe bearbeitet`;
        }
      } else {
        await createGroup(name.trim(), members);
        action = 'create';
        const newMembers = members.map(m => {
          const mu = musicians.find(x => x.id === m.musician_id);
          return `${mu?.name || m.musician_id} (${m.percent.toFixed(2)}%)`;
        }).sort().join(', ');
        logDesc = `Gruppe: ${name.trim()}, Mitglieder: [${newMembers}], neu erstellt`;
      }
      // Logging-Aufruf
      if (user) {
        await supabase.from('logs').insert({
          type: 'group',
          action,
          label: name.trim(),
          description: logDesc,
          user_id: user.id,
          user_name: user.name,
        });
      }
      setOpen(false);
      resetForm();
      await loadData();
    } catch (err) {
      console.error('Gruppe speichern fehlgeschlagen:', err);
      setError('Gruppe konnte nicht gespeichert werden.');
    }
  }

  const deleteGroup = async (id: string) => {
    if (!confirm('Gruppe wirklich löschen?')) return
    try {
      await apiDeleteGroup(id)
      setGroups((prev) => prev.filter((g) => g.id !== id))
      // Logging-Aufruf
      if (user) {
        await supabase.from('logs').insert({
          type: 'group',
          action: 'delete',
          label: id,
          description: 'Gruppe gelöscht',
          user_id: user.id,
          user_name: user.name,
        })
      }
    } catch (err) {
      console.error('Gruppe löschen fehlgeschlagen:', err)
      alert('Gruppe konnte nicht gelöscht werden.')
    }
  }

  if (loading) {
    return <Spinner text="Gruppen werden geladen..." />
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Gruppen</h1>
          <p className="text-muted-foreground mt-1 sm:mt-2 text-sm sm:text-base">Verteile Beträge innerhalb einer Gruppe</p>
        </div>
        <Dialog open={open} onOpenChange={(v: boolean) => { if (!v) resetForm(); setOpen(v) }}>
          <DialogTrigger asChild>
            <Button onClick={openAdd}>
              <Plus className="w-4 h-4 mr-2" />
              Gruppe hinzufügen
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[640px]">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Gruppe bearbeiten' : 'Neue Gruppe erstellen'}</DialogTitle>
              <DialogDescription>Definiere Verteilung in Prozent (Summe = 100%)</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2 px-1 sm:px-2">
                <Label htmlFor="group-name">Gruppenname</Label>
                <Input id="group-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="z. B. Hauptband" />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Musiker auswählen</Label>
                  <Button size="sm" onClick={distributeEven}>Gleichmäßig verteilen</Button>
                </div>
                <div className="space-y-2">
                  {musicians.map((m) => (
                    <div key={m.id} className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
                      <Switch checked={m.id in selected} onCheckedChange={(checked: boolean) => toggleSelectChecked(m.id, checked)} />
                      <div className="flex-1 min-w-[80px]">
                        <div className="font-medium text-sm sm:text-base">{m.name}</div>
                      </div>
                      <div className="w-24 sm:w-36">
                        <Input
                          type="number"
                          step="0.01"
                          min={0}
                          max={100}
                          disabled={!(m.id in selected)}
                          value={(m.id in selected ? (selected[m.id] ?? '') : '') as any}
                          onChange={(e) => setPercent(m.id, e.target.value)}
                        />
                      </div>
                      <div className="w-8 sm:w-12 text-sm text-muted-foreground">%</div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-sm">
                  Summe:{' '}
                  <span
                    className={`font-medium ${
                      Math.abs(calculateSum() - 100) < 0.001 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {calculateSum().toFixed(2)}%
                  </span>
                </div>
                {error && <div className="text-sm text-destructive mt-2">{error}</div>}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setOpen(false); resetForm() }}>Abbrechen</Button>
              <Button onClick={saveGroup} disabled={Math.abs(calculateSum() - 100) > 0.001}>{editingId ? 'Aktualisieren' : 'Erstellen'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {groups.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Noch keine Gruppen. Erstelle eine neue Gruppe, um die Verteilung zu definieren.
            </CardContent>
          </Card>
        ) : (
          groups.map((g) => (
            <Card key={g.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{g.name}</CardTitle>
                    <CardDescription>{g.members.length} Mitglieder</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEdit(g)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => deleteGroup(g.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {g.members.map((m) => (
                    <div key={m.id} className="inline-flex items-center gap-2 px-3 py-1 bg-muted rounded-full text-sm">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <div>{m.musician_name} ({m.percent.toFixed(2)}%)</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}

export default Groups
