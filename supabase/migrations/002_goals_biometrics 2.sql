-- Add biometrics and goals tables for comprehensive health tracking

-- Create biometrics table for tracking user's physical measurements
CREATE TABLE biometrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    weight_kg DECIMAL(5,2), -- e.g., 70.50 kg
    height_cm DECIMAL(5,2), -- e.g., 175.50 cm
    body_fat_percentage DECIMAL(4,2), -- e.g., 15.50%
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create goals table for tracking user's fitness/health goals
CREATE TABLE goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    goal_type TEXT NOT NULL CHECK (goal_type IN ('weight_loss', 'weight_gain', 'body_fat_reduction', 'muscle_gain', 'maintenance')),
    target_weight_kg DECIMAL(5,2),
    target_body_fat_percentage DECIMAL(4,2),
    target_date DATE,
    daily_calorie_target INTEGER,
    daily_protein_target INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create daily_targets table for tracking calculated recommendations
CREATE TABLE daily_targets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    goal_id UUID REFERENCES goals(id) ON DELETE SET NULL,
    date DATE DEFAULT CURRENT_DATE,
    calories_target INTEGER NOT NULL,
    protein_target INTEGER NOT NULL,
    carbs_target INTEGER,
    fat_target INTEGER,
    is_accepted BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, date) -- One target per user per day
);

-- Create indexes for better performance
CREATE INDEX idx_biometrics_user_id ON biometrics(user_id);
CREATE INDEX idx_biometrics_recorded_at ON biometrics(recorded_at);
CREATE INDEX idx_biometrics_user_recorded ON biometrics(user_id, recorded_at);
CREATE INDEX idx_goals_user_id ON goals(user_id);
CREATE INDEX idx_goals_active ON goals(is_active);
CREATE INDEX idx_goals_user_active ON goals(user_id, is_active);
CREATE INDEX idx_daily_targets_user_id ON daily_targets(user_id);
CREATE INDEX idx_daily_targets_date ON daily_targets(date);
CREATE INDEX idx_daily_targets_user_date ON daily_targets(user_id, date);

-- Enable Row Level Security (RLS)
ALTER TABLE biometrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_targets ENABLE ROW LEVEL SECURITY;

-- RLS Policies for biometrics table
CREATE POLICY "Users can view own biometrics" ON biometrics
    FOR SELECT USING (
        user_id IN (
            SELECT id FROM users WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own biometrics" ON biometrics
    FOR INSERT WITH CHECK (
        user_id IN (
            SELECT id FROM users WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own biometrics" ON biometrics
    FOR UPDATE USING (
        user_id IN (
            SELECT id FROM users WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete own biometrics" ON biometrics
    FOR DELETE USING (
        user_id IN (
            SELECT id FROM users WHERE auth_user_id = auth.uid()
        )
    );

-- RLS Policies for goals table
CREATE POLICY "Users can view own goals" ON goals
    FOR SELECT USING (
        user_id IN (
            SELECT id FROM users WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own goals" ON goals
    FOR INSERT WITH CHECK (
        user_id IN (
            SELECT id FROM users WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own goals" ON goals
    FOR UPDATE USING (
        user_id IN (
            SELECT id FROM users WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete own goals" ON goals
    FOR DELETE USING (
        user_id IN (
            SELECT id FROM users WHERE auth_user_id = auth.uid()
        )
    );

-- RLS Policies for daily_targets table
CREATE POLICY "Users can view own daily targets" ON daily_targets
    FOR SELECT USING (
        user_id IN (
            SELECT id FROM users WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own daily targets" ON daily_targets
    FOR INSERT WITH CHECK (
        user_id IN (
            SELECT id FROM users WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own daily targets" ON daily_targets
    FOR UPDATE USING (
        user_id IN (
            SELECT id FROM users WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete own daily targets" ON daily_targets
    FOR DELETE USING (
        user_id IN (
            SELECT id FROM users WHERE auth_user_id = auth.uid()
        )
    );

-- Create function to update goals updated_at timestamp
CREATE OR REPLACE FUNCTION update_goals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for goals updated_at
CREATE TRIGGER goals_updated_at_trigger
    BEFORE UPDATE ON goals
    FOR EACH ROW
    EXECUTE FUNCTION update_goals_updated_at(); 