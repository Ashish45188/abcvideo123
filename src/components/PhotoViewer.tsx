import React, { useState } from 'react';
import { AlertCircle, ExternalLink } from 'lucide-react';

interface PhotoViewerProps {
  src: string;
  title: string;
}

export const PhotoViewer: React.FC<PhotoViewerProps> = ({ src, title }) => {
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  return (
    <div className="w-full h-full flex items-center justify-center relative">
      {loading && !hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 font-mono z-10">
          <div className="w-10 h-10 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      {hasError ? (
        <div className="flex flex-col items-center justify-center p-6 text-center text-slate-600 font-mono z-10">
          <AlertCircle className="w-10 h-10 text-amber-500 mb-2" />
          <h4 className="text-sm font-bold uppercase tracking-wider text-slate-800">UNABLE TO DISPLAY PHOTO</h4>
          <p className="text-xs text-slate-500 max-w-sm mt-1 font-sans">
            The photo URL may have expired or the image file cannot be rendered by your browser.
          </p>
          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Open Original Photo URL
          </a>
        </div>
      ) : (
        <img
          src={src}
          alt={title}
          onLoad={() => setLoading(false)}
          onError={() => {
            setLoading(false);
            setHasError(true);
          }}
          className="max-h-[90vh] max-w-full object-contain"
        />
      )}
    </div>
  );
};
