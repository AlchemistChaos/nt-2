-- Brand Menu Items: Global food items for brands (visible to all users)

-- Create brand_menu_items table
CREATE TABLE brand_menu_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    
    -- Item identification
    name TEXT NOT NULL,
    description TEXT,
    category TEXT, -- e.g., 'breakfast', 'lunch', 'dinner', 'beverage', 'dessert', 'appetizer'
    
    -- Pricing (optional)
    price_cents INTEGER, -- Price in cents for consistency
    currency TEXT DEFAULT 'USD',
    
    -- Nutrition information (per serving)
    serving_size TEXT, -- e.g., "1 item", "12 oz", "large"
    kcal_per_serving INTEGER,
    g_protein_per_serving DECIMAL(6,2),
    g_carb_per_serving DECIMAL(6,2),
    g_fat_per_serving DECIMAL(6,2),
    g_fiber_per_serving DECIMAL(6,2),
    g_sugar_per_serving DECIMAL(6,2),
    mg_sodium_per_serving DECIMAL(8,2),
    
    -- Additional metadata
    ingredients TEXT[], -- Array of ingredients
    allergens TEXT[], -- Array of allergens
    dietary_tags TEXT[], -- e.g., ['vegetarian', 'gluten-free', 'vegan']
    
    -- Import metadata
    imported_by UUID REFERENCES users(id), -- User who imported this item
    import_source TEXT, -- 'csv', 'image', 'manual'
    import_batch_id UUID, -- Group items from same import session
    
    -- Status and availability
    is_available BOOLEAN DEFAULT true,
    is_seasonal BOOLEAN DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_brand_menu_items_brand_id ON brand_menu_items(brand_id);
CREATE INDEX idx_brand_menu_items_category ON brand_menu_items(category);
CREATE INDEX idx_brand_menu_items_available ON brand_menu_items(is_available);
CREATE INDEX idx_brand_menu_items_import_batch ON brand_menu_items(import_batch_id);
CREATE INDEX idx_brand_menu_items_imported_by ON brand_menu_items(imported_by);

-- Enable Row Level Security
ALTER TABLE brand_menu_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Brand menu items are public (viewable by all authenticated users)
CREATE POLICY "Brand menu items are viewable by everyone" ON brand_menu_items 
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert brand menu items" ON brand_menu_items 
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update brand menu items they imported" ON brand_menu_items 
    FOR UPDATE USING (imported_by = auth.uid());

CREATE POLICY "Users can delete brand menu items they imported" ON brand_menu_items 
    FOR DELETE USING (imported_by = auth.uid());

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_brand_menu_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER trigger_update_brand_menu_items_updated_at
    BEFORE UPDATE ON brand_menu_items
    FOR EACH ROW
    EXECUTE FUNCTION update_brand_menu_items_updated_at();

-- Function to generate import batch ID
CREATE OR REPLACE FUNCTION generate_import_batch_id()
RETURNS UUID AS $$
BEGIN
    RETURN uuid_generate_v4();
END;
$$ LANGUAGE plpgsql; 