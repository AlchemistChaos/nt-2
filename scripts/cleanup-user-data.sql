-- Cleanup User Data Script
-- This script deletes all user-generated data while preserving the user account
-- Run this in your Supabase SQL editor or via psql

-- Get your user ID first (uncomment to check)
-- SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';

-- Replace 'YOUR_USER_ID_HERE' with your actual user ID
-- You can find it by running: SELECT id FROM auth.users WHERE email = 'your-email@example.com';

DO $$
DECLARE
    user_uuid UUID := '09f1c88a-9c1d-47ac-ad99-5b2668667a76'; -- Replace with your actual user ID
    deleted_meals_count INTEGER;
    deleted_preferences_count INTEGER;
    deleted_messages_count INTEGER;
BEGIN
    -- Delete all meals for the user
    DELETE FROM meals WHERE user_id = user_uuid;
    GET DIAGNOSTICS deleted_meals_count = ROW_COUNT;
    
    -- Delete all meal items for the user (if any exist)
    DELETE FROM meal_items WHERE meal_id IN (
        SELECT id FROM meals WHERE user_id = user_uuid
    );
    
    -- Delete all preferences for the user
    DELETE FROM preferences WHERE user_id = user_uuid;
    GET DIAGNOSTICS deleted_preferences_count = ROW_COUNT;
    
    -- Delete all chat messages for the user
    DELETE FROM chat_messages WHERE user_id = user_uuid;
    GET DIAGNOSTICS deleted_messages_count = ROW_COUNT;
    
    -- Output summary
    RAISE NOTICE 'Cleanup completed for user: %', user_uuid;
    RAISE NOTICE 'Deleted % meals', deleted_meals_count;
    RAISE NOTICE 'Deleted % preferences', deleted_preferences_count;
    RAISE NOTICE 'Deleted % chat messages', deleted_messages_count;
    
END $$;

-- Verify cleanup (should return 0 for all)
SELECT 
    (SELECT COUNT(*) FROM meals WHERE user_id = '09f1c88a-9c1d-47ac-ad99-5b2668667a76') as remaining_meals,
    (SELECT COUNT(*) FROM preferences WHERE user_id = '09f1c88a-9c1d-47ac-ad99-5b2668667a76') as remaining_preferences,
    (SELECT COUNT(*) FROM chat_messages WHERE user_id = '09f1c88a-9c1d-47ac-ad99-5b2668667a76') as remaining_messages; 