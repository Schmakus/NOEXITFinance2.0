import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Archive, TrendingDown, TrendingUp, Download, RotateCcw, Banknote } from 'lucide-react'
import {
  fetchArchivedMusicians,
  fetchArchivedTransactionsWithMusician,
  exportArchivedTransactionsCSV,
  restoreMusician,
} from '@/lib/api-client'
import type { DbMusician, TransactionArchiveWithMusician } from '@/lib/database.types'
import { useAuth } from '@/contexts/AuthContext'
import { Spinner } from '@/components/ui/spinner'

const isPayout = (t: TransactionArchiveWithMusician) =>
  t.booking_type === 'payout' ||
  (t.description ?? '').toLowerCase().includes('auszahlung') ||
  (t.concert_name ?? '').toLowerCase().includes('auszahlung')

function ArchivePage() {
  const { user } = useAuth()
  const isAdminOrSuperuser = user?.role === 'administrator' || user?.role === 'superuser'
  const [loading, setLoading] = useState(true)
  const [musicians, setMusicians] = useState<DbMusician[]>([])
  const [transactions, setTransactions] = useState<TransactionArchiveWithMusician[]>([])
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const [m, t] = await Promise.all([
          fetchArchivedMusicians(),
          fetchArchivedTransactionsWithMusician(),
        ])
        setMusicians(m)
        setTransactions(t)
      } catch (err) {
        console.error('Archiv laden fehlgeschlagen:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleExportArchiveCsv = async () => {
    try {
      setExporting(true)
      const csv = await exportArchivedTransactionsCSV()
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `noexit-archiv-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('CSV Export fehlgeschlagen:', err)
      alert('CSV Export fehlgeschlagen.')
    } finally {
      setExporting(false)
    }
  }

  const handleRestore = async (id: string) => {
    if (!confirm('Musiker aus dem Archiv wiederherstellen?')) return
    try {
      await restoreMusician(id)
      const [m, t] = await Promise.all([
        fetchArchivedMusicians(),
        fetchArchivedTransactionsWithMusician(),
      ])
      setMusicians(m)
      setTransactions(t)
    } catch (err) {
      console.error('Musiker wiederherstellen fehlgeschlagen:', err)
      alert('Musiker konnte nicht wiederhergestellt werden.')
    }
  }

  if (!isAdminOrSuperuser) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Kein Zugriff.</p>
      </div>
    )
  }

  if (loading) {
    return <Spinner text="Archiv wird geladen..." />
  }

  const transactionsByMusician = transactions.reduce((acc, t) => {
    const key = t.musician_id ?? 'unknown'
    if (!acc[key]) acc[key] = []
    acc[key].push(t)
    return acc
  }, {} as Record<string, TransactionArchiveWithMusician[]>)

  return (
    <div className="space-y-8">
      <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
              <Archive className="w-5 h-5 sm:w-6 sm:h-6" />
              Archiv
            </h1>
            <p className="text-muted-foreground mt-1 sm:mt-2 text-sm sm:text-base">Archivierte Musiker und Kontoauszuege</p>
          </div>
          <Button variant="amber" size="sm" onClick={handleExportArchiveCsv} disabled={exporting}>
            <Download className="w-4 h-4 mr-2" />
            CSV Export
          </Button>
        </div>
      </div>

      {musicians.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Archiv</CardTitle>
            <CardDescription>Keine archivierten Musiker vorhanden</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-muted-foreground">
              Es wurden noch keine Musiker archiviert.
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {musicians.map((musician) => {
            const musicianTransactions = transactionsByMusician[musician.id] || []
            const total = musicianTransactions.reduce((s, t) => s + t.amount, 0)
            return (
              <Card key={musician.id} style={{ backgroundColor: '#18181b', boxShadow: '0 8px 32px 0 rgba(0,0,0,0.37)' }}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{musician.name}</CardTitle>
                      <CardDescription>
                        Archiviert am {musician.archived_at ? formatDate(new Date(musician.archived_at)) : '-'}
                      </CardDescription>
                    </div>
                    <p className={`text-2xl font-bold ${total >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {formatCurrency(total)}
                    </p>
                  </div>
                  <div className="mt-3">
                    <Button variant="outline" size="sm" onClick={() => handleRestore(musician.id)}>
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Wiederherstellen
                    </Button>
                  </div>
                </CardHeader>
                {musicianTransactions.length > 0 && (
                  <CardContent>
                    <div className="space-y-2">
                      {musicianTransactions
                        .sort((a, b) => new Date(b.date ?? '').getTime() - new Date(a.date ?? '').getTime())
                        .map((transaction) => (
                          <div key={transaction.id} className="flex items-center justify-between p-2 rounded text-sm">
                            <div className="flex items-center gap-3">
                              {(() => {
                                const payout = transaction.type === 'expense' && isPayout(transaction)
                                const iconWrapClass = payout
                                  ? 'bg-amber-100 dark:bg-amber-900/30'
                                  : transaction.type === 'earn'
                                    ? 'bg-green-100 dark:bg-green-900/30'
                                    : 'bg-red-100 dark:bg-red-900/30'
                                const icon = payout ? (
                                  <Banknote className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                ) : transaction.type === 'earn' ? (
                                  <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
                                ) : (
                                  <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />
                                )
                                return <div className={`p-2 rounded-full ${iconWrapClass}`}>{icon}</div>
                              })()}
                              <div>
                                <p className="font-medium">
                                  {isPayout(transaction) ? 'Auszahlung' : transaction.description}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {transaction.date ? formatDate(new Date(transaction.date)) : '-'}
                                </p>
                              </div>
                            </div>
                            <p className={transaction.type === 'earn' ? 'text-green-600' : 'text-red-600'}>
                              {transaction.type === 'earn' ? '+' : '-'}{formatCurrency(Math.abs(transaction.amount))}
                            </p>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default ArchivePage
