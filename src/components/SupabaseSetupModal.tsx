import React, { useState } from 'react';
import { getSupabaseConfig, saveSupabaseConfig } from '../lib/supabase';
import {
  Database,
  X,
  Copy,
  Check,
  CheckCircle2,
  Terminal,
  ShieldCheck,
  Radio,
  ExternalLink,
  Save,
  RotateCcw,
} from 'lucide-react';

interface SupabaseSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigSaved: () => void;
}

const SQL_SCHEMA_CONTENT = `-- GeoVideo Tracker - Production Database Schema & RLS Policies
-- Run this in Supabase -> SQL Editor -> New Query

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Table: video_links
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

-- 2. Table: visitor_sessions
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

-- 3. Table: location_updates
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

-- 4. Table: current_locations
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

-- 5. Row Level Security
ALTER TABLE public.video_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitor_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.current_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read active video links" ON public.video_links FOR SELECT USING (active = true);
CREATE POLICY "Admins full access to video_links" ON public.video_links FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Anon read and insert video_links" ON public.video_links FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Visitors can create session" ON public.visitor_sessions FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Public can read session by ID" ON public.visitor_sessions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow update visitor_sessions" ON public.visitor_sessions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow insert location_updates" ON public.location_updates FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Allow read location_updates" ON public.location_updates FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow insert/update current_locations" ON public.current_locations FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 6. Enable Realtime Publications
ALTER PUBLICATION supabase_realtime ADD TABLE public.visitor_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.location_updates;
ALTER PUBLICATION supabase_realtime ADD TABLE public.current_locations;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_video_links_share_id ON public.video_links(share_id);
CREATE INDEX IF NOT EXISTS idx_visitor_sessions_video_link ON public.visitor_sessions(video_link_id);
CREATE INDEX IF NOT EXISTS idx_visitor_sessions_status ON public.visitor_sessions(status);
CREATE INDEX IF NOT EXISTS idx_location_updates_session ON public.location_updates(session_id);
CREATE INDEX IF NOT EXISTS idx_location_updates_created_at ON public.location_updates(created_at);`;

export const SupabaseSetupModal: React.FC<SupabaseSetupModalProps> = ({
  isOpen,
  onClose,
  onConfigSaved,
}) => {
  const currentConfig = getSupabaseConfig();
  const [url, setUrl] = useState(currentConfig.url);
  const [anonKey, setAnonKey] = useState(currentConfig.anonKey);
  const [copiedSql, setCopiedSql] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleCopySql = () => {
    navigator.clipboard.writeText(SQL_SCHEMA_CONTENT);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const handleSaveCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    saveSupabaseConfig(url, anonKey);
    setSavedSuccess(true);
    onConfigSaved();
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleClear = () => {
    setUrl('');
    setAnonKey('');
    saveSupabaseConfig('', '');
    onConfigSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#121215] border border-[#222226] rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto relative font-sans">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-[#8E8E96] hover:text-white p-1.5 rounded-lg hover:bg-[#18181C] transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 border-b border-[#222226] pb-4">
          <div className="w-12 h-12 rounded-2xl bg-[#18181C] text-[#D1FF26] border border-[#2A2A30] flex items-center justify-center">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold uppercase tracking-wider text-white font-mono">
              SUPABASE BACKEND CONFIGURATION
            </h2>
            <p className="text-xs text-[#8E8E96] font-mono">
              Complete setup guide, PostgreSQL schema, RLS rules, and connection manager
            </p>
          </div>
        </div>

        {/* Live Status Pill */}
        <div className="flex items-center justify-between p-3.5 bg-[#0A0A0B] rounded-2xl border border-[#222226] text-xs font-mono">
          <div className="flex items-center gap-2.5">
            <span
              className={`w-3 h-3 rounded-full ${
                currentConfig.isConfigured ? 'bg-[#D1FF26] animate-pulse' : 'bg-amber-500'
              }`}
            ></span>
            <span className="font-bold text-white uppercase tracking-wider">
              Status:{' '}
              {currentConfig.isConfigured
                ? 'Connected to Live Supabase Cloud'
                : 'Using Local In-Memory Fallback'}
            </span>
          </div>
          <span className="text-[#8E8E96] text-[11px] uppercase tracking-widest font-bold">
            {currentConfig.isConfigured ? 'Realtime Active' : 'Zero-Config Preview Mode'}
          </span>
        </div>

        {/* Form: Connect Supabase */}
        <form onSubmit={handleSaveCredentials} className="space-y-4 bg-[#0A0A0B] p-5 rounded-2xl border border-[#222226]">
          <h3 className="text-sm font-bold uppercase tracking-wider text-white font-mono flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#D1FF26]" />
            Supabase Project Credentials
          </h3>
          <p className="text-xs text-[#8E8E96] font-mono">
            Paste your project URL and Anon (public) key from your Supabase Dashboard &gt; Project Settings &gt; API.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1 font-mono">
              <label className="text-xs font-bold text-[#D0D0D5] uppercase tracking-wider">
                VITE_SUPABASE_URL
              </label>
              <input
                type="url"
                placeholder="https://your-project.supabase.co"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full bg-[#121215] border border-[#2A2A30] rounded-xl px-3 py-2 text-xs text-[#F0F0F2] placeholder:text-[#52525B] focus:outline-none focus:border-[#D1FF26] font-mono"
              />
            </div>
            <div className="space-y-1 font-mono">
              <label className="text-xs font-bold text-[#D0D0D5] uppercase tracking-wider">
                VITE_SUPABASE_ANON_KEY
              </label>
              <input
                type="password"
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                value={anonKey}
                onChange={(e) => setAnonKey(e.target.value)}
                className="w-full bg-[#121215] border border-[#2A2A30] rounded-xl px-3 py-2 text-xs text-[#F0F0F2] placeholder:text-[#52525B] focus:outline-none focus:border-[#D1FF26] font-mono"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={handleClear}
              className="px-3 py-1.5 text-xs text-[#8E8E96] hover:text-white flex items-center gap-1 transition font-mono uppercase tracking-wider cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              Reset to Local
            </button>

            <button
              type="submit"
              className="px-4 py-2 bg-[#D1FF26] hover:bg-[#bfe822] text-black rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <Save className="w-3.5 h-3.5 text-black" />
              <span>Save &amp; Connect</span>
            </button>
          </div>

          {savedSuccess && (
            <div className="p-2 bg-[#141810] text-[#D1FF26] rounded-lg text-xs flex items-center gap-1.5 border border-[#304018] font-mono uppercase tracking-wider">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Credentials saved successfully! Reconnecting client...</span>
            </div>
          )}
        </form>

        {/* Step-by-Step Instructions */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-white font-mono">
            Step-by-Step Supabase Setup Guide
          </h3>

          <div className="space-y-2.5 text-xs text-[#D0D0D5]">
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[#0A0A0B] border border-[#222226]">
              <span className="w-5 h-5 rounded-lg bg-[#18181C] text-[#D1FF26] border border-[#2A2A30] flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5 font-mono">
                1
              </span>
              <div className="space-y-0.5 font-mono">
                <span className="font-bold text-white uppercase tracking-wider">Create a free Supabase project</span>
                <p className="text-[#8E8E96] text-[11px] font-sans">
                  Sign in at{' '}
                  <a
                    href="https://supabase.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#D1FF26] hover:underline inline-flex items-center gap-0.5"
                  >
                    supabase.com <ExternalLink className="w-2.5 h-2.5" />
                  </a>{' '}
                  and click "New Project".
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[#0A0A0B] border border-[#222226]">
              <span className="w-5 h-5 rounded-lg bg-[#18181C] text-[#D1FF26] border border-[#2A2A30] flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5 font-mono">
                2
              </span>
              <div className="space-y-1.5 flex-1 font-mono">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white uppercase tracking-wider">Execute the SQL Schema</span>
                  <button
                    onClick={handleCopySql}
                    className="px-2.5 py-1 bg-[#18181C] hover:bg-[#222228] text-[#D0D0D5] rounded-lg text-[11px] font-mono uppercase tracking-wider border border-[#2A2A30] flex items-center gap-1 transition cursor-pointer"
                  >
                    {copiedSql ? (
                      <>
                        <Check className="w-3 h-3 text-[#D1FF26]" />
                        <span className="text-[#D1FF26]">Copied SQL</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy SQL</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-[#8E8E96] text-[11px] font-sans">
                  Go to <strong>SQL Editor</strong> in Supabase, click <strong>New Query</strong>, paste the script below, and click <strong>Run</strong>.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[#0A0A0B] border border-[#222226]">
              <span className="w-5 h-5 rounded-lg bg-[#18181C] text-[#D1FF26] border border-[#2A2A30] flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5 font-mono">
                3
              </span>
              <div className="space-y-0.5 font-mono">
                <span className="font-bold text-white uppercase tracking-wider">HTTPS &amp; Geolocation in Production</span>
                <p className="text-[#8E8E96] text-[11px] font-sans">
                  Browser Geolocation requires <strong>HTTPS</strong> when deployed in production (all browsers enforce this for privacy). In local development, <code>localhost</code> is always permitted.
                </p>
              </div>
            </div>
          </div>

          {/* SQL Preview Box */}
          <div className="space-y-1.5 font-mono">
            <div className="flex items-center justify-between text-xs text-[#8E8E96]">
              <span className="font-bold uppercase tracking-wider flex items-center gap-1.5 text-white">
                <Terminal className="w-3.5 h-3.5 text-[#D1FF26]" />
                SQL Schema Preview
              </span>
              <button
                onClick={handleCopySql}
                className="text-[#D1FF26] hover:underline text-[11px] uppercase tracking-wider flex items-center gap-1 cursor-pointer"
              >
                <Copy className="w-3 h-3" />
                Copy Full Script
              </button>
            </div>
            <pre className="bg-[#0A0A0B] p-3 rounded-xl border border-[#222226] text-[11px] font-mono text-[#D0D0D5] overflow-x-auto max-h-48 overflow-y-auto select-all">
              {SQL_SCHEMA_CONTENT}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
