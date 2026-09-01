-- ================================================================
-- GeoVideo Tracker - Production Supabase Database Schema
-- Run this in your Supabase SQL Editor (Dashboard -> SQL Editor)
-- ================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create Table: video_links
CREATE TABLE IF NOT EXISTS public.video_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    share_id TEXT UNIQUE NOT NULL,
    custom_name TEXT NOT NULL,
    description TEXT,
    media_type TEXT DEFAULT 'youtube', -- 'youtube', 'video', 'photo', 'pdf'
    media_url TEXT,
    thumbnail_url TEXT,
    youtube_url TEXT,
    youtube_video_id TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create Table: visitor_sessions
-- Allowed status values: 'waiting', 'active', 'stopped_by_visitor', 'stopped_by_admin', 'permission_denied', 'location_unavailable', 'expired'
CREATE TABLE IF NOT EXISTS public.visitor_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    video_link_id UUID REFERENCES public.video_links(id) ON DELETE CASCADE,
    visitor_id TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('waiting', 'active', 'stopped_by_visitor', 'stopped_by_admin', 'permission_denied', 'location_unavailable', 'expired')),
    consent_given BOOLEAN DEFAULT FALSE,
    started_at TIMESTAMPTZ,
    stopped_at TIMESTAMPTZ,
    stop_reason TEXT,
    last_seen TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create Table: location_updates
CREATE TABLE IF NOT EXISTS public.location_updates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES public.visitor_sessions(id) ON DELETE CASCADE,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    accuracy DOUBLE PRECISION,
    altitude DOUBLE PRECISION,
    altitude_accuracy DOUBLE PRECISION,
    heading DOUBLE PRECISION,
    speed DOUBLE PRECISION,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create Table: current_locations
CREATE TABLE IF NOT EXISTS public.current_locations (
    session_id UUID PRIMARY KEY REFERENCES public.visitor_sessions(id) ON DELETE CASCADE,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    accuracy DOUBLE PRECISION,
    altitude DOUBLE PRECISION,
    altitude_accuracy DOUBLE PRECISION,
    heading DOUBLE PRECISION,
    speed DOUBLE PRECISION,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Enable Row Level Security (RLS) on all tables
ALTER TABLE public.video_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitor_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.current_locations ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies:
-- Video Links:
-- Public can read active video links by share_id to view video details
CREATE POLICY "Public read active video links"
    ON public.video_links
    ON SELECT
    USING (active = true);

-- Authenticated admins can view, insert, update, delete all video links
CREATE POLICY "Admins full access to video_links"
    ON public.video_links
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Also allow anon full access if using anon key in simplified mode
CREATE POLICY "Anon read and insert video_links"
    ON public.video_links
    FOR ALL
    TO anon
    USING (true)
    WITH CHECK (true);

-- Visitor Sessions:
-- Anyone (visitors) can insert their session upon consent
CREATE POLICY "Visitors can create session"
    ON public.visitor_sessions
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- Visitors and admins can read sessions
CREATE POLICY "Public can read session by ID"
    ON public.visitor_sessions
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- Visitors can update their own session status (e.g. stop sharing)
-- Admins can update any session (e.g. stop session)
CREATE POLICY "Allow update visitor_sessions"
    ON public.visitor_sessions
    FOR UPDATE
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- Location Updates:
-- Visitors can insert location updates
CREATE POLICY "Allow insert location_updates"
    ON public.location_updates
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- Admins and visitors can read location updates
CREATE POLICY "Allow read location_updates"
    ON public.location_updates
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- Current Locations:
-- Allow upsert / insert / update for current location
CREATE POLICY "Allow insert/update current_locations"
    ON public.current_locations
    FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- 8. Enable Supabase Realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.visitor_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.location_updates;
ALTER PUBLICATION supabase_realtime ADD TABLE public.current_locations;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_video_links_share_id ON public.video_links(share_id);
CREATE INDEX IF NOT EXISTS idx_visitor_sessions_video_link ON public.visitor_sessions(video_link_id);
CREATE INDEX IF NOT EXISTS idx_visitor_sessions_status ON public.visitor_sessions(status);
CREATE INDEX IF NOT EXISTS idx_location_updates_session ON public.location_updates(session_id);
CREATE INDEX IF NOT EXISTS idx_location_updates_created_at ON public.location_updates(created_at);

-- ================================================================
-- Supabase Storage Setup & RLS Policies for whatsapp-thumbnails
-- ================================================================

-- Create or update public storage bucket for whatsapp-thumbnails
INSERT INTO storage.buckets (id, name, public)
VALUES ('whatsapp-thumbnails', 'whatsapp-thumbnails', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Drop existing policies if needed to avoid duplicate policy errors on re-run
DROP POLICY IF EXISTS "Public Select whatsapp-thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Allow upload whatsapp-thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Allow update whatsapp-thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Allow delete whatsapp-thumbnails" ON storage.objects;

-- 1. READ: Anyone (public) can read objects in whatsapp-thumbnails so WhatsApp preview works
CREATE POLICY "Public Select whatsapp-thumbnails"
    ON storage.objects FOR SELECT
    TO public
    USING (bucket_id = 'whatsapp-thumbnails');

-- 2. INSERT: Application client (anon, authenticated) can upload thumbnails
CREATE POLICY "Allow upload whatsapp-thumbnails"
    ON storage.objects FOR INSERT
    TO anon, authenticated
    WITH CHECK (bucket_id = 'whatsapp-thumbnails');

-- 3. UPDATE: Restricted to authenticated admins/owners
CREATE POLICY "Allow update whatsapp-thumbnails"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (bucket_id = 'whatsapp-thumbnails')
    WITH CHECK (bucket_id = 'whatsapp-thumbnails');

-- 4. DELETE: Restricted to authenticated admins/owners
CREATE POLICY "Allow delete whatsapp-thumbnails"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'whatsapp-thumbnails');
