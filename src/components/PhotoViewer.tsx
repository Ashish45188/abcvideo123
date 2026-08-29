import React, { useState, useRef } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Download,
  RotateCcw,
  Image as ImageIcon,
  ShieldCheck,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';

interface PhotoViewerProps {
  src: string;
  title: string;
}

export const PhotoViewer: React.FC<PhotoViewerProps> = ({ src, title }) => {
  const [zoom, setZoom] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.25, 0.5));
  };

  const handleResetZoom = () => {
    setZoom(1);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch((err) => {
        console.error('Fullscreen request failed:', err);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch((err) => {
        console.error('Exit fullscreen failed:', err);
      });
    }
  };

  const handleDownload = () => {
    try {
      const a = document.createElement('a');
      a.href = src;
      a.download = `${title.replace(/[^a-zA-Z0-9_-]/g, '_') || 'photo'}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      console.error('Download failed:', e);
      window.open(src, '_blank');
    }
  };

  return (
    <div
      ref={containerRef}
      className="w-full bg-[#121215] rounded-2xl overflow-hidden border border-[#222226] shadow-2xl font-sans relative group"
    >
      {/* Top Banner Header */}
      <div className="bg-[#0E0E10] px-4 py-2.5 border-b border-[#222226] flex items-center justify-between font-mono">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#D1FF26] animate-pulse"></div>
          <span className="text-xs font-bold text-white uppercase tracking-wider truncate max-w-md">
            PHOTO: {title}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-[#D1FF26] bg-[#141810] px-2 py-0.5 rounded border border-[#304018] uppercase tracking-widest font-bold">
          <ShieldCheck className="w-3.5 h-3.5 text-[#D1FF26]" />
          <span>HD PHOTO UNLOCKED</span>
        </div>
      </div>

      {/* Main Image Stage */}
      <div className="relative w-full min-h-[380px] max-h-[70vh] bg-[#0A0A0B] flex items-center justify-center overflow-hidden p-2 sm:p-4 select-none">
        {loading && !hasError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0A0A0B] text-[#8E8E96] gap-3 font-mono z-10">
            <div className="w-10 h-10 border-2 border-[#D1FF26] border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs uppercase tracking-wider">DECRYPTING AND LOADING PHOTO...</p>
          </div>
        )}

        {hasError ? (
          <div className="flex flex-col items-center justify-center p-6 text-center text-[#D0D0D5] font-mono z-10">
            <AlertCircle className="w-10 h-10 text-[#D1FF26] mb-2" />
            <h4 className="text-sm font-bold uppercase tracking-wider text-white">UNABLE TO DISPLAY PHOTO</h4>
            <p className="text-xs text-[#8E8E96] max-w-sm mt-1 font-sans">
              The photo URL may have expired or the image file cannot be rendered by your browser.
            </p>
            <a
              href={src}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 px-4 py-2 bg-[#D1FF26] hover:bg-[#bfe822] text-black rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open Original Photo URL
            </a>
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center overflow-auto max-h-[65vh]">
            <img
              src={src}
              alt={title}
              onLoad={() => setLoading(false)}
              onError={() => {
                setLoading(false);
                setHasError(true);
              }}
              style={{
                transform: `scale(${zoom})`,
                transition: 'transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)',
              }}
              className="max-h-[60vh] max-w-full object-contain rounded-lg shadow-2xl cursor-grab active:cursor-grabbing origin-center"
            />
          </div>
        )}
      </div>

      {/* Bottom Floating Control Bar */}
      <div className="bg-[#0E0E10] px-4 py-2.5 border-t border-[#222226] flex flex-wrap items-center justify-between gap-3 font-mono text-xs">
        <div className="flex items-center gap-1.5 text-[#8E8E96]">
          <ImageIcon className="w-4 h-4 text-[#D1FF26]" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#D0D0D5]">
            Scale: {Math.round(zoom * 100)}%
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleZoomOut}
            disabled={zoom <= 0.5}
            title="Zoom Out"
            className="p-1.5 rounded-lg bg-[#18181C] hover:bg-[#222228] text-[#D0D0D5] hover:text-white border border-[#2A2A30] disabled:opacity-40 transition cursor-pointer"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={handleResetZoom}
            title="Reset to 100%"
            className="px-2 py-1 rounded-lg bg-[#18181C] hover:bg-[#222228] text-[#D0D0D5] hover:text-white border border-[#2A2A30] text-[10px] font-bold uppercase tracking-wider transition cursor-pointer flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            100%
          </button>
          <button
            onClick={handleZoomIn}
            disabled={zoom >= 3}
            title="Zoom In"
            className="p-1.5 rounded-lg bg-[#18181C] hover:bg-[#222228] text-[#D0D0D5] hover:text-white border border-[#2A2A30] disabled:opacity-40 transition cursor-pointer"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <div className="w-px h-4 bg-[#2A2A30] mx-1"></div>

          <button
            onClick={toggleFullscreen}
            title="Toggle Fullscreen"
            className="p-1.5 rounded-lg bg-[#18181C] hover:bg-[#222228] text-[#D0D0D5] hover:text-white border border-[#2A2A30] transition cursor-pointer"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          <button
            onClick={handleDownload}
            title="Download HD Photo"
            className="px-3 py-1.5 rounded-lg bg-[#D1FF26] hover:bg-[#bfe822] text-black font-bold uppercase tracking-wider text-[11px] flex items-center gap-1.5 transition cursor-pointer shadow-md"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download</span>
          </button>
        </div>
      </div>
    </div>
  );
};
