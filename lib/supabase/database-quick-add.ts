import { createClient } from './server'
import { Brand, SavedItem, QuickAddPattern, SupplementSchedule } from '@/types'

// Brand functions
export async function getBrands(): Promise<Brand[]> {
  const supabase = await createClient()
  
  const { data: brands, error } = await supabase
    .from('brands')
    .select('*')
    .order('name')

  if (error) {
    console.error('Error fetching brands:', error)
    return []
  }

  return brands || []
}

export async function createBrand(brandData: Omit<Brand, 'id' | 'created_at' | 'updated_at'>): Promise<Brand | null> {
  const supabase = await createClient()
  
  const { data: brand, error } = await supabase
    .from('brands')
    .insert(brandData)
    .select()
    .single()

  if (error) {
    console.error('Error creating brand:', error)
    return null
  }

  return brand
}

// Saved Items functions
export async function getUserSavedItems(userId: string): Promise<SavedItem[]> {
  const supabase = await createClient()
  
  const { data: items, error } = await supabase
    .from('saved_items')
    .select(`
      *,
      brand:brands(*)
    `)
    .eq('user_id', userId)
    .order('times_used', { ascending: false })

  if (error) {
    console.error('Error fetching saved items:', error)
    return []
  }

  return items || []
}

export async function createSavedItem(itemData: Omit<SavedItem, 'id' | 'times_used' | 'created_at' | 'updated_at'>): Promise<SavedItem | null> {
  const supabase = await createClient()
  
  const { data: item, error } = await supabase
    .from('saved_items')
    .insert({
      ...itemData,
      times_used: 0
    })
    .select(`
      *,
      brand:brands(*)
    `)
    .single()

  if (error) {
    console.error('Error creating saved item:', error)
    return null
  }

  return item
}

export async function updateSavedItem(itemId: string, updates: Partial<SavedItem>): Promise<SavedItem | null> {
  const supabase = await createClient()
  
  const { data: item, error } = await supabase
    .from('saved_items')
    .update(updates)
    .eq('id', itemId)
    .select(`
      *,
      brand:brands(*)
    `)
    .single()

  if (error) {
    console.error('Error updating saved item:', error)
    return null
  }

  return item
}

export async function deleteSavedItem(itemId: string): Promise<boolean> {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('saved_items')
    .delete()
    .eq('id', itemId)

  if (error) {
    console.error('Error deleting saved item:', error)
    return false
  }

  return true
}

// Quick Add Pattern functions
export async function findQuickAddMatches(userId: string, query: string): Promise<SavedItem[]> {
  const supabase = await createClient()
  
  const normalizedQuery = query.toLowerCase().trim()
  
  const { data: patterns, error } = await supabase
    .from('quick_add_patterns')
    .select(`
      *,
      saved_item:saved_items!inner(
        *,
        brand:brands(*)
      )
    `)
    .eq('saved_item.user_id', userId)
    .ilike('pattern', `%${normalizedQuery}%`)
    .order('confidence_score', { ascending: false })
    .limit(5)

  if (error) {
    console.error('Error finding quick add matches:', error)
    return []
  }

  return patterns?.map(p => p.saved_item).filter(Boolean) || []
}

export async function updateItemUsage(itemId: string): Promise<void> {
  const supabase = await createClient()
  
  const { error } = await supabase.rpc('update_item_usage', {
    item_id: itemId
  })

  if (error) {
    console.error('Error updating item usage:', error)
  }
}

// Supplement Schedule functions
export async function getUserSupplementSchedules(userId: string): Promise<SupplementSchedule[]> {
  const supabase = await createClient()
  
  const { data: schedules, error } = await supabase
    .from('supplement_schedules')
    .select(`
      *,
      saved_item:saved_items(
        *,
        brand:brands(*)
      )
    `)
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching supplement schedules:', error)
    return []
  }

  return schedules || []
}

export async function createSupplementSchedule(scheduleData: Omit<SupplementSchedule, 'id' | 'created_at' | 'updated_at'>): Promise<SupplementSchedule | null> {
  const supabase = await createClient()
  
  const { data: schedule, error } = await supabase
    .from('supplement_schedules')
    .insert(scheduleData)
    .select(`
      *,
      saved_item:saved_items(
        *,
        brand:brands(*)
      )
    `)
    .single()

  if (error) {
    console.error('Error creating supplement schedule:', error)
    return null
  }

  return schedule
}

export async function updateSupplementSchedule(scheduleId: string, updates: Partial<SupplementSchedule>): Promise<SupplementSchedule | null> {
  const supabase = await createClient()
  
  const { data: schedule, error } = await supabase
    .from('supplement_schedules')
    .update(updates)
    .eq('id', scheduleId)
    .select(`
      *,
      saved_item:saved_items(
        *,
        brand:brands(*)
      )
    `)
    .single()

  if (error) {
    console.error('Error updating supplement schedule:', error)
    return null
  }

  return schedule
}

export async function deleteSupplementSchedule(scheduleId: string): Promise<boolean> {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('supplement_schedules')
    .delete()
    .eq('id', scheduleId)

  if (error) {
    console.error('Error deleting supplement schedule:', error)
    return false
  }

  return true
} 