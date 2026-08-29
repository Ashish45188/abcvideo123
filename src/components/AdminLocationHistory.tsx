import React from 'react';
import { LocationUpdate, SessionWithLocation } from '../types';
import {
  formatCoordinates,
  formatAccuracy,
  formatDateTime,
  formatTimestamp,
  getGoogleMapsUrl,
} from '../utils/geo';
import {
  History,
  Navigation,
  Clock,
  ExternalLink,
  MapPin,
  Compass,
  Gauge,
  Layers,
  ArrowUpRight,
} from 'lucide-react';

interface AdminLocationHistoryProps {
  sessions: SessionWithLocation[];
  selectedSessionId: string | null;
  onSelectSession: (id: string) => void;
  history: LocationUpdate[];
  loadingHistory: boolean;
}

export const AdminLocationHistory: React.FC<AdminLocationHistoryProps> = ({
  sessions,
  selectedSessionId,
  onSelectSession,
  history,
  loadingHistory,
}) => {
  const currentSession = sessions.find((s) => s.id === selectedSessionId);

  // Best accuracy calculation
  const bestAccuracy = history.reduce((min: number | null, item) => {
    if (item.accuracy === null || item.accuracy === undefined) return min;
    if (min === null) return item.accuracy;
    return Math.min(min, item.accuracy);
  }, null as number | null);

  return (
    <div className="bg-[#121215] rounded-2xl border border-[#222226] shadow-xl overflow-hidden space-y-4 p-5 font-sans">
      {/* Header & Session Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#222226]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#18181C] text-[#D1FF26] border border-[#2A2A30] flex items-center justify-center font-bold">
            <History className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold uppercase tracking-wider text-white font-mono">
              TELEMETRY &amp; LOCATION HISTORY
            </h3>
            <p className="text-xs text-[#8E8E96] font-mono">
              Detailed chronological records and audit trail of device coordinates
            </p>
          </div>
        </div>

        {/* Dropdown Selector */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-mono font-bold text-[#8E8E96] uppercase tracking-wider">
            Session:
          </label>
          <select
            value={selectedSessionId || ''}
            onChange={(e) => onSelectSession(e.target.value)}
            className="bg-[#0A0A0B] border border-[#2A2A30] rounded-xl px-3 py-1.5 text-xs text-[#F0F0F2] focus:outline-none focus:border-[#D1FF26] font-mono"
          >
            <option value="" disabled>
              -- Select a Visitor Session --
            </option>
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.visitor_id} - {s.video_link?.custom_name || 'Direct Link'} (
                {s.status.toUpperCase()})
              </option>
            ))}
          </select>
        </div>
      </div>

      {!selectedSessionId ? (
        <div className="p-10 text-center text-[#71717A] text-xs font-mono">
          PLEASE SELECT A VISITOR SESSION ABOVE TO INSPECT ITS RECORDED LOCATION TELEMETRY.
        </div>
      ) : loadingHistory ? (
        <div className="p-10 text-center space-y-2">
          <div className="w-8 h-8 border-2 border-[#D1FF26] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-[#8E8E96] font-mono">LOADING TELEMETRY HISTORY...</p>
        </div>
      ) : history.length === 0 ? (
        <div className="p-10 text-center text-[#71717A] text-xs font-mono">
          NO LOCATION UPDATES RECORDED FOR THIS SESSION YET.
        </div>
      ) : (
        <div className="space-y-4">
          {/* Summary Stats Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#0A0A0B] p-3.5 rounded-xl border border-[#222226] text-xs font-mono">
            <div>
              <span className="text-[10px] text-[#8E8E96] uppercase tracking-widest block font-bold">
                Total Updates
              </span>
              <span className="font-bold text-white font-mono text-sm">{history.length}</span>
            </div>
            <div>
              <span className="text-[10px] text-[#8E8E96] uppercase tracking-widest block font-bold">
                Best GPS Accuracy
              </span>
              <span className="font-bold text-[#D1FF26] text-sm">
                {bestAccuracy !== null ? formatAccuracy(bestAccuracy) : 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-[#8E8E96] uppercase tracking-widest block font-bold">
                Started At
              </span>
              <span className="font-medium text-[#D0D0D5] text-xs">
                {formatDateTime(history[0].created_at)}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-[#8E8E96] uppercase tracking-widest block font-bold">
                Latest Fix
              </span>
              <span className="font-medium text-[#D0D0D5] text-xs">
                {formatTimestamp(history[history.length - 1].created_at)}
              </span>
            </div>
          </div>

          {/* Telemetry Table */}
          <div className="overflow-x-auto max-h-96 overflow-y-auto rounded-xl border border-[#222226]">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-[#0E0E10] border-b border-[#222226] text-[10px] font-mono font-bold text-[#8E8E96] uppercase tracking-widest z-10">
                <tr>
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Latitude / Longitude</th>
                  <th className="py-2.5 px-3">Accuracy</th>
                  <th className="py-2.5 px-3">Speed</th>
                  <th className="py-2.5 px-3">Altitude</th>
                  <th className="py-2.5 px-3 text-right">Map</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222226] text-xs font-mono">
                {history.map((record, index) => (
                  <tr key={record.id} className="hover:bg-[#16161A] transition">
                    <td className="py-2.5 px-3 text-[#71717A] text-[11px]">{index + 1}</td>
                    <td className="py-2.5 px-3 text-[#D0D0D5] whitespace-nowrap">
                      {formatTimestamp(record.created_at)}
                    </td>
                    <td className="py-2.5 px-3 text-white font-semibold whitespace-nowrap">
                      {formatCoordinates(record.latitude, record.longitude, 6)}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span
                        className={`${
                          record.accuracy && record.accuracy <= 15
                            ? 'text-[#D1FF26] font-semibold'
                            : 'text-amber-400'
                        }`}
                      >
                        {formatAccuracy(record.accuracy)}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-[#8E8E96] whitespace-nowrap">
                      {record.speed !== null && record.speed !== undefined
                        ? `${(record.speed * 3.6).toFixed(1)} km/h`
                        : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-[#8E8E96] whitespace-nowrap">
                      {record.altitude !== null && record.altitude !== undefined
                        ? `${record.altitude.toFixed(1)}m`
                        : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <a
                        href={getGoogleMapsUrl(record.latitude, record.longitude)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-[#D1FF26] hover:underline uppercase"
                      >
                        <span>View</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
