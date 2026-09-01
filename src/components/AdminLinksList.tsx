import React, { useState } from 'react';
import { VideoLink } from '../types';
import { getYouTubeThumbnailUrl } from '../utils/youtube';
import { formatDateTime } from '../utils/geo';
import {
  Link2,
  Copy,
  Check,
  QrCode,
  ExternalLink,
  Trash2,
  Power,
  Play,
  Calendar,
  AlertCircle,
  Plus,
  Image as ImageIcon,
  Film,
  Share2,
} from 'lucide-react';

interface AdminLinksListProps {
  links: VideoLink[];
  baseUrl: string;
  onToggleStatus: (id: string, active: boolean) => Promise<void>;
  onDeleteLink: (id: string) => Promise<void>;
  onShowQr: (link: VideoLink) => void;
  onCreateNewClick: () => void;
  onOpenVisitorView: (shareId: string) => void;
}

export const AdminLinksList: React.FC<AdminLinksListProps> = ({
  links,
  baseUrl,
  onToggleStatus,
  onDeleteLink,
  onShowQr,
  onCreateNewClick,
  onOpenVisitorView,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const getPublicShareUrl = (shareId: string) => {
    const cleanBase = baseUrl.replace(/\/$/, '');
    return `${cleanBase}/watch/${shareId}`;
  };

  const handleCopy = (shareId: string) => {
    const url = getPublicShareUrl(shareId);
    navigator.clipboard.writeText(url);
    setCopiedId(shareId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleWhatsAppShare = (shareId: string) => {
    const url = getPublicShareUrl(shareId);
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(url)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  const getMediaThumbnail = (link: VideoLink) => {
    const type = link.media_type || 'youtube';
    if (type === 'photo') {
      return (
        <div className="relative w-28 h-18 sm:w-32 sm:h-20 shrink-0 bg-[#0A0A0B] rounded-xl overflow-hidden border border-[#2A2A30] group">
          <img
            src={link.thumbnail_url || link.media_url || ''}
            alt={link.custom_name}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-xs text-[#D1FF26] text-[9px] font-mono font-bold flex items-center gap-1 border border-white/10">
            <ImageIcon className="w-3 h-3" />
            <span>PHOTO</span>
          </div>
        </div>
      );
    }

    if (type === 'video') {
      return (
        <div className="relative w-28 h-18 sm:w-32 sm:h-20 shrink-0 bg-[#0A0A0B] rounded-xl overflow-hidden border border-[#2A2A30] group flex items-center justify-center">
          {link.thumbnail_url ? (
            <img
              src={link.thumbnail_url}
              alt={link.custom_name}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          ) : link.media_url && !link.media_url.startsWith('data:') ? (
            <video
              src={link.media_url}
              className="w-full h-full object-cover opacity-60"
              muted
              playsInline
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-[#8E8E96] gap-1">
              <Film className="w-6 h-6 text-[#D1FF26]" />
            </div>
          )}
          <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-xs text-[#D1FF26] text-[9px] font-mono font-bold flex items-center gap-1 border border-white/10">
            <Film className="w-3 h-3" />
            <span>VIDEO</span>
          </div>
        </div>
      );
    }

    // YouTube
    return (
      <div className="relative w-28 h-18 sm:w-32 sm:h-20 shrink-0 bg-[#0A0A0B] rounded-xl overflow-hidden border border-[#2A2A30] group">
        <img
          src={getYouTubeThumbnailUrl(link.youtube_video_id || '')}
          alt={link.custom_name}
          className="w-full h-full object-cover"
          onError={(e) => ((e.target as HTMLElement).style.display = 'none')}
        />
        <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-xs text-rose-400 text-[9px] font-mono font-bold flex items-center gap-1 border border-white/10">
          <Play className="w-3 h-3 fill-current" />
          <span>YOUTUBE</span>
        </div>
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
          <Play className="w-6 h-6 text-[#D1FF26] fill-[#D1FF26]" />
        </div>
      </div>
    );
  };

  return (
    <div className="bg-[#121215] rounded-2xl border border-[#222226] shadow-xl overflow-hidden font-sans">
      {/* Header */}
      <div className="p-5 border-b border-[#222226] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#18181C] text-[#D1FF26] border border-[#2A2A30] flex items-center justify-center font-bold">
            <Link2 className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold uppercase tracking-wider text-white font-mono">
                GENERATED PUBLIC LINKS
              </h3>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold tracking-widest bg-[#18181C] text-[#D1FF26] border border-[#2A2A30]">
                {links.length} TOTAL
              </span>
            </div>
            <p className="text-xs text-[#8E8E96] font-mono">
              Manage item links with dynamic WhatsApp preview cards
            </p>
          </div>
        </div>

        <button
          onClick={onCreateNewClick}
          className="self-start sm:self-auto px-3.5 py-2 bg-[#D1FF26] hover:bg-[#bfe822] text-black rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition flex items-center gap-1.5 cursor-pointer shadow-md"
        >
          <Plus className="w-3.5 h-3.5 text-black stroke-[2.5]" />
          <span>New Item Link</span>
        </button>
      </div>

      {/* List Table / Cards */}
      {links.length === 0 ? (
        <div className="p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#18181C] text-[#D1FF26] border border-[#2A2A30] flex items-center justify-center mx-auto">
            <Link2 className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold uppercase tracking-wider text-white font-mono">
            No public links created yet
          </h4>
          <p className="text-xs text-[#8E8E96] font-mono max-w-sm mx-auto">
            Generate your first item link to share on WhatsApp or view public media content.
          </p>
          <button
            onClick={onCreateNewClick}
            className="mt-2 px-4 py-2 bg-[#D1FF26] hover:bg-[#bfe822] text-black rounded-xl text-xs font-mono font-bold uppercase tracking-wider inline-flex items-center gap-1.5 transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-black stroke-[2.5]" />
            Create Item Link
          </button>
        </div>
      ) : (
        <div className="divide-y divide-[#222226]">
          {links.map((link) => {
            const isCopied = copiedId === link.share_id;
            const type = link.media_type || 'youtube';

            return (
              <div
                key={link.id}
                className="p-5 hover:bg-[#16161A] transition flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                {/* Left: Thumbnail & Info */}
                <div className="flex items-start gap-4 min-w-0">
                  {getMediaThumbnail(link)}

                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-sm font-bold text-white truncate font-sans">
                        {link.custom_name}
                      </h4>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-mono font-bold tracking-wider uppercase border ${
                          link.active
                            ? 'bg-[#141810] text-[#D1FF26] border-[#304018]'
                            : 'bg-[#18181C] text-[#8E8E96] border-[#2A2A30]'
                        }`}
                      >
                        {link.active ? 'ACTIVE' : 'PAUSED'}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold tracking-wider uppercase bg-[#18181C] text-[#A0A0A8] border border-[#2A2A30]">
                        {type === 'photo' ? 'PHOTO' : type === 'video' ? 'DIRECT VIDEO' : 'YOUTUBE'}
                      </span>
                    </div>

                    {link.description && (
                      <p className="text-xs text-[#8E8E96] truncate max-w-md">
                        {link.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-3 text-xs text-[#8E8E96] font-mono pt-0.5">
                      <span className="flex items-center gap-1 font-mono text-[11px] text-[#D0D0D5]">
                        ID: {link.share_id}
                      </span>
                      <span>&bull;</span>
                      <span className="flex items-center gap-1 text-[11px]">
                        <Calendar className="w-3 h-3 text-[#8E8E96]" />
                        {formatDateTime(link.created_at)}
                      </span>
                      {link.youtube_url && (
                        <>
                          <span>&bull;</span>
                          <a
                            href={link.youtube_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#8E8E96] hover:text-[#D1FF26] text-[11px] flex items-center gap-0.5 transition"
                          >
                            YouTube Source <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex flex-wrap items-center gap-2 lg:self-center pt-2 lg:pt-0 border-t lg:border-t-0 border-[#222226]">
                  {/* Share URL copy button */}
                  <button
                    onClick={() => handleCopy(link.share_id)}
                    className="px-3 py-1.5 bg-[#18181C] hover:bg-[#222228] text-[#D0D0D5] rounded-xl text-xs font-mono border border-[#2A2A30] flex items-center gap-1.5 transition cursor-pointer"
                    title="Copy visitor link to clipboard"
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[#D1FF26]" />
                        <span className="text-[#D1FF26] font-bold">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-[#8E8E96]" />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>

                  {/* Share on WhatsApp */}
                  <button
                    onClick={() => handleWhatsAppShare(link.share_id)}
                    className="px-3 py-1.5 bg-[#25D366] hover:bg-[#20bd5a] text-black rounded-xl text-xs font-mono font-bold border border-[#25D366] flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                    title="Share item on WhatsApp"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </button>

                  {/* QR Code trigger */}
                  <button
                    onClick={() => onShowQr(link)}
                    className="px-3 py-1.5 bg-[#18181C] hover:bg-[#222228] text-[#D0D0D5] rounded-xl text-xs font-mono border border-[#2A2A30] flex items-center gap-1.5 transition cursor-pointer"
                    title="Show QR Code"
                  >
                    <QrCode className="w-3.5 h-3.5 text-[#D1FF26]" />
                    <span>QR Code</span>
                  </button>

                  {/* Open Consent Page Direct */}
                  <button
                    onClick={() => onOpenVisitorView(link.share_id)}
                    className="px-3 py-1.5 bg-[#141810] hover:bg-[#1B2412] text-[#D1FF26] rounded-xl text-xs font-mono font-bold tracking-wide border border-[#304018] flex items-center gap-1.5 transition cursor-pointer"
                    title="Open public page"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open Watch</span>
                  </button>

                  {/* Active / Inactive Toggle */}
                  <button
                    onClick={() => onToggleStatus(link.id, !link.active)}
                    className={`p-1.5 rounded-xl border transition cursor-pointer ${
                      link.active
                        ? 'bg-[#18181C] text-[#D1FF26] hover:bg-[#222228] border-[#2A2A30]'
                        : 'bg-[#18181C] text-[#8E8E96] hover:text-white hover:bg-[#222228] border-[#2A2A30]'
                    }`}
                    title={link.active ? 'Pause link' : 'Activate link'}
                  >
                    <Power className="w-4 h-4" />
                  </button>

                  {/* Delete Link */}
                  <button
                    onClick={() => {
                      if (confirm(`Delete media link "${link.custom_name}"?`)) {
                        onDeleteLink(link.id);
                      }
                    }}
                    className="p-1.5 bg-[#18181C] hover:bg-rose-950/40 text-[#8E8E96] hover:text-rose-400 rounded-xl border border-[#2A2A30] hover:border-rose-800/60 transition cursor-pointer"
                    title="Delete link"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
