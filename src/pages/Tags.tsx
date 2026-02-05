import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

function Tags() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tags</h1>
          <p className="text-muted-foreground mt-2">Verwalte Transaktions-Tags</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Tag hinzufügen
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tags-Liste</CardTitle>
          <CardDescription>Alle Transaktions-Tags</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            Noch keine Tags hinzugefügt. Klick auf "Tag hinzufügen" um zu beginnen.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default Tags
