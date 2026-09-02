import React, { useEffect, useState } from 'react';
import { LocationUpdate, SessionWithLocation } from '../types';
import { AdminLiveMap } from './AdminLiveMap';
import { db } from '../services/db';
import {
  downloadSessionCSV,
  downloadSessionJSON,
  downloadCompleteReportCSV,
} from '../services/locationExportService';
import {
  calculateCumulativeDistance,
  formatDistanceInMeters,
  formatDuration,
  formatDateTime,
  formatAccuracy,
} from '../utils/geo';
import {
  X,
  MapPin,
  Clock,
  Navigation,
  Download,
  FileText,
  FileJson,
  CheckCircle2,
  AlertCircle,
  Activity,
  Route,
} from 'lucide-react';

interface SessionRouteDetailsProps {
  session: SessionWithLocation;
  onClose: () => void;
}

export const SessionRouteDetails: React.FC<SessionRouteDetailsProps> = ({ session, onClose }) => {
  const [history, setHistory] = useState<LocationUpdate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadSessionHistory() {
      setLoading(true);
      try {
        const hist = await db.getLocationHistory(session.id);
        if (isMounted) {
          setHistory(hist);
        }
      } catch (err) {
        console.error('Failed to load route details history:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadSessionHistory();

    // Subscribe to realtime updates for this session
    const unsubscribe = db.subscribeToAllSessions(() => {
      loadSessionHistory();
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [session.id]);

  const totalDistanceMeters = calculateCumulativeDistance(history);
  const durationText = formatDuration(
    session.started_at || session.created_at,
    session.stopped_at || session.last_seen
  );

  const bestAccuracy = history.reduce((min: number | null, item) => {
    if (item.accuracy === null || item.accuracy === undefined) return min;
    if (min === null) return item.accuracy;
    return Math.min(min, item.accuracy);
  }, null as number | null);

  const isActive = session.status === 'active';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="bg-[#121215] border border-[#28282E] rounded-2xl w-full max-w-5xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] my-auto font-sans">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#222226] bg-[#0E0E10]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#18181C] text-[#D1FF26] border border-[#2A2A30] flex items-center justify-center font-bold">
              <Route className="w-5 h-5 text-[#D1FF26]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold uppercase tracking-wider text-white font-mono">
                  TRAVEL ROUTE DETAILS
                </h3>
                {isActive ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold font-mono tracking-widest bg-[#141810] text-[#D1FF26] border border-[#304018] uppercase">
                    <span className="w-2 h-2 rounded-full bg-[#D1FF26] animate-pulse"></span>
                    LIVE TRACKING
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold font-mono tracking-widest bg-[#1C1C22] text-[#8E8E96] border border-[#2A2A30] uppercase">
                    HISTORICAL / COMPLETED
                  </span>
                )}
              </div>
              <p className="text-xs text-[#8E8E96] font-mono">
                Visitor: <span className="text-white font-bold">{session.visitor_id}</span> &bull; Session ID: {session.id.slice(0, 8)}...
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-[#8E8E96] hover:text-white rounded-xl bg-[#18181C] hover:bg-[#222228] transition border border-[#28282E]"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Top Travel Summary Panel */}
          <div className="bg-[#0A0A0B] border border-[#222226] rounded-xl p-4 space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#1E1E22]">
              <span className="text-xs font-bold uppercase tracking-wider text-[#8E8E96] flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#D1FF26]" />
                Travel Summary Statistics
              </span>
              <span className="text-[#8E8E96]">
                Video Link: <span className="text-white font-semibold">{session.video_link?.custom_name || 'Direct Link'}</span>
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <div>
                <span className="text-[10px] text-[#8E8E96] uppercase tracking-widest block font-bold">Status</span>
                <span className={`font-bold uppercase ${isActive ? 'text-[#D1FF26]' : 'text-white'}`}>
                  {session.status.replace(/_/g, ' ')}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-[#8E8E96] uppercase tracking-widest block font-bold">Total Distance</span>
                <span className="font-bold text-[#D1FF26] text-sm">{formatDistanceInMeters(totalDistanceMeters)}</span>
              </div>

              <div>
                <span className="text-[10px] text-[#8E8E96] uppercase tracking-widest block font-bold">Duration</span>
                <span className="font-bold text-white text-sm">{durationText}</span>
              </div>

              <div>
                <span className="text-[10px] text-[#8E8E96] uppercase tracking-widest block font-bold">GPS Points</span>
                <span className="font-bold text-white text-sm">{history.length}</span>
              </div>

              <div>
                <span className="text-[10px] text-[#8E8E96] uppercase tracking-widest block font-bold">Best Accuracy</span>
                <span className="font-bold text-[#D1FF26]">{bestAccuracy !== null ? formatAccuracy(bestAccuracy) : 'N/A'}</span>
              </div>

              <div>
                <span className="text-[10px] text-[#8E8E96] uppercase tracking-widest block font-bold">Consent</span>
                <span className="font-bold text-white">{session.consent_given ? 'GRANTED' : 'DENIED'}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-[#1E1E22] text-[11px] text-[#A0A0AA]">
              <div>
                <span className="text-[#8E8E96]">Started:</span> {formatDateTime(session.started_at || session.created_at)}
              </div>
              <div>
                <span className="text-[#8E8E96]">Stopped / End:</span> {session.stopped_at ? formatDateTime(session.stopped_at) : isActive ? 'Active Now' : 'N/A'}
              </div>
              <div>
                <span className="text-[#8E8E96]">Last Seen:</span> {session.last_seen ? formatDateTime(session.last_seen) : 'N/A'}
              </div>
            </div>
          </div>

          {/* Interactive Map View */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-[#D1FF26]" />
                Road-Following Travel Route Map
              </span>
              <span className="text-[#8E8E96]">
                {isActive ? 'Live Updates Active' : 'Historical Trajectory Loaded'}
              </span>
            </div>

            {loading ? (
              <div className="h-[400px] rounded-2xl border border-[#222226] bg-[#0A0A0B] flex flex-col items-center justify-center space-y-2">
                <div className="w-8 h-8 border-2 border-[#D1FF26] border-t-transparent rounded-full animate-spin"></div>
                <p className="text-xs text-[#8E8E96] font-mono">LOADING ROAD ROUTE...</p>
              </div>
            ) : (
              <AdminLiveMap
                sessions={[session]}
                selectedSessionId={session.id}
                locationHistory={history}
              />
            )}
          </div>
        </div>

        {/* Modal Footer / Export Bar */}
        <div className="p-4 bg-[#0E0E10] border-t border-[#222226] flex flex-wrap items-center justify-between gap-3 font-mono text-xs">
          <div className="text-[#8E8E96]">
            Export full location telemetry data for session <span className="text-white font-bold">{session.visitor_id}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => downloadSessionCSV(session, history)}
              disabled={history.length === 0}
              className="px-3 py-2 bg-[#18181C] hover:bg-[#222228] text-white rounded-xl border border-[#2A2A30] font-bold flex items-center gap-1.5 transition disabled:opacity-50"
            >
              <FileText className="w-4 h-4 text-[#D1FF26]" />
              <span>Download CSV</span>
            </button>

            <button
              onClick={() => downloadSessionJSON(session, history)}
              disabled={history.length === 0}
              className="px-3 py-2 bg-[#18181C] hover:bg-[#222228] text-white rounded-xl border border-[#2A2A30] font-bold flex items-center gap-1.5 transition disabled:opacity-50"
            >
              <FileJson className="w-4 h-4 text-[#D1FF26]" />
              <span>Download JSON</span>
            </button>

            <button
              onClick={() => downloadCompleteReportCSV(session, history)}
              disabled={history.length === 0}
              className="px-3.5 py-2 bg-[#D1FF26] hover:bg-[#bfe822] text-black font-bold rounded-xl shadow-md flex items-center gap-1.5 transition disabled:opacity-50"
            >
              <Download className="w-4 h-4 text-black stroke-[2.5]" />
              <span>Download Complete Report</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
