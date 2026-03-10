import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { Plus, Edit2, Trash2, Download, X } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import {
  fetchGuestLists,
  fetchGuestList,
  createGuestList,
  updateGuestList,
  deleteGuestList,
  addGuestListEntry,
  deleteGuestListEntry,
  fetchSettings,
} from '@/lib/api-client'
import { useAuth } from '@/contexts/AuthContext'
import { Spinner } from '@/components/ui/spinner'
import type { GuestListWithEntries } from '@/lib/database.types'

function GuestLists() {
  const { isAdmin, isSuperuser } = useAuth()
  const [guestLists, setGuestLists] = useState<GuestListWithEntries[]>([])
  const [loading, setLoading] = useState(true)
  const [openCreateDialog, setOpenCreateDialog] = useState(false)
  const [openEditDialog, setOpenEditDialog] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [maxGuestsDefault, setMaxGuestsDefault] = useState(25)

  const [form, setForm] = useState({
    date: '',
    location: '',
    maxGuests: 25,
  })

  const [addGuestForm, setAddGuestForm] = useState({
    guestName: '',
    guestCount: 1,
    expandedCount: false,
  })

  const [editingListId, setEditingListId] = useState<string | null>(null)

  const loadData = async () => {
    try {
      const lists = await fetchGuestLists()
      setGuestLists(lists)

      // Load max guests setting
      const settings = await fetchSettings()
      const maxGuests = parseInt(settings.max_guests_per_list || '25', 10)
      setMaxGuestsDefault(maxGuests)
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
      date: '',
      location: '',
      maxGuests: maxGuestsDefault,
    })
    setAddGuestForm({
      guestName: '',
      guestCount: 1,
      expandedCount: false,
    })
    setEditingId(null)
    setEditingListId(null)
  }

  const openAdd = () => {
    resetForm()
    setOpenCreateDialog(true)
  }

  const openEdit = (list: GuestListWithEntries) => {
    setEditingId(list.id)
    setEditingListId(list.id)
    setForm({
      date: list.date,
      location: list.location,
      maxGuests: list.max_guests,
    })
    setOpenEditDialog(true)
  }

  const saveGuestList = async () => {
    if (!form.date || !form.location) return

    try {
      if (editingId) {
        await updateGuestList(editingId, {
          date: form.date,
          location: form.location,
          max_guests: form.maxGuests,
        })
      } else {
        await createGuestList({
          date: form.date,
          location: form.location,
          max_guests: form.maxGuests,
        })
      }
      setOpenCreateDialog(false)
      setOpenEditDialog(false)
      resetForm()
      await loadData()
    } catch (err) {
      console.error('Fehler beim Speichern:', err)
      alert('Gästeliste konnte nicht gespeichert werden.')
    }
  }

  const handleDeleteGuestList = async (id: string) => {
    if (!confirm('Gästeliste wirklich löschen?')) return
    try {
      await deleteGuestList(id)
      setGuestLists((prev) => prev.filter((l) => l.id !== id))
    } catch (err) {
      console.error('Fehler beim Löschen:', err)
      alert('Gästeliste konnte nicht gelöscht werden.')
    }
  }

  const addGuest = async () => {
    if (!addGuestForm.guestName || !editingListId) return

    try {
      const newEntry = await addGuestListEntry(editingListId, {
        guest_name: addGuestForm.guestName,
        guest_count: addGuestForm.guestCount,
      })

      setGuestLists((prev) =>
        prev.map((list) =>
          list.id === editingListId
            ? {
                ...list,
                entries: [...list.entries, newEntry],
                total_guests: list.total_guests + addGuestForm.guestCount,
              }
            : list
        )
      )

      setAddGuestForm({
        guestName: '',
        guestCount: 1,
        expandedCount: false,
      })
    } catch (err) {
      console.error('Fehler beim Hinzufügen des Gastes:', err)
      alert('Gast konnte nicht hinzugefügt werden.')
    }
  }

  const removeGuest = async (entryId: string) => {
    try {
      await deleteGuestListEntry(entryId)

      setGuestLists((prev) =>
        prev.map((list) =>
          list.id === editingListId
            ? {
                ...list,
                entries: list.entries.filter((e) => e.id !== entryId),
                total_guests: list.total_guests - (list.entries.find((e) => e.id === entryId)?.guest_count || 0),
              }
            : list
        )
      )
    } catch (err) {
      console.error('Fehler beim Löschen des Gastes:', err)
      alert('Gast konnte nicht gelöscht werden.')
    }
  }

  const exportPDF = async (listId: string) => {
    try {
      const list = await fetchGuestList(listId)
      await generateGuestListPDF(list)
    } catch (err) {
      console.error('Fehler beim PDF-Export:', err)
      alert('PDF-Export fehlgeschlagen.')
    }
  }

  if (loading) {
    return <Spinner text="Gästelisten werden geladen..." />
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Gästelisten</h1>
          <p className="text-muted-foreground mt-1 sm:mt-2 text-sm sm:text-base">Verwalte deine Gästelisten für Events</p>
        </div>
        <Dialog open={openCreateDialog} onOpenChange={(v: boolean) => { if (!v) resetForm(); setOpenCreateDialog(v) }}>
          <DialogTrigger asChild>
            <Button onClick={openAdd} className="btn-amber">
              <Plus className="w-4 h-4 mr-2" />
              Gästeliste hinzufügen
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[640px]" style={{ backgroundColor: '#18181b', boxShadow: '0 8px 32px 0 rgba(0,0,0,0.37)' }}>
            <DialogHeader>
              <DialogTitle>{editingId ? 'Gästeliste bearbeiten' : 'Neue Gästeliste'}</DialogTitle>
              <DialogDescription>Erstelle eine neue Gästeliste für dein Event</DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4 px-1">
              <div className="grid gap-2">
                <Label>Datum</Label>
                <DatePicker value={form.date} onChange={(v) => setForm((s) => ({ ...s, date: v }))} />
              </div>

              <div className="grid gap-2">
                <Label>Veranstaltungsort</Label>
                <Input value={form.location} onChange={(e) => setForm((s) => ({ ...s, location: e.target.value }))} placeholder="z.B. Konzertsaal" />
              </div>

              <div className="grid gap-2">
                <Label>Maximale Anzahl Gäste</Label>
                <Input
                  type="number"
                  min="1"
                  value={form.maxGuests}
                  onChange={(e) => setForm((s) => ({ ...s, maxGuests: parseInt(e.target.value, 10) || 25 }))}
                  variant="amber"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => { setOpenCreateDialog(false); resetForm() }} className="border-red-500 text-red-600 hover:bg-red-50 hover:border-red-600">Abbrechen</Button>
              {editingId ? (
                <Button onClick={saveGuestList} variant="outline" className="border-amber-400 text-amber-600 hover:bg-amber-50 hover:border-amber-500">Aktualisieren</Button>
              ) : (
                <Button onClick={saveGuestList} variant="outline" className="border-green-500 text-green-600 hover:bg-green-50 hover:border-green-600">Erstellen</Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {guestLists.length === 0 ? (
          <Card className="bg-muted/40" style={{ backgroundColor: '#18181b', boxShadow: '0 8px 32px 0 rgba(0,0,0,0.37)' }}>
            <CardContent className="py-12 text-center text-muted-foreground">Noch keine Gästelisten. Lege eine neue an.</CardContent>
          </Card>
        ) : (
          guestLists.map((list) => (
            <Card key={list.id} className="bg-muted/40" style={{ backgroundColor: '#18181b', boxShadow: '0 8px 32px 0 rgba(0,0,0,0.37)' }}>
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <p className="font-semibold text-sm sm:text-base truncate">{list.location}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(new Date(list.date))} • Gäste: {list.total_guests}/{list.max_guests} • Von: {list.created_by_name}
                    </p>
                  </div>

                  <div className="flex gap-0.5 shrink-0">
                    <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => exportPDF(list.id)} title="PDF herunterladen">
                      <Download className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="editicon" size="icon" className="h-7 w-7" onClick={() => openEdit(list)}>
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    {(isAdmin || isSuperuser) && (
                      <Button variant="deleteicon" size="icon" className="h-7 w-7" onClick={() => handleDeleteGuestList(list.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Guest List Entries */}
                {list.entries.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border/50 space-y-1">
                    {list.entries.map((entry) => (
                      <div key={entry.id} className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{entry.guest_name}</span>
                        <span>{entry.guest_count} Person{entry.guest_count !== 1 ? 'en' : ''}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Edit Dialog mit Gast-Hinzufügen */}
      {editingListId && (
        <Dialog open={openEditDialog} onOpenChange={(v: boolean) => { if (!v) resetForm(); setOpenEditDialog(v) }}>
          <DialogContent className="sm:max-w-[640px]" style={{ backgroundColor: '#18181b', boxShadow: '0 8px 32px 0 rgba(0,0,0,0.37)' }}>
            <DialogHeader>
              <DialogTitle>Gäste hinzufügen</DialogTitle>
              <DialogDescription>Verwalte die Gäste für diese Veranstaltung</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4 px-1">
              {/* Current guest list */}
              <div>
                <Label className="text-sm font-medium">Gästeliste</Label>
                <div className="mt-2 space-y-2 max-h-64 overflow-y-auto">
                  {guestLists
                    .find((l) => l.id === editingListId)
                    ?.entries.map((entry) => (
                      <div key={entry.id} className="flex items-center justify-between p-2 bg-muted rounded-sm border border-border/50">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{entry.guest_name}</p>
                          <p className="text-xs text-muted-foreground">{entry.guest_count} Person{entry.guest_count !== 1 ? 'en' : ''}</p>
                        </div>
                        <Button
                          variant="deleteicon"
                          size="icon"
                          className="h-6 w-6 ml-2"
                          onClick={() => removeGuest(entry.id)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                </div>
              </div>

              {/* Add guest form */}
              <div className="border-t border-border/50 pt-4">
                <Label className="text-sm font-medium">Gast hinzufügen</Label>
                <div className="space-y-2 mt-2">
                  <Input
                    placeholder="Name des Gastes"
                    value={addGuestForm.guestName}
                    onChange={(e) => setAddGuestForm((s) => ({ ...s, guestName: e.target.value }))}
                    variant="amber"
                  />

                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Label className="text-xs text-muted-foreground">Anzahl Personen</Label>
                      <select
                        value={addGuestForm.guestCount}
                        onChange={(e) => {
                          const val = e.target.value
                          if (val === '_expand') {
                            setAddGuestForm((s) => ({ ...s, expandedCount: true }))
                          } else {
                            setAddGuestForm((s) => ({ ...s, guestCount: parseInt(val, 10) }))
                          }
                        }}
                        className="flex h-10 w-full rounded-md border border-amber-600 bg-[#18181b] px-3 py-2 text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:border-amber-600"
                      >
                        {[1, 2, 3, 4, 5, 6].map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                        {addGuestForm.expandedCount && (
                          <>
                            {[7, 8, 9, 10, 15, 20].map((n) => (
                              <option key={n} value={n}>
                                {n}
                              </option>
                            ))}
                          </>
                        )}
                        {!addGuestForm.expandedCount && <option value="_expand">Mehr...</option>}
                      </select>
                    </div>
                    <Button
                      onClick={addGuest}
                      variant="outline"
                      className="self-end border-amber-400 text-amber-600 hover:bg-amber-50 hover:border-amber-500"
                    >
                      Hinzufügen
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                onClick={() => {
                  setOpenEditDialog(false)
                  resetForm()
                }}
                className="border-gray-500 text-gray-600 hover:bg-gray-50"
                variant="outline"
              >
                Fertig
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

// PDF Export Function
async function generateGuestListPDF(list: GuestListWithEntries) {
  const { jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF('p', 'mm', 'a4')
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  let yPosition = 20

  // Logo (if available)
  // Note: Logo fetching would need to be implemented
  const logoSize = 20
  yPosition += logoSize + 5

  // Title (centered)
  doc.setFontSize(14)
  doc.text('Gästeliste', pageWidth / 2, yPosition, { align: 'center' })
  yPosition += 8

  // Date and Location
  doc.setFontSize(11)
  doc.text(`Datum: ${formatDate(new Date(list.date))}`, 20, yPosition)
  yPosition += 6

  doc.text(`Ort: ${list.location}`, 20, yPosition)
  yPosition += 10

  // Table with guests
  const tableData = list.entries.map((entry) => [entry.guest_name, entry.guest_count.toString()])

  autoTable(doc, {
    head: [['Name', 'Anzahl']],
    body: tableData,
    startY: yPosition,
    theme: 'grid',
    styles: {
      fontSize: 10,
    },
    columnStyles: {
      0: { cellWidth: 100 },
      1: { cellWidth: 30, halign: 'center' },
    },
  })

  // Footer
  const footerY = pageHeight - 10
  doc.setFontSize(8)
  doc.text(`Gesamt: ${list.total_guests} Gäste`, 20, footerY)

  doc.save(`Gaestliste_${list.location}_${list.date}.pdf`)
}

export default GuestLists
