-- Fix nutrition columns to accept decimal values instead of integers
-- This fixes the error: invalid input syntax for type integer: "7.5"

ALTER TABLE meals 
ALTER COLUMN kcal_total TYPE NUMERIC(8,2),
ALTER COLUMN g_protein TYPE NUMERIC(6,2),
ALTER COLUMN g_carb TYPE NUMERIC(6,2),
ALTER COLUMN g_fat TYPE NUMERIC(6,2);

-- Add comments for documentation
COMMENT ON COLUMN meals.kcal_total IS 'Total calories - supports decimal values (e.g., 207.5)';
COMMENT ON COLUMN meals.g_protein IS 'Protein in grams - supports decimal values (e.g., 2.5)';
COMMENT ON COLUMN meals.g_carb IS 'Carbohydrates in grams - supports decimal values (e.g., 30.5)';
COMMENT ON COLUMN meals.g_fat IS 'Fat in grams - supports decimal values (e.g., 7.5)';