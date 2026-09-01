import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Copy, Check, ExternalLink, QrCode } from 'lucide-react';
import { VideoLink } from '../types';

interface QRCodeModalProps {
  link: VideoLink | null;
  baseUrl: string;
  onClose: () => void;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({ link, baseUrl, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!link) return null;

  const cleanBase = baseUrl.replace(/\/$/, '');
  const shareUrl = `${cleanBase}/watch/${link.share_id}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#121215] border border-[#222226] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-6 relative font-sans">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#8E8E96] hover:text-white p-1.5 rounded-lg hover:bg-[#18181C] transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center space-y-1">
          <div className="w-10 h-10 bg-[#18181C] text-[#D1FF26] rounded-xl flex items-center justify-center mx-auto border border-[#2A2A30] mb-2">
            <QrCode className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold uppercase tracking-wider text-white font-mono">
            SHAREABLE QR CODE
          </h3>
          <p className="text-xs text-[#8E8E96] truncate max-w-xs mx-auto font-mono">{link.custom_name}</p>
        </div>

        {/* QR Code Canvas */}
        <div className="flex justify-center p-6 bg-white rounded-2xl border border-white/20 shadow-inner">
          <QRCodeSVG
            value={shareUrl}
            size={200}
            level="H"
            includeMargin={true}
            imageSettings={{
              src: 'https://www.youtube.com/s/desktop/f7ae9065/img/favicon_144x144.png',
              x: undefined,
              y: undefined,
              height: 28,
              width: 28,
              excavate: true,
            }}
          />
        </div>

        {/* Share Link Copy Box */}
        <div className="space-y-2 font-mono">
          <label className="text-xs font-bold text-[#8E8E96] uppercase tracking-wider">
            Shareable Visitor URL
          </label>
          <div className="flex items-center gap-2 bg-[#0A0A0B] rounded-xl p-2 border border-[#2A2A30]">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="bg-transparent text-xs text-[#F0F0F2] flex-1 outline-none px-2 font-mono truncate"
            />
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 bg-[#D1FF26] hover:bg-[#bfe822] text-black rounded-lg text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 transition shrink-0 cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {/* Open Direct Button */}
        <div className="pt-2">
          <a
            href={shareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-2.5 bg-[#18181C] hover:bg-[#222228] text-[#D0D0D5] rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-2 border border-[#2A2A30] transition"
          >
            <span>Open Visitor Consent Page</span>
            <ExternalLink className="w-3.5 h-3.5 text-[#D1FF26]" />
          </a>
        </div>
      </div>
    </div>
  );
};
