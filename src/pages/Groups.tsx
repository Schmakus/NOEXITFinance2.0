import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

function Groups() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gruppen</h1>
          <p className="text-muted-foreground mt-2">Verwalte Musikergruppen</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Gruppe hinzufügen
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Gruppenliste</CardTitle>
          <CardDescription>Alle Musikergruppen</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            Noch keine Gruppen hinzugefügt. Klick auf "Gruppe hinzufügen" um zu beginnen.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default Groups
