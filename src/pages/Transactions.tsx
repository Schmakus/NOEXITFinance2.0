import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Banknote, TrendingUp, TrendingDown } from 'lucide-react'
import { fetchMusicians, fetchTransactionsWithMusician } from '@/lib/api-client'
import type { DbMusician } from '@/lib/database.types'

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
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Transaktionen werden geladen...</p>
      </div>
    )
  }

  const isPayout = (t: TransactionRow) =>
    t.booking_type === 'payout' ||
    (t.description ?? '').toLowerCase().includes('auszahlung') ||
    (t.concert_name ?? '').toLowerCase().includes('auszahlung')

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Transaktionen</h1>
        <p className="text-muted-foreground mt-2">Verfolge alle Finanztransaktionen</p>
      </div>

      {transactions.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Transaktionsliste</CardTitle>
            <CardDescription>Alle Transaktionen</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-muted-foreground">
              Noch keine Transaktionen. Erstelle ein Konzert mit Gruppenzuweisung um Transaktionen zu generieren.
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Alle Transaktionen</CardTitle>
              <CardDescription>Insgesamt: {transactions.length}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {sortedTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1">
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
                      <div className="flex-1">
                        <p className="font-medium text-sm">
                          {transaction.musician_name} - {isPayout(transaction) ? 'Auszahlung' : transaction.description}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {transaction.concert_name ?? '-'} • {transaction.date ? formatDate(new Date(transaction.date)) : '-'}
                        </p>
                      </div>
                    </div>
                    <p className={`font-semibold text-sm ${transaction.type === 'earn' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {transaction.type === 'earn' ? '+' : '-'}{formatCurrency(Math.abs(transaction.amount))}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4">
            {musicians.map((musician) => {
              const musicianTransactions = transactionsByMusician[musician.id] || []
              const total = musicianTransactions.reduce((s, t) => s + t.amount, 0)
              return (
                <Card key={musician.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>{musician.name}</CardTitle>
                        <CardDescription>{musicianTransactions.length} Transaktionen</CardDescription>
                      </div>
                      <p className={`text-2xl font-bold ${total >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {formatCurrency(total)}
                      </p>
                    </div>
                  </CardHeader>
                  {musicianTransactions.length > 0 && (
                    <CardContent>
                      <div className="space-y-2">
                        {musicianTransactions
                          .sort((a, b) => new Date(b.date ?? '').getTime() - new Date(a.date ?? '').getTime())
                          .map((transaction) => (
                            <div key={transaction.id} className="flex items-center justify-between p-2 rounded text-sm">
                              <div>
                                <p className="font-medium">{transaction.description}</p>
                                <p className="text-xs text-muted-foreground">
                                  {transaction.date ? formatDate(new Date(transaction.date)) : '-'}
                                </p>
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
        </>
      )}
    </div>
  )
}

export default Transactions
