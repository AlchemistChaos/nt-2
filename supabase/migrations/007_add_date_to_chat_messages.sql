-- Add date field to chat_messages table for day-based navigation
-- This allows users to have separate chats for each day

-- Add date column to chat_messages table
ALTER TABLE chat_messages 
ADD COLUMN date DATE NOT NULL DEFAULT CURRENT_DATE;

-- Create index for efficient date-based queries
CREATE INDEX idx_chat_messages_user_date ON chat_messages(user_id, date);

-- Update existing chat messages to have today's date
-- This ensures existing data works with the new system
UPDATE chat_messages 
SET date = CURRENT_DATE 
WHERE date IS NULL;

-- Update RLS policies to be date-aware
-- Users can only access their own chat messages for any date
DROP POLICY IF EXISTS "Users can view their own chat messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can insert their own chat messages" ON chat_messages;

CREATE POLICY "Users can view their own chat messages" ON chat_messages
    FOR SELECT USING (
        user_id IN (
            SELECT id FROM users WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own chat messages" ON chat_messages
    FOR INSERT WITH CHECK (
        user_id IN (
            SELECT id FROM users WHERE auth_user_id = auth.uid()
        )
    );

-- Add comment for documentation
COMMENT ON COLUMN chat_messages.date IS 'Date of the chat session (YYYY-MM-DD format). Each day gets its own chat thread.'; 