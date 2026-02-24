import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Plus, Pencil, Trash2, Tag } from 'lucide-react'
import { useTags } from '@/contexts/TagsContext'
import { useAuth } from '@/contexts/AuthContext'
import { Spinner } from '@/components/ui/spinner'
import { supabase } from '@/lib/supabase'

function Tags() {
  const { user } = useAuth()
  const { tags, tagNames, isLoading, addTag, removeTag, updateTag } = useTags()
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [editingTag, setEditingTag] = useState<{ id: string; name: string } | null>(null)
  const [editName, setEditName] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleAddTag = async () => {
    const name = newTagName.trim()
    if (!name) return
    if (tagNames.includes(name)) {
      setError('Dieses Keyword existiert bereits')
      return
    }
    try {
      await addTag(name)
      // Logging-Aufruf
      if (user) {
        await supabase.from('logs').insert({
          type: 'tag',
          action: 'create',
          label: name,
          description: 'Keyword erstellt',
          user_id: user.id,
          user_name: user.name,
        })
      }
      setNewTagName('')
      setError(null)
      setShowAddDialog(false)
    } catch (err) {
      console.error(err)
      setError('Fehler beim Erstellen')
    }
  }

  const handleEditTag = async () => {
    if (!editingTag) return
    const name = editName.trim()
    if (!name) return
    if (tagNames.includes(name) && name !== editingTag.name) {
      setError('Dieses Keyword existiert bereits')
      return
    }
    try {
      await updateTag(editingTag.id, name)
      // Logging-Aufruf
      if (user) {
        await supabase.from('logs').insert({
          type: 'tag',
          action: 'update',
          label: name,
          description: 'Keyword bearbeitet',
          user_id: user.id,
          user_name: user.name,
        })
      }
      setShowEditDialog(false)
      setEditingTag(null)
      setEditName('')
      setError(null)
    } catch (err) {
      console.error(err)
      setError('Fehler beim Aktualisieren')
    }
  }

  const handleDeleteTag = async (id: string) => {
    if (!confirm('Dieses Keyword wirklich löschen?')) return
    try {
      await removeTag(id)
      // Logging-Aufruf
      if (user) {
        await supabase.from('logs').insert({
          type: 'tag',
          action: 'delete',
          label: id,
          description: 'Keyword gelöscht',
          user_id: user.id,
          user_name: user.name,
        })
      }
    } catch (err) {
      console.error(err)
    }
  }

  if (isLoading) {
    return <Spinner text="Keywords werden geladen..." />
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Keywords</h1>
          <p className="text-muted-foreground mt-1 sm:mt-2 text-sm sm:text-base">Verwalte Keywords für Konzerte und Buchungen</p>
        </div>
        <Button onClick={() => { setShowAddDialog(true); setError(null); setNewTagName('') }} className="btn-amber">
          <Plus className="w-4 h-4 mr-2" />
          Neues Keyword
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Alle Keywords</CardTitle>
          <CardDescription>{tags.length} Keywords insgesamt</CardDescription>
        </CardHeader>
        <CardContent>
          {tags.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Noch keine Keywords. Erstelle dein erstes Keyword.
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <div
                  key={tag.id}
                  className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2 group hover:bg-muted/80 transition-colors"
                >
                  <Tag className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium text-sm">{tag.name}</span>
                  <div className="flex gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => {
                        setEditingTag(tag)
                        setEditName(tag.name)
                        setError(null)
                        setShowEditDialog(true)
                      }}
                    >
                      <Pencil className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive hover:text-destructive"
                      onClick={() => handleDeleteTag(tag.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent style={{ backgroundColor: '#18181b', boxShadow: '0 8px 32px 0 rgba(0,0,0,0.37)' }}>
          <DialogHeader>
            <DialogTitle>Neues Keyword</DialogTitle>
            <DialogDescription>Erstelle ein neues Keyword für Konzerte und Buchungen</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tagName">Name</Label>
              <Input
                id="tagName"
                value={newTagName}
                onChange={(e) => { setNewTagName(e.target.value); setError(null) }}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                placeholder="Keyword eingeben"
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Abbrechen</Button>
            <Button onClick={handleAddTag} disabled={!newTagName.trim()}>Erstellen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent style={{ backgroundColor: '#18181b', boxShadow: '0 8px 32px 0 rgba(0,0,0,0.37)' }}>
          <DialogHeader>
            <DialogTitle>Keyword bearbeiten</DialogTitle>
            <DialogDescription>Ändere den Namen des Keywords</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editTagName">Name</Label>
              <Input
                id="editTagName"
                value={editName}
                onChange={(e) => { setEditName(e.target.value); setError(null) }}
                onKeyDown={(e) => e.key === 'Enter' && handleEditTag()}
                placeholder="Keyword eingeben"
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>Abbrechen</Button>
            <Button onClick={handleEditTag} disabled={!editName.trim()}>Speichern</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default Tags
