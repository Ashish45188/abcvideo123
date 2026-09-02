import React, { useState, useEffect, useMemo } from 'react';
import { SessionWithLocation, LocationUpdate } from '../types';
import { db } from '../services/db';
import { SessionRouteDetails } from './SessionRouteDetails';
import {
  downloadSessionCSV,
  downloadSessionJSON,
  downloadCompleteReportCSV,
} from '../services/locationExportService';
import {
  calculateCumulativeDistance,
  formatDistanceInMeters,
  formatDateTime,
  formatTimestamp,
  getGoogleMapsUrl,
} from '../utils/geo';
import {
  History,
  Search,
  Filter,
  Calendar,
  Eye,
  Download,
  FileText,
  FileJson,
  RotateCcw,
  MapPin,
  Clock,
  Radio,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';

interface AdminLocationHistoryProps {
  sessions: SessionWithLocation[];
  selectedSessionId: string | null;
  onSelectSession: (id: string) => void;
  history: LocationUpdate[];
  loadingHistory: boolean;
}

interface SessionStats {
  pointCount: number;
  distanceMeters: number;
  history: LocationUpdate[];
}

export const AdminLocationHistory: React.FC<AdminLocationHistoryProps> = ({
  sessions,
  selectedSessionId,
  onSelectSession,
  history,
  loadingHistory,
}) => {
  // Filter states
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchVisitor, setSearchVisitor] = useState<string>('');

  // Session route modal state
  const [viewRouteSession, setViewRouteSession] = useState<SessionWithLocation | null>(null);

  // Cached telemetry stats per session (point count and calculated distance)
  const [statsMap, setStatsMap] = useState<Record<string, SessionStats>>({});
  const [loadingStats, setLoadingStats] = useState<boolean>(false);

  // Load telemetry stats for all sessions so table shows exact distance and point count
  useEffect(() => {
    let isMounted = true;
    async function loadAllSessionStats() {
      setLoadingStats(true);
      try {
        const newMap: Record<string, SessionStats> = {};
        for (const s of sessions) {
          const hist = await db.getLocationHistory(s.id);
          const dist = calculateCumulativeDistance(hist);
          newMap[s.id] = {
            pointCount: hist.length,
            distanceMeters: dist,
            history: hist,
          };
        }
        if (isMounted) {
          setStatsMap(newMap);
        }
      } catch (err) {
        console.error('Failed to load session stats:', err);
      } finally {
        if (isMounted) setLoadingStats(false);
      }
    }

    if (sessions.length > 0) {
      loadAllSessionStats();
    }
  }, [sessions]);

  // Filter sessions based on user inputs
  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      // 1. Visitor ID Search
      if (searchVisitor.trim() !== '') {
        const query = searchVisitor.toLowerCase().trim();
        const visitorMatch = s.visitor_id.toLowerCase().includes(query);
        const linkMatch = s.video_link?.custom_name?.toLowerCase().includes(query) || false;
        if (!visitorMatch && !linkMatch) return false;
      }

      // 2. Status Filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'active' && s.status !== 'active') return false;
        if (statusFilter === 'stopped' && !s.status.startsWith('stopped')) return false;
        if (statusFilter === 'expired' && s.status !== 'expired') return false;
      }

      // 3. Date Range Filter
      const sessionStart = new Date(s.started_at || s.created_at).getTime();

      if (fromDate) {
        const fromTime = new Date(`${fromDate}T00:00:00`).getTime();
        if (sessionStart < fromTime) return false;
      }

      if (toDate) {
        const toTime = new Date(`${toDate}T23:59:59`).getTime();
        if (sessionStart > toTime) return false;
      }

      return true;
    });
  }, [sessions, searchVisitor, statusFilter, fromDate, toDate]);

  const handleClearFilters = () => {
    setFromDate('');
    setToDate('');
    setStatusFilter('all');
    setSearchVisitor('');
  };

  const handleDownloadCSV = (s: SessionWithLocation) => {
    const hist = statsMap[s.id]?.history || [];
    downloadSessionCSV(s, hist);
  };

  const handleDownloadJSON = (s: SessionWithLocation) => {
    const hist = statsMap[s.id]?.history || [];
    downloadSessionJSON(s, hist);
  };

  const handleDownloadReport = (s: SessionWithLocation) => {
    const hist = statsMap[s.id]?.history || [];
    downloadCompleteReportCSV(s, hist);
  };

  return (
    <div className="bg-[#121215] rounded-2xl border border-[#222226] shadow-xl overflow-hidden space-y-6 p-5 font-sans animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#222226]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#18181C] text-[#D1FF26] border border-[#2A2A30] flex items-center justify-center font-bold">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold uppercase tracking-wider text-white font-mono">
              LOCATION &amp; TRAVEL HISTORY
            </h2>
            <p className="text-xs text-[#8E8E96] font-mono">
              Complete persistent history of visitor location telemetry sessions
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="px-3 py-1.5 rounded-xl bg-[#18181C] border border-[#2A2A30] text-[#D0D0D5]">
            Total Recorded Sessions: <span className="font-bold text-[#D1FF26]">{sessions.length}</span>
          </span>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-[#0A0A0B] p-4 rounded-xl border border-[#222226] space-y-3 font-mono">
        <div className="flex items-center gap-2 text-xs font-bold text-[#8E8E96] uppercase tracking-wider">
          <Filter className="w-3.5 h-3.5 text-[#D1FF26]" />
          <span>Filter Telemetry Logs</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Visitor ID Search */}
          <div>
            <label className="text-[10px] text-[#8E8E96] uppercase tracking-widest block font-bold mb-1">
              Search Visitor / Link
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="e.g. visitor_123..."
                value={searchVisitor}
                onChange={(e) => setSearchVisitor(e.target.value)}
                className="w-full bg-[#121215] border border-[#2A2A30] rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-[#52525B] focus:outline-none focus:border-[#D1FF26]"
              />
              <Search className="w-3.5 h-3.5 text-[#71717A] absolute left-2.5 top-2.5" />
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label className="text-[10px] text-[#8E8E96] uppercase tracking-widest block font-bold mb-1">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-[#121215] border border-[#2A2A30] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#D1FF26]"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Tracking (LIVE)</option>
              <option value="stopped">Stopped by Visitor/Admin</option>
              <option value="expired">Expired / Offline</option>
            </select>
          </div>

          {/* From Date */}
          <div>
            <label className="text-[10px] text-[#8E8E96] uppercase tracking-widest block font-bold mb-1">
              From Date
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full bg-[#121215] border border-[#2A2A30] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#D1FF26]"
            />
          </div>

          {/* To Date */}
          <div>
            <label className="text-[10px] text-[#8E8E96] uppercase tracking-widest block font-bold mb-1">
              To Date
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full bg-[#121215] border border-[#2A2A30] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#D1FF26]"
            />
          </div>
        </div>

        {/* Clear Filters Button */}
        {(fromDate || toDate || statusFilter !== 'all' || searchVisitor) && (
          <div className="flex justify-end pt-2 border-t border-[#1E1E22]">
            <button
              onClick={handleClearFilters}
              className="px-3 py-1 bg-[#18181C] hover:bg-[#222228] text-[#D0D0D5] rounded-lg text-xs font-mono font-bold border border-[#2A2A30] flex items-center gap-1.5 transition"
            >
              <RotateCcw className="w-3 h-3 text-[#D1FF26]" />
              <span>Clear Filters</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Location History Table */}
      <div className="overflow-x-auto rounded-xl border border-[#222226]">
        <table className="w-full text-left border-collapse">
          <thead className="bg-[#0E0E10] border-b border-[#222226] text-[10px] font-mono font-bold text-[#8E8E96] uppercase tracking-widest">
            <tr>
              <th className="py-3 px-4">Visitor ID</th>
              <th className="py-3 px-4">Session ID</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Started At</th>
              <th className="py-3 px-4">Stopped At</th>
              <th className="py-3 px-4">Last Seen</th>
              <th className="py-3 px-4 text-center">Location Points</th>
              <th className="py-3 px-4">Distance Travelled</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#222226] text-xs font-mono">
            {filteredSessions.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-[#71717A] text-xs font-mono">
                  NO LOCATION SESSIONS MATCHING YOUR FILTER CRITERIA.
                </td>
              </tr>
            ) : (
              filteredSessions.map((s) => {
                const isActive = s.status === 'active';
                const sessionStats = statsMap[s.id] || { pointCount: s.location_count || 0, distanceMeters: 0, history: [] };

                return (
                  <tr key={s.id} className="hover:bg-[#16161A] transition">
                    {/* Visitor ID */}
                    <td className="py-3 px-4 font-bold text-white whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[#D1FF26]">&bull;</span>
                        <span>{s.visitor_id}</span>
                      </div>
                      <div className="text-[10px] text-[#8E8E96] font-normal truncate max-w-[150px]">
                        {s.video_link?.custom_name || 'Direct Link'}
                      </div>
                    </td>

                    {/* Session ID */}
                    <td className="py-3 px-4 text-[#8E8E96] font-mono text-[11px] whitespace-nowrap">
                      {s.id.slice(0, 8)}...
                    </td>

                    {/* Status Badge */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {isActive ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-[#141810] text-[#D1FF26] border border-[#304018]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#D1FF26] animate-pulse"></span>
                          ● LIVE
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-[#1A1A20] text-[#8E8E96] border border-[#2A2A30]">
                          COMPLETED
                        </span>
                      )}
                    </td>

                    {/* Started At */}
                    <td className="py-3 px-4 text-[#D0D0D5] whitespace-nowrap">
                      {formatDateTime(s.started_at || s.created_at)}
                    </td>

                    {/* Stopped At */}
                    <td className="py-3 px-4 text-[#8E8E96] whitespace-nowrap">
                      {s.stopped_at ? formatDateTime(s.stopped_at) : isActive ? '--' : 'N/A'}
                    </td>

                    {/* Last Seen */}
                    <td className="py-3 px-4 text-[#8E8E96] whitespace-nowrap">
                      {s.last_seen ? formatTimestamp(s.last_seen) : 'N/A'}
                    </td>

                    {/* Location Points */}
                    <td className="py-3 px-4 text-center text-white font-bold whitespace-nowrap">
                      {sessionStats.pointCount}
                    </td>

                    {/* Distance Travelled */}
                    <td className="py-3 px-4 font-bold text-[#D1FF26] whitespace-nowrap">
                      {formatDistanceInMeters(sessionStats.distanceMeters)}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            onSelectSession(s.id);
                            setViewRouteSession(s);
                          }}
                          className="px-2.5 py-1 bg-[#D1FF26] hover:bg-[#bfe822] text-black font-bold rounded-lg text-[11px] uppercase tracking-wider flex items-center gap-1 transition"
                          title="View complete road route on map"
                        >
                          <Eye className="w-3 h-3 text-black stroke-[2.5]" />
                          <span>View Route</span>
                        </button>

                        <button
                          onClick={() => handleDownloadCSV(s)}
                          className="p-1.5 bg-[#18181C] hover:bg-[#222228] text-white rounded-lg border border-[#2A2A30] transition"
                          title="Download CSV"
                        >
                          <FileText className="w-3.5 h-3.5 text-[#D1FF26]" />
                        </button>

                        <button
                          onClick={() => handleDownloadJSON(s)}
                          className="p-1.5 bg-[#18181C] hover:bg-[#222228] text-white rounded-lg border border-[#2A2A30] transition"
                          title="Download JSON"
                        >
                          <FileJson className="w-3.5 h-3.5 text-[#D1FF26]" />
                        </button>

                        <button
                          onClick={() => handleDownloadReport(s)}
                          className="p-1.5 bg-[#18181C] hover:bg-[#222228] text-white rounded-lg border border-[#2A2A30] transition"
                          title="Download Complete Session Report"
                        >
                          <Download className="w-3.5 h-3.5 text-white" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Detail Route Modal */}
      {viewRouteSession && (
        <SessionRouteDetails
          session={viewRouteSession}
          onClose={() => setViewRouteSession(null)}
        />
      )}
    </div>
  );
};
