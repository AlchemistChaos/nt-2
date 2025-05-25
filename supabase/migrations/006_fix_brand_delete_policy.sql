-- Fix missing DELETE policy for brands table
-- This allows authenticated users to delete brands

CREATE POLICY "Authenticated users can delete brands" ON brands FOR DELETE USING (auth.role() = 'authenticated'); 