-- Create the missing dnc_entries table
-- This is the main table that's missing from the database

CREATE TABLE IF NOT EXISTS dnc_entries (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    phone_number TEXT NOT NULL,
    added_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    source TEXT NOT NULL CHECK (source IN ('customer_request', 'legal_requirement', 'manual', 'complaint')),
    notes TEXT,
    expiry_date TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(profile_id, phone_number)
);

-- Enable RLS
ALTER TABLE dnc_entries ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own dnc entries" ON dnc_entries FOR SELECT USING (
    profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
);
CREATE POLICY "Users can insert own dnc entries" ON dnc_entries FOR INSERT WITH CHECK (
    profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
);
CREATE POLICY "Users can update own dnc entries" ON dnc_entries FOR UPDATE USING (
    profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
);
CREATE POLICY "Users can delete own dnc entries" ON dnc_entries FOR DELETE USING (
    profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_dnc_entries_profile_id ON dnc_entries(profile_id);
CREATE INDEX IF NOT EXISTS idx_dnc_entries_phone_number ON dnc_entries(phone_number);
CREATE INDEX IF NOT EXISTS idx_dnc_entries_is_active ON dnc_entries(is_active);