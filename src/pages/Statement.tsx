import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { DatePicker } from '@/components/ui/date-picker'
import { formatCurrency, formatDate } from '@/lib/utils'
import { fetchMusicianById, fetchTransactionsWithMusician } from '@/lib/api-client'
import { useAuth } from '@/contexts/AuthContext'
import { Spinner } from '@/components/ui/spinner'
import type { DbMusician, TransactionWithMusician } from '@/lib/database.types'
import {
  ArrowLeft,
  Banknote,
  FileDown,
  TrendingDown,
  UserRound,
  CircleDollarSign,
} from 'lucide-react'

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
  const { user, isUser } = useAuth()
  const [musician, setMusician] = useState<DbMusician | null>(null)
  const [transactions, setTransactions] = useState<TransactionWithMusician[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const contentRef = useRef<HTMLDivElement | null>(null)

  // Users can only view their own statement
  useEffect(() => {
    if (isUser && user && musicianId && musicianId !== user.id) {
      navigate(`/statement/${user.id}`, { replace: true })
    }
  }, [isUser, user, musicianId, navigate])

  const today = useMemo(() => new Date(), [])
  const ninetyDaysAgo = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() - 90)
    return d
  }, [])

  const [fromDate, setFromDate] = useState(toDateInput(ninetyDaysAgo))
  const [toDate, setToDate] = useState(toDateInput(today))

  useEffect(() => {
    const load = async () => {
      if (!musicianId) return
      try {
        const [m, t] = await Promise.all([
          fetchMusicianById(musicianId),
          fetchTransactionsWithMusician(),
        ])
        setMusician(m)
        setTransactions(t.filter((row) => row.musician_id === musicianId))
      } catch (err) {
        console.error('Kontoauszug laden fehlgeschlagen:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [musicianId])

  const filteredTransactions = useMemo(() => {
    const from = fromDate ? new Date(fromDate) : null
    const to = toDate ? new Date(toDate) : null
    return transactions
      .filter((t) => {
        if (!t.date) return false
        const d = new Date(t.date)
        if (from && d < from) return false
        if (to && d > new Date(to.getTime() + 24 * 60 * 60 * 1000 - 1)) return false
        return true
      })
      .sort((a, b) => new Date(b.date ?? '').getTime() - new Date(a.date ?? '').getTime())
  }, [transactions, fromDate, toDate])

  const totals = useMemo(() => {
    const income = filteredTransactions
      .filter((t) => t.type === 'earn')
      .reduce((sum, t) => sum + t.amount, 0)
    const payouts = filteredTransactions
      .filter((t) => t.type === 'expense' && isPayout(t))
      .reduce((sum, t) => sum + Math.abs(t.amount), 0)
    const expenses = filteredTransactions
      .filter((t) => t.type === 'expense' && !isPayout(t))
      .reduce((sum, t) => sum + Math.abs(t.amount), 0)
    return { income, payouts, expenses }
  }, [filteredTransactions])

  const currentBalance = useMemo(() => {
    if (!musician) return 0
    const txnTotal = transactions.reduce((sum, t) => sum + t.amount, 0)
    return musician.balance + txnTotal
  }, [musician, transactions])

  const handlePdfExport = async () => {
    if (!contentRef.current) return
    setExporting(true)
    try {
      const [{ toPng }, { jsPDF }] = await Promise.all([
        import('html-to-image'),
        import('jspdf'),
      ])
      const dataUrl = await toPng(contentRef.current, {
        pixelRatio: 2,
        backgroundColor: '#0b1220',
      })
      const img = new Image()
      img.src = dataUrl
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = () => reject(new Error('Bild konnte nicht geladen werden'))
      })
      const pdf = new jsPDF('p', 'pt', 'a4')
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const imgWidth = pageWidth
      const imgHeight = (img.height * imgWidth) / img.width
      let y = 0
      if (imgHeight <= pageHeight) {
        pdf.addImage(dataUrl, 'PNG', 0, 0, imgWidth, imgHeight)
      } else {
        let remainingHeight = imgHeight
        while (remainingHeight > 0) {
          pdf.addImage(dataUrl, 'PNG', 0, y, imgWidth, imgHeight)
          remainingHeight -= pageHeight
          if (remainingHeight > 0) {
            pdf.addPage()
            y -= pageHeight
          }
        }
      }
      pdf.save(`kontoauszug-${musician?.name ?? 'musiker'}.pdf`)
    } catch (err) {
      console.error('PDF Export fehlgeschlagen:', err)
      alert('PDF Export fehlgeschlagen: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setExporting(false)
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
          <Button variant="ghost" size="icon" className="shrink-0" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
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
          <Button variant="outline" size="sm" onClick={handlePdfExport} disabled={exporting}>
            <FileDown className="w-4 h-4 mr-2" />
            PDF Export
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-4 px-4">
        <div className="grid gap-2">
          <span className="text-xs text-muted-foreground">Von</span>
          <DatePicker value={fromDate} onChange={setFromDate} placeholder="Von" />
        </div>
        <div className="grid gap-2">
          <span className="text-xs text-muted-foreground">Bis</span>
          <DatePicker value={toDate} onChange={setToDate} placeholder="Bis" />
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
          {filteredTransactions.length === 0 ? (
            <p className="text-muted-foreground">Keine Transaktionen im Zeitraum.</p>
          ) : (
            filteredTransactions.map((t) => {
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
                <Card key={t.id} className="bg-muted/40">
                  <CardContent className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${iconWrapClass}`}>
                        {icon}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{t.description || '-'}</p>
                          {payout && (
                            <span className="text-xs px-2 py-0.5 rounded-full border border-amber-400/60 text-amber-300">
                              Auszahlung
                            </span>
                          )}
                          {!payout && t.type === 'earn' && isGage(t) && (
                            <span className="text-xs px-2 py-0.5 rounded-full border border-amber-400/60 text-amber-300">
                              Gage
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {t.date ? formatDate(new Date(t.date)) : '-'}
                          {t.concert_name ? ` • ${t.concert_name}` : ''}
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
    </div>
  )
}

export default Statement
