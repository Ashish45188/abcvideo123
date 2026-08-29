import React, { useState } from 'react';
import { getYouTubeEmbedUrl } from '../utils/youtube';
import { Play, AlertCircle, ShieldCheck } from 'lucide-react';

interface YouTubePlayerProps {
  videoId: string;
  title: string;
  autoplay?: boolean;
}

export const YouTubePlayer: React.FC<YouTubePlayerProps> = ({
  videoId,
  title,
  autoplay = true,
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const embedUrl = getYouTubeEmbedUrl(videoId, autoplay);

  return (
    <div className="w-full bg-[#121215] rounded-2xl overflow-hidden border border-[#222226] shadow-2xl font-sans">
      {/* Top Banner Header */}
      <div className="bg-[#0E0E10] px-4 py-2.5 border-b border-[#222226] flex items-center justify-between font-mono">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#D1FF26] animate-pulse"></div>
          <span className="text-xs font-bold text-white uppercase tracking-wider truncate max-w-md">
            STREAM: {title}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-[#D1FF26] bg-[#141810] px-2 py-0.5 rounded border border-[#304018] uppercase tracking-widest font-bold">
          <ShieldCheck className="w-3.5 h-3.5 text-[#D1FF26]" />
          <span>OFFICIAL EMBED</span>
        </div>
      </div>

      {/* 16:9 Aspect Ratio Container */}
      <div className="relative w-full pb-[56.25%] bg-black">
        {!isLoaded && !hasError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0A0A0B] text-[#8E8E96] gap-3 font-mono">
            <div className="w-10 h-10 border-2 border-[#D1FF26] border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs uppercase tracking-wider">CONNECTING TO YOUTUBE SECURE EMBED...</p>
          </div>
        )}

        {hasError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-[#0A0A0B] text-[#D0D0D5] font-mono">
            <AlertCircle className="w-10 h-10 text-[#D1FF26] mb-2" />
            <h4 className="text-sm font-bold uppercase tracking-wider text-white">UNABLE TO LOAD PLAYER</h4>
            <p className="text-xs text-[#8E8E96] max-w-sm mt-1 font-sans">
              The video owner might have restricted embedding, or the video might be unavailable.
            </p>
            <a
              href={`https://www.youtube.com/watch?v=${videoId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 px-4 py-2 bg-[#D1FF26] hover:bg-[#bfe822] text-black rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 transition"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Watch on YouTube.com
            </a>
          </div>
        ) : (
          <iframe
            src={embedUrl}
            title={title}
            className={`absolute top-0 left-0 w-full h-full border-0 transition-opacity duration-300 ${
              isLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            onLoad={() => setIsLoaded(true)}
            onError={() => setHasError(true)}
          />
        )}
      </div>
    </div>
  );
};
