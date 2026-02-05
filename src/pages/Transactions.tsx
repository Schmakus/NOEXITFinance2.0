import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

function Transactions() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Transaktionen</h1>
          <p className="text-muted-foreground mt-2">Verfolge alle Finanztransaktionen</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Transaktion hinzufügen
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transaktionsliste</CardTitle>
          <CardDescription>Alle Transaktionen</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            Noch keine Transaktionen hinzugefügt. Klick auf "Transaktion hinzufügen" um zu beginnen.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default Transactions
