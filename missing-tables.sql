-- Missing tables for AI Calling V3 system
-- This script adds all the missing tables that the TypeScript types expect

-- Create campaigns table (renamed from outbound_campaigns to match TypeScript)
CREATE TABLE IF NOT EXISTS campaigns (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES ai_agents(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'cancelled')),
    caller_id TEXT NOT NULL,
    max_concurrent_calls INTEGER NOT NULL DEFAULT 1,
    call_timeout_seconds INTEGER NOT NULL DEFAULT 30,
    retry_attempts INTEGER NOT NULL DEFAULT 3,
    retry_delay_minutes INTEGER NOT NULL DEFAULT 15,
    start_time TIME,
    end_time TIME,
    timezone TEXT NOT NULL DEFAULT 'UTC',
    days_of_week INTEGER[] NOT NULL DEFAULT '{1,2,3,4,5}',
    scheduled_start_date TIMESTAMP WITH TIME ZONE,
    scheduled_end_date TIMESTAMP WITH TIME ZONE,
    custom_system_instruction TEXT,
    custom_voice_name TEXT CHECK (custom_voice_name IN ('Puck', 'Charon', 'Kore', 'Fenrir', 'Aoede', 'Leda', 'Orus', 'Zephyr')),
    priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    compliance_settings JSONB,
    total_leads INTEGER NOT NULL DEFAULT 0,
    leads_called INTEGER NOT NULL DEFAULT 0,
    leads_answered INTEGER NOT NULL DEFAULT 0,
    leads_completed INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create campaign_leads table
CREATE TABLE IF NOT EXISTS campaign_leads (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    phone_number TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    email TEXT,
    company TEXT,
    title TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'called', 'answered', 'no_answer', 'busy', 'failed', 'completed')),
    priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    call_attempts INTEGER NOT NULL DEFAULT 0,
    last_call_at TIMESTAMP WITH TIME ZONE,
    next_call_at TIMESTAMP WITH TIME ZONE,
    outcome TEXT,
    notes TEXT,
    custom_fields JSONB,
    do_not_call BOOLEAN NOT NULL DEFAULT false,
    preferred_call_time TEXT,
    timezone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create dnc_entries table (Do Not Call)
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

-- Create appointments table
CREATE TABLE IF NOT EXISTS appointments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    call_log_id UUID REFERENCES call_logs(id) ON DELETE SET NULL,
    lead_id UUID REFERENCES campaign_leads(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_email TEXT,
    appointment_type TEXT NOT NULL,
    scheduled_date TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 60,
    location TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'cancelled', 'completed', 'no_show')),
    reminder_sent BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create webhook_endpoints table
CREATE TABLE IF NOT EXISTS webhook_endpoints (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    events TEXT[] NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    secret_key TEXT,
    retry_attempts INTEGER NOT NULL DEFAULT 3,
    last_triggered_at TIMESTAMP WITH TIME ZONE,
    success_count INTEGER NOT NULL DEFAULT 0,
    failure_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create webhook_deliveries table
CREATE TABLE IF NOT EXISTS webhook_deliveries (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    webhook_id UUID REFERENCES webhook_endpoints(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    response_status INTEGER,
    response_body TEXT,
    delivered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    success BOOLEAN NOT NULL DEFAULT false
);

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    plan_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'unpaid')),
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(profile_id)
);

-- Create usage_records table
CREATE TABLE IF NOT EXISTS usage_records (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
    usage_type TEXT NOT NULL CHECK (usage_type IN ('minutes', 'calls', 'agents')),
    quantity INTEGER NOT NULL DEFAULT 0,
    unit_price DECIMAL(10,4),
    total_cost DECIMAL(10,2),
    billing_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    billing_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create compliance_reports table
CREATE TABLE IF NOT EXISTS compliance_reports (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    report_type TEXT NOT NULL CHECK (report_type IN ('dnc_compliance', 'tcpa_compliance', 'call_recording_consent')),
    report_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    report_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    report_data JSONB NOT NULL,
    generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    generated_by TEXT
);

-- Create system_status table
CREATE TABLE IF NOT EXISTS system_status (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    service_name TEXT NOT NULL CHECK (service_name IN ('api', 'calls', 'webhooks', 'database', 'ai', 'analytics')),
    status TEXT NOT NULL CHECK (status IN ('operational', 'degraded', 'outage')),
    message TEXT,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Update ai_agents table to match TypeScript interface (add missing fields)
ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS agent_type TEXT NOT NULL DEFAULT 'customer_service' CHECK (agent_type IN ('customer_service', 'sales', 'support', 'appointment_booking', 'survey', 'after_hours', 'general'));
ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS voice_name TEXT NOT NULL DEFAULT 'Puck' CHECK (voice_name IN ('Puck', 'Charon', 'Kore', 'Fenrir', 'Aoede', 'Leda', 'Orus', 'Zephyr'));
ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS language_code TEXT NOT NULL DEFAULT 'en-US';
ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS system_instruction TEXT;
ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS twilio_phone_number TEXT;
ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS twilio_webhook_url TEXT;
ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS max_concurrent_calls INTEGER NOT NULL DEFAULT 1;
ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS business_hours_start TIME;
ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS business_hours_end TIME;
ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS business_days INTEGER[] NOT NULL DEFAULT '{1,2,3,4,5}';
ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'UTC';
ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS escalation_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS escalation_type TEXT CHECK (escalation_type IN ('human_agent', 'supervisor', 'voicemail', 'callback'));
ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS escalation_phone_number TEXT;
ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS escalation_email TEXT;

-- Update call_logs table to match TypeScript interface (add missing fields)
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES ai_agents(id) ON DELETE SET NULL;
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL;
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES campaign_leads(id) ON DELETE SET NULL;
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent'));
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS customer_satisfaction_score INTEGER CHECK (customer_satisfaction_score >= 1 AND customer_satisfaction_score <= 5);
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS follow_up_required BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS follow_up_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS tags TEXT[];
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Update profiles table to match TypeScript interface (add missing fields)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS max_concurrent_calls INTEGER NOT NULL DEFAULT 1;

-- Enable RLS on all new tables
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE dnc_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_endpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_status ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for new tables
-- Campaigns
CREATE POLICY "Users can view own campaigns" ON campaigns FOR SELECT USING (
    profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
);
CREATE POLICY "Users can insert own campaigns" ON campaigns FOR INSERT WITH CHECK (
    profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
);
CREATE POLICY "Users can update own campaigns" ON campaigns FOR UPDATE USING (
    profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
);
CREATE POLICY "Users can delete own campaigns" ON campaigns FOR DELETE USING (
    profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
);

-- Campaign leads
CREATE POLICY "Users can view own campaign leads" ON campaign_leads FOR SELECT USING (
    campaign_id IN (SELECT id FROM campaigns WHERE profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()))
);
CREATE POLICY "Users can insert own campaign leads" ON campaign_leads FOR INSERT WITH CHECK (
    campaign_id IN (SELECT id FROM campaigns WHERE profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()))
);
CREATE POLICY "Users can update own campaign leads" ON campaign_leads FOR UPDATE USING (
    campaign_id IN (SELECT id FROM campaigns WHERE profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()))
);
CREATE POLICY "Users can delete own campaign leads" ON campaign_leads FOR DELETE USING (
    campaign_id IN (SELECT id FROM campaigns WHERE profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()))
);

-- DNC entries
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

-- Appointments
CREATE POLICY "Users can view own appointments" ON appointments FOR SELECT USING (
    profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
);
CREATE POLICY "Users can insert own appointments" ON appointments FOR INSERT WITH CHECK (
    profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
);
CREATE POLICY "Users can update own appointments" ON appointments FOR UPDATE USING (
    profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
);
CREATE POLICY "Users can delete own appointments" ON appointments FOR DELETE USING (
    profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
);

-- Webhook endpoints
CREATE POLICY "Users can view own webhook endpoints" ON webhook_endpoints FOR SELECT USING (
    profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
);
CREATE POLICY "Users can insert own webhook endpoints" ON webhook_endpoints FOR INSERT WITH CHECK (
    profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
);
CREATE POLICY "Users can update own webhook endpoints" ON webhook_endpoints FOR UPDATE USING (
    profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
);
CREATE POLICY "Users can delete own webhook endpoints" ON webhook_endpoints FOR DELETE USING (
    profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
);

-- Webhook deliveries
CREATE POLICY "Users can view own webhook deliveries" ON webhook_deliveries FOR SELECT USING (
    webhook_id IN (SELECT id FROM webhook_endpoints WHERE profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()))
);

-- Subscriptions
CREATE POLICY "Users can view own subscriptions" ON subscriptions FOR SELECT USING (
    profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
);
CREATE POLICY "Users can insert own subscriptions" ON subscriptions FOR INSERT WITH CHECK (
    profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
);
CREATE POLICY "Users can update own subscriptions" ON subscriptions FOR UPDATE USING (
    profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
);

-- Usage records
CREATE POLICY "Users can view own usage records" ON usage_records FOR SELECT USING (
    profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
);
CREATE POLICY "Users can insert own usage records" ON usage_records FOR INSERT WITH CHECK (
    profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
);

-- Compliance reports
CREATE POLICY "Users can view own compliance reports" ON compliance_reports FOR SELECT USING (
    profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
);
CREATE POLICY "Users can insert own compliance reports" ON compliance_reports FOR INSERT WITH CHECK (
    profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
);

-- System status (read-only for all authenticated users)
CREATE POLICY "Authenticated users can view system status" ON system_status FOR SELECT USING (auth.role() = 'authenticated');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_campaigns_profile_id ON campaigns(profile_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaign_leads_campaign_id ON campaign_leads(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_leads_phone_number ON campaign_leads(phone_number);
CREATE INDEX IF NOT EXISTS idx_campaign_leads_status ON campaign_leads(status);
CREATE INDEX IF NOT EXISTS idx_dnc_entries_profile_id ON dnc_entries(profile_id);
CREATE INDEX IF NOT EXISTS idx_dnc_entries_phone_number ON dnc_entries(phone_number);
CREATE INDEX IF NOT EXISTS idx_appointments_profile_id ON appointments(profile_id);
CREATE INDEX IF NOT EXISTS idx_appointments_scheduled_date ON appointments(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_profile_id ON webhook_endpoints(profile_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook_id ON webhook_deliveries(webhook_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_profile_id ON subscriptions(profile_id);
CREATE INDEX IF NOT EXISTS idx_usage_records_profile_id ON usage_records(profile_id);
CREATE INDEX IF NOT EXISTS idx_compliance_reports_profile_id ON compliance_reports(profile_id);
CREATE INDEX IF NOT EXISTS idx_system_status_service_name ON system_status(service_name);

-- Create updated_at triggers for tables that need them
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_campaign_leads_updated_at BEFORE UPDATE ON campaign_leads FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_webhook_endpoints_updated_at BEFORE UPDATE ON webhook_endpoints FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();