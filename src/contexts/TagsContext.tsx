import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import {
  fetchTags as apiFetchTags,
  createTag as apiCreateTag,
  createTags as apiCreateTags,
  updateTagApi,
  deleteTagApi,
} from '@/lib/api-client'
import type { DbTag } from '@/lib/database.types'

interface TagsContextType {
  tags: DbTag[]
  tagNames: string[]
  isLoading: boolean
  addTag: (name: string) => Promise<void>
  addTags: (names: string[]) => Promise<void>
  removeTag: (id: string) => Promise<void>
  updateTag: (id: string, newName: string) => Promise<void>
  reload: () => Promise<void>
}

const TagsContext = createContext<TagsContextType | undefined>(undefined)

export function TagsProvider({ children }: { children: ReactNode }) {
  const [tags, setTags] = useState<DbTag[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadTags = useCallback(async () => {
    try {
      const data = await apiFetchTags()
      setTags(data)
    } catch (err) {
      console.error('Tags laden fehlgeschlagen:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadTags()
  }, [loadTags])

  const addTag = useCallback(async (name: string) => {
    if (!name) return
    // Skip if already exists
    if (tags.some((t) => t.name === name)) return
    try {
      const newTag = await apiCreateTag(name)
      setTags((prev) => [...prev, newTag].sort((a, b) => a.name.localeCompare(b.name)))
    } catch (err: any) {
      // Unique constraint violation — tag already exists
      if (err?.code === '23505') return
      console.error('Tag erstellen fehlgeschlagen:', err)
    }
  }, [tags])

  const addTags = useCallback(async (names: string[]) => {
    const newNames = names.filter((n) => n && !tags.some((t) => t.name === n))
    if (newNames.length === 0) return
    try {
      await apiCreateTags(newNames)
      await loadTags() // Reload to get all tags sorted
    } catch (err) {
      console.error('Tags erstellen fehlgeschlagen:', err)
    }
  }, [tags, loadTags])

  const removeTag = useCallback(async (id: string) => {
    try {
      await deleteTagApi(id)
      setTags((prev) => prev.filter((t) => t.id !== id))
    } catch (err) {
      console.error('Tag löschen fehlgeschlagen:', err)
    }
  }, [])

  const updateTag = useCallback(async (id: string, newName: string) => {
    if (!newName) return
    if (tags.some((t) => t.name === newName && t.id !== id)) return
    try {
      const updated = await updateTagApi(id, newName)
      setTags((prev) =>
        prev.map((t) => (t.id === id ? updated : t)).sort((a, b) => a.name.localeCompare(b.name))
      )
    } catch (err) {
      console.error('Tag aktualisieren fehlgeschlagen:', err)
    }
  }, [tags])

  const tagNames = tags.map((t) => t.name)

  return (
    <TagsContext.Provider
      value={{
        tags,
        tagNames,
        isLoading,
        addTag,
        addTags,
        removeTag,
        updateTag,
        reload: loadTags,
      }}
    >
      {children}
    </TagsContext.Provider>
  )
}

export function useTags() {
  const context = useContext(TagsContext)
  if (context === undefined) {
    throw new Error('useTags must be used within a TagsProvider')
  }
  return context
}
