'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Check, X, Edit3, Save, Loader2 } from 'lucide-react'
import { ImportReviewItem, ImportMenuResponse } from '@/types'
import { useCreateBrandMenuItems } from '@/lib/supabase/client-cache'
import { useQueryClient } from '@tanstack/react-query'

interface ImportReviewTableProps {
  analysisResult: ImportMenuResponse
  importSource: 'csv' | 'image'
  onComplete: () => void
  onCancel: () => void
}

export function ImportReviewTable({ 
  analysisResult, 
  importSource, 
  onComplete, 
  onCancel 
}: ImportReviewTableProps) {
  const [items, setItems] = useState<ImportReviewItem[]>(() => 
    analysisResult.items.map(item => ({
      ...item,
      isApproved: true, // Default to approved
      isEdited: false
    }))
  )
  const [editingId, setEditingId] = useState<string | null>(null)
  
  const [isSaving, setIsSaving] = useState(false)
  const queryClient = useQueryClient()

  // Statistics
  const stats = useMemo(() => {
    const approved = items.filter(item => item.isApproved)
    const rejected = items.filter(item => !item.isApproved)
    const edited = items.filter(item => item.isEdited)
    
    return {
      total: items.length,
      approved: approved.length,
      rejected: rejected.length,
      edited: edited.length,
      avgCalories: approved.length > 0 
        ? Math.round(approved.reduce((sum, item) => sum + (item.kcal_per_serving || 0), 0) / approved.length)
        : 0,
      avgPrice: approved.length > 0 
        ? (approved.reduce((sum, item) => sum + (item.price_cents || 0), 0) / approved.length / 100)
        : 0
    }
  }, [items])

  const handleToggleApproval = (index: number) => {
    setItems(prev => prev.map((item, i) => 
      i === index ? { ...item, isApproved: !item.isApproved } : item
    ))
  }

  const handleBulkOperation = (operation: 'approve-all' | 'reject-all' | 'approve-edited' | 'reject-unedited') => {
    console.log('Bulk operation:', operation)
    setItems(prev => {
      const updated = prev.map(item => {
        let newItem = { ...item }
        switch (operation) {
          case 'approve-all':
            newItem.isApproved = true
            break
          case 'reject-all':
            newItem.isApproved = false
            break
          case 'approve-edited':
            if (item.isEdited) newItem.isApproved = true
            break
          case 'reject-unedited':
            if (!item.isEdited) newItem.isApproved = false
            break
        }
        return newItem
      })
      console.log('Updated items:', updated.map(i => ({ name: i.name, isApproved: i.isApproved })))
      return updated
    })
  }

  const handleEditItem = (index: number, field: string, value: any) => {
    setItems(prev => prev.map((item, i) => 
      i === index 
        ? { 
            ...item, 
            [field]: value,
            isEdited: true 
          } 
        : item
    ))
  }

  const handleSaveItems = async () => {
    const approvedItems = items.filter(item => item.isApproved)
    
    if (approvedItems.length === 0) {
      alert('Please approve at least one item to import')
      return
    }

    console.log('analysisResult.detectedBrand:', analysisResult.detectedBrand)

    setIsSaving(true)

    try {
      // Prepare brand information
      let brandId = analysisResult.detectedBrand?.id
      
      // If no brand ID, we'll need to handle brand creation in the API
      const requestData = {
        brandId: analysisResult.detectedBrand?.id,
        brandName: analysisResult.detectedBrand?.name,
        brandType: analysisResult.detectedBrand?.type,
        items: approvedItems,
        importSource
      }

      console.log('Confirming import with mutation:', {
        fullRequestData: requestData,
        brand: requestData.brandName,
        brandId: requestData.brandId,
        itemCount: approvedItems.length,
        source: importSource
      })

      // Call confirm API directly (since the mutation expects different params)
      const response = await fetch('/api/import-brand-menu/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save items')
      }

      const result = await response.json()
      console.log('Import successful:', result.itemsCreated, 'items created for brandId:', result.brandId)

      // Manually invalidate React Query cache to refresh the brand menu items
      if (result.brandId) {
        await queryClient.invalidateQueries({ 
          queryKey: ['brandMenuItems', result.brandId] 
        })
        await queryClient.invalidateQueries({ 
          queryKey: ['brands'] 
        })
        console.log('Cache invalidated for brandId:', result.brandId)
      }

      // Pass the created brand ID back to the parent so it can update properly
      onComplete()
      
      console.log('Import completed, cache refreshed')

    } catch (error) {
      console.error('Save error:', error)
      alert(error instanceof Error ? error.message : 'Failed to save items')
    } finally {
      setIsSaving(false)
    }
  }

  const formatPrice = (priceCents?: number) => {
    if (!priceCents) return '-'
    return `$${(priceCents / 100).toFixed(2)}`
  }

  const getCategoryColor = (category?: string) => {
    switch (category?.toLowerCase()) {
      case 'breakfast': return 'bg-yellow-100 text-yellow-800'
      case 'lunch': return 'bg-green-100 text-green-800'
      case 'dinner': return 'bg-blue-100 text-blue-800'
      case 'beverage': return 'bg-purple-100 text-purple-800'
      case 'dessert': return 'bg-pink-100 text-pink-800'
      case 'appetizer': return 'bg-orange-100 text-orange-800'
      case 'snack': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-7xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Review Import Results</h2>
              <p className="text-sm text-gray-600 mt-1">
                {analysisResult.detectedBrand?.name && (
                  <span className="font-medium">{analysisResult.detectedBrand.name}</span>
                )}
                {analysisResult.detectedBrand?.name && ' • '}
                {stats.total} items found from {importSource === 'image' ? 'image' : 'CSV'}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onCancel}
              disabled={isSaving}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="text-sm text-blue-600">Total Items</div>
              <div className="text-lg font-semibold text-blue-900">{stats.total}</div>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <div className="text-sm text-green-600">Approved</div>
              <div className="text-lg font-semibold text-green-900">{stats.approved}</div>
            </div>
            <div className="bg-red-50 p-3 rounded-lg">
              <div className="text-sm text-red-600">Rejected</div>
              <div className="text-lg font-semibold text-red-900">{stats.rejected}</div>
            </div>
            <div className="bg-orange-50 p-3 rounded-lg">
              <div className="text-sm text-orange-600">Avg Calories</div>
              <div className="text-lg font-semibold text-orange-900">{stats.avgCalories}</div>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg">
              <div className="text-sm text-purple-600">Avg Price</div>
              <div className="text-lg font-semibold text-purple-900">
                {stats.avgPrice > 0 ? `$${stats.avgPrice.toFixed(2)}` : '-'}
              </div>
            </div>
          </div>

          {/* Bulk Operations */}
          <div className="flex flex-wrap gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handleBulkOperation('approve-all')}
              disabled={isSaving}
            >
              <Check className="h-3 w-3 mr-1" />
              Approve All
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handleBulkOperation('reject-all')}
              disabled={isSaving}
            >
              <X className="h-3 w-3 mr-1" />
              Reject All
            </Button>
            {stats.edited > 0 && (
              <>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleBulkOperation('approve-edited')}
                  disabled={isSaving}
                >
                  <Edit3 className="h-3 w-3 mr-1" />
                  Approve Edited ({stats.edited})
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleBulkOperation('reject-unedited')}
                  disabled={isSaving}
                >
                  Reject Unedited
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[200px]">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                  Category
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                  Price
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                  Calories
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                  Protein
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                  Carbs
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                  Fat
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {items.map((item, index) => (
                <tr 
                  key={index} 
                  className={`${item.isApproved ? 'bg-white' : 'bg-gray-50 opacity-60'} ${item.isEdited ? 'border-l-4 border-l-orange-400' : ''}`}
                >
                  <td className="px-4 py-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleApproval(index)}
                      disabled={isSaving}
                      className={`h-8 w-8 ${item.isApproved 
                        ? 'text-green-600 hover:bg-green-50' 
                        : 'text-red-600 hover:bg-red-50'
                      }`}
                    >
                      {item.isApproved ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                    </Button>
                  </td>
                  
                  <td className="px-4 py-3">
                    {editingId === `${index}-name` ? (
                      <Input
                        value={item.name || ''}
                        onChange={(e) => handleEditItem(index, 'name', e.target.value)}
                        onBlur={() => setEditingId(null)}
                        onKeyDown={(e) => e.key === 'Enter' && setEditingId(null)}
                        className="h-8 text-sm"
                        autoFocus
                      />
                    ) : (
                      <div 
                        className="cursor-pointer hover:bg-gray-100 p-1 rounded"
                        onClick={() => setEditingId(`${index}-name`)}
                      >
                        <div className="font-medium text-sm">{item.name || 'Unnamed Item'}</div>
                        {item.description && (
                          <div className="text-xs text-gray-500 truncate max-w-[200px]">
                            {item.description}
                          </div>
                        )}
                      </div>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    {editingId === `${index}-category` ? (
                      <select
                        value={item.category || ''}
                        onChange={(e) => {
                          handleEditItem(index, 'category', e.target.value)
                          setEditingId(null)
                        }}
                        onBlur={() => setEditingId(null)}
                        className="h-8 text-sm border rounded px-2"
                        autoFocus
                      >
                        <option value="">-</option>
                        <option value="breakfast">Breakfast</option>
                        <option value="lunch">Lunch</option>
                        <option value="dinner">Dinner</option>
                        <option value="beverage">Beverage</option>
                        <option value="dessert">Dessert</option>
                        <option value="appetizer">Appetizer</option>
                        <option value="snack">Snack</option>
                      </select>
                    ) : (
                      <div 
                        className="cursor-pointer"
                        onClick={() => setEditingId(`${index}-category`)}
                      >
                        {item.category ? (
                          <span className={`px-2 py-1 text-xs rounded-full ${getCategoryColor(item.category)}`}>
                            {item.category}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">-</span>
                        )}
                      </div>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    {editingId === `${index}-price` ? (
                      <Input
                        type="number"
                        step="0.01"
                        value={item.price_cents ? (item.price_cents / 100).toFixed(2) : ''}
                        onChange={(e) => handleEditItem(index, 'price_cents', Math.round(parseFloat(e.target.value || '0') * 100))}
                        onBlur={() => setEditingId(null)}
                        onKeyDown={(e) => e.key === 'Enter' && setEditingId(null)}
                        className="h-8 text-sm w-20"
                        autoFocus
                      />
                    ) : (
                      <div 
                        className="cursor-pointer hover:bg-gray-100 p-1 rounded text-sm"
                        onClick={() => setEditingId(`${index}-price`)}
                      >
                        {formatPrice(item.price_cents)}
                      </div>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    {editingId === `${index}-calories` ? (
                      <Input
                        type="number"
                        value={item.kcal_per_serving || ''}
                        onChange={(e) => handleEditItem(index, 'kcal_per_serving', parseInt(e.target.value) || 0)}
                        onBlur={() => setEditingId(null)}
                        onKeyDown={(e) => e.key === 'Enter' && setEditingId(null)}
                        className="h-8 text-sm w-16"
                        autoFocus
                      />
                    ) : (
                      <div 
                        className="cursor-pointer hover:bg-gray-100 p-1 rounded text-sm"
                        onClick={() => setEditingId(`${index}-calories`)}
                      >
                        {item.kcal_per_serving || '-'}
                      </div>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    {editingId === `${index}-protein` ? (
                      <Input
                        type="number"
                        step="0.1"
                        value={item.g_protein_per_serving || ''}
                        onChange={(e) => handleEditItem(index, 'g_protein_per_serving', parseFloat(e.target.value) || 0)}
                        onBlur={() => setEditingId(null)}
                        onKeyDown={(e) => e.key === 'Enter' && setEditingId(null)}
                        className="h-8 text-sm w-16"
                        autoFocus
                      />
                    ) : (
                      <div 
                        className="cursor-pointer hover:bg-gray-100 p-1 rounded text-sm"
                        onClick={() => setEditingId(`${index}-protein`)}
                      >
                        {item.g_protein_per_serving ? `${item.g_protein_per_serving}g` : '-'}
                      </div>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    {editingId === `${index}-carbs` ? (
                      <Input
                        type="number"
                        step="0.1"
                        value={item.g_carb_per_serving || ''}
                        onChange={(e) => handleEditItem(index, 'g_carb_per_serving', parseFloat(e.target.value) || 0)}
                        onBlur={() => setEditingId(null)}
                        onKeyDown={(e) => e.key === 'Enter' && setEditingId(null)}
                        className="h-8 text-sm w-16"
                        autoFocus
                      />
                    ) : (
                      <div 
                        className="cursor-pointer hover:bg-gray-100 p-1 rounded text-sm"
                        onClick={() => setEditingId(`${index}-carbs`)}
                      >
                        {item.g_carb_per_serving ? `${item.g_carb_per_serving}g` : '-'}
                      </div>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    {editingId === `${index}-fat` ? (
                      <Input
                        type="number"
                        step="0.1"
                        value={item.g_fat_per_serving || ''}
                        onChange={(e) => handleEditItem(index, 'g_fat_per_serving', parseFloat(e.target.value) || 0)}
                        onBlur={() => setEditingId(null)}
                        onKeyDown={(e) => e.key === 'Enter' && setEditingId(null)}
                        className="h-8 text-sm w-16"
                        autoFocus
                      />
                    ) : (
                      <div 
                        className="cursor-pointer hover:bg-gray-100 p-1 rounded text-sm"
                        onClick={() => setEditingId(`${index}-fat`)}
                      >
                        {item.g_fat_per_serving ? `${item.g_fat_per_serving}g` : '-'}
                      </div>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center space-x-1">
                      {item.isEdited && (
                        <div className="h-2 w-2 bg-orange-400 rounded-full" title="Modified" />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {stats.approved} of {stats.total} items will be imported
              {stats.edited > 0 && (
                <span className="ml-2 text-orange-600">• {stats.edited} modified</span>
              )}
            </div>
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={onCancel}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveItems}
                disabled={stats.approved === 0 || isSaving}
                className="min-w-[120px]"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Import {stats.approved} Items
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 