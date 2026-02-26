import { useState, useMemo, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { DatePicker } from '@/components/ui/date-picker'
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
import { Plus, Edit2, Trash2, X, Banknote, CircleDollarSign, TrendingDown } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  fetchBookings,
  fetchPayoutRequests,
  createBooking,
  updateBooking,
  deleteBooking as apiDeleteBooking,
  fetchMusicians,
  fetchGroupsWithMembers,
  replaceTransactionsByBooking,
  deleteTransactionsByBooking,
} from '@/lib/api-client'
import { useTags } from '@/contexts/TagsContext'
import { useAuth } from '@/contexts/AuthContext'
import { Spinner } from '@/components/ui/spinner'
import { supabase } from '@/lib/supabase'
import type { DbBooking, DbMusician, GroupWithMembers } from '@/lib/database.types'

type BookingWithDetailsAndPayout = (DbBooking & { group_name?: string, payout_request_id?: string, payout_request_status?: string })

function Bookings() {
  const { user } = useAuth()
  const canManage = user?.role === 'administrator' || user?.role === 'superuser'
  const [bookings, setBookings] = useState<BookingWithDetailsAndPayout[]>([])
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
      const [b, m, g, payoutRequests] = await Promise.all([
        fetchBookings(),
        fetchMusicians(),
        fetchGroupsWithMembers(),
        fetchPayoutRequests(),
      ])
      // Map payout request status by id
      const statusMap: Record<string, string> = {}
      payoutRequests.forEach((pr: any) => {
        statusMap[pr.id] = pr.status
      })
      // Inject status into bookings
      setBookings(
        b.map((booking: any) => {
          if (booking.payout_request_id) {
            const status = statusMap[booking.payout_request_id]
            // If deleted, set amount to 0
            if (booking.type === 'payout' && status === 'deleted') {
              return { ...booking, payout_request_status: status, amount: 0 }
            }
            return { ...booking, payout_request_status: status }
          }
          return booking
        })
      )
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
    if (!canManage) return
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
    if (!canManage) {
      alert('Keine Berechtigung: Nur Admins/Superuser koennen Buchungen verwalten.')
      return
    }
    if (!form.amount || !form.date) return

    const amount = parseFloat(form.amount)
    const bookingData = {
      description: form.description || '-',
      amount,
      type: form.type as 'expense' | 'income' | 'payout',
      date: form.date,
      group_id: form.type !== 'payout' ? (form.groupId || null) : null,
      payout_musician_ids: form.type === 'payout' ? form.payoutMusicians : [],
      keywords: (() => {
        let kws = form.keywords.length ? [...form.keywords] : [];
        if (form.type === 'payout' && !kws.includes('Auszahlung')) kws.push('Auszahlung');
        return kws;
      })(),
      notes: form.notes,
    }

    try {
      let bookingId: string
      let action: 'create' | 'update'
      if (editingId) {
        const updated = await updateBooking(editingId, bookingData)
        bookingId = updated.id
        action = 'update'
      } else {
        const created = await createBooking(bookingData)
        bookingId = created.id
        action = 'create'
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

      // Logging-Aufruf
      if (user) {
        const changes: string[] = [];
        let desc = '';
        if (editingId) {
          const oldBooking = bookings.find((b) => b.id === editingId);
          if (oldBooking) {
            if (bookingData.amount !== oldBooking.amount) {
              changes.push(`Betrag von ${formatCurrency(oldBooking.amount)} auf ${formatCurrency(bookingData.amount)}`);
            }
            if ((bookingData.description || '-') !== (oldBooking.description || '-')) {
              changes.push('Beschreibung geändert');
            }
            if ((bookingData.notes || '') !== (oldBooking.notes || '')) {
              changes.push('Notiz geändert');
            }
            if ((bookingData.group_id || '') !== (oldBooking.group_id || '')) {
              changes.push('Gruppe geändert');
            }
            desc = `${bookingData.type === 'payout' ? 'Auszahlung' : bookingData.type === 'income' ? 'Einnahme' : 'Ausgabe'}: ${bookingData.description || '-'}, Betrag ${formatCurrency(bookingData.amount)}${bookingData.group_id ? ', Gruppe: ' + (groups.find((g) => g.id === bookingData.group_id)?.name || '-') : ''}${bookingData.payout_musician_ids && bookingData.payout_musician_ids.length ? ', an: ' + bookingData.payout_musician_ids.map(id => musicians.find(m => m.id === id)?.name).filter(Boolean).join(', ') : ''}${bookingData.notes ? ', Notiz: ' + bookingData.notes : ''}${changes.length ? ', ' + changes.join(', ') : ', keine Änderung'}`;
          }
        } else {
          desc = `${bookingData.type === 'payout' ? 'Auszahlung' : bookingData.type === 'income' ? 'Einnahme' : 'Ausgabe'}: ${bookingData.description || '-'}, Betrag ${formatCurrency(bookingData.amount)}${bookingData.group_id ? ', Gruppe: ' + (groups.find((g) => g.id === bookingData.group_id)?.name || '-') : ''}${bookingData.payout_musician_ids && bookingData.payout_musician_ids.length ? ', an: ' + bookingData.payout_musician_ids.map(id => musicians.find(m => m.id === id)?.name).filter(Boolean).join(', ') : ''}${bookingData.notes ? ', Notiz: ' + bookingData.notes : ''}, neu erstellt`;
        }
        await supabase.from('logs').insert({
          type: 'booking',
          action,
          label: bookingData.description,
          description: desc,
          user_id: user.id,
          user_name: user.name,
        });
      }

      setOpen(false)
      resetForm()
      await loadData()
    } catch (err) {
      console.error('Buchung speichern fehlgeschlagen:', err)
      const msg = (err as any)?.message || (err as any)?.details || String(err)
      alert(`Buchung konnte nicht gespeichert werden: ${msg}`)
    }
  }

  const handleDeleteBooking = async (id: string) => {
    if (!confirm('Buchung wirklich löschen?')) return
    try {
      const oldBooking = bookings.find((b) => b.id === id);
      // Falls es eine Auszahlung mit payout_request_id ist, setze den Status des zugehörigen payout_requests auf 'deleted'
      if (oldBooking && oldBooking.type === 'payout' && oldBooking.payout_request_id) {
        await supabase.from('payout_requests')
          .update({ status: 'deleted', updated_at: new Date().toISOString() })
          .eq('id', oldBooking.payout_request_id);
      }
      await apiDeleteBooking(id);
      setBookings((prev) => prev.filter((b) => b.id !== id));
      // Logging-Aufruf
      if (user && oldBooking) {
        const desc = `${oldBooking.type === 'payout' ? 'Auszahlung' : oldBooking.type === 'income' ? 'Einnahme' : 'Ausgabe'}: ${oldBooking.description || '-'}, Betrag ${formatCurrency(oldBooking.amount)}${oldBooking.group_id ? ', Gruppe: ' + (groups.find((g) => g.id === oldBooking.group_id)?.name || '-') : ''}${oldBooking.payout_musician_ids && oldBooking.payout_musician_ids.length ? ', an: ' + oldBooking.payout_musician_ids.map(id => musicians.find(m => m.id === id)?.name).filter(Boolean).join(', ') : ''}${oldBooking.notes ? ', Notiz: ' + oldBooking.notes : ''}, gelöscht`;
        await supabase.from('logs').insert({
          type: 'booking',
          action: 'delete',
          label: id,
          description: desc,
          user_id: user.id,
          user_name: user.name,
        });
      }
    } catch (err) {
      console.error('Buchung löschen fehlgeschlagen:', err);
      alert('Buchung konnte nicht gelöscht werden.');
    }
  }

  const descriptionSuggestions = useMemo(() => {
    const set = new Set<string>()
    bookings.forEach((b) => b.description && set.add(b.description))
    return Array.from(set)
  }, [bookings])

  if (loading) {
    return <Spinner text="Buchungen werden geladen..." />
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Buchungen</h1>
          <p className="text-muted-foreground mt-1 sm:mt-2 text-sm sm:text-base">Erfasse einzelne Buchungen (Einnahmen, Ausgaben, Auszahlungen)</p>
        </div>
        {canManage && (
          <Dialog open={open} onOpenChange={(v: boolean) => { if (!v) resetForm(); setOpen(v) }}>
            <DialogTrigger asChild>
              <Button onClick={openAdd} className="btn-amber">
                <Plus className="w-4 h-4 mr-2" />
                Buchung hinzufügen
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[640px]" style={{ backgroundColor: '#18181b', boxShadow: '0 8px 32px 0 rgba(0,0,0,0.37)' }}>
            <DialogHeader>
              <DialogTitle>{editingId ? 'Buchung bearbeiten' : 'Neue Buchung'}</DialogTitle>
              <DialogDescription>Erfasse eine Ausgabe, Einnahme oder Auszahlung</DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4 px-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Typ</Label>
                  <select value={form.type} onChange={(e) => setForm((s) => ({ ...s, type: e.target.value, payoutMusicians: [] }))} className="flex h-10 w-full rounded-md border border-input bg-[#18181b] px-3 py-2 text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:border-amber-500 disabled:cursor-not-allowed disabled:opacity-50">
                    <option value="expense">Ausgabe</option>
                    <option value="income">Einnahme</option>
                    <option value="payout">Auszahlung</option>
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label>Betrag (€)</Label>
                  <Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm((s) => ({ ...s, amount: e.target.value }))} variant="amber" />
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
                  <DatePicker value={form.date} onChange={(v) => setForm((s) => ({ ...s, date: v }))} />
              </div>

              {form.type !== 'payout' && (
                <div className="grid gap-2">
                  <Label>Verteilergruppe</Label>
                  <select value={form.groupId} onChange={(e) => setForm((s) => ({ ...s, groupId: e.target.value }))} className="flex h-10 w-full rounded-md border border-input bg-[#18181b] px-3 py-2 text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:border-amber-500 disabled:cursor-not-allowed disabled:opacity-50">
                    <option value="">-- Keine Gruppe --</option>
                    {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                  {selectedGroupMembers.length > 0 && (
                    <div className="mt-3 p-3 bg-muted rounded-md">
                      <div className="text-sm font-medium mb-2">Gruppenmitglieder:</div>
                      <div className="flex flex-wrap gap-2">
                        {selectedGroupMembers.map((m) => (
                          <span
                            key={m.musician_id}
                            className="keyword text-xs px-2 py-0.5 rounded-full border border-blue-400/60 text-blue-300 bg-blue-500/10 flex items-center gap-1"
                          >
                            {m.musician_name} ({m.percent.toFixed(2)}%)
                          </span>
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
                          <Switch checked={selected} onCheckedChange={handleChange} variant="amber" />
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
                          className={`px-2 py-0.5 rounded-full text-xs font-medium border transition-colors ${
                            isSelected
                              ? 'border-blue-400/60 text-blue-300 bg-blue-500/10'
                              : 'border-border text-foreground bg-muted hover:bg-muted/80'
                          }`}
                          style={{ minWidth: '2.5rem' }}
                        >
                          {k}
                        </button>
                      )
                    })}
                  </div>
                  <div className="flex gap-2">
                    <Input placeholder="Neues Stichwort" value={form.keyword} onChange={(e) => setForm((s) => ({ ...s, keyword: e.target.value }))} variant="amber" />
                    <Button variant="outline" onClick={() => addKeyword(form.keyword)}>Hinzufügen</Button>
                  </div>
                  {form.keywords.length > 0 && (
                    <div className="pt-2 border-t border-border">
                      <div className="text-xs text-muted-foreground mb-2">Ausgewählte Stichworte:</div>
                      <div className="flex gap-2 flex-wrap">
                        {form.keywords.map((k) => (
                          <span key={k} className="keyword text-xs px-2 py-0.5 rounded-full border border-blue-400/60 text-blue-300 bg-blue-500/10 flex items-center gap-1">
                            {k}
                            <button onClick={() => setForm((s) => ({ ...s, keywords: s.keywords.filter((x) => x !== k) }))} className="hover:opacity-80 ml-1">
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Notizen</Label>
                <Textarea value={form.notes} onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))} variant="amber" />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => { setOpen(false); resetForm() }} className="border-red-500 text-red-600 hover:bg-red-50 hover:border-red-600">Abbrechen</Button>
              {editingId ? (
                <Button onClick={saveBooking} variant="outline" className="border-amber-400 text-amber-600 hover:bg-amber-50 hover:border-amber-500">Aktualisieren</Button>
              ) : (
                <Button onClick={saveBooking} variant="outline" className="border-green-500 text-green-600 hover:bg-green-50 hover:border-green-600">Erstellen</Button>
              )}
            </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="space-y-3">
        {bookings.length === 0 ? (
          <Card className="bg-muted/40" style={{ backgroundColor: '#18181b', boxShadow: '0 8px 32px 0 rgba(0,0,0,0.37)' }}>
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


            const isPayout = b.type === 'payout'
            const isIncome = b.type === 'income'

            // Detect deleted payout (if payout_request_status is available)
            const payoutRequestStatus = b.payout_request_status
            const isDeletedPayout = isPayout && payoutRequestStatus === 'deleted'

            const iconWrapClass = isDeletedPayout
              ? 'bg-red-500/20 text-red-400'
              : isPayout
                ? 'bg-amber-500/20 text-amber-300'
                : isIncome
                  ? 'bg-green-500/20 text-green-300'
                  : 'bg-red-500/20 text-red-300'

            const icon = isDeletedPayout
              ? <Banknote className="w-5 h-5" />
              : isPayout
                ? <Banknote className="w-5 h-5" />
                : isIncome
                  ? <CircleDollarSign className="w-5 h-5" />
                  : <TrendingDown className="w-5 h-5" />



            const hasDetails = (isPayout && payoutNames.length > 0)
              || (!isPayout && groupMembers.length > 0)
              || !!b.notes

            return (
              <Card key={b.id} className="bg-muted/40" style={{ backgroundColor: '#18181b', boxShadow: '0 8px 32px 0 rgba(0,0,0,0.37)' }}>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${iconWrapClass}`}>
                        {icon}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold truncate text-sm sm:text-base">{b.description || '-'}</p>
                          {Array.isArray(b.keywords) && b.keywords.length > 0 && (
                            <span className="flex flex-wrap gap-1 ml-2">
                              {b.keywords.map((kw: string) => (
                                <span key={kw} className="keyword text-xs px-2 py-0.5 rounded-full border border-blue-400/60 text-blue-300 bg-blue-500/10">{kw}</span>
                              ))}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {b.date ? formatDate(new Date(b.date)) : '-'}
                          {b.group_name ? ` • ${b.group_name}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <p className={`text-sm sm:text-base font-semibold whitespace-nowrap ${
                        isIncome ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {isIncome ? '+' : '-'}{formatCurrency(b.amount)}
                      </p>
                      {canManage && (
                        <div className="flex gap-0.5">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(b)}>
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-300" onClick={() => handleDeleteBooking(b.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  {hasDetails && (
                    <div className="mt-2 pt-2 border-t border-border/50 ml-[52px] space-y-1">
                      {isPayout && payoutNames.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium">An:</span> {payoutNames.join(', ')}
                        </p>
                      )}
                      {!isPayout && groupMembers.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {groupMembers.map((m) => `${m.musician_name} (${m.percent}%)`).join(', ')}
                        </p>
                      )}
                      {b.notes && <p className="text-xs text-muted-foreground italic">{b.notes}</p>}
                    </div>
                  )}
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
