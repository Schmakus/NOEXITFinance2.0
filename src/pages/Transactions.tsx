import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Banknote, TrendingUp, TrendingDown } from 'lucide-react'
import { fetchMusicians, fetchTransactionsWithMusician } from '@/lib/api-client'
import type { DbMusician } from '@/lib/database.types'
import { Spinner } from '@/components/ui/spinner'

interface TransactionRow {
  id: string
  musician_id: string
  musician_name: string
  concert_id: string | null
  booking_id: string | null
  booking_type?: 'expense' | 'income' | 'payout' | null
  concert_name: string | null
  amount: number
  date: string | null
  type: 'earn' | 'expense'
  description: string | null
}

function Transactions() {
  const [transactions, setTransactions] = useState<TransactionRow[]>([])
  const [musicians, setMusicians] = useState<DbMusician[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        const [t, m] = await Promise.all([fetchTransactionsWithMusician(), fetchMusicians()])
        setTransactions(t)
        setMusicians(m)
      } catch (err) {
        console.error('Transaktionen laden fehlgeschlagen:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const sortedTransactions = [...transactions].sort(
    (a, b) => new Date(b.date ?? '').getTime() - new Date(a.date ?? '').getTime()
  )

  const transactionsByMusician = transactions.reduce((acc, t) => {
    if (!acc[t.musician_id]) acc[t.musician_id] = []
    acc[t.musician_id].push(t)
    return acc
  }, {} as Record<string, TransactionRow[]>)

  if (loading) {
    return <Spinner text="Transaktionen werden geladen..." />
  }

  const isPayout = (t: TransactionRow) =>
    t.booking_type === 'payout' ||
    (t.description ?? '').toLowerCase().includes('auszahlung') ||
    (t.concert_name ?? '').toLowerCase().includes('auszahlung')

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Transaktionen</h1>
          <p className="text-muted-foreground mt-1 sm:mt-2 text-sm sm:text-base">Verfolge alle Finanztransaktionen</p>
        </div>
      </div>

      <div className="space-y-3">
        {sortedTransactions.length === 0 ? (
          <Card className="bg-muted/40" style={{ backgroundColor: '#18181b', boxShadow: '0 8px 32px 0 rgba(0,0,0,0.37)' }}>
            <CardContent className="py-12 text-center text-muted-foreground">Noch keine Transaktionen. Erstelle ein Konzert mit Gruppenzuweisung um Transaktionen zu generieren.</CardContent>
          </Card>
        ) : (
          sortedTransactions.map((transaction) => {
            const payout = transaction.type === 'expense' && isPayout(transaction)
            const iconWrapClass = payout
              ? 'bg-amber-500/20 text-amber-300'
              : transaction.type === 'earn'
                ? 'bg-green-500/20 text-green-300'
                : 'bg-red-500/20 text-red-300'
            const icon = payout ? (
              <Banknote className="w-5 h-5" />
            ) : transaction.type === 'earn' ? (
              <TrendingUp className="w-5 h-5" />
            ) : (
              <TrendingDown className="w-5 h-5" />
            )
            const keywords = Array.isArray(transaction.keywords) && transaction.keywords.length > 0
              ? transaction.keywords
              : (Array.isArray((transaction.booking_keywords)) ? transaction.booking_keywords : []);
            return (
              <Card key={transaction.id} className="bg-muted/40" style={{ backgroundColor: '#18181b', boxShadow: '0 8px 32px 0 rgba(0,0,0,0.37)' }}>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${iconWrapClass}`}>
                        {icon}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold truncate text-sm sm:text-base">
                            {transaction.musician_name} - {isPayout(transaction) ? 'Auszahlung' : transaction.description}
                          </p>
                          {keywords.length > 0 && (
                            <span className="flex flex-wrap gap-1 ml-2">
                              {keywords.map((kw: string) => (
                                <span key={kw} className="keyword text-xs px-2 py-0.5 rounded-full border border-blue-400/60 text-blue-300 bg-blue-500/10">{kw}</span>
                              ))}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {transaction.concert_name ?? '-'} • {transaction.date ? formatDate(new Date(transaction.date)) : '-'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <p className={`text-sm sm:text-base font-semibold whitespace-nowrap ${
                        transaction.type === 'earn' ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {transaction.type === 'earn' ? '+' : '-'}{formatCurrency(Math.abs(transaction.amount))}
                      </p>
                    </div>
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

export default Transactions
