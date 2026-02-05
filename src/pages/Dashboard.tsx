import { useState } from 'react'
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

interface Transaction {
  id: string
  date: string
  description: string
  amount: number
  type: 'income' | 'expense'
}

interface Musician {
  id: string
  name: string
  balance: number
}

const mockTransaction = (type: 'income' | 'expense', description: string, amount: number, date: string): Transaction => ({
  id: Math.random().toString(),
  type,
  description,
  amount,
  date,
})

const mockMusicians: Musician[] = [
  {
    id: '1',
    name: 'Max Mueller',
    balance: 2500,
  },
  {
    id: '2',
    name: 'Anna Schmidt',
    balance: 1800,
  },
  {
    id: '3',
    name: 'Tom Weber',
    balance: 950,
  },
  {
    id: '4',
    name: 'Julia Braun',
    balance: 3200,
  },
]

const mockTransactionsByMusician: Record<string, Transaction[]> = {
  '1': [
    mockTransaction('income', 'Concert Payment - Rock Nacht', 500, '2026-02-01'),
    mockTransaction('income', 'Session Work - Studio XYZ', 300, '2026-01-28'),
    mockTransaction('expense', 'Equipment Repair', -150, '2026-01-25'),
    mockTransaction('income', 'Band Split - Monthly', 400, '2026-01-20'),
  ],
  '2': [
    mockTransaction('income', 'Concert Payment - Summer Festival', 600, '2026-02-03'),
    mockTransaction('income', 'Teaching Lessons', 200, '2026-01-30'),
    mockTransaction('expense', 'Strings - Replacement', -50, '2026-01-22'),
    mockTransaction('income', 'Band Split - Monthly', 400, '2026-01-20'),
  ],
  '3': [
    mockTransaction('income', 'Concert Payment - Jazz Club', 300, '2026-02-02'),
    mockTransaction('expense', 'Setup Fee', -100, '2026-01-29'),
    mockTransaction('income', 'Band Split - Monthly', 400, '2026-01-20'),
  ],
  '4': [
    mockTransaction('income', 'Corporate Event - Company Gala', 800, '2026-02-04'),
    mockTransaction('income', 'Concert Payment - Summer Festival', 600, '2026-02-03'),
    mockTransaction('income', 'Session Work - Studio XYZ', 400, '2026-01-28'),
    mockTransaction('expense', 'Equipment Purchase', -300, '2026-01-25'),
    mockTransaction('income', 'Band Split - Monthly', 400, '2026-01-20'),
  ],
}

function Dashboard() {
  const [selectedMusician, setSelectedMusician] = useState<Musician | null>(null)
  const totalBalance = mockMusicians.reduce((sum, m) => sum + m.balance, 0)

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
          {mockMusicians.map((musician) => (
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
                  {(mockTransactionsByMusician[selectedMusician.id] || []).map(
                    (transaction) => (
                      <div
                        key={transaction.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <div
                            className={`p-2 rounded-full ${
                              transaction.type === 'income'
                                ? 'bg-green-100 dark:bg-green-900/30'
                                : 'bg-red-100 dark:bg-red-900/30'
                            }`}
                          >
                            {transaction.type === 'income' ? (
                              <TrendingUp
                                className="w-4 h-4 text-green-600 dark:text-green-400"
                              />
                            ) : (
                              <TrendingDown
                                className="w-4 h-4 text-red-600 dark:text-red-400"
                              />
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-sm">{transaction.description}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(new Date(transaction.date))}
                            </p>
                          </div>
                        </div>
                        <p
                          className={`font-semibold text-sm ${
                            transaction.type === 'income'
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}
                        >
                          {transaction.type === 'income' ? '+' : ''}
                          {formatCurrency(transaction.amount)}
                        </p>
                      </div>
                    )
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

