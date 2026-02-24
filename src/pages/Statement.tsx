import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { DatePicker } from '@/components/ui/date-picker'
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
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  fetchMusicianById,
  fetchTransactionsWithMusician,
  fetchMyPayoutRequests,
  fetchPayoutRequests,
  createPayoutRequest,
  updatePayoutRequestAdmin,
  deletePayoutRequest,
  updatePayoutRequestUser,
  deletePayoutRequestUser,
  fetchConcerts
} from '@/lib/api-client'
import { useAuth } from '@/contexts/AuthContext'
import { Spinner } from '@/components/ui/spinner'
import type { DbMusician, DbPayoutRequest, TransactionWithMusician, ConcertWithExpenses, PayoutRequestWithMusician } from '@/lib/database.types'
import {
  ArrowLeft,
  Banknote,
  FileDown,
  TrendingDown,
  UserRound,
  CircleDollarSign,
  HandCoins,
  LogOut,
  Settings,
  Save,
  Mail,
  Lock,
  Pencil,
  Trash2,
} from 'lucide-react'
import { exportStatementPdf } from '@/lib/pdf-export'
import type { PdfExportEntry } from '@/lib/pdf-export'
import { useSettings } from '@/contexts/SettingsContext'
import { invertImageDataUrl } from '@/lib/invert-image'

const isPayout = (t: TransactionWithMusician) =>
  t.booking_type === 'payout' ||
  (t.description ?? '').toLowerCase().includes('auszahlung') ||
  (t.concert_name ?? '').toLowerCase().includes('auszahlung')

const isGage = (t: TransactionWithMusician) =>
  (t.description ?? '').toLowerCase().includes('gage') ||
  (t.concert_name ?? '').toLowerCase().includes('gage')

const toDateInput = (date: Date) => date.toISOString().slice(0, 10)

function Statement() {
  const { musicianId } = useParams()
  const navigate = useNavigate()
  const { user, isUser, isSuperuser, logout, updateEmail, updatePassword } = useAuth()
  const canRequestPayout = (isUser || isSuperuser) && !!user && musicianId === user.id
  const [musician, setMusician] = useState<DbMusician | null>(null)
  const [transactions, setTransactions] = useState<TransactionWithMusician[]>([])
  const [concerts, setConcerts] = useState<ConcertWithExpenses[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const contentRef = useRef<HTMLDivElement | null>(null)

  // Payout request state
  const [payoutRequests, setPayoutRequests] = useState<PayoutRequestWithMusician[]>([])
  const [showPayoutDialog, setShowPayoutDialog] = useState(false)
  const [payoutAmount, setPayoutAmount] = useState('')
  const [payoutNote, setPayoutNote] = useState('')
  // PDF-Upload temporär deaktiviert
  const [payoutSubmitting, setPayoutSubmitting] = useState(false)
  const [payoutError, setPayoutError] = useState('')

  // Edit payout request state
  const [editRequestId, setEditRequestId] = useState<string | null>(null)
  const [editRequestAmount, setEditRequestAmount] = useState('')
  const [editRequestNote, setEditRequestNote] = useState('')
  const [editRequestSubmitting, setEditRequestSubmitting] = useState(false)
  const [editRequestError, setEditRequestError] = useState('')

  // Account dialog state (User only)
  const [showAccountDialog, setShowAccountDialog] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [accountSaving, setAccountSaving] = useState(false)
  const [accountMessage, setAccountMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  // Users can only view their own statement
  useEffect(() => {
    if (isUser && user && musicianId && musicianId !== user.id) {
      navigate(`/statement/${user.id}`, { replace: true })
    }
  }, [isUser, user, musicianId, navigate])

  // Bis-Datum: größtes Transaktionsdatum, sonst heute
  const maxTransactionDate = useMemo(() => {
    if (transactions.length === 0) return new Date()
    return new Date(Math.max(...transactions.map(t => t.date ? new Date(t.date).getTime() : 0)))
  }, [transactions])

  const ninetyDaysAgo = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() - 90)
    return d
  }, [])

  const [fromDate, setFromDate] = useState(toDateInput(ninetyDaysAgo))
  const [toDate, setToDate] = useState(() => toDateInput(maxTransactionDate))

  // toDate aktualisieren, wenn sich maxTransactionDate ändert
  useEffect(() => {
    setToDate(toDateInput(maxTransactionDate))
  }, [maxTransactionDate])

  useEffect(() => {
    const load = async () => {
      if (!musicianId) return
      try {
        const [m, t, c] = await Promise.all([
          fetchMusicianById(musicianId),
          fetchTransactionsWithMusician(),
          fetchConcerts(),
        ])
        setMusician(m)
        setTransactions(t.filter((row) => row.musician_id === musicianId))
        setConcerts(c)
        // Load payout requests for own statement (user) or all (admin)
        if ((isUser || isSuperuser) && user && musicianId === user.id) {
          // For user, fetch only their requests (does not include reviewed_by_name)
          const requests = await fetchMyPayoutRequests(musicianId)
          // Patch in musician_name and reviewed_by_name for UI consistency
          setPayoutRequests(requests.map(r => ({
            ...r,
            musician_name: musician?.name ?? '',
            reviewed_by_name: undefined,
          })))
        } else if (isSuperuser) {
          // For admin, fetch all payout requests (includes reviewed_by_name)
          const allRequests = await fetchPayoutRequests()
          setPayoutRequests(allRequests)
        }
      } catch (err) {
        console.error('Kontoauszug laden fehlgeschlagen:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [musicianId, isUser, user])

  // Build a map of payout booking IDs to their status
  const payoutStatusMap = useMemo(() => {
    const map: Record<string, string> = {}
    payoutRequests.forEach((pr) => {
      if (pr.status && pr.id) map[pr.id] = pr.status
    })
    return map
  }, [payoutRequests])

  const filteredTransactions = useMemo(() => {
    const from = fromDate ? new Date(fromDate) : null
    const to = toDate ? new Date(toDate) : null
    return transactions
      .filter((t) => {
        if (!t.date) return false
        const d = new Date(t.date)
        if (from && d < from) return false
        if (to && d > new Date(to.getTime() + 24 * 60 * 60 * 1000 - 1)) return false
        // Filter out deleted payouts by booking_id
        if (t.booking_type === 'payout' && t.booking_id && payoutStatusMap[t.booking_id] === 'deleted') return false
        return true
      })
      .map((t) => {
        // Set amount to 0 for deleted payouts (defensive)
        if (t.booking_type === 'payout' && t.booking_id && payoutStatusMap[t.booking_id] === 'deleted') {
          return { ...t, amount: 0 }
        }
        return t
      })
      .sort((a, b) => new Date(b.date ?? '').getTime() - new Date(a.date ?? '').getTime())
  }, [transactions, fromDate, toDate, payoutStatusMap])

  // Merge pending payout requests into the statement as entries
  type StatementEntry =
    | { kind: 'transaction'; data: TransactionWithMusician }
    | { kind: 'payout-request'; data: DbPayoutRequest }

  const statementEntries: StatementEntry[] = useMemo(() => {
    const txEntries: StatementEntry[] = filteredTransactions.map((t) => ({
      kind: 'transaction' as const,
      data: t,
    }))
    // Show all payout requests except deleted
    const requestEntries: StatementEntry[] = payoutRequests
      .filter((r) => r.status !== 'deleted')
      .map((r) => ({ kind: 'payout-request' as const, data: r }))
    const all = [...txEntries, ...requestEntries]
    all.sort((a, b) => {
      const dateA = a.kind === 'transaction' ? (a.data.date ?? '') : (a.data.created_at ?? '')
      const dateB = b.kind === 'transaction' ? (b.data.date ?? '') : (b.data.created_at ?? '')
      return new Date(dateB).getTime() - new Date(dateA).getTime()
    })
    return all
  }, [filteredTransactions, payoutRequests, canRequestPayout])

  // Gesamtsummen immer aus allen Transaktionen berechnen
  const totals = useMemo(() => {
    const income = transactions
      .filter((t) => t.type === 'earn')
      .reduce((sum, t) => sum + t.amount, 0)
    const payouts = transactions
      .filter((t) => t.type === 'expense' && isPayout(t))
      .reduce((sum, t) => sum + Math.abs(t.amount), 0)
    const expenses = transactions
      .filter((t) => t.type === 'expense' && !isPayout(t))
      .reduce((sum, t) => sum + Math.abs(t.amount), 0)
    return { income, payouts, expenses }
  }, [transactions])

  const currentBalance = useMemo(() => {
    if (!musician) return 0
    const txnTotal = transactions.reduce((sum, t) => sum + t.amount, 0)
    return musician.balance + txnTotal
  }, [musician, transactions])

  const { logo } = useSettings()
  const handlePdfExport = async () => {
    setExporting(true)
    try {
      // Logo aus SettingsContext verwenden und invertieren
      let logoDataUrl: string | undefined = undefined
      if (logo) {
        const dataUrl = logo.startsWith('data:image') ? logo : `data:image/png;base64,${logo}`
        logoDataUrl = await invertImageDataUrl(dataUrl)
      }

      // Tabellarische Daten vorbereiten
      const entries: PdfExportEntry[] = statementEntries.map(entry => {
        if (entry.kind === 'transaction') {
          const t = entry.data
          // Konzertinfos, falls vorhanden
          let eventName = t.concert_name || ''
          let eventLocation = ''
          if (t.concert_id) {
            const concert = concerts.find(c => c.id === t.concert_id)
            if (concert) {
              eventName = concert.name
              eventLocation = concert.location || ''
            }
          }
          return {
            date: t.date ? formatDate(new Date(t.date)) : '',
            description: t.description || '',
            amount: t.amount,
            eventName,
            eventLocation,
          }
        } else {
          // Payout-Request als eigene Zeile
          const r = entry.data
          return {
            date: r.created_at ? formatDate(new Date(r.created_at)) : '',
            description: 'Auszahlungsantrag' + (r.note ? ` (${r.note})` : ''),
            amount: -Math.abs(r.amount),
            eventName: '',
            eventLocation: '',
          }
        }
      })

      await exportStatementPdf({
        logoDataUrl,
        musicianName: musician?.name || '',
        fromDate: fromDate ? formatDate(new Date(fromDate)) : '',
        toDate: toDate ? formatDate(new Date(toDate)) : '',
        entries,
      })
    } catch (err) {
      console.error('PDF Export fehlgeschlagen:', err)
      alert('PDF Export fehlgeschlagen: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setExporting(false)
    }
  }

  const openAccountDialog = () => {
    setNewEmail(user?.email ?? '')
    setNewPassword('')
    setConfirmPassword('')
    setAccountMessage(null)
    setShowAccountDialog(true)
  }

  const handleUpdateEmail = async () => {
    if (!newEmail.trim() || newEmail === user?.email) return
    setAccountSaving(true)
    try {
      await updateEmail(newEmail.trim())
      setAccountMessage({ text: 'E-Mail Änderung angefordert. Bitte bestätige die neue E-Mail-Adresse.', type: 'success' })
    } catch (err: any) {
      setAccountMessage({ text: 'Fehler: ' + (err?.message ?? String(err)), type: 'error' })
    } finally {
      setAccountSaving(false)
    }
  }

  const handleUpdatePassword = async () => {
    if (!newPassword) return
    if (newPassword.length < 6) {
      setAccountMessage({ text: 'Passwort muss mindestens 6 Zeichen lang sein', type: 'error' })
      return
    }
    if (newPassword !== confirmPassword) {
      setAccountMessage({ text: 'Passwörter stimmen nicht überein', type: 'error' })
      return
    }
    setAccountSaving(true)
    try {
      await updatePassword(newPassword)
      setNewPassword('')
      setConfirmPassword('')
      setAccountMessage({ text: 'Passwort erfolgreich geändert', type: 'success' })
    } catch (err: any) {
      setAccountMessage({ text: 'Fehler: ' + (err?.message ?? String(err)), type: 'error' })
    } finally {
      setAccountSaving(false)
    }
  }

  const handlePayoutRequest = async () => {
    const amount = parseFloat(payoutAmount.replace(',', '.'))
    if (isNaN(amount) || amount <= 0) {
      setPayoutError('Bitte einen gültigen Betrag eingeben')
      return
    }
    if (amount > currentBalance) {
      setPayoutError('Der Betrag übersteigt deinen Kontostand')
      return
    }
    if (!musicianId) return
    setPayoutSubmitting(true)
    setPayoutError('')
    try {
      // PDF-Upload temporär deaktiviert
      const newReq = await createPayoutRequest(musicianId, amount, payoutNote)
      setPayoutRequests((prev) => [
        {
          ...newReq,
          musician_name: musician?.name ?? '',
          reviewed_by_name: undefined,
        },
        ...prev,
      ])
      setShowPayoutDialog(false)
      setPayoutAmount('')
      setPayoutNote('')
      // PDF-Upload temporär deaktiviert: setPayoutPdf / setPayoutPdfName entfernt
    } catch (err) {
      setPayoutError('Antrag konnte nicht erstellt werden: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setPayoutSubmitting(false)
    }
  }

  const openEditRequest = (req: DbPayoutRequest) => {
    setEditRequestId(req.id)
    setEditRequestAmount(String(req.amount))
    setEditRequestNote(req.note ?? '')
    setEditRequestError('')
  }

  const handleEditRequest = async () => {
    if (!editRequestId) return
    const amount = parseFloat(editRequestAmount.replace(',', '.'))
    if (isNaN(amount) || amount <= 0) {
      setEditRequestError('Bitte einen gültigen Betrag eingeben')
      return
    }
    if (amount > currentBalance) {
      setEditRequestError('Der Betrag übersteigt deinen Kontostand')
      return
    }
    setEditRequestSubmitting(true)
    setEditRequestError('')
    try {
      let updated: DbPayoutRequest
      if (isUser && user && musicianId === user.id) {
        updated = await updatePayoutRequestUser(editRequestId, musicianId, {
          amount,
          note: editRequestNote || undefined,
        })
      } else {
        updated = await updatePayoutRequestAdmin(editRequestId, {
          amount,
          note: editRequestNote || undefined,
        })
      }
      setPayoutRequests((prev) => prev.map((r) =>
        r.id === editRequestId
          ? { ...updated, musician_name: musician?.name ?? '', reviewed_by_name: undefined }
          : r
      ))
      setEditRequestId(null)
    } catch (err) {
      let msg = ''
      if (err instanceof Error && err.message.includes('existiert nicht, gehört nicht dir oder ist nicht mehr ausstehend')) {
        msg = 'Der Antrag kann nicht mehr bearbeitet werden. Er wurde entweder bereits bearbeitet, gehört nicht dir oder existiert nicht mehr.'
      } else {
        msg = 'Bearbeitung fehlgeschlagen. Bitte versuche es erneut oder kontaktiere den Support.'
      }
      setEditRequestError(msg)
    } finally {
      setEditRequestSubmitting(false)
    }
  }

  const handleDeleteRequest = async (id: string) => {
    if (!confirm('Antrag wirklich löschen?')) return
    try {
      if (isUser && user && musicianId === user.id) {
        await deletePayoutRequestUser(id, musicianId)
      } else {
        await deletePayoutRequest(id)
      }
      setPayoutRequests((prev) => prev.filter((r) => r.id !== id))
    } catch (err) {
      console.error('Löschen fehlgeschlagen:', err)
    }
  }


  if (loading) {
    return <Spinner text="Kontoauszug wird geladen..." />
  }

  if (!musician) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Musiker nicht gefunden.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-4">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          {!isUser && (
            <Button variant="ghost" size="icon" className="shrink-0" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/30 flex items-center justify-center shrink-0">
              <UserRound className="w-5 h-5 sm:w-6 sm:h-6 text-amber-200" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold truncate">{musician.name}</h1>
              <p className={`text-base sm:text-lg font-semibold ${currentBalance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {formatCurrency(currentBalance)}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 ml-auto sm:ml-0">
          {canRequestPayout && (
            <Button variant="default" size="sm" onClick={() => setShowPayoutDialog(true)}>
              <HandCoins className="w-4 h-4 mr-2" />
              Auszahlung beantragen
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handlePdfExport} disabled={exporting} className="btn-amber">
            <FileDown className="w-4 h-4 mr-2" />
            PDF Export
          </Button>
          {isUser && (
            <>
              <Button variant="ghost" size="icon" className="shrink-0" onClick={openAccountDialog} title="Mein Konto">
                <Settings className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="shrink-0" onClick={logout} title="Logout">
                <LogOut className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-4 px-4">
        <div className="grid gap-2">
          <span className="text-xs text-muted-foreground">Von</span>
          <DatePicker value={fromDate} onChange={setFromDate} placeholder="Von" />
        </div>
        <div className="grid gap-2">
          <span className="text-xs text-muted-foreground">Bis</span>
          <div className="flex items-center gap-2">
            <DatePicker value={toDate} onChange={setToDate} placeholder="Bis" />
            <Button
              type="button"
              variant="outline"
              className="btn-amber px-3 py-1 text-xs h-8"
              onClick={() => {
                // Finde frühestes und spätestes Transaktionsdatum
                let minDate = new Date()
                let maxDate = new Date(0)
                transactions.forEach(t => {
                  if (t.date) {
                    const d = new Date(t.date)
                    if (d < minDate) minDate = d
                    if (d > maxDate) maxDate = d
                  }
                })
                setFromDate(toDateInput(minDate))
                setToDate(toDateInput(maxDate))
              }}
            >
              Max. Zeitraum
            </Button>
          </div>
        </div>
      </div>

      <div ref={contentRef} className="space-y-6 p-4">
        {/* PDF Header — Musiker & Zeitraum */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/30 flex items-center justify-center">
              <UserRound className="w-6 h-6 text-amber-200" />
            </div>
            <div>
              <h2 className="text-xl font-bold">{musician.name}</h2>
              <p className={`text-lg font-semibold ${currentBalance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                Kontostand: {formatCurrency(currentBalance)}
              </p>
            </div>
          </div>
          <div className="text-right text-sm text-muted-foreground">
            <p>Zeitraum</p>
            <p className="font-medium text-foreground">
              {fromDate ? formatDate(new Date(fromDate)) : '–'} — {toDate ? formatDate(new Date(toDate)) : '–'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-green-500/10 to-green-500/20 border-green-500/30">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Gesamteinnahmen</p>
              <p className="text-2xl font-bold text-green-400">{formatCurrency(totals.income)}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-red-500/10 to-red-500/20 border-red-500/30">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Gesamtausgaben</p>
              <p className="text-2xl font-bold text-red-400">{formatCurrency(totals.expenses)}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/20 border-amber-500/30">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Auszahlungen</p>
              <p className="text-2xl font-bold text-amber-400">{formatCurrency(totals.payouts)}</p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-3">
          <h2 className="text-xl font-semibold">Kontoauszug</h2>
          {statementEntries.length === 0 ? (
            <p className="text-muted-foreground">Keine Transaktionen im Zeitraum.</p>
          ) : (
            statementEntries.map((entry) => {
              if (entry.kind === 'payout-request') {
                const r = entry.data
                let batchLabel = 'Genehmigung ausstehend…'
                let batchClass = 'text-xs px-2 py-0.5 rounded-full border border-amber-400/60 text-amber-300 animate-pulse'
                let showEditDelete = true
                let displayAmount = r.amount
                if (r.status === 'approved') {
                  batchLabel = 'Genehmigt'
                } else if (r.status === 'rejected') {
                  batchLabel = 'Abgelehnt'
                  batchClass = 'text-xs px-2 py-0.5 rounded-full border border-red-400/60 text-red-400'
                  showEditDelete = false
                  displayAmount = 0
                }
                return (
                  <Card key={`pr-${r.id}`} className="bg-muted/40 border-amber-500/30" style={{ backgroundColor: '#18181b', boxShadow: '0 8px 32px 0 rgba(0,0,0,0.37)' }}>
                    <CardContent className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-amber-500/20 text-amber-300">
                          <HandCoins className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold">Auszahlung beantragt</p>
                            <span className={batchClass}>{batchLabel}</span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {r.created_at ? formatDate(new Date(r.created_at)) : '-'}
                            {r.note ? ` • ${r.note}` : ''}
                            {(() => {
                              if (r.status === 'rejected' && r.admin_note) {
                                let reviewer = ''
                                if ('reviewed_by_name' in r && r.reviewed_by_name) {
                                  reviewer = ` (Bearbeiter: ${r.reviewed_by_name})`;
                                }
                                return <><br /><span className="text-xs text-red-400">Begründung: {r.admin_note}{reviewer} (beantragt: {formatCurrency(r.amount)})</span></>
                              }
                              return null
                            })()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="text-lg font-semibold text-amber-400">
                          -{formatCurrency(displayAmount)}
                        </p>
                        {showEditDelete && (
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 btn-amber"
                              title="Bearbeiten"
                              onClick={() => openEditRequest(r)}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-red-400"
                              title="Löschen"
                              onClick={() => handleDeleteRequest(r.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              }

              const t = entry.data
              const payout = t.type === 'expense' && isPayout(t)
              const iconWrapClass = payout
                ? 'bg-amber-500/20 text-amber-300'
                : t.type === 'earn'
                  ? 'bg-green-500/20 text-green-300'
                  : 'bg-red-500/20 text-red-300'
              const icon = payout ? (
                <Banknote className="w-5 h-5" />
              ) : t.type === 'earn' ? (
                <CircleDollarSign className="w-5 h-5" />
              ) : (
                <TrendingDown className="w-5 h-5" />
              )
              return (
                <Card key={t.id} className="bg-muted/40" style={{ backgroundColor: '#18181b', boxShadow: '0 8px 32px 0 rgba(0,0,0,0.37)' }}>
                  <CardContent className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${iconWrapClass}`}>
                        {icon}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{t.description || '-'}</p>
                          {payout ? (
                            <span className="text-xs px-2 py-0.5 rounded-full border border-amber-400/60 text-amber-300">
                              Auszahlung
                            </span>
                          ) : null}
                          {!payout && t.type === 'earn' && isGage(t) ? (
                            <span className="text-xs px-2 py-0.5 rounded-full border border-amber-400/60 text-amber-300">
                              Gage
                            </span>
                          ) : null}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {t.date ? formatDate(new Date(t.date)) : '-'}
                          {t.concert_id && concerts.length > 0 ? (() => {
                            const concert = concerts.find((c) => c.id === t.concert_id)
                            return concert && concert.location ? ` • ${concert.location}` : ''
                          })() : ''}
                        </p>
                      </div>
                    </div>
                    <p className={`text-lg font-semibold ${t.type === 'earn' ? 'text-green-400' : 'text-red-400'}`}>
                      {t.type === 'earn' ? '+' : '-'}{formatCurrency(Math.abs(t.amount))}
                    </p>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      </div>

      {/* Edit Payout Request Dialog */}
      <Dialog open={!!editRequestId} onOpenChange={(open) => { if (!open) setEditRequestId(null) }}>
        <DialogContent aria-describedby="edit-request-dialog-desc" style={{ backgroundColor: '#18181b', boxShadow: '0 8px 32px 0 rgba(0,0,0,0.37)' }}>
          <DialogHeader>
            <DialogTitle>Antrag bearbeiten</DialogTitle>
          </DialogHeader>
          <DialogDescription id="edit-request-dialog-desc" className="sr-only">
            Hier kannst du einen Auszahlungsantrag bearbeiten.
          </DialogDescription>
          {/* Kein Wrapper um die nächsten Blöcke, alles direkt als Child */}
          <div className="space-y-4 px-1">
            <div className="grid gap-2">
              <Label htmlFor="edit-req-amount">Betrag (€)</Label>
              <Input
                id="edit-req-amount"
                type="number"
                step="0.01"
                min="0.01"
                value={editRequestAmount}
                onChange={(e) => setEditRequestAmount(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-req-note">Notiz (optional)</Label>
              <Textarea
                id="edit-req-note"
                placeholder="z.B. Banküberweisung auf mein Konto"
                value={editRequestNote}
                onChange={(e) => setEditRequestNote(e.target.value)}
                rows={2}
              />
            </div>
            {editRequestError && <p className="text-sm text-red-400">{editRequestError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditRequestId(null)} disabled={editRequestSubmitting}>
              Abbrechen
            </Button>
            <Button onClick={handleEditRequest} disabled={editRequestSubmitting}>
              {editRequestSubmitting ? 'Wird gespeichert...' : 'Speichern'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Account Dialog (User only) */}
      <Dialog open={showAccountDialog} onOpenChange={setShowAccountDialog}>
        <DialogContent aria-describedby="account-dialog-desc" style={{ backgroundColor: '#18181b', boxShadow: '0 8px 32px 0 rgba(0,0,0,0.37)' }}>
          <DialogHeader>
            <DialogTitle>Mein Konto</DialogTitle>
          </DialogHeader>
          <DialogDescription id="account-dialog-desc" className="sr-only">
            Hier kannst du deine Kontodaten und dein Passwort ändern.
          </DialogDescription>
          <div className="space-y-6 px-1">
            {accountMessage && (
              <div className={`p-3 rounded-lg text-sm font-medium ${
                accountMessage.type === 'success'
                  ? 'bg-green-900/30 text-green-300'
                  : 'bg-red-900/30 text-red-300'
              }`}>
                {accountMessage.text}
              </div>
            )}

            {/* E-Mail ändern */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2"><Mail className="w-4 h-4" /> E-Mail ändern</h3>
              <div className="grid gap-2">
                <Label htmlFor="account-email">Neue E-Mail-Adresse</Label>
                <Input
                  id="account-email"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="neue@email.de"
                />
              </div>
              {(!!newEmail && newEmail !== user?.email && !accountSaving) && (
                <Button size="sm" onClick={handleUpdateEmail}>
                  <Save className="w-4 h-4 mr-2" />
                  E-Mail ändern
                </Button>
              )}
            </div>

            {/* Passwort ändern */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2"><Lock className="w-4 h-4" /> Passwort ändern</h3>
              <div className="grid gap-2">
                <Label htmlFor="account-password">Neues Passwort</Label>
                <Input
                  id="account-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="account-confirm">Passwort bestätigen</Label>
                <Input
                  id="account-confirm"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
              {(!!newPassword && !accountSaving) && (
                <Button size="sm" onClick={handleUpdatePassword}>
                  <Save className="w-4 h-4 mr-2" />
                  Passwort ändern
                </Button>
              )}
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setShowAccountDialog(false)}>Schließen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payout Request Dialog */}
      <Dialog open={showPayoutDialog} onOpenChange={setShowPayoutDialog}>
        <DialogContent aria-describedby="payout-dialog-desc" style={{ backgroundColor: '#18181b', boxShadow: '0 8px 32px 0 rgba(0,0,0,0.37)' }}>
          <DialogHeader>
            <DialogTitle>Auszahlung beantragen</DialogTitle>
          </DialogHeader>
          <DialogDescription id="payout-dialog-desc" className="sr-only">
            Hier kannst du eine Auszahlung beantragen und optional ein PDF hochladen.
          </DialogDescription>
          <div className="space-y-4 px-1">
            <div>
              <p className="text-sm text-muted-foreground mb-3">
                Dein aktueller Kontostand: <span className={currentBalance >= 0 ? 'text-green-400 font-semibold' : 'text-red-400 font-semibold'}>{formatCurrency(currentBalance)}</span>
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="payout-amount">Betrag (€)</Label>
              <Input
                id="payout-amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="z.B. 50,00"
                value={payoutAmount}
                onChange={(e) => setPayoutAmount(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="payout-note">Notiz (optional)</Label>
              <Textarea
                id="payout-note"
                placeholder="z.B. Banküberweisung auf mein Konto"
                value={payoutNote}
                onChange={(e) => setPayoutNote(e.target.value)}
                rows={2}
              />
            </div>
            <div className="grid gap-2">
              {/* PDF-Upload temporär deaktiviert */}
            </div>
            {payoutError && (
              <p className="text-sm text-red-400">{payoutError}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPayoutDialog(false)} disabled={payoutSubmitting}>
              Abbrechen
            </Button>
            <Button onClick={handlePayoutRequest} disabled={payoutSubmitting}>
              {payoutSubmitting ? 'Wird gesendet...' : 'Antrag senden'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default Statement
