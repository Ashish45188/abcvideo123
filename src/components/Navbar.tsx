import React from 'react';
import {
  Radio,
  MapPin,
  Link2,
  Activity,
  History,
  Database,
  Plus,
  ExternalLink,
  Shield,
  Layers,
  LayoutDashboard,
} from 'lucide-react';

export type AdminTab = 'overview' | 'links' | 'sessions' | 'map' | 'history';

interface NavbarProps {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  onCreateLinkClick: () => void;
  onOpenDbModal: () => void;
  isSupabaseConnected: boolean;
  activeSessionCount: number;
  latestShareId?: string | null;
  onOpenVisitorView?: (shareId: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  onCreateLinkClick,
  onOpenDbModal,
  isSupabaseConnected,
  activeSessionCount,
  latestShareId,
  onOpenVisitorView,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#0A0A0B]/95 backdrop-blur-md border-b border-[#222226]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#D1FF26] flex items-center justify-center text-black shadow-md font-bold">
              <MapPin className="w-4 h-4 text-black stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm sm:text-base tracking-wider uppercase text-white font-mono">
                  GEOVIDEO<span className="text-[#D1FF26]">.TRACKER</span>
                </span>
                <span className="hidden sm:inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold font-mono tracking-widest bg-[#18181C] text-[#D1FF26] border border-[#2A2A30]">
                  ADMIN
                </span>
              </div>
              <p className="text-[10px] text-[#8E8E96] font-mono hidden sm:block tracking-tight">
                CONSENT-BASED LOCATION TELEMETRY
              </p>
            </div>
          </div>

          {/* Desktop Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1 bg-[#121215] p-1 rounded-xl border border-[#222226]">
            <button
              onClick={() => onTabChange('overview')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold tracking-wider uppercase flex items-center gap-1.5 transition ${
                activeTab === 'overview'
                  ? 'bg-[#D1FF26] text-black shadow-sm'
                  : 'text-[#8E8E96] hover:text-white hover:bg-[#1A1A1E]'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Overview</span>
            </button>

            <button
              onClick={() => onTabChange('links')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold tracking-wider uppercase flex items-center gap-1.5 transition ${
                activeTab === 'links'
                  ? 'bg-[#D1FF26] text-black shadow-sm'
                  : 'text-[#8E8E96] hover:text-white hover:bg-[#1A1A1E]'
              }`}
            >
              <Link2 className="w-3.5 h-3.5" />
              <span>Video Links</span>
            </button>

            <button
              onClick={() => onTabChange('sessions')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold tracking-wider uppercase flex items-center gap-1.5 transition relative ${
                activeTab === 'sessions'
                  ? 'bg-[#D1FF26] text-black shadow-sm'
                  : 'text-[#8E8E96] hover:text-white hover:bg-[#1A1A1E]'
              }`}
            >
              <Radio
                className={`w-3.5 h-3.5 ${
                  activeTab === 'sessions'
                    ? 'text-black'
                    : activeSessionCount > 0
                    ? 'text-[#D1FF26] animate-pulse'
                    : ''
                }`}
              />
              <span>Active Sessions</span>
              {activeSessionCount > 0 && (
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    activeTab === 'sessions' ? 'bg-black' : 'bg-[#D1FF26]'
                  }`}
                ></span>
              )}
            </button>

            <button
              onClick={() => onTabChange('map')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold tracking-wider uppercase flex items-center gap-1.5 transition ${
                activeTab === 'map'
                  ? 'bg-[#D1FF26] text-black shadow-sm'
                  : 'text-[#8E8E96] hover:text-white hover:bg-[#1A1A1E]'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Live Map</span>
            </button>

            <button
              onClick={() => onTabChange('history')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold tracking-wider uppercase flex items-center gap-1.5 transition ${
                activeTab === 'history'
                  ? 'bg-[#D1FF26] text-black shadow-sm'
                  : 'text-[#8E8E96] hover:text-white hover:bg-[#1A1A1E]'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>History</span>
            </button>
          </nav>

          {/* Right Action Bar */}
          <div className="flex items-center gap-2">
            {/* Test Visitor View Shortcut */}
            {latestShareId && onOpenVisitorView && (
              <button
                onClick={() => onOpenVisitorView(latestShareId)}
                className="hidden lg:flex items-center gap-1 px-2.5 py-1.5 bg-[#141418] hover:bg-[#1C1C22] text-[#D0D0D5] rounded-xl text-xs font-mono tracking-wide border border-[#28282E] transition"
                title="Open sample visitor consent page"
              >
                <ExternalLink className="w-3.5 h-3.5 text-[#D1FF26]" />
                <span>Test Visitor View</span>
              </button>
            )}

            {/* Supabase status / config trigger */}
            <button
              onClick={onOpenDbModal}
              className={`p-2 rounded-xl border text-xs font-mono tracking-tight flex items-center gap-1.5 transition ${
                isSupabaseConnected
                  ? 'bg-[#141810] text-[#D1FF26] border-[#304018] hover:bg-[#1B2412]'
                  : 'bg-[#141418] text-[#C4C4C8] border-[#28282E] hover:bg-[#1C1C22]'
              }`}
              title={isSupabaseConnected ? 'Connected to Supabase Cloud' : 'Configure Supabase backend'}
            >
              <Database className="w-4 h-4 text-[#D1FF26]" />
              <span className="hidden sm:inline">
                {isSupabaseConnected ? 'Database Connected' : 'Database Setup'}
              </span>
            </button>

            {/* Create Link Quick Button */}
            <button
              onClick={onCreateLinkClick}
              className="px-3.5 py-2 bg-[#D1FF26] hover:bg-[#bfe822] text-black rounded-xl text-xs font-mono font-bold uppercase tracking-wider shadow-md flex items-center gap-1.5 transition cursor-pointer"
            >
              <Plus className="w-4 h-4 text-black stroke-[2.5]" />
              <span className="hidden sm:inline">Create Link</span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Tabs */}
        <div className="flex md:hidden items-center justify-around py-2 border-t border-[#222226] overflow-x-auto text-[11px] font-mono">
          <button
            onClick={() => onTabChange('overview')}
            className={`px-2 py-1 rounded-lg font-bold flex items-center gap-1 ${
              activeTab === 'overview' ? 'text-black bg-[#D1FF26]' : 'text-[#8E8E96]'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Overview</span>
          </button>
          <button
            onClick={() => onTabChange('links')}
            className={`px-2 py-1 rounded-lg font-bold flex items-center gap-1 ${
              activeTab === 'links' ? 'text-black bg-[#D1FF26]' : 'text-[#8E8E96]'
            }`}
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>Links</span>
          </button>
          <button
            onClick={() => onTabChange('sessions')}
            className={`px-2 py-1 rounded-lg font-bold flex items-center gap-1 ${
              activeTab === 'sessions' ? 'text-black bg-[#D1FF26]' : 'text-[#8E8E96]'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Sessions</span>
          </button>
          <button
            onClick={() => onTabChange('map')}
            className={`px-2 py-1 rounded-lg font-bold flex items-center gap-1 ${
              activeTab === 'map' ? 'text-black bg-[#D1FF26]' : 'text-[#8E8E96]'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Map</span>
          </button>
          <button
            onClick={() => onTabChange('history')}
            className={`px-2 py-1 rounded-lg font-bold flex items-center gap-1 ${
              activeTab === 'history' ? 'text-black bg-[#D1FF26]' : 'text-[#8E8E96]'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>History</span>
          </button>
        </div>
      </div>
    </header>
  );
};
