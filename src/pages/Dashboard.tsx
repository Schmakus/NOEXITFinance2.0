import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Wallet, Clock, CheckCircle2, XCircle, Pencil, Trash2, HandCoins } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Spinner } from '@/components/ui/spinner'
import {
  fetchMusicians,
  fetchTransactionsWithMusician,
  fetchPayoutRequests,
  approvePayoutRequest,
  rejectPayoutRequest,
  updatePayoutRequestAdmin,
  deletePayoutRequest,
} from '@/lib/api-client'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import type { DbMusician, TransactionWithMusician, PayoutRequestWithMusician } from '@/lib/database.types'

interface MusicianWithBalance {
  id: string
  name: string
  balance: number
}

function Dashboard() {
  const navigate = useNavigate()
  const { user, isUser, isAdmin } = useAuth()
  const [musicians, setMusicians] = useState<DbMusician[]>([])
  const [transactions, setTransactions] = useState<TransactionWithMusician[]>([])
  const [loading, setLoading] = useState(true)

  // Payout requests (admin)
  const [payoutRequests, setPayoutRequests] = useState<PayoutRequestWithMusician[]>([])
  const [actionId, setActionId] = useState<string | null>(null)
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'edit' | null>(null)
  const [adminNote, setAdminNote] = useState('')
  const [editAmount, setEditAmount] = useState('')
  const [editNote, setEditNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [actionError, setActionError] = useState('')

  // User role: redirect to own statement
  useEffect(() => {
    if (isUser && user) {
      navigate(`/statement/${user.id}`, { replace: true })
    }
  }, [isUser, user, navigate])

  useEffect(() => {
    const loadData = async () => {
      try {
        const [m, t] = await Promise.all([fetchMusicians(), fetchTransactionsWithMusician()])
        setMusicians(m)
        setTransactions(t)
        if (!isUser) {
          const pr = await fetchPayoutRequests()
          setPayoutRequests(pr)
        }
      } catch (err) {
        console.error('Dashboard laden fehlgeschlagen:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [isUser])

  // Calculate balances: initial balance + sum of transactions
  const musiciansWithBalance: MusicianWithBalance[] = musicians.map((m) => {
    const musicianTxns = transactions.filter((t) => t.musician_id === m.id)
    const txnTotal = musicianTxns.reduce((sum, t) => sum + t.amount, 0)
    return {
      id: m.id,
      name: m.name,
      balance: m.balance + txnTotal,
    }
  })

  const totalBalance = musiciansWithBalance.reduce((sum, m) => sum + m.balance, 0)

  // Payout request actions
  const pendingRequests = payoutRequests.filter((r) => r.status === 'pending')

  const reloadPayoutRequests = async () => {
    try {
      const pr = await fetchPayoutRequests()
      setPayoutRequests(pr)
    } catch { /* ignore */ }
  }

  const openAction = (id: string, type: 'approve' | 'reject' | 'edit') => {
    const req = payoutRequests.find((r) => r.id === id)
    setActionId(id)
    setActionType(type)
    setAdminNote('')
    setEditAmount(req ? String(req.amount) : '')
    setEditNote(req?.note ?? '')
    setActionError('')
  }

  const closeAction = () => {
    setActionId(null)
    setActionType(null)
    setAdminNote('')
    setActionError('')
  }

  const handleApprove = async () => {
    if (!actionId || !user) return
    setSubmitting(true)
    setActionError('')
    try {
      await approvePayoutRequest(actionId, user.id, adminNote)
      closeAction()
      await reloadPayoutRequests()
    } catch (err) {
      setActionError('Genehmigung fehlgeschlagen: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setSubmitting(false)
    }
  }

  const handleReject = async () => {
    if (!actionId || !user) return
    setSubmitting(true)
    setActionError('')
    try {
      await rejectPayoutRequest(actionId, user.id, adminNote)
      closeAction()
      await reloadPayoutRequests()
    } catch (err) {
      setActionError('Ablehnung fehlgeschlagen: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = async () => {
    if (!actionId) return
    const amount = parseFloat(editAmount.replace(',', '.'))
    if (isNaN(amount) || amount <= 0) {
      setActionError('Bitte einen gültigen Betrag eingeben')
      return
    }
    setSubmitting(true)
    setActionError('')
    try {
      await updatePayoutRequestAdmin(actionId, { amount, note: editNote || undefined })
      closeAction()
      await reloadPayoutRequests()
    } catch (err) {
      setActionError('Bearbeitung fehlgeschlagen: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Antrag wirklich löschen?')) return
    try {
      await deletePayoutRequest(id)
      setPayoutRequests((prev) => prev.filter((r) => r.id !== id))
    } catch { /* ignore */ }
  }

  const activeRequest = actionId ? payoutRequests.find((r) => r.id === actionId) : null

  if (loading) {
    return <Spinner text="Dashboard wird geladen..." />
  }

  return (
    <div className="space-y-8">
      <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1 sm:mt-2 text-sm sm:text-base">Übersicht deiner Bandmitglieder</p>
      </div>

      {/* Pending Payout Requests — Admin only */}
      {isAdmin && pendingRequests.length > 0 && (
        <Card className="border-amber-500/50 bg-gradient-to-br from-amber-500/10 via-transparent to-amber-600/10" style={{ backgroundColor: '#18181b', boxShadow: '0 8px 32px 0 rgba(0,0,0,0.37)' }}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <HandCoins className="w-5 h-5 text-amber-400" />
              Offene Auszahlungsanträge
              <span className="ml-auto text-sm font-normal text-amber-400">
                {pendingRequests.length} {pendingRequests.length === 1 ? 'Antrag' : 'Anträge'}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingRequests.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/40">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-amber-500/20 text-amber-300">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold">{r.musician_name}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {r.created_at ? formatDate(new Date(r.created_at)) : '-'}
                      {r.note ? ` • ${r.note}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <p className="text-lg font-semibold text-amber-400">{formatCurrency(r.amount)}</p>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" title="Bearbeiten" onClick={() => openAction(r.id, 'edit')}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-green-400 hover:text-green-300" title="Genehmigen" onClick={() => openAction(r.id, 'approve')}>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-300" title="Ablehnen" onClick={() => openAction(r.id, 'reject')}>
                      <XCircle className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-400" title="Löschen" onClick={() => handleDelete(r.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Total Balance Card */}
      <Card className="bg-gradient-to-br from-amber-500/20 via-transparent to-amber-600/20 border-amber-300 dark:border-amber-700" style={{ backgroundColor: '#18181b', boxShadow: '0 8px 32px 0 rgba(0,0,0,0.37)' }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-amber-500" />
            Gesamtkontostand Band
          </CardTitle>
          <CardDescription>Kombinierter Kontostand aller Mitglieder</CardDescription>
        </CardHeader>
        <CardContent>
          <p className={`text-4xl font-bold ${totalBalance >= 0 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>
            {formatCurrency(totalBalance)}
          </p>
        </CardContent>
      </Card>

      {/* Musicians Grid */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Bandmitglieder</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {musiciansWithBalance.map((musician) => (
            <Card
              key={musician.id}
              className="cursor-pointer hover:shadow-lg transition-all hover:border-amber-400/50 dark:hover:border-amber-500/50"
              onClick={() => navigate(`/statement/${musician.id}`)}
            >
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-1">Musiker</p>
                  <h3 className="text-lg font-semibold mb-3">{musician.name}</h3>
                  <p className={`text-3xl font-bold ${musician.balance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {formatCurrency(musician.balance)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">Klick für Kontoauszug</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Payout Action Dialog */}
      <Dialog open={!!actionId} onOpenChange={(open) => { if (!open) closeAction() }}>
        <DialogContent aria-describedby="dashboard-payout-dialog-desc">
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' && 'Auszahlung genehmigen'}
              {actionType === 'reject' && 'Auszahlung ablehnen'}
              {actionType === 'edit' && 'Antrag bearbeiten'}
            </DialogTitle>
          </DialogHeader>
          <DialogDescription id="dashboard-payout-dialog-desc">
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
                  <Label htmlFor="dash-edit-amount">Betrag (€)</Label>
                  <Input
                    id="dash-edit-amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="dash-edit-note">Notiz</Label>
                  <Textarea
                    id="dash-edit-note"
                    value={editNote}
                    onChange={(e) => setEditNote(e.target.value)}
                    rows={2}
                  />
                </div>
              </>
            ) : (
              <div className="grid gap-2">
                <Label htmlFor="dash-admin-note">Admin-Notiz (optional)</Label>
                <Textarea
                  id="dash-admin-note"
                  placeholder={actionType === 'reject' ? 'Grund der Ablehnung...' : 'Optionale Notiz...'}
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  rows={2}
                />
              </div>
            )}

            {actionError && <p className="text-sm text-red-400">{actionError}</p>}
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

export default Dashboard

