-- Add portion_size column to meals table
ALTER TABLE meals 
ADD COLUMN portion_size TEXT DEFAULT 'full';
 
-- Add comment for documentation
COMMENT ON COLUMN meals.portion_size IS 'Portion size of the meal (e.g., "1/2", "3/4", "2x", "full")'; 