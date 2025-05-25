#!/bin/bash

# Cleanup User Data Script
# This script deletes all user-generated data while preserving the user account
# Requires Supabase CLI to be installed and configured

USER_ID="09f1c88a-9c1d-47ac-ad99-5b2668667a76"

echo "🧹 Starting cleanup for user: $USER_ID"
echo "This will delete ALL meals, preferences, and chat messages..."
echo ""

# Confirm before proceeding
read -p "Are you sure you want to proceed? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Cleanup cancelled"
    exit 1
fi

echo "🗑️  Deleting user data..."

# Delete meals
echo "Deleting meals..."
supabase db reset --db-url "$SUPABASE_DB_URL" --sql "DELETE FROM meals WHERE user_id = '$USER_ID';"

# Delete preferences  
echo "Deleting preferences..."
supabase db reset --db-url "$SUPABASE_DB_URL" --sql "DELETE FROM preferences WHERE user_id = '$USER_ID';"

# Delete chat messages
echo "Deleting chat messages..."
supabase db reset --db-url "$SUPABASE_DB_URL" --sql "DELETE FROM chat_messages WHERE user_id = '$USER_ID';"

echo ""
echo "✅ Cleanup completed!"
echo ""
echo "Verifying cleanup..."

# Verify cleanup
supabase db reset --db-url "$SUPABASE_DB_URL" --sql "
SELECT 
    (SELECT COUNT(*) FROM meals WHERE user_id = '$USER_ID') as remaining_meals,
    (SELECT COUNT(*) FROM preferences WHERE user_id = '$USER_ID') as remaining_preferences,
    (SELECT COUNT(*) FROM chat_messages WHERE user_id = '$USER_ID') as remaining_messages;
"

echo "🎉 All done! Your user account is preserved but all data has been cleaned up." 