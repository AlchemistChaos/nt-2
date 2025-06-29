-- Fix Brand Menu Items RLS Policies
-- Allow any authenticated user to delete brand menu items (they're global data)

-- Drop the restrictive delete policy
DROP POLICY IF EXISTS "Users can delete brand menu items they imported" ON brand_menu_items;

-- Create a more permissive delete policy for brand menu items
-- Since brand menu items are global data, any authenticated user should be able to manage them
CREATE POLICY "Authenticated users can delete brand menu items" ON brand_menu_items 
    FOR DELETE USING (auth.role() = 'authenticated');

-- Also allow authenticated users to update brand menu items (for consistency)
DROP POLICY IF EXISTS "Users can update brand menu items they imported" ON brand_menu_items;

CREATE POLICY "Authenticated users can update brand menu items" ON brand_menu_items 
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Keep the existing insert and select policies as they are appropriate
-- SELECT: already allows authenticated users to view
-- INSERT: already allows authenticated users to create

-- Add a comment explaining the rationale
COMMENT ON TABLE brand_menu_items IS 'Global brand menu items - visible and manageable by all authenticated users. Import metadata tracks original contributor but does not restrict modification rights.'; 