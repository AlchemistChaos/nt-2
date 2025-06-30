'use client'

import { useState } from 'react'
import { User, Brand, ImportMenuResponse } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeft, Plus, Search, Star, Upload } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useBrands, useBrandStats } from '@/lib/supabase/client-cache'
import { CreateBrandModal } from '@/components/custom/CreateBrandModal'
import { EditBrandModal } from '@/components/custom/EditBrandModal'
import { BrandDetailModal } from '@/components/custom/BrandDetailModal'
import { BrandCard } from '@/components/custom/BrandCard'
import { ImportBrandMenuModal } from '@/components/custom/ImportBrandMenuModal'
import { ImportReviewTable } from '@/components/custom/ImportReviewTable'

interface LibraryPageClientProps {
  user: User
}

export function LibraryPageClient({ user }: LibraryPageClientProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateBrandModal, setShowCreateBrandModal] = useState(false)
  const [showEditBrandModal, setShowEditBrandModal] = useState(false)
  const [showBrandDetailModal, setShowBrandDetailModal] = useState(false)
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null)
  const [viewingBrand, setViewingBrand] = useState<Brand | null>(null)
  const [showImportModal, setShowImportModal] = useState(false)
  const [showImportReview, setShowImportReview] = useState(false)
  const [importAnalysisResult, setImportAnalysisResult] = useState<ImportMenuResponse | null>(null)
  const [importSource, setImportSource] = useState<'csv' | 'image' | null>(null)

  // Fetch brands data
  const { data: brands = [], isLoading: brandsLoading, isError: brandsError, error: brandsFetchError } = useBrands()
  const { data: brandStats = {} } = useBrandStats(user.id, { enabled: brands.length > 0 })

  // Debug brands data
  console.log('LibraryPageClient brands debug:', {
    brandsLoading,
    brandsCount: brands.length,
    brands: brands.map(b => ({ id: b.id, name: b.name, type: b.type }))
  })

  // Filter brands based on search query
  const filteredBrands = brands.filter(brand =>
    brand.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    brand.type.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleEditBrand = (brand: Brand) => {
    setEditingBrand(brand)
    setShowEditBrandModal(true)
  }

  const handleCloseBrandEditModal = () => {
    setShowEditBrandModal(false)
    setEditingBrand(null)
  }

  const handleViewBrandDetails = (brand: Brand) => {
    console.log('Clicking on brand for details:', {
      brand,
      brandId: brand.id,
      brandName: brand.name,
      brandType: brand.type
    })
    setViewingBrand(brand)
    setShowBrandDetailModal(true)
  }

  const handleCloseBrandDetailModal = () => {
    setShowBrandDetailModal(false)
    setViewingBrand(null)
  }

  const handleImportAnalysisComplete = (result: ImportMenuResponse, source: 'csv' | 'image') => {
    setImportAnalysisResult(result)
    setImportSource(source)
    setShowImportModal(false)
    setShowImportReview(true)
  }

  const handleImportComplete = () => {
    setShowImportReview(false)
    setImportAnalysisResult(null)
    setImportSource(null)
    // React Query will automatically refetch data
  }

  const handleImportCancel = () => {
    setShowImportReview(false)
    setImportAnalysisResult(null)
    setImportSource(null)
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
              onClick={() => setShowImportModal(true)}
              variant="outline"
              size="sm"
            >
              <Upload className="h-4 w-4 mr-2" />
              Import Menu
            </Button>
            <Button
              onClick={() => setShowCreateBrandModal(true)}
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Brand
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
              placeholder="Search brands..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Brands Section */}
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Star className="h-5 w-5" />
            Brands ({brands.length})
          </h2>
          
            {brandsLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-500 mt-2">Loading brands...</p>
              </div>
            ) : brandsError ? (
              <Card>
                <CardContent className="text-center py-8">
                  <Star className="h-12 w-12 text-red-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-red-700 mb-2">Error Loading Brands</h3>
                  <p className="text-gray-500 mb-4">
                    There was an issue fetching the brands. Please try again later.
                  </p>
                  <pre className="text-xs text-left bg-red-50 p-2 rounded">{brandsFetchError?.message}</pre>
                </CardContent>
              </Card>
            ) : filteredBrands.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <Star className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No brands found</h3>
                  <p className="text-gray-500 mb-4">
                  {searchQuery ? 'No brands match your search.' : 'Add brands to organize your menu items.'}
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
                  <BrandCard
                    key={brand.id}
                    brand={brand}
                    brandStats={brandStats[brand.id]}
                    onEdit={handleEditBrand}
                    onViewDetails={handleViewBrandDetails}
                    onBrandUpdated={() => {
                      // React Query will automatically refetch
                    }}
                  />
                ))}
              </div>
            )}
              </div>
      </div>

      {/* Modals */}
      <CreateBrandModal
        isOpen={showCreateBrandModal}
        onClose={() => setShowCreateBrandModal(false)}
      />

      <EditBrandModal
        isOpen={showEditBrandModal}
        onClose={handleCloseBrandEditModal}
        brand={editingBrand}
      />

      <BrandDetailModal
        isOpen={showBrandDetailModal}
        onClose={handleCloseBrandDetailModal}
        brand={viewingBrand}
      />

      <ImportBrandMenuModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onAnalysisComplete={handleImportAnalysisComplete}
      />

      {showImportReview && importAnalysisResult && importSource && (
        <ImportReviewTable
          analysisResult={importAnalysisResult}
          importSource={importSource}
          onComplete={handleImportComplete}
          onCancel={handleImportCancel}
      />
      )}
    </div>
  )
} 