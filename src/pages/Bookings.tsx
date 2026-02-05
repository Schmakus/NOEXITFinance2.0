import { useState, useMemo, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import { Plus, Edit2, Trash2, X } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  fetchBookings,
  createBooking,
  updateBooking,
  deleteBooking as apiDeleteBooking,
  fetchMusicians,
  fetchGroupsWithMembers,
  replaceTransactionsByBooking,
  deleteTransactionsByBooking,
} from '@/lib/api-client'
import { useTags } from '@/contexts/TagsContext'
import type { DbBooking, DbMusician, GroupWithMembers } from '@/lib/database.types'

function Bookings() {
  const [bookings, setBookings] = useState<(DbBooking & { group_name?: string })[]>([])
  const [musicians, setMusicians] = useState<DbMusician[]>([])
  const [groups, setGroups] = useState<GroupWithMembers[]>([])
  const [loading, setLoading] = useState(true)

  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({
    type: 'expense',
    amount: '',
    date: '',
    groupId: '',
    description: '',
    keyword: '',
    keywords: [] as string[],
    notes: '',
    payoutMusicians: [] as string[],
  })

  const { tagNames, addTag } = useTags()

  const loadData = async () => {
    try {
      const [b, m, g] = await Promise.all([
        fetchBookings(),
        fetchMusicians(),
        fetchGroupsWithMembers(),
      ])
      setBookings(b)
      setMusicians(m)
      setGroups(g)
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
    setForm({
      type: 'expense',
      amount: '',
      date: '',
      groupId: '',
      description: '',
      keyword: '',
      keywords: [],
      notes: '',
      payoutMusicians: [],
    })
    setEditingId(null)
  }

  const openAdd = () => {
    resetForm()
    setOpen(true)
  }

  const openEdit = (b: DbBooking & { group_name?: string }) => {
    setEditingId(b.id)
    setForm({
      type: b.type,
      amount: b.amount.toString(),
      date: b.date ?? '',
      groupId: b.group_id ?? '',
      description: b.description,
      keyword: '',
      keywords: b.keywords ?? [],
      notes: b.notes ?? '',
      payoutMusicians: b.payout_musician_ids ?? [],
    })
    setOpen(true)
  }

  const addKeyword = (kw: string) => {
    if (!kw) return
    addTag(kw)
    setForm((s) => ({ ...s, keywords: Array.from(new Set([...s.keywords, kw])), keyword: '' }))
  }

  const selectedGroupMembers = useMemo(() => {
    if (!form.groupId) return []
    const group = groups.find((g) => g.id === form.groupId)
    return group?.members ?? []
  }, [form.groupId, groups])

  const saveBooking = async () => {
    if (!form.amount || !form.date) return

    const amount = parseFloat(form.amount)
    const bookingData = {
      description: form.description || '-',
      amount,
      type: form.type as 'expense' | 'income' | 'payout',
      date: form.date,
      group_id: form.type !== 'payout' ? (form.groupId || null) : null,
      payout_musician_ids: form.type === 'payout' ? form.payoutMusicians : [],
      keywords: form.keywords.length ? form.keywords : [],
      notes: form.notes,
    }

    try {
      let bookingId: string

      if (editingId) {
        const updated = await updateBooking(editingId, bookingData)
        bookingId = updated.id
      } else {
        const created = await createBooking(bookingData)
        bookingId = created.id
      }

      // Create transactions
      const transactions: {
        musician_id: string
        concert_name: string
        amount: number
        date: string
        type: 'earn' | 'expense'
        description: string
      }[] = []

      if (form.type === 'payout' && form.payoutMusicians.length > 0) {
        form.payoutMusicians.forEach((musicianId) => {
          transactions.push({
            musician_id: musicianId,
            concert_name: form.description || 'Auszahlung',
            amount: -amount,
            date: form.date,
            type: 'expense',
            description: form.description || 'Auszahlung',
          })
        })
      } else if (form.groupId && form.type !== 'payout') {
        selectedGroupMembers.forEach((m) => {
          transactions.push({
            musician_id: m.musician_id,
            concert_name: form.description || 'Buchung',
            amount: Number((amount * (m.percent / 100)).toFixed(2)) * (form.type === 'expense' ? -1 : 1),
            date: form.date,
            type: form.type === 'expense' ? 'expense' : 'earn',
            description: form.description || 'Buchung',
          })
        })
      }

      if (transactions.length > 0) {
        await replaceTransactionsByBooking(bookingId, transactions)
      } else {
        await deleteTransactionsByBooking(bookingId)
      }

      setOpen(false)
      resetForm()
      await loadData()
    } catch (err) {
      console.error('Buchung speichern fehlgeschlagen:', err)
      alert('Buchung konnte nicht gespeichert werden.')
    }
  }

  const handleDeleteBooking = async (id: string) => {
    if (!confirm('Buchung wirklich löschen?')) return
    try {
      await apiDeleteBooking(id)
      setBookings((prev) => prev.filter((b) => b.id !== id))
    } catch (err) {
      console.error('Buchung löschen fehlgeschlagen:', err)
      alert('Buchung konnte nicht gelöscht werden.')
    }
  }

  const descriptionSuggestions = useMemo(() => {
    const set = new Set<string>()
    bookings.forEach((b) => b.description && set.add(b.description))
    return Array.from(set)
  }, [bookings])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Buchungen werden geladen...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Buchungen</h1>
          <p className="text-muted-foreground mt-2">Erfasse einzelne Buchungen (Einnahmen, Ausgaben, Auszahlungen)</p>
        </div>
        <Dialog open={open} onOpenChange={(v: boolean) => { if (!v) resetForm(); setOpen(v) }}>
          <DialogTrigger asChild>
            <Button onClick={openAdd}>
              <Plus className="w-4 h-4 mr-2" />
              Buchung hinzufügen
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[640px]">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Buchung bearbeiten' : 'Neue Buchung'}</DialogTitle>
              <DialogDescription>Erfasse eine Ausgabe, Einnahme oder Auszahlung</DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4 pl-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Typ</Label>
                  <select value={form.type} onChange={(e) => setForm((s) => ({ ...s, type: e.target.value, payoutMusicians: [] }))} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50">
                    <option value="expense">Ausgabe</option>
                    <option value="income">Einnahme</option>
                    <option value="payout">Auszahlung</option>
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label>Betrag (€)</Label>
                  <Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm((s) => ({ ...s, amount: e.target.value }))} />
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Beschreibung</Label>
                <Input list="desc-suggestions" value={form.description} onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))} />
                <datalist id="desc-suggestions">
                  {descriptionSuggestions.map((d) => <option key={d} value={d} />)}
                </datalist>
              </div>

              <div className="grid gap-2">
                <Label>Datum</Label>
                <Input type="date" value={form.date} onChange={(e) => setForm((s) => ({ ...s, date: e.target.value }))} />
              </div>

              {form.type !== 'payout' && (
                <div className="grid gap-2">
                  <Label>Verteilergruppe</Label>
                  <select value={form.groupId} onChange={(e) => setForm((s) => ({ ...s, groupId: e.target.value }))} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50">
                    <option value="">-- Keine Gruppe --</option>
                    {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                  {selectedGroupMembers.length > 0 && (
                    <div className="mt-3 p-3 bg-muted rounded-md">
                      <div className="text-sm font-medium mb-2">Gruppenmitglieder:</div>
                      <div className="space-y-2">
                        {selectedGroupMembers.map((m) => (
                          <div key={m.musician_id} className="text-sm text-muted-foreground">
                            {m.musician_name} ({m.percent}%)
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {form.type === 'payout' && (
                <div className="grid gap-2">
                  <Label>Musiker (Auszahlung)</Label>
                  <div className="space-y-2">
                    {musicians.map((m) => {
                      const selected = form.payoutMusicians.includes(m.id)
                      const handleChange = (checked: boolean) => {
                        setForm((s) => ({
                          ...s,
                          payoutMusicians: checked
                            ? [...s.payoutMusicians, m.id]
                            : s.payoutMusicians.filter((id) => id !== m.id),
                        }))
                      }
                      return (
                        <div key={m.id} className="flex items-center gap-2 p-2 rounded border border-input">
                          <Switch checked={selected} onCheckedChange={handleChange} />
                          <span className="text-sm">{m.name}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className="grid gap-2">
                <Label>Stichworte</Label>
                <div className="space-y-3">
                  <div className="flex gap-2 flex-wrap">
                    {tagNames.map((k) => {
                      const isSelected = form.keywords.includes(k)
                      return (
                        <button
                          key={k}
                          onClick={() => setForm((s) => ({ ...s, keywords: isSelected ? s.keywords.filter((x) => x !== k) : [...s.keywords, k] }))}
                          className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                            isSelected
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-foreground hover:bg-muted/80'
                          }`}
                        >
                          {k}
                        </button>
                      )
                    })}
                  </div>
                  <div className="flex gap-2">
                    <Input placeholder="Neues Stichwort" value={form.keyword} onChange={(e) => setForm((s) => ({ ...s, keyword: e.target.value }))} />
                    <Button variant="outline" onClick={() => addKeyword(form.keyword)}>Hinzufügen</Button>
                  </div>
                  {form.keywords.length > 0 && (
                    <div className="pt-2 border-t border-border">
                      <div className="text-xs text-muted-foreground mb-2">Ausgewählte Stichworte:</div>
                      <div className="flex gap-2 flex-wrap">
                        {form.keywords.map((k) => (
                          <div key={k} className="px-3 py-1 bg-primary text-primary-foreground rounded-full text-sm font-medium flex items-center gap-2">
                            <span>{k}</span>
                            <button onClick={() => setForm((s) => ({ ...s, keywords: s.keywords.filter((x) => x !== k) }))} className="hover:opacity-80">
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Notizen</Label>
                <Textarea value={form.notes} onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))} />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => { setOpen(false); resetForm() }}>Abbrechen</Button>
              <Button onClick={saveBooking}>{editingId ? 'Aktualisieren' : 'Erstellen'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {bookings.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">Noch keine Buchungen. Lege eine neue Buchung an.</CardContent>
          </Card>
        ) : (
          bookings.map((b) => {
            const group = b.group_id ? groups.find((g) => g.id === b.group_id) : null
            const groupMembers = group?.members ?? []
            const payoutNames = b.type === 'payout' && b.payout_musician_ids?.length
              ? b.payout_musician_ids
                  .map((id) => musicians.find((m) => m.id === id)?.name)
                  .filter(Boolean)
              : []

            return (
              <Card key={b.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>
                        {b.description || '-'}{' '}
                        {b.group_name && <span className="text-sm text-muted-foreground">• {b.group_name}</span>}
                      </CardTitle>
                      <CardDescription>
                        {b.date ? formatDate(new Date(b.date)) : '-'} • {b.type} • {formatCurrency(b.amount)}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(b)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDeleteBooking(b.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {b.type === 'payout' && payoutNames.length > 0 && (
                      <div className="text-sm space-y-1">
                        <div className="font-medium text-muted-foreground">Auszahlung an:</div>
                        <div className="space-y-1">
                          {payoutNames.map((name) => (
                            <div key={name} className="text-sm">{name}</div>
                          ))}
                        </div>
                      </div>
                    )}
                    {(b.type === 'income' || b.type === 'expense') && groupMembers.length > 0 && (
                      <div className="text-sm space-y-1">
                        <div className="font-medium text-muted-foreground">Verteilung:</div>
                        <div className="space-y-1">
                          {groupMembers.map((m) => (
                            <div key={m.musician_id} className="text-sm">{m.musician_name} ({m.percent}%)</div>
                          ))}
                        </div>
                      </div>
                    )}
                    {b.keywords.length > 0 && (
                      <div className="flex gap-2 flex-wrap pt-2">
                        {b.keywords.map((k) => (
                          <span key={k} className="px-2 py-1 bg-primary text-primary-foreground rounded-full text-xs font-medium">
                            {k}
                          </span>
                        ))}
                      </div>
                    )}
                    {b.notes && <div className="text-sm text-muted-foreground pt-2">{b.notes}</div>}
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}

export default Bookings
