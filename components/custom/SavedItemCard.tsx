'use client'

import { SavedItem } from '@/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Utensils, Pill, Package, Edit, Trash2, Clock } from 'lucide-react'

interface SavedItemCardProps {
  item: SavedItem
  onItemUpdated: () => void
}

export function SavedItemCard({ item, onItemUpdated }: SavedItemCardProps) {
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'meal':
      case 'snack':
        return <Utensils className="h-4 w-4" />
      case 'supplement':
        return <Pill className="h-4 w-4" />
      case 'drink':
        return <Package className="h-4 w-4" />
      default:
        return <Package className="h-4 w-4" />
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'meal':
        return 'bg-blue-100 text-blue-800'
      case 'snack':
        return 'bg-yellow-100 text-yellow-800'
      case 'supplement':
        return 'bg-green-100 text-green-800'
      case 'drink':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatNutrition = () => {
    const parts = []
    if (item.kcal_per_serving) parts.push(`${item.kcal_per_serving} cal`)
    if (item.g_protein_per_serving) parts.push(`${item.g_protein_per_serving}g protein`)
    if (item.g_carb_per_serving) parts.push(`${item.g_carb_per_serving}g carbs`)
    if (item.g_fat_per_serving) parts.push(`${item.g_fat_per_serving}g fat`)
    return parts.join(' • ')
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {getCategoryIcon(item.category)}
            <CardTitle className="text-lg">{item.name}</CardTitle>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-600 hover:text-red-700">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge className={getCategoryColor(item.category)}>
            {item.category}
          </Badge>
          {item.brand && (
            <Badge variant="outline">
              {item.brand.name}
            </Badge>
          )}
        </div>

        {item.brand && item.brand.description && (
          <CardDescription>{item.brand.description}</CardDescription>
        )}
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-3">
          {/* Serving Size */}
          {item.serving_size && (
            <div className="text-sm text-gray-600">
              <span className="font-medium">Serving:</span> {item.serving_size}
            </div>
          )}

          {/* Nutrition Info */}
          {formatNutrition() && (
            <div className="text-sm text-gray-600">
              <span className="font-medium">Nutrition:</span> {formatNutrition()}
            </div>
          )}

          {/* Usage Stats */}
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>Used {item.times_used} times</span>
            </div>
            {item.last_used_at && (
              <span>
                Last: {new Date(item.last_used_at).toLocaleDateString()}
              </span>
            )}
          </div>

          {/* Notes */}
          {item.notes && (
            <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
              {item.notes}
            </div>
          )}

          {/* Ingredients */}
          {item.ingredients && item.ingredients.length > 0 && (
            <div className="text-sm">
              <span className="font-medium text-gray-700">Ingredients:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {item.ingredients.map((ingredient, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {ingredient}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Allergens */}
          {item.allergens && item.allergens.length > 0 && (
            <div className="text-sm">
              <span className="font-medium text-red-700">Allergens:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {item.allergens.map((allergen, index) => (
                  <Badge key={index} variant="destructive" className="text-xs">
                    {allergen}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
} 