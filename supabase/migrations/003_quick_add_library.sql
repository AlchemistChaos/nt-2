-- Quick Add Library: Saved meals, supplements, and branded items for fast logging

-- Create brands/restaurants table
CREATE TABLE brands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE, -- e.g., "Watchouse", "Thorne", "Starbucks"
    type TEXT NOT NULL CHECK (type IN ('restaurant', 'supplement_brand', 'food_brand', 'other')),
    description TEXT,
    website TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create saved items table (meals, supplements, products)
CREATE TABLE saved_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    brand_id UUID REFERENCES brands(id) ON DELETE SET NULL,
    
    -- Item identification
    name TEXT NOT NULL, -- e.g., "salmon avocado toast", "collagen powder"
    category TEXT NOT NULL CHECK (category IN ('meal', 'snack', 'supplement', 'drink', 'ingredient')),
    
    -- Nutrition information
    serving_size TEXT, -- e.g., "1 slice", "1 teaspoon", "1 scoop"
    kcal_per_serving INTEGER,
    g_protein_per_serving DECIMAL(6,2),
    g_carb_per_serving DECIMAL(6,2),
    g_fat_per_serving DECIMAL(6,2),
    
    -- Additional metadata
    ingredients TEXT[], -- Array of ingredients
    allergens TEXT[], -- Array of allergens
    notes TEXT,
    image_url TEXT,
    
    -- Usage tracking
    times_used INTEGER DEFAULT 0,
    last_used_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create quick add patterns table for smart recognition
CREATE TABLE quick_add_patterns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    saved_item_id UUID NOT NULL REFERENCES saved_items(id) ON DELETE CASCADE,
    pattern TEXT NOT NULL, -- e.g., "salmon avocado watchouse", "collagen thorne"
    confidence_score DECIMAL(3,2) DEFAULT 1.0, -- How confident we are in this pattern
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create supplement schedules table (for recurring supplements)
CREATE TABLE supplement_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    saved_item_id UUID NOT NULL REFERENCES saved_items(id) ON DELETE CASCADE,
    
    -- Schedule configuration
    frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'as_needed')),
    times_per_day INTEGER DEFAULT 1,
    preferred_times TIME[], -- Array of preferred times e.g., ['08:00', '20:00']
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_saved_items_user_id ON saved_items(user_id);
CREATE INDEX idx_saved_items_brand_id ON saved_items(brand_id);
CREATE INDEX idx_saved_items_category ON saved_items(category);
CREATE INDEX idx_saved_items_times_used ON saved_items(times_used DESC);
CREATE INDEX idx_quick_add_patterns_pattern ON quick_add_patterns(pattern);
CREATE INDEX idx_quick_add_patterns_confidence ON quick_add_patterns(confidence_score DESC);
CREATE INDEX idx_supplement_schedules_user_id ON supplement_schedules(user_id);

-- Create RLS policies
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE quick_add_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplement_schedules ENABLE ROW LEVEL SECURITY;

-- Brands are public (everyone can see all brands)
CREATE POLICY "Brands are viewable by everyone" ON brands FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert brands" ON brands FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update brands" ON brands FOR UPDATE USING (auth.role() = 'authenticated');

-- Saved items are private to each user
CREATE POLICY "Users can view own saved items" ON saved_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own saved items" ON saved_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own saved items" ON saved_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own saved items" ON saved_items FOR DELETE USING (auth.uid() = user_id);

-- Quick add patterns follow saved items permissions
CREATE POLICY "Users can view patterns for own saved items" ON quick_add_patterns FOR SELECT 
    USING (EXISTS (SELECT 1 FROM saved_items WHERE saved_items.id = quick_add_patterns.saved_item_id AND saved_items.user_id = auth.uid()));
CREATE POLICY "Users can insert patterns for own saved items" ON quick_add_patterns FOR INSERT 
    WITH CHECK (EXISTS (SELECT 1 FROM saved_items WHERE saved_items.id = quick_add_patterns.saved_item_id AND saved_items.user_id = auth.uid()));
CREATE POLICY "Users can update patterns for own saved items" ON quick_add_patterns FOR UPDATE 
    USING (EXISTS (SELECT 1 FROM saved_items WHERE saved_items.id = quick_add_patterns.saved_item_id AND saved_items.user_id = auth.uid()));
CREATE POLICY "Users can delete patterns for own saved items" ON quick_add_patterns FOR DELETE 
    USING (EXISTS (SELECT 1 FROM saved_items WHERE saved_items.id = quick_add_patterns.saved_item_id AND saved_items.user_id = auth.uid()));

-- Supplement schedules are private to each user
CREATE POLICY "Users can view own supplement schedules" ON supplement_schedules FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own supplement schedules" ON supplement_schedules FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own supplement schedules" ON supplement_schedules FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own supplement schedules" ON supplement_schedules FOR DELETE USING (auth.uid() = user_id);

-- Create functions for automatic pattern generation
CREATE OR REPLACE FUNCTION generate_quick_add_pattern(item_name TEXT, brand_name TEXT DEFAULT NULL)
RETURNS TEXT AS $$
BEGIN
    IF brand_name IS NOT NULL THEN
        RETURN LOWER(TRIM(item_name || ' ' || brand_name));
    ELSE
        RETURN LOWER(TRIM(item_name));
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate patterns when saved items are created
CREATE OR REPLACE FUNCTION auto_generate_pattern()
RETURNS TRIGGER AS $$
DECLARE
    brand_name TEXT;
    pattern_text TEXT;
BEGIN
    -- Get brand name if exists
    IF NEW.brand_id IS NOT NULL THEN
        SELECT name INTO brand_name FROM brands WHERE id = NEW.brand_id;
    END IF;
    
    -- Generate pattern
    pattern_text := generate_quick_add_pattern(NEW.name, brand_name);
    
    -- Insert pattern
    INSERT INTO quick_add_patterns (saved_item_id, pattern, confidence_score)
    VALUES (NEW.id, pattern_text, 1.0);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_generate_pattern
    AFTER INSERT ON saved_items
    FOR EACH ROW
    EXECUTE FUNCTION auto_generate_pattern();

-- Create function to update usage statistics
CREATE OR REPLACE FUNCTION update_item_usage(item_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE saved_items 
    SET times_used = times_used + 1,
        last_used_at = NOW()
    WHERE id = item_id;
END;
$$ LANGUAGE plpgsql;

-- Insert some default brands
INSERT INTO brands (name, type, description) VALUES
    ('Thorne', 'supplement_brand', 'Premium supplement brand'),
    ('Watchouse', 'restaurant', 'Coffee shop and eatery'),
    ('Starbucks', 'restaurant', 'Global coffee chain'),
    ('Optimum Nutrition', 'supplement_brand', 'Sports nutrition brand'),
    ('Garden of Life', 'supplement_brand', 'Organic supplement brand'),
    ('Whole Foods', 'food_brand', 'Organic grocery store brand'),
    ('Trader Joes', 'food_brand', 'Specialty grocery store'),
    ('Chipotle', 'restaurant', 'Mexican fast-casual restaurant'),
    ('Sweetgreen', 'restaurant', 'Healthy fast-casual salads'),
    ('Pret A Manger', 'restaurant', 'Fresh food and coffee shop'); 