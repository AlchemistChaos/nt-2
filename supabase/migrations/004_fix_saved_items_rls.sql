-- Fix RLS policies for saved_items table to match the pattern used in other tables
-- The issue is that auth.uid() returns auth_user_id, but saved_items.user_id references users.id

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own saved items" ON saved_items;
DROP POLICY IF EXISTS "Users can insert own saved items" ON saved_items;
DROP POLICY IF EXISTS "Users can update own saved items" ON saved_items;
DROP POLICY IF EXISTS "Users can delete own saved items" ON saved_items;

-- Create new policies that properly map auth.uid() to users.id
CREATE POLICY "Users can view own saved items" ON saved_items
    FOR SELECT USING (
        user_id IN (
            SELECT id FROM users WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own saved items" ON saved_items
    FOR INSERT WITH CHECK (
        user_id IN (
            SELECT id FROM users WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own saved items" ON saved_items
    FOR UPDATE USING (
        user_id IN (
            SELECT id FROM users WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete own saved items" ON saved_items
    FOR DELETE USING (
        user_id IN (
            SELECT id FROM users WHERE auth_user_id = auth.uid()
        )
    );

-- Also fix supplement_schedules policies to be consistent
DROP POLICY IF EXISTS "Users can view own supplement schedules" ON supplement_schedules;
DROP POLICY IF EXISTS "Users can insert own supplement schedules" ON supplement_schedules;
DROP POLICY IF EXISTS "Users can update own supplement schedules" ON supplement_schedules;
DROP POLICY IF EXISTS "Users can delete own supplement schedules" ON supplement_schedules;

CREATE POLICY "Users can view own supplement schedules" ON supplement_schedules
    FOR SELECT USING (
        user_id IN (
            SELECT id FROM users WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own supplement schedules" ON supplement_schedules
    FOR INSERT WITH CHECK (
        user_id IN (
            SELECT id FROM users WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own supplement schedules" ON supplement_schedules
    FOR UPDATE USING (
        user_id IN (
            SELECT id FROM users WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete own supplement schedules" ON supplement_schedules
    FOR DELETE USING (
        user_id IN (
            SELECT id FROM users WHERE auth_user_id = auth.uid()
        )
    ); 