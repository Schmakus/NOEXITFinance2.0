import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Spinner } from '@/components/ui/spinner'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  fetchPayoutRequests,
  fetchPayoutBookings,
  approvePayoutRequest,
  rejectPayoutRequest,
  updatePayoutRequestAdmin,
  deletePayoutRequest,
} from '@/lib/api-client'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import type { PayoutRequestWithMusician, BookingWithDetails } from '@/lib/database.types'
import {
  Clock,
  CheckCircle2,
  XCircle,
  X,
  HandCoins,
  Pencil,
  Trash2,
} from 'lucide-react'


// Typ-Erweiterung für Status


function PayoutRequests() {
  const { user } = useAuth()
  // Debug: Expose supabase client to window for DevTools
  if (typeof window !== 'undefined') {
    (window as any).supabase = supabase;
  }
  const [requests, setRequests] = useState<PayoutRequestWithMusician[]>([])
  const [, setPayoutBookings] = useState<BookingWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'pending' | 'all'>('pending')

  // Action states
  const [actionId, setActionId] = useState<string | null>(null)
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'edit' | null>(null)
  const [adminNote, setAdminNote] = useState('')
  const [editAmount, setEditAmount] = useState('')
  const [editNote, setEditNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const loadData = async () => {
    try {
      const [data, bookings] = await Promise.all([
        fetchPayoutRequests(),
        fetchPayoutBookings(),
      ])
      setRequests(data)
      setPayoutBookings(bookings)
    } catch (err) {
      console.error('Auszahlungen laden fehlgeschlagen:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const pendingRequests = requests.filter((r) => r.status === 'pending')
  const pendingCount = pendingRequests.length

  // Combined & sorted list for "Alle" tab

  const openAction = (id: string, type: 'approve' | 'reject' | 'edit') => {
    const req = requests.find((r) => r.id === id)
    setActionId(id)
    setActionType(type)
    setAdminNote('')
    setEditAmount(req ? String(req.amount) : '')
    setEditNote(req?.note ?? '')
    setError('')
  }

  const closeAction = () => {
    setActionId(null)
    setActionType(null)
    setAdminNote('')
    setError('')
  }

  const handleApprove = async () => {
    if (!actionId || !user) return
    setSubmitting(true)
    setError('')
    try {
      await approvePayoutRequest(actionId, user.id, adminNote)
      closeAction()
      await loadData()
    } catch (err) {
      setError('Genehmigung fehlgeschlagen: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setSubmitting(false)
    }
  }

  const handleReject = async () => {
    if (!actionId || !user) return
    setSubmitting(true)
    setError('')
    try {
      await rejectPayoutRequest(actionId, user.id, adminNote)
      closeAction()
      await loadData()
    } catch (err) {
      setError('Ablehnung fehlgeschlagen: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = async () => {
    if (!actionId) return
    const amount = parseFloat(editAmount.replace(',', '.'))
    if (isNaN(amount) || amount <= 0) {
      setError('Bitte einen gültigen Betrag eingeben')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const oldRequest = requests.find((r) => r.id === actionId)
      await updatePayoutRequestAdmin(actionId, {
        amount,
        note: editNote || undefined,
      })
      // Logging-Aufruf
      if (user && oldRequest) {
        const changes = []
        if (amount !== oldRequest.amount) {
          changes.push(`Betrag von ${formatCurrency(oldRequest.amount)} auf ${formatCurrency(amount)}`)
        }
        if ((editNote || '') !== (oldRequest.note || '')) {
          changes.push(`Notiz geändert`)
        }
        const desc = `Auszahlung (Antrag): ${oldRequest.note || 'Keine Notiz'}, an ${oldRequest.musician_name}, ${changes.length ? changes.join(', ') : 'keine Änderung'}`
        await supabase.from('logs').insert({
          type: 'payout_request',
          action: 'edit',
          label: actionId,
          description: desc,
          user_id: user.id,
          user_name: user.name,
        })
      }
      closeAction()
      await loadData()
    } catch (err) {
      setError('Bearbeitung fehlgeschlagen: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Antrag wirklich löschen?')) return
    try {
      const oldRequest = requests.find((r) => r.id === id)
      await deletePayoutRequest(id)
      // Logging-Aufruf
      if (user && oldRequest) {
        const desc = `Auszahlung (Antrag): ${oldRequest.note || 'Keine Notiz'}, an ${oldRequest.musician_name}, Betrag ${formatCurrency(oldRequest.amount)} gelöscht`
        await supabase.from('logs').insert({
          type: 'payout_request',
          action: 'delete',
          label: id,
          description: desc,
          user_id: user.id,
          user_name: user.name,
        })
      }
      await loadData() // Nach dem Löschen Daten neu laden
    } catch (err) {
      setError('Löschen fehlgeschlagen: ' + (err instanceof Error ? err.message : String(err)))
    }
  }

  const activeRequest = actionId ? requests.find((r) => r.id === actionId) : null

  if (loading) {
    return <Spinner text="Auszahlungen werden geladen..." />
  }

  // Render a request card
  const renderRequestCard = (r: PayoutRequestWithMusician) => {
    const statusIcon =
      r.status === 'pending' ? <Clock className="w-5 h-5" /> :
      r.status === 'approved' ? <CheckCircle2 className="w-5 h-5" /> :
      r.status === 'deleted' ? <X className="w-5 h-5 text-red-400" /> :
      <XCircle className="w-5 h-5" />
    const statusColor =
      r.status === 'pending' ? 'bg-amber-500/20 text-amber-300' :
      r.status === 'approved' ? 'bg-green-500/20 text-green-300' :
      r.status === 'deleted' ? 'bg-red-500/20 text-red-400' :
      'bg-red-500/20 text-red-300'
    const statusLabel =
      r.status === 'pending' ? 'Ausstehend' :
      r.status === 'approved' ? 'Genehmigt' :
      r.status === 'deleted' ? 'Gelöscht' :
      'Abgelehnt'

    return (
      <Card key={r.id} className="bg-muted/40" style={{ backgroundColor: '#18181b', boxShadow: '0 8px 32px 0 rgba(0,0,0,0.37)' }}>
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${statusColor}`}>
                {statusIcon}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold">{r.musician_name}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${
                    r.status === 'pending' ? 'border-amber-400/60 text-amber-300' :
                    r.status === 'approved' ? 'border-green-400/60 text-green-300' :
                    r.status === 'deleted' ? 'border-red-400/80 text-red-400' :
                    'border-red-400/60 text-red-300'
                  }`}>
                    {statusLabel}
                  </span>
                  {tab === 'all' && (
                    <span className="text-xs px-2 py-0.5 rounded-full border border-zinc-500/60 text-zinc-400">
                      Antrag
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {r.created_at ? formatDate(new Date(r.created_at)) : '-'}
                  {r.note ? ` • ${r.note}` : ''}
                </p>
                {r.admin_note && (
                  <p className="text-xs text-muted-foreground mt-1">Admin: {r.admin_note}</p>
                )}
                {r.reviewed_by_name && r.reviewed_at && (
                  <p className="text-xs text-muted-foreground">
                    Bearbeitet von {r.reviewed_by_name} am {formatDate(new Date(r.reviewed_at))}
                  </p>
                )}
                {r.pdf_url && (
                  null
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              <p className="text-lg font-semibold text-amber-400">
                {formatCurrency(r.amount)}
              </p>
              {r.status === 'pending' && (
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                    title="Bearbeiten"
                    onClick={() => openAction(r.id, 'edit')}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-green-400 hover:text-green-300"
                    title="Genehmigen"
                    onClick={() => openAction(r.id, 'approve')}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-red-400 hover:text-red-300"
                    title="Ablehnen"
                    onClick={() => openAction(r.id, 'reject')}
                  >
                    <XCircle className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-red-400 hover:text-red-300"
                    title="Löschen"
                    onClick={() => handleDelete(r.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Render a booking card

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Auszahlungen</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {pendingCount > 0
            ? `${pendingCount} ${pendingCount === 1 ? 'offener Antrag' : 'offene Anträge'}`
            : 'Keine offenen Anträge'}
        </p>
      </div>

      {/* Tab Filter */}
      <div className="flex gap-2">
        <Button
          variant={tab === 'pending' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTab('pending')}
          className={tab === 'pending' ? 'btn-amber' : ''}
        >
          Offen{pendingCount > 0 && ` (${pendingCount})`}
        </Button>
        <Button
          variant={tab === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTab('all')}
          className={tab === 'all' ? 'btn-amber' : ''}
        >
          Alle ({requests.length})
        </Button>
      </div>

      {/* Pending tab – only open requests */}
      {tab === 'pending' && (
        pendingRequests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <HandCoins className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Keine offenen Anträge</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingRequests.map(renderRequestCard)}
          </div>
        )
      )}

      {/* All tab – requests + bookings combined, sorted by date */}
      {tab === 'all' && (
        requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <HandCoins className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Keine Auszahlungen vorhanden</p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map(renderRequestCard)}
          </div>
        )
      )}

      {/* Approve / Reject / Edit Dialog */}
      <Dialog open={!!actionId} onOpenChange={(open) => { if (!open) closeAction() }}>
        <DialogContent aria-describedby="payout-request-dialog-desc" style={{ backgroundColor: '#18181b', boxShadow: '0 8px 32px 0 rgba(0,0,0,0.37)' }}>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' && 'Auszahlung genehmigen'}
              {actionType === 'reject' && 'Auszahlung ablehnen'}
              {actionType === 'edit' && 'Antrag bearbeiten'}
            </DialogTitle>
          </DialogHeader>
          <DialogDescription id="payout-request-dialog-desc">
            {actionType === 'approve' && 'Bitte überprüfe die Angaben und bestätige die Auszahlung.'}
            {actionType === 'reject' && 'Bitte gib einen Grund für die Ablehnung an.'}
            {actionType === 'edit' && 'Bearbeite die Angaben zum Auszahlungsantrag.'}
          </DialogDescription>
          <div className="space-y-4 px-1">
            {activeRequest && (
              <div className="text-sm space-y-1">
                <p><span className="text-muted-foreground">Musiker:</span> {activeRequest.musician_name}</p>
                <p><span className="text-muted-foreground">Betrag:</span> {formatCurrency(activeRequest.amount)}</p>
                {activeRequest.note && (
                  <p><span className="text-muted-foreground">Notiz:</span> {activeRequest.note}</p>
                )}
              </div>
            )}

            {actionType === 'edit' ? (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="edit-amount">Betrag (€)</Label>
                  <Input
                    id="edit-amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-note">Notiz</Label>
                  <Textarea
                    id="edit-note"
                    value={editNote}
                    onChange={(e) => setEditNote(e.target.value)}
                    rows={2}
                  />
                </div>
              </>
            ) : (
              <div className="grid gap-2">
                <Label htmlFor="admin-note">Admin-Notiz (optional)</Label>
                <Textarea
                  id="admin-note"
                  placeholder={actionType === 'reject' ? 'Grund der Ablehnung...' : 'Optionale Notiz...'}
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  rows={2}
                />
              </div>
            )}

            {error && <p className="text-sm text-red-400">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeAction} disabled={submitting}>
              Abbrechen
            </Button>
            {actionType === 'approve' && (
              <Button onClick={handleApprove} disabled={submitting} className="bg-green-600 hover:bg-green-700">
                {submitting ? 'Wird genehmigt...' : 'Genehmigen'}
              </Button>
            )}
            {actionType === 'reject' && (
              <Button onClick={handleReject} disabled={submitting} variant="destructive">
                {submitting ? 'Wird abgelehnt...' : 'Ablehnen'}
              </Button>
            )}
            {actionType === 'edit' && (
              <Button onClick={handleEdit} disabled={submitting}>
                {submitting ? 'Wird gespeichert...' : 'Speichern'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default PayoutRequests
