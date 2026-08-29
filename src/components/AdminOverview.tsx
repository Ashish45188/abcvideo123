import React from 'react';
import { DashboardStats } from '../types';
import { Link2, Radio, Users, Activity, Plus, MapPin, Database } from 'lucide-react';

interface AdminOverviewProps {
  stats: DashboardStats;
  onCreateLinkClick: () => void;
  onViewMapClick: () => void;
  onOpenDbModal: () => void;
  isSupabaseConnected: boolean;
}

export const AdminOverview: React.FC<AdminOverviewProps> = ({
  stats,
  onCreateLinkClick,
  onViewMapClick,
  onOpenDbModal,
  isSupabaseConnected,
}) => {
  return (
    <div className="space-y-6">
      {/* Top Editorial Banner / Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#121215] p-6 rounded-2xl border border-[#222226] shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg sm:text-xl font-bold uppercase tracking-wider text-white font-mono">
              TELEMETRY DASHBOARD
            </h2>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-widest uppercase border ${
                isSupabaseConnected
                  ? 'bg-[#141810] text-[#D1FF26] border-[#304018]'
                  : 'bg-[#18181C] text-[#A0A0A8] border-[#2A2A30]'
              }`}
            >
              {isSupabaseConnected ? 'SUPABASE CLOUD' : 'LOCAL STORE'}
            </span>
          </div>
          <p className="text-xs text-[#8E8E96] font-mono tracking-tight">
            Real-time consent-based GPS coordinates stream with high-accuracy telemetry.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={onOpenDbModal}
            className="px-3.5 py-2 bg-[#18181C] hover:bg-[#202026] text-[#D0D0D5] rounded-xl text-xs font-mono tracking-wide border border-[#2A2A30] flex items-center gap-1.5 transition"
          >
            <Database className="w-3.5 h-3.5 text-[#D1FF26]" />
            <span>Supabase Setup</span>
          </button>
          <button
            onClick={onViewMapClick}
            className="px-3.5 py-2 bg-[#18181C] hover:bg-[#202026] text-[#D0D0D5] rounded-xl text-xs font-mono tracking-wide border border-[#2A2A30] flex items-center gap-1.5 transition"
          >
            <MapPin className="w-3.5 h-3.5 text-[#D1FF26]" />
            <span>Live Map</span>
          </button>
          <button
            onClick={onCreateLinkClick}
            className="px-4 py-2 bg-[#D1FF26] hover:bg-[#bfe822] text-black rounded-xl text-xs font-mono font-bold uppercase tracking-wider shadow-lg flex items-center gap-1.5 transition cursor-pointer"
          >
            <Plus className="w-4 h-4 text-black stroke-[2.5]" />
            <span>New Tracking Link</span>
          </button>
        </div>
      </div>

      {/* 4 Core Stat Cards (Overview Section) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Links */}
        <div className="bg-[#121215] p-5 rounded-2xl border border-[#222226] shadow-md space-y-3 relative overflow-hidden group hover:border-[#383842] transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold text-[#8E8E96] uppercase tracking-widest">
              Total Links
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#18181C] text-[#F0F0F2] border border-[#2A2A30] flex items-center justify-center">
              <Link2 className="w-4 h-4 text-[#D1FF26]" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-white font-mono tracking-tight">
              {stats.totalLinks}
            </div>
            <p className="text-[11px] text-[#71717A] font-mono mt-0.5">Generated shareable URLs</p>
          </div>
        </div>

        {/* Card 2: Active Sessions */}
        <div className="bg-[#121215] p-5 rounded-2xl border border-[#222226] shadow-md space-y-3 relative overflow-hidden group hover:border-[#383842] transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold text-[#8E8E96] uppercase tracking-widest">
              Active Sessions
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#18181C] text-[#D1FF26] border border-[#2A2A30] flex items-center justify-center">
              <Radio className="w-4 h-4 animate-pulse text-[#D1FF26]" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-[#D1FF26] font-mono tracking-tight">
              {stats.activeSessions}
            </div>
            <p className="text-[11px] text-[#71717A] font-mono mt-0.5">Transmitting live GPS telemetry</p>
          </div>
        </div>

        {/* Card 3: Total Sessions */}
        <div className="bg-[#121215] p-5 rounded-2xl border border-[#222226] shadow-md space-y-3 relative overflow-hidden group hover:border-[#383842] transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold text-[#8E8E96] uppercase tracking-widest">
              Total Sessions
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#18181C] text-[#F0F0F2] border border-[#2A2A30] flex items-center justify-center">
              <Activity className="w-4 h-4 text-[#D1FF26]" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-white font-mono tracking-tight">
              {stats.totalSessions}
            </div>
            <p className="text-[11px] text-[#71717A] font-mono mt-0.5">Historical visitor sessions</p>
          </div>
        </div>

        {/* Card 4: Active Visitors */}
        <div className="bg-[#121215] p-5 rounded-2xl border border-[#222226] shadow-md space-y-3 relative overflow-hidden group hover:border-[#383842] transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold text-[#8E8E96] uppercase tracking-widest">
              Active Visitors
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#18181C] text-[#F0F0F2] border border-[#2A2A30] flex items-center justify-center">
              <Users className="w-4 h-4 text-[#D1FF26]" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-white font-mono tracking-tight">
              {stats.activeVisitors}
            </div>
            <p className="text-[11px] text-[#71717A] font-mono mt-0.5">Unique visitor devices active</p>
          </div>
        </div>
      </div>
    </div>
  );
};

