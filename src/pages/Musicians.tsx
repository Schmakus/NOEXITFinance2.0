import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Plus, Edit2, Trash2, Mail, Badge, User, Users } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface Musician {
  id: string
  name: string
  email: string
  balance: number
  role: 'Administrator' | 'Superuser' | 'User'
  groups: string[]
}

const mockGroups = ['Band 1', 'Band 2', 'Session Band', 'Corporate Events']

const mockMusicians: Musician[] = [
  {
    id: '1',
    name: 'Max Mueller',
    email: 'max@noexit.de',
    balance: 2500,
    role: 'Administrator',
    groups: ['Band 1', 'Session Band'],
  },
  {
    id: '2',
    name: 'Anna Schmidt',
    email: 'anna@noexit.de',
    balance: 1800,
    role: 'Superuser',
    groups: ['Band 1', 'Corporate Events'],
  },
  {
    id: '3',
    name: 'Tom Weber',
    email: 'tom@noexit.de',
    balance: 950,
    role: 'User',
    groups: ['Band 1', 'Band 2'],
  },
  {
    id: '4',
    name: 'Julia Braun',
    email: 'julia@noexit.de',
    balance: 3200,
    role: 'Superuser',
    groups: ['Band 2', 'Session Band', 'Corporate Events'],
  },
]

function Musicians() {
  const [musicians, setMusicians] = useState<Musician[]>(mockMusicians)
  const [isOpen, setIsOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    balance: '',
    role: 'User' as const,
    groups: [] as string[],
  })

  const handleAdd = () => {
    setEditingId(null)
    setFormData({ name: '', email: '', balance: '', role: 'User', groups: [] })
    setIsOpen(true)
  }

  const handleEdit = (musician: Musician) => {
    setEditingId(musician.id)
    setFormData({
      name: musician.name,
      email: musician.email,
      balance: musician.balance.toString(),
      role: musician.role,
      groups: musician.groups,
    })
    setIsOpen(true)
  }

  const handleDelete = (id: string) => {
    setMusicians(musicians.filter((m) => m.id !== id))
  }

  const handleGroupToggle = (group: string) => {
    setFormData((prev) => ({
      ...prev,
      groups: prev.groups.includes(group)
        ? prev.groups.filter((g) => g !== group)
        : [...prev.groups, group],
    }))
  }

  const handleSave = () => {
    if (!formData.name || !formData.email || !formData.balance) {
      return
    }

    if (editingId) {
      setMusicians(
        musicians.map((m) =>
          m.id === editingId
            ? {
                ...m,
                name: formData.name,
                email: formData.email,
                balance: parseInt(formData.balance),
                role: formData.role,
                groups: formData.groups,
              }
            : m
        )
      )
    } else {
      setMusicians([
        ...musicians,
        {
          id: Date.now().toString(),
          name: formData.name,
          email: formData.email,
          balance: parseInt(formData.balance),
          role: formData.role,
          groups: formData.groups,
        },
      ])
    }

    setIsOpen(false)
    setFormData({ name: '', email: '', balance: '', role: 'User', groups: [] })
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Musiker</h1>
          <p className="text-muted-foreground mt-2">Verwalte Bandmitglieder</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleAdd}>
              <Plus className="w-4 h-4 mr-2" />
              Musiker hinzufügen
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
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">E-Mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="max@beispiel.de"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="balance">Anfänglicher Kontostand (€)</Label>
                <Input
                  id="balance"
                  type="number"
                  placeholder="0.00"
                  value={formData.balance}
                  onChange={(e) =>
                    setFormData({ ...formData, balance: e.target.value })
                  }
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
                      role: e.target.value as 'Administrator' | 'Superuser' | 'User',
                    })
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="User">Benutzer</option>
                  <option value="Superuser">Superuser</option>
                  <option value="Administrator">Administrator</option>
                </select>
              </div>
              <div className="grid gap-2">
                <Label>Gruppen zuordnen</Label>
                <div className="space-y-2">
                  {mockGroups.map((group) => (
                    <div key={group} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={group}
                        checked={formData.groups.includes(group)}
                        onChange={() => handleGroupToggle(group)}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <Label htmlFor={group} className="font-normal cursor-pointer">
                        {group}
                      </Label>
                    </div>
                  ))}
                </div>
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
      </div>

      {/* Musicians List */}
      <div className="grid grid-cols-1 gap-4">
        {musicians.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">
                Noch keine Musiker hinzugefügt. Klick auf "Musiker hinzufügen" um zu beginnen.
              </p>
            </CardContent>
          </Card>
        ) : (
          musicians.map((musician) => (
            <Card
              key={musician.id}
              className="hover:shadow-lg transition-shadow"
            >
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-semibold">{musician.name}</h3>
                      <Badge variant="secondary">{musician.role}</Badge>
                    </div>
                    <div className="flex flex-col gap-2 mt-3 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        {musician.email}
                      </div>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Balance: <span className="font-semibold text-foreground">{formatCurrency(musician.balance)}</span>
                      </div>
                      {musician.groups.length > 0 && (
                        <div className="flex items-start gap-2">
                          <Users className="w-4 h-4 mt-0.5" />
                          <div>
                            <p className="font-medium text-foreground">Groups:</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {musician.groups.map((group) => (
                                <span
                                  key={group}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs"
                                >
                                  {group}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(musician)}
                    >
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
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Summary Stats */}
      {musicians.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Band-Übersicht</CardTitle>
            <CardDescription>Übersicht deiner Band</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Gesamtmitglieder</p>
                <p className="text-2xl font-bold">{musicians.length}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Gesamtkontostand</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(musicians.reduce((sum, m) => sum + m.balance, 0))}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Aktive Gruppen</p>
                <p className="text-2xl font-bold">
                  {new Set(musicians.flatMap((m) => m.groups)).size}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Durchschn. Kontostand</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(
                    musicians.reduce((sum, m) => sum + m.balance, 0) / musicians.length
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default Musicians
