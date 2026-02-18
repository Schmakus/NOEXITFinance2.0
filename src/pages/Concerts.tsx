import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { DatePicker } from '@/components/ui/date-picker'
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
import { formatCurrency } from '@/lib/utils'
import {
  fetchConcerts,
  createConcert,
  updateConcert,
  deleteConcert as apiDeleteConcert,
  fetchGroupsWithMembers,
  replaceTransactionsByConcert,
  deleteTransactionsByConcert,
} from '@/lib/api-client'
import { useTags } from '@/contexts/TagsContext'
import { useAuth } from '@/contexts/AuthContext'
import { Spinner } from '@/components/ui/spinner'
import { supabase } from '@/lib/supabase'
import type { ConcertWithExpenses, GroupWithMembers } from '@/lib/database.types'

interface LocalExpense {
  id: string
  description: string
  amount: number
  keyword: string
}

function Concerts() {
  const { user } = useAuth()
  const [concerts, setConcerts] = useState<ConcertWithExpenses[]>([])
  // AutoFill Vorschläge für Ausgaben-Beschreibung
  const expenseDescriptionSuggestions: string[] = Array.from(new Set(concerts.flatMap((c: ConcertWithExpenses) => (c.expenses || []).map(e => typeof e.description === 'string' ? e.description : '')))).filter((v): v is string => !!v)
  const [groups, setGroups] = useState<GroupWithMembers[]>([])
  const [loading, setLoading] = useState(true)
  const { tagNames, addTag } = useTags()

  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    date: '',
    nettoGage: '',
    groupId: '',
    notes: '',
  })
  const [expenses, setExpenses] = useState<LocalExpense[]>([])
  const [expenseForm, setExpenseForm] = useState({ description: '', amount: '', keyword: '' })

  const loadData = async () => {
    try {
      const [c, g] = await Promise.all([fetchConcerts(), fetchGroupsWithMembers()])
      setConcerts(c)
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
    setFormData({ name: '', location: '', date: '', nettoGage: '', groupId: '', notes: '' })
    setExpenses([])
    setExpenseForm({ description: '', amount: '', keyword: '' })
    setEditingId(null)
  }

  const openAdd = () => {
    resetForm()
    setOpen(true)
  }

  const openEdit = (concert: ConcertWithExpenses) => {
    setEditingId(concert.id)
    setFormData({
      name: concert.name,
      location: concert.location || '',
      date: concert.date || '',
      nettoGage: concert.netto_gage.toString(),
      groupId: concert.group_id || '',
      notes: concert.notes || '',
    })
    setExpenses(
      concert.expenses.map((e) => ({
        id: e.id,
        description: e.description,
        amount: e.amount,
        keyword: e.keyword || '',
      }))
    )
    setOpen(true)
  }

  const addExpense = () => {
    if (!expenseForm.description || !expenseForm.amount) return
    if (expenseForm.keyword) addTag(expenseForm.keyword)
    const newExpense: LocalExpense = {
      id: Date.now().toString(),
      description: expenseForm.description,
      amount: parseFloat(expenseForm.amount),
      keyword: expenseForm.keyword,
    }
    setExpenses([...expenses, newExpense])
    setExpenseForm({ description: '', amount: '', keyword: '' })
  }

  const deleteExpense = (id: string) => {
    setExpenses(expenses.filter((e) => e.id !== id))
  }

  const getGroupMembers = (groupId: string) => {
    const group = groups.find((g) => g.id === groupId)
    return group?.members ?? []
  }

  const saveConcert = async () => {
    if (!formData.name || !formData.location || !formData.date || !formData.nettoGage) return

    const nettoGage = parseFloat(formData.nettoGage)
    const expenseTotal = expenses.reduce((sum, e) => sum + e.amount, 0)
    // restBetrag wird weiter unten als const deklariert, daher hier entfernen

    const concertData = {
      name: formData.name,
      location: formData.location,
      date: formData.date,
      netto_gage: nettoGage,
      group_id: formData.groupId || null,
      notes: formData.notes,
    }
    const expenseData = expenses.map((e) => ({
      description: e.description,
      amount: e.amount,
      keyword: e.keyword,
    }))

    try {
      let concertId: string;
      let action: 'create' | 'update' = 'create';
      if (editingId) {
        const updated = await updateConcert(editingId, concertData, expenseData);
        concertId = updated.id;
        action = 'update';
      } else {
        const created = await createConcert(concertData, expenseData);
        concertId = created.id;
        action = 'create';
      }

      // Create transactions if group is selected and there's a positive rest
      const restBetrag = nettoGage - expenseTotal;
      if (formData.groupId && restBetrag > 0) {
        const members = getGroupMembers(formData.groupId);
        const transactions = members.map((member) => ({
          musician_id: member.musician_id,
          concert_name: formData.name,
          amount: Number((restBetrag * member.percent / 100).toFixed(2)),
          date: formData.date,
          type: 'earn' as const,
          description: `Gagen Verteilung: ${formData.name}`,
        }));
        await replaceTransactionsByConcert(concertId, transactions);
      } else {
        // No group or no rest — remove any existing transactions
        await deleteTransactionsByConcert(concertId);
      }

      // Logging-Aufruf
      if (user) {
        let changes: string[] = [];
        let desc = '';
        if (editingId) {
          const oldConcert = concerts.find((c) => c.id === editingId);
          if (oldConcert) {
            if (concertData.netto_gage !== oldConcert.netto_gage) {
              changes.push(`Gage von ${formatCurrency(oldConcert.netto_gage)} auf ${formatCurrency(concertData.netto_gage)}`);
            }
            if ((concertData.name || '-') !== (oldConcert.name || '-')) {
              changes.push('Name geändert');
            }
            if ((concertData.location || '') !== (oldConcert.location || '')) {
              changes.push('Ort geändert');
            }
            if ((concertData.date || '') !== (oldConcert.date || '')) {
              changes.push('Datum geändert');
            }
            if ((concertData.group_id || '') !== (oldConcert.group_id || '')) {
              changes.push('Gruppe geändert');
            }
            if ((concertData.notes || '') !== (oldConcert.notes || '')) {
              changes.push('Notiz geändert');
            }
            // Ausgaben-Änderungen
            const oldExpenses = oldConcert.expenses.map(e => `${e.description}:${e.amount}:${e.keyword}`).join('|');
            const newExpenses = expenseData.map(e => `${e.description}:${e.amount}:${e.keyword}`).join('|');
            if (oldExpenses !== newExpenses) {
              changes.push('Ausgaben geändert');
            }
            const groupName = concertData.group_id ? (groups.find(g => g.id === concertData.group_id)?.name || '-') : '';
            desc = `Konzert: ${concertData.name}, Ort: ${concertData.location}, Datum: ${concertData.date}, Gage: ${formatCurrency(concertData.netto_gage)}${groupName ? ', Gruppe: ' + groupName : ''}${concertData.notes ? ', Notiz: ' + concertData.notes : ''}${expenseData.length ? ', Ausgaben: ' + expenseData.map(e => `${e.description} (${formatCurrency(e.amount)})`).join(', ') : ''}${changes.length ? ', ' + changes.join(', ') : ', keine Änderung'}`;
          }
        } else {
          const groupName = concertData.group_id ? (groups.find(g => g.id === concertData.group_id)?.name || '-') : '';
          desc = `Konzert: ${concertData.name}, Ort: ${concertData.location}, Datum: ${concertData.date}, Gage: ${formatCurrency(concertData.netto_gage)}${groupName ? ', Gruppe: ' + groupName : ''}${concertData.notes ? ', Notiz: ' + concertData.notes : ''}${expenseData.length ? ', Ausgaben: ' + expenseData.map(e => `${e.description} (${formatCurrency(e.amount)})`).join(', ') : ''}, neu erstellt`;
        }
        await supabase.from('logs').insert({
          type: 'concert',
          action,
          label: concertData.name,
          description: desc,
          user_id: user.id,
          user_name: user.name,
        });
      }

      setOpen(false);
      resetForm();
      await loadData();
    } catch (err) {
      console.error('Konzert speichern fehlgeschlagen:', err);
      alert('Konzert konnte nicht gespeichert werden.');
    }
  }

  const handleDeleteConcert = async (id: string) => {
    if (!confirm('Konzert wirklich löschen?')) return
    try {
      const oldConcert = concerts.find((c) => c.id === id);
      await apiDeleteConcert(id);
      setConcerts((prev) => prev.filter((c) => c.id !== id));
      // Logging-Aufruf
      if (user && oldConcert) {
        const groupName = oldConcert.group_id ? (groups.find(g => g.id === oldConcert.group_id)?.name || '-') : '';
        const desc = `Konzert: ${oldConcert.name}, Ort: ${oldConcert.location}, Datum: ${oldConcert.date}, Gage: ${formatCurrency(oldConcert.netto_gage)}${groupName ? ', Gruppe: ' + groupName : ''}${oldConcert.notes ? ', Notiz: ' + oldConcert.notes : ''}${oldConcert.expenses.length ? ', Ausgaben: ' + oldConcert.expenses.map(e => `${e.description} (${formatCurrency(e.amount)})`).join(', ') : ''}, gelöscht`;
        await supabase.from('logs').insert({
          type: 'concert',
          action: 'delete',
          label: id,
          description: desc,
          user_id: user.id,
          user_name: user.name,
        });
      }
    } catch (err) {
      console.error('Konzert löschen fehlgeschlagen:', err);
      alert('Konzert konnte nicht gelöscht werden.');
    }
  }

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)
  // restBetrag wird nur in saveConcert benötigt

  if (loading) {
    return <Spinner text="Konzerte werden geladen..." />
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Konzerte</h1>
          <p className="text-muted-foreground mt-1 sm:mt-2 text-sm sm:text-base">Verwalte deine Konzertabrechnungen</p>
        </div>
        <Dialog open={open} onOpenChange={(v: boolean) => { if (!v) resetForm(); setOpen(v) }}>
          <DialogTrigger asChild>
            <Button onClick={openAdd}>
              <Plus className="w-4 h-4 mr-2" />
              Konzert hinzufügen
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[700px]">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Konzert bearbeiten' : 'Neues Konzert anlegen'}</DialogTitle>
              <DialogDescription>
                {editingId ? 'Aktualisiere die Konzertinformationen' : 'Erstelle ein neues Konzert mit Ausgaben'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4 px-1">
              {/* Basic Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Name/Anlass</Label>
                  <Input
                    id="name"
                    placeholder="z.B. Stadtfest Musterstadt"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="location">Veranstaltungsort</Label>
                  <Input
                    id="location"
                    placeholder="Ort/Location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="date">Datum</Label>
                  <DatePicker value={formData.date} onChange={(v) => setFormData({ ...formData, date: v })} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="nettoGage">Netto-Gage (€)</Label>
                  <Input
                    id="nettoGage"
                    type="number"
                    placeholder="0.00"
                    step="0.01"
                    value={formData.nettoGage}
                    onChange={(e) => setFormData({ ...formData, nettoGage: e.target.value })}
                  />
                </div>
              </div>

              {/* Concert Summary */}
              <div className="grid grid-cols-3 gap-2 sm:gap-4 p-3 sm:p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Netto-Gage</p>
                  <p className="text-lg font-medium">{formatCurrency(parseFloat(formData.nettoGage || '0'))}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Ausgaben</p>
                  <p className="text-lg font-medium text-red-600 dark:text-red-400">{formatCurrency(totalExpenses)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Restbetrag</p>
                  <p className="text-lg font-medium text-green-600 dark:text-green-400">{formatCurrency(parseFloat(formData.nettoGage || '0') - totalExpenses)}</p>
                </div>
              </div>

              {/* Expenses */}
              <div className="grid gap-2">
                <Label>Konzert-Ausgaben</Label>
                <div className="space-y-2">
                  {expenses.map((e) => (
                    <div key={e.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium">{e.description}</p>
                        <p className="text-sm text-muted-foreground">{e.keyword}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="font-medium text-red-600">{formatCurrency(e.amount)}</p>
                        <Button variant="ghost" size="sm" onClick={() => deleteExpense(e.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add Expense Form */}
                <div className="grid gap-2 p-3 border rounded-lg bg-muted/30">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <Input
                      placeholder="Beschreibung"
                      value={expenseForm.description}
                      onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                      list="expense-description-suggestions"
                    />
                    <datalist id="expense-description-suggestions">
                      {expenseDescriptionSuggestions.map((desc) => (
                        <option key={desc} value={desc} />
                      ))}
                    </datalist>
                    <Input
                      placeholder="Betrag (€)"
                      type="number"
                      step="0.01"
                      value={expenseForm.amount}
                      onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                    />
                    <Input
                      placeholder="Stichwort"
                      list="concert-keyword-suggestions"
                      value={expenseForm.keyword}
                      onChange={(e) => setExpenseForm({ ...expenseForm, keyword: e.target.value })}
                    />
                    <datalist id="concert-keyword-suggestions">
                      {tagNames.map((tag) => (
                        <option key={tag} value={tag} />
                      ))}
                    </datalist>
                  </div>
                  <Button onClick={addExpense} variant="outline" size="sm">
                    + Ausgabe
                  </Button>
                </div>
              </div>

              {/* Group Distribution */}
              <div className="grid gap-2">
                <Label htmlFor="groupId">Verteilung an Gruppe</Label>
                <select
                  id="groupId"
                  value={formData.groupId}
                  onChange={(e) => setFormData({ ...formData, groupId: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">-- Keine Gruppe --</option>
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>

                {formData.groupId && (
                  <div className="flex flex-wrap gap-2 p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground w-full mb-2">Gruppenmitglieder:</p>
                    {getGroupMembers(formData.groupId).map((member) => (
                      <div key={member.musician_id} className="inline-flex items-center gap-2 px-3 py-1 bg-background rounded-full text-sm">
                        <div>{member.musician_name} ({member.percent.toFixed(2)}%)</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="grid gap-2">
                <Label htmlFor="notes">Notizen</Label>
                <Textarea
                  id="notes"
                  placeholder="Zusätzliche Notizen..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="min-h-24"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setOpen(false); resetForm() }}>Abbrechen</Button>
              <Button onClick={saveConcert}>{editingId ? 'Aktualisieren' : 'Erstellen'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Concerts List */}
      <div className="grid grid-cols-1 gap-4">
        {concerts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Noch keine Konzerte angelegt. Klick auf "Konzert hinzufügen" um zu beginnen.
            </CardContent>
          </Card>
        ) : (
          concerts.map((concert) => {
            const expenseTotal = concert.expenses.reduce((sum, e) => sum + e.amount, 0)
            const rest = concert.netto_gage - expenseTotal
            const members = concert.group_id ? getGroupMembers(concert.group_id) : []

            return (
              <Card key={concert.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle>{concert.name}</CardTitle>
                      <CardDescription>
                        {concert.date} • {concert.location}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(concert)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDeleteConcert(concert.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Summary */}
                    <div className="grid grid-cols-3 gap-2 sm:gap-4 p-3 sm:p-4 bg-muted rounded-lg">
                      <div>
                        <p className="text-sm text-muted-foreground">Netto-Gage</p>
                        <p className="text-lg font-medium">{formatCurrency(concert.netto_gage)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Ausgaben</p>
                        <p className="text-lg font-medium text-red-600">{formatCurrency(expenseTotal)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Restbetrag</p>
                        <p className="text-lg font-medium text-green-600">{formatCurrency(rest)}</p>
                      </div>
                    </div>

                    {/* Expenses List */}
                    {concert.expenses.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">Ausgaben</h4>
                        <div className="space-y-1">
                          {concert.expenses.map((e) => (
                            <div key={e.id} className="flex justify-between text-sm">
                              <span>{e.description} {e.keyword ? `(${e.keyword})` : ''}</span>
                              <span className="text-red-600">{formatCurrency(e.amount)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Group Distribution */}
                    {concert.group_id && members.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">Verteilung: {concert.group_name || concert.group_id}</h4>
                        <div className="flex flex-wrap gap-2">
                          {members.map((member) => (
                            <div key={member.musician_id} className="inline-flex items-center gap-2 px-3 py-1 bg-muted rounded-full text-sm">
                              <Users className="w-4 h-4 text-muted-foreground" />
                              <div>{member.musician_name} ({member.percent.toFixed(2)}%)</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    {concert.notes && (
                      <div>
                        <h4 className="font-medium mb-2">Notizen</h4>
                        <p className="text-sm text-muted-foreground">{concert.notes}</p>
                      </div>
                    )}
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

export default Concerts