import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

function Concerts() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Konzerte</h1>
          <p className="text-muted-foreground mt-2">Verwalte Konzertereignisse</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Konzert hinzufügen
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Konzertliste</CardTitle>
          <CardDescription>Alle Konzerte und Veranstaltungen</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            Noch keine Konzerte hinzugefügt. Klick auf "Konzert hinzufügen" um zu beginnen.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default Concerts
