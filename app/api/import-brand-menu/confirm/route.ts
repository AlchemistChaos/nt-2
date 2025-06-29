import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, createBrandIfNotExists, createBrandMenuItems } from '@/lib/supabase/database'
import { ImportReviewItem } from '@/types'

interface ConfirmImportRequest {
  brandId?: string
  brandName?: string
  brandType?: string
  items: ImportReviewItem[]
  importSource: 'csv' | 'image' | 'manual'
}

export async function POST(request: NextRequest) {
  try {
    // Get current user
    let user
    try {
      user = await getCurrentUser()
    } catch (userError) {
      console.error('Failed to get current user:', userError)
      return NextResponse.json({ error: 'Failed to authenticate user' }, { status: 401 })
    }
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const requestData: ConfirmImportRequest = await request.json()
    const { brandId, brandName, brandType, items, importSource } = requestData

    // Validate required fields
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Items array is required and cannot be empty' }, { status: 400 })
    }

    if (!brandId && !brandName) {
      return NextResponse.json({ error: 'Either brandId or brandName is required' }, { status: 400 })
    }

    console.log('Confirming import for user:', user.id, 'Brand:', brandName || brandId, 'Items:', items.length)

    // Filter only approved items
    const approvedItems = items.filter(item => item.isApproved)
    
    if (approvedItems.length === 0) {
      return NextResponse.json({ error: 'No items were approved for import' }, { status: 400 })
    }

    console.log('Approved items count:', approvedItems.length)

    // Handle brand creation/resolution
    let finalBrandId = brandId
    if (!finalBrandId) {
      // Create or get existing brand
      const brand = await createBrandIfNotExists(
        brandName!,
        brandType || 'restaurant',
        `Imported by ${user.name || user.email}`
      )
      finalBrandId = brand.id
      console.log('Brand resolved:', brand.name, 'ID:', finalBrandId)
    }

    // Prepare items for database insertion
    const menuItemsToCreate = approvedItems.map(item => {
      // Remove import-specific fields
      const { isApproved: _isApproved, isEdited: _isEdited, id: _id, brand_id: _brandId, brand: _brand, imported_by: _importedBy, import_source: _importSource, import_batch_id: _importBatchId, created_at: _createdAt, updated_at: _updatedAt, ...itemData } = item
      
      // Ensure required fields have values
      return {
        ...itemData,
        name: itemData.name || 'Unnamed Item',
        is_available: itemData.is_available !== false, // Default to true
        is_seasonal: itemData.is_seasonal === true
      }
    })

    console.log('Creating menu items in database...')

    // Create menu items in database
    const createdItems = await createBrandMenuItems(
      user.id,
      finalBrandId,
      menuItemsToCreate,
      importSource,
      crypto.randomUUID() // Generate batch ID for this import
    )

    console.log('Successfully created', createdItems.length, 'brand menu items')

    return NextResponse.json({
      success: true,
      brandId: finalBrandId,
      itemsCreated: createdItems.length,
      items: createdItems
    })

  } catch (error) {
    console.error('Import menu confirm error:', error)
    
    // Handle specific database errors
    if (error instanceof Error) {
      if (error.message.includes('duplicate key')) {
        return NextResponse.json({ error: 'Some items already exist for this brand' }, { status: 409 })
      }
      if (error.message.includes('foreign key')) {
        return NextResponse.json({ error: 'Invalid brand or user reference' }, { status: 400 })
      }
    }
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined
      },
      { status: 500 }
    )
  }
} 