import React, { useState, useEffect, useCallback } from 'react';
import {
  VideoLink,
  VisitorSession,
  SessionWithLocation,
  LocationUpdate,
  DashboardStats,
  CreateVideoLinkInput,
} from '../types';
import { db, STALE_SESSION_THRESHOLD_MS } from '../services/db';
import { getSupabaseConfig } from '../lib/supabase';
import { Navbar, AdminTab } from '../components/Navbar';
import { AdminOverview } from '../components/AdminOverview';
import { AdminLinksList } from '../components/AdminLinksList';
import { AdminActiveSessions } from '../components/AdminActiveSessions';
import { AdminLiveMap } from '../components/AdminLiveMap';
import { AdminLocationHistory } from '../components/AdminLocationHistory';
import { CreateVideoLinkModal } from '../components/CreateVideoLinkModal';
import { QRCodeModal } from '../components/QRCodeModal';
import { SupabaseSetupModal } from '../components/SupabaseSetupModal';
import { MapPin, Plus, Radio, RefreshCw } from 'lucide-react';

interface AdminDashboardProps {
  onOpenVisitorView: (shareId: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onOpenVisitorView }) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [links, setLinks] = useState<VideoLink[]>([]);
  const [sessions, setSessions] = useState<SessionWithLocation[]>([]);
  const [loading, setLoading] = useState(true);

  // Selected session for map centering & history
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [locationHistory, setLocationHistory] = useState<LocationUpdate[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDbModalOpen, setIsDbModalOpen] = useState(false);
  const [qrModalLink, setQrModalLink] = useState<VideoLink | null>(null);

  const [supabaseConfig, setSupabaseConfig] = useState(getSupabaseConfig());

  // Ticks every 15s purely to force a re-render so stale-session detection
  // (based on elapsed time since last_seen) stays accurate even when no new
  // realtime DB event has come in.
  const [, forceStaleRecheck] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => forceStaleRecheck((t) => t + 1), 15000);
    return () => clearInterval(interval);
  }, []);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : '';

  // Load all initial data and refresh location history for active/selected session
  const loadData = useCallback(async () => {
    try {
      await db.expireStaleSessions();
      const [fetchedLinks, fetchedSessions] = await Promise.all([
        db.getVideoLinks(),
        db.getAllSessions(),
      ]);
      setLinks(fetchedLinks);
      setSessions(fetchedSessions);

      let currentSelected = selectedSessionId;
      // Default select the first active session if none selected
      if (!currentSelected && fetchedSessions.length > 0) {
        const activeOne = fetchedSessions.find((s) => s.status === 'active');
        currentSelected = activeOne ? activeOne.id : fetchedSessions[0].id;
        setSelectedSessionId(currentSelected);
      }

      // Automatically re-fetch location history for the selected session
      // so live GPS trajectory updates automatically in Realtime!
      if (currentSelected) {
        const hist = await db.getLocationHistory(currentSelected);
        setLocationHistory(hist);
        console.log('=== LIVE ROUTE DEBUG ===');
        console.log('Realtime Event: received');
        console.log('Admin Map Updated: true');
        console.log('Route Coordinates:', hist.length);
      }
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedSessionId]);

  useEffect(() => {
    loadData();

    // Subscribe to realtime database events
    const unsubscribe = db.subscribeToAllSessions(() => {
      loadData();
    });

    return () => {
      unsubscribe();
    };
  }, [loadData]);

  // Load history when selectedSessionId changes
  useEffect(() => {
    if (!selectedSessionId) {
      setLocationHistory([]);
      return;
    }

    let isMounted = true;
    async function loadHist() {
      setLoadingHistory(true);
      try {
        const hist = await db.getLocationHistory(selectedSessionId!);
        if (isMounted) {
          setLocationHistory(hist);
        }
      } catch (err) {
        console.error('Failed to load session history:', err);
      } finally {
        if (isMounted) setLoadingHistory(false);
      }
    }

    loadHist();

    return () => {
      isMounted = false;
    };
  }, [selectedSessionId]);

  // Handlers
  const handleCreateLink = async (input: CreateVideoLinkInput): Promise<VideoLink> => {
    const created = await db.createVideoLink(input);
    await loadData();
    return created;
  };

  const handleToggleLinkStatus = async (id: string, active: boolean) => {
    await db.toggleVideoLinkStatus(id, active);
    await loadData();
  };

  const handleDeleteLink = async (id: string) => {
    await db.deleteVideoLink(id);
    await loadData();
  };

  const handleStopSession = async (sessionId: string) => {
    await db.updateVisitorSessionStatus(sessionId, 'stopped_by_admin', 'Stopped by administrator');
    await loadData();
  };

  const handleDeleteSession = async (sessionId: string) => {
    await db.deleteVisitorSession(sessionId);
    setSessions((current) => current.filter((session) => session.id !== sessionId));
    if (selectedSessionId === sessionId) {
      setSelectedSessionId(null);
    }
    await loadData();
  };

  const handleViewLocation = (sessionId: string) => {
    setSelectedSessionId(sessionId);
    setActiveTab('map');
  };

  const handleViewHistory = (sessionId: string) => {
    setSelectedSessionId(sessionId);
    setActiveTab('history');
  };

  // Compute Stats
  // A session's status can stay 'active' forever if a visitor just closes
  // the tab (no browser event marks it stopped). Treat sessions with no
  // location update in the last 90s as stale so they stop being counted
  // as "active" and don't overlap with genuinely live sessions.
  const isSessionLive = (s: SessionWithLocation) => {
    if (s.status !== 'active') return false;
    const lastSeenTime = Math.max(
      new Date(s.last_seen || s.created_at).getTime(),
      new Date(s.current_location?.updated_at || s.created_at).getTime()
    );
    return Date.now() - lastSeenTime < STALE_SESSION_THRESHOLD_MS;
  };
  const activeSessionsList = sessions.filter(isSessionLive);
  const uniqueActiveVisitors = new Set(activeSessionsList.map((s) => s.visitor_id)).size;

  const stats: DashboardStats = {
    totalLinks: links.length,
    activeSessions: activeSessionsList.length,
    totalSessions: sessions.length,
    activeVisitors: uniqueActiveVisitors,
  };

  const latestShareId = links.length > 0 ? links[0].share_id : null;

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-[#F0F0F2] flex flex-col font-sans">
      {/* Top Header Navbar */}
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onCreateLinkClick={() => setIsCreateModalOpen(true)}
        onOpenDbModal={() => setIsDbModalOpen(true)}
        isSupabaseConnected={supabaseConfig.isConfigured}
        activeSessionCount={activeSessionsList.length}
        latestShareId={latestShareId}
        onOpenVisitorView={onOpenVisitorView}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-8 h-8 border-2 border-[#D1FF26] border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs text-[#8E8E96] font-mono">SYNCHRONIZING TELEMETRY STREAMS...</p>
          </div>
        ) : (
          <>
            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <div className="space-y-6 animate-fadeIn">
                <AdminOverview
                  stats={stats}
                  onCreateLinkClick={() => setIsCreateModalOpen(true)}
                  onViewMapClick={() => setActiveTab('map')}
                  onOpenDbModal={() => setIsDbModalOpen(true)}
                  isSupabaseConnected={supabaseConfig.isConfigured}
                />

                {/* Split Grid: Live Map & Active Sessions summary */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left Map (7 cols) */}
                  <div className="lg:col-span-7 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-white font-mono flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-[#D1FF26]" />
                        <span>Live Device Map Preview</span>
                      </h3>
                      <button
                        onClick={() => setActiveTab('map')}
                        className="text-xs font-mono text-[#D1FF26] hover:underline uppercase tracking-wide"
                      >
                        Expand Map View &rarr;
                      </button>
                    </div>
                    <AdminLiveMap
                      sessions={activeSessionsList}
                      selectedSessionId={selectedSessionId}
                      onSelectSession={setSelectedSessionId}
                      locationHistory={locationHistory}
                    />
                  </div>

                  {/* Right Active Sessions (5 cols) */}
                  <div className="lg:col-span-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-white font-mono flex items-center gap-2">
                        <Radio className="w-3.5 h-3.5 text-[#D1FF26] animate-pulse" />
                        <span>Active Telemetry Feed</span>
                      </h3>
                      <button
                        onClick={() => setActiveTab('sessions')}
                        className="text-xs font-mono text-[#D1FF26] hover:underline uppercase tracking-wide"
                      >
                        View All ({activeSessionsList.length}) &rarr;
                      </button>
                    </div>

                    <div className="bg-[#121215] rounded-2xl border border-[#222226] p-4 shadow-xl space-y-3 max-h-[550px] overflow-y-auto">
                      {activeSessionsList.length === 0 ? (
                        <div className="p-8 text-center text-[#71717A] text-xs font-mono">
                          NO ACTIVE STREAMS. OPEN A VISITOR LINK TO TRANSMIT GPS.
                        </div>
                      ) : (
                        activeSessionsList.map((s) => (
                          <div
                            key={s.id}
                            onClick={() => setSelectedSessionId(s.id)}
                            className={`p-3.5 rounded-xl border transition cursor-pointer ${
                              selectedSessionId === s.id
                                ? 'bg-[#18181C] border-[#D1FF26]/80 ring-1 ring-[#D1FF26]/30'
                                : 'bg-[#0E0E10] border-[#222226] hover:bg-[#151518]'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-xs font-mono text-white">{s.visitor_id}</span>
                              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded font-bold tracking-wider bg-[#141810] text-[#D1FF26] border border-[#304018]">
                                LIVE
                              </span>
                            </div>
                            <p className="text-[11px] text-[#8E8E96] truncate mt-0.5">
                              {s.video_link?.custom_name || 'Protected Video'}
                            </p>
                            {s.current_location && (
                              <div className="mt-2 pt-2 border-t border-[#222226] flex items-center justify-between text-[11px] text-[#D0D0D5] font-mono">
                                <span>
                                  {s.current_location.latitude.toFixed(4)},{' '}
                                  {s.current_location.longitude.toFixed(4)}
                                </span>
                                <span className="text-[#D1FF26] font-mono font-semibold">
                                  &plusmn;{Math.round(s.current_location.accuracy || 0)}m
                                </span>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Bottom Recent Video Links Section */}
                <AdminLinksList
                  links={links}
                  baseUrl={baseUrl}
                  onToggleStatus={handleToggleLinkStatus}
                  onDeleteLink={handleDeleteLink}
                  onShowQr={(link) => setQrModalLink(link)}
                  onCreateNewClick={() => setIsCreateModalOpen(true)}
                  onOpenVisitorView={onOpenVisitorView}
                />
              </div>
            )}

            {/* LINKS TAB */}
            {activeTab === 'links' && (
              <div className="animate-fadeIn space-y-4">
                <AdminLinksList
                  links={links}
                  baseUrl={baseUrl}
                  onToggleStatus={handleToggleLinkStatus}
                  onDeleteLink={handleDeleteLink}
                  onShowQr={(link) => setQrModalLink(link)}
                  onCreateNewClick={() => setIsCreateModalOpen(true)}
                  onOpenVisitorView={onOpenVisitorView}
                />
              </div>
            )}

            {/* ACTIVE SESSIONS TAB */}
            {activeTab === 'sessions' && (
              <div className="animate-fadeIn space-y-4">
                <AdminActiveSessions
                  sessions={activeSessionsList}
                  onStopSession={handleStopSession}
                  onViewLocation={handleViewLocation}
                  onViewHistory={handleViewHistory}
                  onDeleteSession={handleDeleteSession}
                  selectedSessionId={selectedSessionId}
                />
              </div>
            )}

            {/* LIVE MAP TAB */}
            {activeTab === 'map' && (
              <div className="animate-fadeIn space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-[#121215] p-4 rounded-xl border border-[#222226]">
                  <div>
                    <h2 className="text-base font-bold uppercase tracking-wider text-white font-mono flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-[#D1FF26]" />
                      Live Interactive Map View
                    </h2>
                    <p className="text-xs text-[#8E8E96] font-mono">
                      OpenStreetMap &bull; High-Accuracy Geolocation circles &bull; Realtime updates
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => loadData()}
                      className="px-3.5 py-1.5 bg-[#18181C] hover:bg-[#222228] text-[#D0D0D5] rounded-lg text-xs font-mono font-bold tracking-wide border border-[#2A2A30] flex items-center gap-1.5 transition"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-[#D1FF26]" />
                      <span>Refresh Telemetry</span>
                    </button>
                  </div>
                </div>

                <AdminLiveMap
                  sessions={activeSessionsList}
                  selectedSessionId={selectedSessionId}
                  onSelectSession={setSelectedSessionId}
                  locationHistory={locationHistory}
                />
              </div>
            )}

            {/* LOCATION HISTORY TAB */}
            {activeTab === 'history' && (
              <div className="animate-fadeIn space-y-4">
                <AdminLocationHistory
                  sessions={sessions}
                  selectedSessionId={selectedSessionId}
                  onSelectSession={setSelectedSessionId}
                  history={locationHistory}
                  loadingHistory={loadingHistory}
                />

                {selectedSessionId && locationHistory.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-[#8E8E96] font-mono">
                      Waypoint Trail Breadcrumbs
                    </h4>
                    <AdminLiveMap
                      sessions={sessions}
                      selectedSessionId={selectedSessionId}
                      onSelectSession={setSelectedSessionId}
                      locationHistory={locationHistory}
                    />
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* Modals */}
      <CreateVideoLinkModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateLink}
        baseUrl={baseUrl}
      />

      <QRCodeModal
        link={qrModalLink}
        baseUrl={baseUrl}
        onClose={() => setQrModalLink(null)}
      />

      <SupabaseSetupModal
        isOpen={isDbModalOpen}
        onClose={() => setIsDbModalOpen(false)}
        onConfigSaved={() => {
          setSupabaseConfig(getSupabaseConfig());
          loadData();
        }}
      />
    </div>
  );
};
