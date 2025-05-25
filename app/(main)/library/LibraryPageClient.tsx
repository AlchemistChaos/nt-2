'use client'

import { useState } from 'react'
import { User } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Plus, Search, Clock, Star, Package, Utensils, Pill } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useSavedItems, useBrands, useSupplementSchedules } from '@/lib/supabase/client-cache'
import { SavedItemCard } from '@/components/custom/SavedItemCard'
import { CreateSavedItemModal } from '@/components/custom/CreateSavedItemModal'
import { CreateBrandModal } from '@/components/custom/CreateBrandModal'

interface LibraryPageClientProps {
  user: User
}

export function LibraryPageClient({ user }: LibraryPageClientProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateItemModal, setShowCreateItemModal] = useState(false)
  const [showCreateBrandModal, setShowCreateBrandModal] = useState(false)
  const [activeTab, setActiveTab] = useState('items')

  // Fetch data using React Query
  const { data: savedItems = [], isLoading: itemsLoading } = useSavedItems(user.id)
  const { data: brands = [], isLoading: brandsLoading } = useBrands()
  const { data: supplementSchedules = [], isLoading: schedulesLoading } = useSupplementSchedules(user.id)

  // Filter items based on search query
  const filteredItems = savedItems.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.brand?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.category.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredBrands = brands.filter(brand =>
    brand.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    brand.type.toLowerCase().includes(searchQuery.toLowerCase())
  )

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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">📚 Quick Add Library</h1>
              <p className="text-sm text-gray-500">Manage your saved meals, supplements, and brands</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setShowCreateBrandModal(true)}
              variant="outline"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Brand
            </Button>
            <Button
              onClick={() => setShowCreateItemModal(true)}
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search items, brands, or categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="items" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Saved Items ({savedItems.length})
            </TabsTrigger>
            <TabsTrigger value="brands" className="flex items-center gap-2">
              <Star className="h-4 w-4" />
              Brands ({brands.length})
            </TabsTrigger>
            <TabsTrigger value="supplements" className="flex items-center gap-2">
              <Pill className="h-4 w-4" />
              Supplements ({supplementSchedules.length})
            </TabsTrigger>
          </TabsList>

          {/* Saved Items Tab */}
          <TabsContent value="items" className="mt-6">
            {itemsLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-500 mt-2">Loading saved items...</p>
              </div>
            ) : filteredItems.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No saved items yet</h3>
                  <p className="text-gray-500 mb-4">
                    {searchQuery ? 'No items match your search.' : 'Start building your quick add library by saving frequently used meals and supplements.'}
                  </p>
                  {!searchQuery && (
                    <Button onClick={() => setShowCreateItemModal(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Your First Item
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredItems.map((item) => (
                  <SavedItemCard
                    key={item.id}
                    item={item}
                    onItemUpdated={() => {
                      // React Query will automatically refetch
                    }}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Brands Tab */}
          <TabsContent value="brands" className="mt-6">
            {brandsLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-500 mt-2">Loading brands...</p>
              </div>
            ) : filteredBrands.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <Star className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No brands found</h3>
                  <p className="text-gray-500 mb-4">
                    {searchQuery ? 'No brands match your search.' : 'Add brands to organize your saved items.'}
                  </p>
                  {!searchQuery && (
                    <Button onClick={() => setShowCreateBrandModal(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Brand
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredBrands.map((brand) => (
                  <Card key={brand.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{brand.name}</CardTitle>
                        <Badge className={getBrandTypeColor(brand.type)}>
                          {brand.type.replace('_', ' ')}
                        </Badge>
                      </div>
                      {brand.description && (
                        <CardDescription>{brand.description}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm text-gray-500">
                        {savedItems.filter(item => item.brand_id === brand.id).length} saved items
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Supplements Tab */}
          <TabsContent value="supplements" className="mt-6">
            {schedulesLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-500 mt-2">Loading supplement schedules...</p>
              </div>
            ) : supplementSchedules.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <Pill className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No supplement schedules</h3>
                  <p className="text-gray-500 mb-4">
                    Set up recurring supplement schedules to track your daily supplements automatically.
                  </p>
                  <Button onClick={() => setShowCreateItemModal(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Supplement Schedule
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {supplementSchedules.map((schedule) => (
                  <Card key={schedule.id}>
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <Pill className="h-5 w-5 text-green-600" />
                        <CardTitle className="text-lg">{schedule.saved_item?.name}</CardTitle>
                      </div>
                      {schedule.saved_item?.brand && (
                        <CardDescription>{schedule.saved_item.brand.name}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span>{schedule.frequency} - {schedule.times_per_day}x per day</span>
                        </div>
                        {schedule.preferred_times && schedule.preferred_times.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {schedule.preferred_times.map((time, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {time}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Modals */}
      <CreateSavedItemModal
        isOpen={showCreateItemModal}
        onClose={() => setShowCreateItemModal(false)}
        userId={user.id}
        brands={brands}
      />

      <CreateBrandModal
        isOpen={showCreateBrandModal}
        onClose={() => setShowCreateBrandModal(false)}
      />
    </div>
  )
} 