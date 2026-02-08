import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Wallet } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { Spinner } from '@/components/ui/spinner'
import { fetchMusicians, fetchTransactionsWithMusician } from '@/lib/api-client'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import type { DbMusician, TransactionWithMusician } from '@/lib/database.types'

interface MusicianWithBalance {
  id: string
  name: string
  balance: number
}

function Dashboard() {
  const navigate = useNavigate()
  const { user, isUser } = useAuth()
  const [musicians, setMusicians] = useState<DbMusician[]>([])
  const [transactions, setTransactions] = useState<TransactionWithMusician[]>([])
  const [loading, setLoading] = useState(true)

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

  if (loading) {
    return <Spinner text="Dashboard wird geladen..." />
  }

  return (
    <div className="space-y-8">
      <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1 sm:mt-2 text-sm sm:text-base">Übersicht deiner Bandmitglieder</p>
      </div>

      {/* Total Balance Card */}
      <Card className="bg-gradient-to-br from-amber-500/20 via-transparent to-amber-600/20 border-amber-300 dark:border-amber-700">
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
    </div>
  )
}

export default Dashboard

