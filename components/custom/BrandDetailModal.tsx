'use client'
import { useState } from 'react'
import { Brand, BrandMenuItem } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Utensils, Pill, Package, X, DollarSign, Plus } from 'lucide-react'
import { useBrandMenuItems } from '@/lib/supabase/client-cache'
import { CreateBrandMenuItemModal } from './CreateBrandMenuItemModal'

interface BrandDetailModalProps {
  isOpen: boolean
  onClose: () => void
  brand: Brand | null
}

export function BrandDetailModal({ 
  isOpen, 
  onClose, 
  brand
}: BrandDetailModalProps) {
  const [showCreateItemModal, setShowCreateItemModal] = useState(false)

  // Fetch brand menu items
  const { data: brandMenuItems = [], isLoading: menuItemsLoading, error: menuItemsError } = useBrandMenuItems(
    brand?.id || '', 
    { enabled: isOpen && !!brand?.id }
  )

  // Basic debug logging
  console.log('BrandDetailModal Debug:', {
    isOpen,
    brandId: brand?.id,
    brandName: brand?.name,
    menuItemsCount: brandMenuItems.length,
    menuItemsLoading,
    menuItemsError,
    timestamp: new Date().toISOString()
  })

  if (!isOpen || !brand) return null

  // Only show imported brand menu items
  const allItems = brandMenuItems

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
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setShowCreateItemModal(true)}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
                <button 
                  className="text-gray-400 hover:text-gray-600 p-1"
                  onClick={onClose}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Brand Menu Items</h3>
                <p className="text-sm text-gray-600">
                  {allItems.length} imported menu items
                </p>
              </div>
            </div>

            {menuItemsLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-500 mt-2">Loading items...</p>
              </div>
            ) : allItems.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No items yet</h3>
                <p className="text-gray-500">
                  No saved items or imported menu items found for this brand.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {allItems.map((item) => (
                  <Card key={item.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          {getCategoryIcon(item.category || 'meal')}
                          <CardTitle className="text-lg">{item.name}</CardTitle>
                        </div>
                        {item.price_cents && (
                          <div className="flex items-center gap-1 text-green-600">
                            <DollarSign className="h-4 w-4" />
                            <span className="font-semibold">
                              {item.currency || '$'}{(item.price_cents / 100).toFixed(2)}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      <Badge className={getCategoryColor(item.category || 'meal')}>
                        {item.category || 'meal'}
                      </Badge>
                    </CardHeader>

                    <CardContent className="pt-0">
                      <div className="space-y-3">
                        {/* Description */}
                        {item.description && (
                          <div className="text-sm text-gray-600">
                            {item.description}
                          </div>
                        )}

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

                        {/* Import Info */}
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <Badge variant="outline" className="text-xs">
                            {item.import_source}
                          </Badge>
                          {item.created_at && (
                            <span>
                              Added: {new Date(item.created_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>

                        {/* Ingredients */}
                        {item.ingredients && item.ingredients.length > 0 && (
                          <div className="text-sm">
                            <span className="font-medium text-gray-700">Ingredients:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {item.ingredients.slice(0, 3).map((ingredient, index) => (
                                <Badge key={`ingredient-${index}`} variant="outline" className="text-xs">
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
                                <Badge key={`allergen-${index}`} variant="destructive" className="text-xs">
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

      {/* Create Menu Item Modal */}
      {brand && (
        <CreateBrandMenuItemModal
          isOpen={showCreateItemModal}
          onClose={() => setShowCreateItemModal(false)}
          brand={brand}
        />
      )}
    </>
  )
} 