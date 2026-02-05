import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { TrendingUp, TrendingDown, Wallet } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { fetchMusicians, fetchTransactions } from '@/lib/api-client'
import type { DbMusician, DbTransaction } from '@/lib/database.types'

interface MusicianWithBalance {
  id: string
  name: string
  balance: number
}

function Dashboard() {
  const [musicians, setMusicians] = useState<DbMusician[]>([])
  const [transactions, setTransactions] = useState<DbTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMusician, setSelectedMusician] = useState<MusicianWithBalance | null>(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        const [m, t] = await Promise.all([fetchMusicians(), fetchTransactions()])
        setMusicians(m)
        setTransactions(t)
      } catch (err) {
        console.error('Dashboard laden fehlgeschlagen:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

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

  const getMusiciansTransactions = (musicianId: string) => {
    return transactions
      .filter((t) => t.musician_id === musicianId)
      .sort((a, b) => new Date(b.date ?? '').getTime() - new Date(a.date ?? '').getTime())
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Dashboard wird geladen...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Übersicht</h1>
        <p className="text-muted-foreground mt-2">Übersicht deiner Bandmitglieder</p>
      </div>

      {/* Total Balance Card */}
      <Card className="bg-gradient-to-br from-blue-500/20 via-transparent to-blue-600/20 border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            Gesamtkontostand Band
          </CardTitle>
          <CardDescription>Kombinierter Kontostand aller Mitglieder</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-4xl font-bold text-blue-600 dark:text-blue-400">
            {formatCurrency(totalBalance)}
          </p>
        </CardContent>
      </Card>

      {/* Musicians Grid */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Bandmitglieder</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {musiciansWithBalance.map((musician) => (
            <Card
              key={musician.id}
              className="cursor-pointer hover:shadow-lg transition-all hover:border-blue-400/50 dark:hover:border-blue-600/50"
              onClick={() => setSelectedMusician(musician)}
            >
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-1">Musiker</p>
                  <h3 className="text-lg font-semibold mb-3">{musician.name}</h3>
                  <p className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-500 dark:from-blue-400 dark:to-blue-300 bg-clip-text text-transparent">
                    {formatCurrency(musician.balance)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">Klick um Transaktionen anzuzeigen</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Statement Modal */}
      {selectedMusician && (
        <Dialog open={!!selectedMusician} onOpenChange={() => setSelectedMusician(null)}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Kontoauszug - {selectedMusician.name}</DialogTitle>
              <DialogDescription>
                Vollständige Transaktionshistorie und aktueller Kontostand
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              {/* Current Balance */}
              <div className="bg-gradient-to-r from-blue-500/20 to-blue-600/20 dark:from-blue-900/40 dark:to-blue-800/40 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-muted-foreground mb-1">Aktueller Kontostand</p>
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  {formatCurrency(selectedMusician.balance)}
                </p>
              </div>

              {/* Transactions */}
              <div>
                <h3 className="font-semibold mb-3">Aktuelle Transaktionen</h3>
                <div className="space-y-2 max-h-[350px] overflow-y-auto">
                  {getMusiciansTransactions(selectedMusician.id).map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div
                          className={`p-2 rounded-full ${
                            transaction.type === 'earn'
                              ? 'bg-green-100 dark:bg-green-900/30'
                              : 'bg-red-100 dark:bg-red-900/30'
                          }`}
                        >
                          {transaction.type === 'earn' ? (
                            <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
                          ) : (
                            <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{transaction.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {transaction.date ? formatDate(new Date(transaction.date)) : '-'}
                          </p>
                        </div>
                      </div>
                      <p
                        className={`font-semibold text-sm ${
                          transaction.type === 'earn'
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {transaction.type === 'earn' ? '+' : ''}
                        {formatCurrency(transaction.amount)}
                      </p>
                    </div>
                  ))}
                  {getMusiciansTransactions(selectedMusician.id).length === 0 && (
                    <p className="text-muted-foreground text-center py-4 text-sm">
                      Keine Transaktionen vorhanden.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

export default Dashboard

