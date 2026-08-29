import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  RotateCcw,
  Repeat,
  ShieldCheck,
  AlertCircle,
  ExternalLink,
  Film,
} from 'lucide-react';

interface DirectVideoPlayerProps {
  src: string;
  title: string;
  autoplay?: boolean;
}

export const DirectVideoPlayer: React.FC<DirectVideoPlayerProps> = ({
  src,
  title,
  autoplay = true,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isLooping, setIsLooping] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<number | null>(null);

  // Auto-hide controls during playback
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      window.clearTimeout(controlsTimeoutRef.current);
    }
    if (isPlaying) {
      controlsTimeoutRef.current = window.setTimeout(() => {
        setShowControls(false);
      }, 2500);
    }
  };

  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) {
        window.clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch((e) => {
        console.warn('Autoplay prevented:', e);
      });
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    setCurrentTime(videoRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    setDuration(videoRef.current.duration);
    setIsBuffering(false);
    if (autoplay) {
      videoRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(() => {
        // Autoplay may need user gesture
        setIsPlaying(false);
      });
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const nextMuted = !isMuted;
    videoRef.current.muted = nextMuted;
    setIsMuted(nextMuted);
  };

  const handleRateChange = () => {
    const rates = [0.75, 1, 1.25, 1.5, 2];
    const nextIdx = (rates.indexOf(playbackRate) + 1) % rates.length;
    const nextRate = rates[nextIdx];
    setPlaybackRate(nextRate);
    if (videoRef.current) {
      videoRef.current.playbackRate = nextRate;
    }
  };

  const toggleLoop = () => {
    if (!videoRef.current) return;
    const nextLoop = !isLooping;
    videoRef.current.loop = nextLoop;
    setIsLooping(nextLoop);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(console.error);
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch(console.error);
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      className="w-full bg-[#121215] rounded-2xl overflow-hidden border border-[#222226] shadow-2xl font-sans relative group"
    >
      {/* Top Banner Header */}
      <div className="bg-[#0E0E10] px-4 py-2.5 border-b border-[#222226] flex items-center justify-between font-mono z-20 relative">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#D1FF26] animate-pulse"></div>
          <span className="text-xs font-bold text-white uppercase tracking-wider truncate max-w-md">
            VIDEO STREAM: {title}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-[#D1FF26] bg-[#141810] px-2 py-0.5 rounded border border-[#304018] uppercase tracking-widest font-bold">
          <ShieldCheck className="w-3.5 h-3.5 text-[#D1FF26]" />
          <span>HD DIRECT STREAM</span>
        </div>
      </div>

      {/* Video Viewport */}
      <div className="relative w-full bg-black flex items-center justify-center min-h-[300px] max-h-[70vh] overflow-hidden">
        {isBuffering && !hasError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0A0A0B]/80 backdrop-blur-xs text-[#8E8E96] gap-3 font-mono z-10">
            <div className="w-10 h-10 border-2 border-[#D1FF26] border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs uppercase tracking-wider">BUFFERING HD VIDEO STREAM...</p>
          </div>
        )}

        {hasError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-[#0A0A0B] text-[#D0D0D5] font-mono z-10">
            <AlertCircle className="w-10 h-10 text-[#D1FF26] mb-2" />
            <h4 className="text-sm font-bold uppercase tracking-wider text-white">UNABLE TO PLAY VIDEO</h4>
            <p className="text-xs text-[#8E8E96] max-w-sm mt-1 font-sans">
              The video source could not be decoded or the URL is invalid.
            </p>
            <a
              href={src}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 px-4 py-2 bg-[#D1FF26] hover:bg-[#bfe822] text-black rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open Direct Video Link
            </a>
          </div>
        ) : null}

        <video
          ref={videoRef}
          src={src}
          playsInline
          onClick={togglePlay}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onWaiting={() => setIsBuffering(true)}
          onPlaying={() => {
            setIsBuffering(false);
            setIsPlaying(true);
          }}
          onPause={() => setIsPlaying(false)}
          onError={() => {
            setIsBuffering(false);
            setHasError(true);
          }}
          className="w-full max-h-[65vh] object-contain cursor-pointer"
        />

        {/* Center Play Button Overlay on Pause */}
        {!isPlaying && !isBuffering && !hasError && (
          <button
            onClick={togglePlay}
            className="absolute inset-0 m-auto w-16 h-16 rounded-2xl bg-black/60 hover:bg-[#D1FF26] text-white hover:text-black border border-white/20 hover:border-[#D1FF26] flex items-center justify-center transition backdrop-blur-sm cursor-pointer shadow-2xl group-hover:scale-105"
          >
            <Play className="w-8 h-8 fill-current ml-1" />
          </button>
        )}
      </div>

      {/* Floating Modern Transport Control Bar */}
      <div
        className={`bg-[#0E0E10]/95 backdrop-blur-md px-4 py-3 border-t border-[#222226] font-mono text-xs transition-opacity duration-300 ${
          showControls || !isPlaying ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Progress Bar / Scrubber */}
        <div className="relative mb-3 flex items-center gap-3">
          <span className="text-[11px] text-[#8E8E96] font-mono w-10 text-right">
            {formatTime(currentTime)}
          </span>
          <div className="relative flex-1 flex items-center group/slider">
            <input
              type="range"
              min="0"
              max={duration || 100}
              step="0.1"
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1.5 bg-[#222226] rounded-lg appearance-none cursor-pointer accent-[#D1FF26] focus:outline-none"
            />
          </div>
          <span className="text-[11px] text-[#8E8E96] font-mono w-10">
            {formatTime(duration)}
          </span>
        </div>

        {/* Control Buttons Row */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Left Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={togglePlay}
              className="p-2 rounded-xl bg-[#18181C] hover:bg-[#222228] text-[#D1FF26] border border-[#2A2A30] transition cursor-pointer"
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
            </button>

            {/* Volume Control */}
            <div className="flex items-center gap-1.5 bg-[#18181C] px-2.5 py-1.5 rounded-xl border border-[#2A2A30]">
              <button
                onClick={toggleMute}
                className="text-[#8E8E96] hover:text-white transition cursor-pointer"
              >
                {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-[#D1FF26]" />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-16 h-1 bg-[#2A2A30] rounded-lg appearance-none cursor-pointer accent-[#D1FF26]"
              />
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-1.5">
            {/* Speed Toggle */}
            <button
              onClick={handleRateChange}
              title="Playback Speed"
              className="px-2 py-1.5 rounded-xl bg-[#18181C] hover:bg-[#222228] text-[#D0D0D5] hover:text-white border border-[#2A2A30] text-[10px] font-bold uppercase tracking-wider transition cursor-pointer"
            >
              {playbackRate}x
            </button>

            {/* Loop Toggle */}
            <button
              onClick={toggleLoop}
              title={isLooping ? 'Looping enabled' : 'Looping disabled'}
              className={`p-2 rounded-xl border transition cursor-pointer ${
                isLooping
                  ? 'bg-[#141810] text-[#D1FF26] border-[#304018]'
                  : 'bg-[#18181C] text-[#8E8E96] hover:text-white border-[#2A2A30]'
              }`}
            >
              <Repeat className="w-3.5 h-3.5" />
            </button>

            <div className="w-px h-4 bg-[#2A2A30] mx-1"></div>

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              title="Toggle Fullscreen"
              className="p-2 rounded-xl bg-[#18181C] hover:bg-[#222228] text-[#D0D0D5] hover:text-white border border-[#2A2A30] transition cursor-pointer"
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
