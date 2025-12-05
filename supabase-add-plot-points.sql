-- Add key_plot_points column to sessions table for storing important story branch points
ALTER TABLE sessions 
ADD COLUMN IF NOT EXISTS key_plot_points TEXT;

-- Update comment
COMMENT ON COLUMN sessions.key_plot_points IS 'JSON array of key plot points that should never be forgotten';
