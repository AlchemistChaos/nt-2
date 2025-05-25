'use client'

import { useState } from 'react'
import { Brand, SavedItem } from '@/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Utensils, Pill, Package, Edit, Clock, X } from 'lucide-react'
import { EditSavedItemModal } from './EditSavedItemModal'

interface BrandDetailModalProps {
  isOpen: boolean
  onClose: () => void
  brand: Brand | null
  savedItems: SavedItem[]
  brands: Brand[]
  brandStats: { itemCount: number; totalUsage: number } | undefined
}

export function BrandDetailModal({ 
  isOpen, 
  onClose, 
  brand, 
  savedItems, 
  brands,
  brandStats 
}: BrandDetailModalProps) {
  const [editingItem, setEditingItem] = useState<SavedItem | null>(null)
  const [showEditItemModal, setShowEditItemModal] = useState(false)

  if (!isOpen || !brand) return null

  const brandItems = savedItems.filter(item => item.brand_id === brand.id)

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

  const handleEditItem = (item: SavedItem) => {
    setEditingItem(item)
    setShowEditItemModal(true)
  }

  const handleCloseEditModal = () => {
    setShowEditItemModal(false)
    setEditingItem(null)
  }

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold">{brand.name}</h2>
                {brand.description && (
                  <p className="text-gray-600 mt-1">{brand.description}</p>
                )}
                <div className="flex items-center gap-4 mt-2">
                  <Badge className="capitalize">
                    {brand.type.replace('_', ' ')}
                  </Badge>
                  {brandStats && (
                    <>
                      <span className="text-sm text-gray-600">
                        {brandStats.itemCount} {brandStats.itemCount === 1 ? 'item' : 'items'}
                      </span>
                      <span className="text-sm text-gray-600">
                        Used {brandStats.totalUsage} {brandStats.totalUsage === 1 ? 'time' : 'times'}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {brandItems.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No items yet</h3>
                <p className="text-gray-500">
                  No saved items have been added to this brand yet.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {brandItems.map((item) => (
                  <Card key={item.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          {getCategoryIcon(item.category)}
                          <CardTitle className="text-lg">{item.name}</CardTitle>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0"
                          onClick={() => handleEditItem(item)}
                          title="Edit item"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <Badge className={getCategoryColor(item.category)}>
                        {item.category}
                      </Badge>
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
                        {(item.kcal_per_serving || item.g_protein_per_serving || item.g_carb_per_serving || item.g_fat_per_serving) && (
                          <div className="text-sm text-gray-600">
                            <span className="font-medium">Nutrition:</span>{' '}
                            {[
                              item.kcal_per_serving && `${item.kcal_per_serving} cal`,
                              item.g_protein_per_serving && `${item.g_protein_per_serving}g protein`,
                              item.g_carb_per_serving && `${item.g_carb_per_serving}g carbs`,
                              item.g_fat_per_serving && `${item.g_fat_per_serving}g fat`
                            ].filter(Boolean).join(' • ')}
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
                              {item.ingredients.slice(0, 3).map((ingredient, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {ingredient}
                                </Badge>
                              ))}
                              {item.ingredients.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{item.ingredients.length - 3} more
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Allergens */}
                        {item.allergens && item.allergens.length > 0 && (
                          <div className="text-sm">
                            <span className="font-medium text-red-700">Allergens:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {item.allergens.slice(0, 3).map((allergen, index) => (
                                <Badge key={index} variant="destructive" className="text-xs">
                                  {allergen}
                                </Badge>
                              ))}
                              {item.allergens.length > 3 && (
                                <Badge variant="destructive" className="text-xs">
                                  +{item.allergens.length - 3} more
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Item Modal */}
      <EditSavedItemModal
        isOpen={showEditItemModal}
        onClose={handleCloseEditModal}
        item={editingItem}
        brands={brands}
      />
    </>
  )
} 