'use client'

import { useState } from 'react'
import { Brand } from '@/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Edit, Trash2, ExternalLink } from 'lucide-react'
import { useDeleteBrand } from '@/lib/supabase/client-cache'

interface BrandCardProps {
  brand: Brand
  brandStats: { itemCount: number; totalUsage: number } | undefined
  onEdit: (brand: Brand) => void
  onViewDetails: (brand: Brand) => void
  onBrandUpdated: () => void
}

export function BrandCard({ 
  brand, 
  brandStats, 
  onEdit, 
  onViewDetails, 
  onBrandUpdated 
}: BrandCardProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const deleteBrand = useDeleteBrand()

  const getBrandTypeColor = (type: string) => {
    switch (type) {
      case 'restaurant':
        return 'bg-orange-100 text-orange-800'
      case 'supplement_brand':
        return 'bg-green-100 text-green-800'
      case 'food_brand':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    onEdit(brand)
  }

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isDeleting) return
    
    if (confirm(`Are you sure you want to delete "${brand.name}"? This action cannot be undone.`)) {
      setIsDeleting(true)
      try {
        await deleteBrand.mutateAsync(brand.id)
        onBrandUpdated()
      } catch (error) {
        console.error('Error deleting brand:', error)
        alert('Error deleting brand: ' + (error as Error).message)
      } finally {
        setIsDeleting(false)
      }
    }
  }

  const handleCardClick = () => {
    onViewDetails(brand)
  }

  const handleWebsiteClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (brand.website) {
      window.open(brand.website, '_blank')
    }
  }

  return (
    <Card 
      className="hover:shadow-md transition-shadow cursor-pointer"
      onClick={handleCardClick}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <CardTitle className="text-lg truncate">{brand.name}</CardTitle>
            {brand.website && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-gray-400 hover:text-blue-600"
                onClick={handleWebsiteClick}
                title="Visit website"
              >
                <ExternalLink className="h-3 w-3" />
              </Button>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0"
              onClick={handleEdit}
              title="Edit brand"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
              onClick={handleDelete}
              disabled={isDeleting}
              title="Delete brand"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge className={getBrandTypeColor(brand.type)}>
            {brand.type.replace('_', ' ')}
          </Badge>
        </div>

        {brand.description && (
          <CardDescription className="line-clamp-2">{brand.description}</CardDescription>
        )}
      </CardHeader>

      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">
              {brandStats?.itemCount || 0} {(brandStats?.itemCount || 0) === 1 ? 'item' : 'items'}
            </span>
            <span className="text-gray-600">
              Used {brandStats?.totalUsage || 0} {(brandStats?.totalUsage || 0) === 1 ? 'time' : 'times'}
            </span>
          </div>
          
          <div className="text-xs text-gray-500 pt-1 border-t">
            Click to view all items in this brand
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 