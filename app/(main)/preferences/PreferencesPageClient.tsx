'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { User, Preference } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'

interface PreferencesPageClientProps {
  user: User
  initialPreferences: Preference[]
}

export function PreferencesPageClient({ user, initialPreferences }: PreferencesPageClientProps) {
  const [preferences, setPreferences] = useState(initialPreferences)
  const [newPreference, setNewPreference] = useState({
    type: 'allergy',
    food_name: '',
    notes: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  
  const router = useRouter()
  const supabase = createClient()

  const handleAddPreference = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPreference.food_name.trim()) return

    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('preferences')
        .insert({
          user_id: user.id,
          type: newPreference.type,
          food_name: newPreference.food_name.trim(),
          notes: newPreference.notes.trim() || null
        })
        .select()
        .single()

      if (error) throw error

      setPreferences(prev => [data, ...prev])
      setNewPreference({ type: 'allergy', food_name: '', notes: '' })
    } catch (error) {
      console.error('Error adding preference:', error)
      alert('Failed to add preference')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeletePreference = async (id: string) => {
    try {
      const { error } = await supabase
        .from('preferences')
        .delete()
        .eq('id', id)

      if (error) throw error

      setPreferences(prev => prev.filter(p => p.id !== id))
    } catch (error) {
      console.error('Error deleting preference:', error)
      alert('Failed to delete preference')
    }
  }

  const getPreferenceTypeLabel = (type: string) => {
    switch (type) {
      case 'allergy': return 'Allergy'
      case 'dietary_restriction': return 'Dietary Restriction'
      case 'goal': return 'Goal'
      case 'dislike': return 'Dislike'
      default: return type
    }
  }

  const getPreferenceTypeColor = (type: string) => {
    switch (type) {
      case 'allergy': return 'bg-red-100 text-red-700'
      case 'dietary_restriction': return 'bg-blue-100 text-blue-700'
      case 'goal': return 'bg-green-100 text-green-700'
      case 'dislike': return 'bg-yellow-100 text-yellow-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold text-gray-900">Preferences</h1>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Add New Preference */}
        <Card>
          <CardHeader>
            <CardTitle>Add New Preference</CardTitle>
            <CardDescription>
              Add dietary restrictions, allergies, goals, or foods you dislike
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddPreference} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                    Type
                  </label>
                  <select
                    id="type"
                    value={newPreference.type}
                    onChange={(e) => setNewPreference(prev => ({ ...prev, type: e.target.value }))}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="allergy">Allergy</option>
                    <option value="dietary_restriction">Dietary Restriction</option>
                    <option value="goal">Goal</option>
                    <option value="dislike">Dislike</option>
                  </select>
                </div>
                
                <div>
                  <label htmlFor="food_name" className="block text-sm font-medium text-gray-700 mb-1">
                    Food/Item
                  </label>
                  <Input
                    id="food_name"
                    type="text"
                    value={newPreference.food_name}
                    onChange={(e) => setNewPreference(prev => ({ ...prev, food_name: e.target.value }))}
                    placeholder="e.g., peanuts, dairy, gluten"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (optional)
                </label>
                <Input
                  id="notes"
                  type="text"
                  value={newPreference.notes}
                  onChange={(e) => setNewPreference(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional details..."
                />
              </div>

              <Button type="submit" disabled={isLoading || !newPreference.food_name.trim()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Preference
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Current Preferences */}
        <Card>
          <CardHeader>
            <CardTitle>Your Preferences</CardTitle>
            <CardDescription>
              {preferences.length === 0 
                ? 'No preferences set yet'
                : `${preferences.length} preference${preferences.length === 1 ? '' : 's'} configured`
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {preferences.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No preferences added yet.</p>
                <p className="text-sm mt-1">Add your first preference above to get started.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {preferences.map((preference) => (
                  <div
                    key={preference.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPreferenceTypeColor(preference.type)}`}>
                        {getPreferenceTypeLabel(preference.type)}
                      </span>
                      <div>
                        <p className="font-medium text-gray-900">{preference.food_name}</p>
                        {preference.notes && (
                          <p className="text-sm text-gray-600">{preference.notes}</p>
                        )}
                      </div>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeletePreference(preference.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 