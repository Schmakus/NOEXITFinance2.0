import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/contexts/AuthContext'

function Settings() {
  const { user } = useAuth()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Einstellungen</h1>
        <p className="text-muted-foreground mt-2">Verwalte deine Kontoeinstellungen</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Kontoinformationen</CardTitle>
          <CardDescription>Deine Profildetails</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Name</label>
            <p className="text-foreground mt-1">{user?.name}</p>
          </div>
          <div>
            <label className="text-sm font-medium">E-Mail</label>
            <p className="text-foreground mt-1">{user?.email}</p>
          </div>
          <div>
            <label className="text-sm font-medium">Rolle</label>
            <p className="text-foreground mt-1 capitalize">{user?.role || 'Benutzer'}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Einstellungen</CardTitle>
          <CardDescription>Passe dein App-Erlebnis an</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Design</label>
            <p className="text-muted-foreground mt-1">Kommt bald</p>
          </div>
          <div>
            <label className="text-sm font-medium">Benachrichtigungen</label>
            <p className="text-muted-foreground mt-1">Kommt bald</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default Settings
