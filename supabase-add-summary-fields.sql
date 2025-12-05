-- Add auto-summary tracking fields to sessions table
ALTER TABLE sessions 
ADD COLUMN IF NOT EXISTS ai_message_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_summary_turn INTEGER DEFAULT 0;

-- Update existing sessions to have default values
UPDATE sessions 
SET ai_message_count = 0, last_summary_turn = 0 
WHERE ai_message_count IS NULL OR last_summary_turn IS NULL;
