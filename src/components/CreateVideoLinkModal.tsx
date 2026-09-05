import React, { useState, useEffect, useRef } from 'react';
import { CreateVideoLinkInput, VideoLink, MediaType } from '../types';
import { extractYouTubeVideoId, isValidYouTubeUrl, getYouTubeThumbnailUrl } from '../utils/youtube';
import { uploadMediaToSupabaseStorage } from '../lib/supabase';
import {
  Link2,
  Sparkles,
  X,
  AlertCircle,
  CheckCircle2,
  Play,
  QrCode,
  Copy,
  Check,
  Image as ImageIcon,
  Film,
  UploadCloud,
  FileVideo,
  FileImage,
  FileText,
  Share2,
  MessageSquare,
  ExternalLink,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface CreateVideoLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: CreateVideoLinkInput) => Promise<VideoLink>;
  baseUrl: string;
}

const PHOTO_PRESETS = [
  {
    name: '🏔 Alpine Mountain Panorama',
    url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1920&q=80',
    desc: 'High-altitude panorama of jagged alpine peaks at golden hour.',
  },
  {
    name: '🌆 Neon Cyberpunk Cityscape',
    url: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=1920&q=80',
    desc: 'Futuristic urban night skyline with vibrant neon reflections.',
  },
  {
    name: '🌴 Tropical Forest Waterfall',
    url: 'https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?auto=format&fit=crop&w=1920&q=80',
    desc: 'Lush tropical rainforest cascade surrounded by emerald foliage.',
  },
];

const VIDEO_PRESETS = [
  {
    name: '🌊 Pacific Ocean Coastal Waves',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    desc: 'High-definition ocean swell and coastline scenery in 1080p.',
  },
  {
    name: '🏎 High-Speed Racing Reel',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    desc: 'Dynamic cinematic footage stream.',
  },
  {
    name: '🌿 Rainforest Wildlife Drone',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    desc: 'Aerial 4K drone sweep across canopy landscapes.',
  },
];

const YOUTUBE_PRESETS = [
  {
    name: '🦜 Costa Rica 4K Wildlife Relaxation',
    url: 'https://www.youtube.com/watch?v=LXb3EKWsInQ',
    desc: 'Tropical wildlife and calming rainforest nature sounds.',
  },
  {
    name: '🌌 Deep Space 4K Aurora Timelapse',
    url: 'https://www.youtube.com/watch?v=1zxXZ9tqUf8',
    desc: 'Cosmic auroral displays and celestial night sky captures.',
  },
];

export const CreateVideoLinkModal: React.FC<CreateVideoLinkModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  baseUrl,
}) => {
  const [mediaType, setMediaType] = useState<MediaType>('photo');

  // Input states
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [directMediaUrl, setDirectMediaUrl] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [uploadedFileSize, setUploadedFileSize] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewMediaUrl, setPreviewMediaUrl] = useState<string | null>(null);

  const [customName, setCustomName] = useState('');
  const [description, setDescription] = useState('');
  const [videoId, setVideoId] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdLink, setCreatedLink] = useState<VideoLink | null>(null);
  const [copied, setCopied] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // YouTube ID sync
  useEffect(() => {
    if (mediaType === 'youtube' && youtubeUrl) {
      const id = extractYouTubeVideoId(youtubeUrl);
      setVideoId(id);
      if (id && !customName) {
        setCustomName(`YouTube Video #${id.substring(0, 5)}`);
      }
    } else if (mediaType !== 'youtube') {
      setVideoId(null);
    }
  }, [youtubeUrl, mediaType]);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Size limit check: 35MB for video, 15MB for photo/PDF
    const maxBytes = (mediaType === 'photo' || mediaType === 'pdf') ? 15 * 1024 * 1024 : 35 * 1024 * 1024;
    if (file.size > maxBytes) {
      setError(`File is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Max allowed size is ${mediaType === 'video' ? '35MB' : '15MB'}.`);
      return;
    }

    setError(null);
    setSelectedFile(file);
    setUploadedFileName(file.name);
    setUploadedFileSize((file.size / (1024 * 1024)).toFixed(2) + ' MB');

    if (!customName) {
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      setCustomName(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setDirectMediaUrl(result);
      setPreviewMediaUrl(result);
    };
    reader.onerror = () => {
      setError('Failed to read file from your device.');
    };
    reader.readAsDataURL(file);
  };

  const handlePresetSelect = (preset: { name: string; url: string; desc: string }) => {
    setCustomName(preset.name);
    setDescription(preset.desc);
    if (mediaType === 'youtube') {
      setYoutubeUrl(preset.url);
    } else {
      setDirectMediaUrl(preset.url);
      setPreviewMediaUrl(preset.url);
      setUploadedFileName('');
      setUploadedFileSize(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!customName.trim()) {
      setError('Please enter a title for the media link.');
      return;
    }

    let finalMediaUrl = directMediaUrl;
    let publicImageUrl: string | null = null;
    let storagePath: string | null = null;

    if (mediaType === 'youtube') {
      if (!isValidYouTubeUrl(youtubeUrl)) {
        setError('Please provide a valid YouTube URL (watch, share, shorts, or embed).');
        return;
      }
      const ytid = extractYouTubeVideoId(youtubeUrl);
      if (ytid) {
        publicImageUrl = getYouTubeThumbnailUrl(ytid);
      }
    } else {
      if (!directMediaUrl.trim()) {
        setError(`Please select a ${mediaType} file or provide a valid ${mediaType} URL.`);
        return;
      }

      // If a local file was selected or directMediaUrl is base64 data URL
      if (selectedFile) {
        setIsSubmitting(true);
        const uploadRes = await uploadMediaToSupabaseStorage(selectedFile);
        storagePath = uploadRes?.storagePath || null;

        if (uploadRes && uploadRes.publicImageUrl) {
          publicImageUrl = uploadRes.publicImageUrl;
          finalMediaUrl = publicImageUrl;
        } else {
          const errMsg = uploadRes?.error?.message
            ? `Supabase Storage upload failed: ${uploadRes.error.message}`
            : 'WhatsApp preview requires a public HTTPS URL. Please connect Supabase Storage.';
          setError(errMsg);
          setIsSubmitting(false);
          return;
        }
      } else {
        publicImageUrl = finalMediaUrl;
      }

      if (finalMediaUrl.startsWith('data:') || finalMediaUrl.startsWith('blob:')) {
        setError('WhatsApp preview requires a public HTTPS URL. Base64 or Blob URLs cannot be previewed by WhatsApp. Please connect Supabase Storage.');
        setIsSubmitting(false);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const defaultVideoThumbnail = 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80';
      const thumbnailUrl = mediaType === 'photo'
        ? finalMediaUrl
        : mediaType === 'pdf'
        ? 'https://images.unsplash.com/photo-1568667256549-094345857637?auto=format&fit=crop&w=1200&q=80'
        : mediaType === 'video'
        ? defaultVideoThumbnail
        : undefined;
      const previewImageUrl = thumbnailUrl || (mediaType === 'youtube' && videoId ? getYouTubeThumbnailUrl(videoId) : finalMediaUrl);

      console.log("=== WHATSAPP DEBUG ===");
      console.log("selected file:", selectedFile);
      console.log("storage path:", storagePath);
      console.log("public image URL:", publicImageUrl);
      console.log("database thumbnail_url:", thumbnailUrl);
      console.log("preview image URL:", previewImageUrl);
      console.log("======================");

      const result = await onSubmit({
        media_type: mediaType,
        youtube_url: mediaType === 'youtube' ? youtubeUrl : undefined,
        media_url: mediaType !== 'youtube' ? finalMediaUrl : undefined,
        thumbnail_url: thumbnailUrl,
        custom_name: customName,
        description: description,
      });
      setCreatedLink(result);
    } catch (err: any) {
      setError(err?.message || 'Failed to create link.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setYoutubeUrl('');
    setDirectMediaUrl('');
    setPreviewMediaUrl(null);
    setUploadedFileName('');
    setUploadedFileSize(null);
    setCustomName('');
    setDescription('');
    setVideoId(null);
    setCreatedLink(null);
    setError(null);
  };

  // Format public watch URL (e.g. https://mydomain.com/watch/qww5vmet)
  const getPublicShareUrl = (link: VideoLink) => {
    if (!baseUrl) return '';
    const cleanBase = baseUrl.replace(/\/$/, '');
    return `${cleanBase}/watch/${link.share_id}`;
  };

  const shareUrl = createdLink ? getPublicShareUrl(createdLink) : '';

  const handleCopy = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsAppShare = () => {
    if (!shareUrl) return;
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareUrl)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  const handleSmsShare = () => {
    if (!shareUrl) return;
    const message = `Please open this link: ${shareUrl}`;
    const smsUrl = `sms:?body=${encodeURIComponent(message)}`;
    window.location.href = smsUrl;
  };

  const getItemThumbnail = (link: VideoLink) => {
    if (link.thumbnail_url) return link.thumbnail_url;
    if (link.media_type === 'photo' && link.media_url) return link.media_url;
    if (link.youtube_video_id) return getYouTubeThumbnailUrl(link.youtube_video_id);
    return 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80';
  };

  const getCleanDomain = () => {
    try {
      if (!shareUrl) return 'mydomain.com';
      const u = new URL(shareUrl);
      return u.hostname;
    } catch {
      return 'mydomain.com';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#121215] border border-[#222226] rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden font-sans max-h-[92vh] overflow-y-auto">
        <button
          onClick={() => {
            handleReset();
            onClose();
          }}
          className="absolute top-5 right-5 text-[#8E8E96] hover:text-white p-1.5 rounded-lg hover:bg-[#18181C] transition cursor-pointer z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {createdLink ? (
          /* SUCCESS STATE - Content Created Successfully & WhatsApp Preview */
          <div className="space-y-6 animate-fadeIn">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-[#18181C] text-[#25D366] rounded-2xl flex items-center justify-center mx-auto border border-[#2A2A30] shadow-lg">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold uppercase tracking-wider text-white font-mono">
                Content Created Successfully
              </h3>
              <div className="text-xs text-[#D1FF26] font-mono space-y-1 pt-1">
                <p>✓ Image uploaded</p>
                <p>✓ Thumbnail URL generated</p>
                <p>✓ Shareable URL generated</p>
              </div>
            </div>

            {/* Title & Shareable URL details */}
            <div className="space-y-3 font-mono bg-[#0A0A0B] p-4 rounded-2xl border border-[#222226]">
              <div>
                <span className="text-[10px] font-bold text-[#8E8E96] uppercase tracking-wider block">
                  Title:
                </span>
                <p className="text-sm font-bold text-white truncate">{createdLink.custom_name}</p>
              </div>

              <div>
                <span className="text-[10px] font-bold text-[#8E8E96] uppercase tracking-wider block mb-1">
                  Shareable URL:
                </span>
                <p className="text-xs text-[#D1FF26] font-mono truncate mb-2">{shareUrl}</p>
                <div className="space-y-2">
                  <button
                    onClick={handleCopy}
                    className="w-full py-2 bg-[#D1FF26] hover:bg-[#bfe822] text-black rounded-lg text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy Link'}</span>
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleWhatsAppShare}
                      className="flex-1 py-2 bg-[#25D366] hover:bg-[#20bd5a] text-black rounded-lg text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition cursor-pointer shadow-md"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Share on WhatsApp</span>
                    </button>
                    <button
                      onClick={handleSmsShare}
                      className="flex-1 py-2 bg-[#34B7F1] hover:bg-[#2aa2d8] text-black rounded-lg text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition cursor-pointer shadow-md"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Share via SMS</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Simulated WhatsApp Preview Card */}
            <div className="space-y-1.5 font-mono">
              <span className="text-xs font-bold text-[#8E8E96] uppercase tracking-wider block">
                Preview:
              </span>
              <div className="bg-[#0b141a] rounded-2xl border border-[#222226] overflow-hidden shadow-xl p-3 space-y-2 max-w-sm mx-auto">
                <div className="relative rounded-xl overflow-hidden bg-black/40 aspect-video border border-white/10">
                  <img
                    src={getItemThumbnail(createdLink)}
                    alt={createdLink.custom_name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>
                <div className="px-1 space-y-1">
                  <h4 className="text-sm font-bold text-[#e9edef] line-clamp-1 font-sans">
                    {createdLink.custom_name}
                  </h4>
                  {createdLink.description && (
                    <p className="text-xs text-[#8696a0] line-clamp-2 font-sans">
                      {createdLink.description}
                    </p>
                  )}
                  <p className="text-[11px] text-[#8696a0] font-mono lowercase truncate pt-0.5">
                    {getCleanDomain()}
                  </p>
                </div>
              </div>
            </div>

            {/* QR Code Canvas */}
            <div className="flex justify-center p-3 bg-white rounded-2xl border border-white/20 shadow-inner max-w-xs mx-auto">
              <QRCodeSVG value={shareUrl} size={140} level="H" includeMargin={true} />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleReset}
                className="flex-1 py-2.5 bg-[#18181C] hover:bg-[#222228] text-[#D0D0D5] rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition border border-[#2A2A30] cursor-pointer"
              >
                Create Another
              </button>
              <button
                onClick={() => {
                  handleReset();
                  onClose();
                }}
                className="flex-1 py-2.5 bg-[#D1FF26] hover:bg-[#bfe822] text-black rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition cursor-pointer shadow-md"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* FORM STATE */
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#18181C] text-[#D1FF26] border border-[#2A2A30] flex items-center justify-center">
                <Link2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold uppercase tracking-wider text-white font-mono">
                  CREATE PUBLIC ITEM
                </h3>
                <p className="text-xs text-[#8E8E96] font-mono">
                  Upload or enter item details to generate shareable link
                </p>
              </div>
            </div>

            {error && (
              <div className="bg-rose-950/40 border border-rose-800/60 rounded-xl p-3 text-xs text-rose-200 flex items-center gap-2 font-mono">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Media Type Selector Tabs */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono font-bold text-[#D0D0D5] uppercase tracking-wider">
                Select Media Type
              </label>
              <div className="grid grid-cols-4 gap-1.5 bg-[#0A0A0B] p-1 rounded-2xl border border-[#2A2A30]">
                <button
                  type="button"
                  onClick={() => {
                    setMediaType('pdf');
                    setError(null);
                  }}
                  className={`py-2 px-2 rounded-xl font-mono text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 transition cursor-pointer ${
                    mediaType === 'pdf'
                      ? 'bg-[#18181C] text-[#D1FF26] border border-[#304018] shadow-md'
                      : 'text-[#8E8E96] hover:text-white'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMediaType('photo');
                    setError(null);
                  }}
                  className={`py-2 px-2 rounded-xl font-mono text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 transition cursor-pointer ${
                    mediaType === 'photo'
                      ? 'bg-[#18181C] text-[#D1FF26] border border-[#304018] shadow-md'
                      : 'text-[#8E8E96] hover:text-white'
                  }`}
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>Photo</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMediaType('video');
                    setError(null);
                  }}
                  className={`py-2 px-2 rounded-xl font-mono text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 transition cursor-pointer ${
                    mediaType === 'video'
                      ? 'bg-[#18181C] text-[#D1FF26] border border-[#304018] shadow-md'
                      : 'text-[#8E8E96] hover:text-white'
                  }`}
                >
                  <Film className="w-3.5 h-3.5" />
                  <span>Video</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMediaType('youtube');
                    setError(null);
                  }}
                  className={`py-2 px-2 rounded-xl font-mono text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 transition cursor-pointer ${
                    mediaType === 'youtube'
                      ? 'bg-[#18181C] text-[#D1FF26] border border-[#304018] shadow-md'
                      : 'text-[#8E8E96] hover:text-white'
                  }`}
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>YouTube</span>
                </button>
              </div>
            </div>

            {/* TAB: PDF Document Config */}
            {mediaType === 'pdf' && (
              <div className="space-y-4 bg-[#0E0E10] p-4 rounded-2xl border border-[#222226]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-[#D1FF26]" />
                    PDF Document Source
                  </span>
                </div>

                <div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="application/pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-[#2A2A30] hover:border-[#D1FF26] bg-[#0A0A0B] p-5 rounded-2xl text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#18181C] group-hover:bg-[#141810] text-[#8E8E96] group-hover:text-[#D1FF26] border border-[#2A2A30] group-hover:border-[#304018] flex items-center justify-center transition">
                      <UploadCloud className="w-5 h-5" />
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                        Click to Browse or Drop PDF Document
                      </p>
                      <p className="text-[11px] text-[#8E8E96] font-mono">
                        PDF files (Up to 15MB)
                      </p>
                    </div>
                    {uploadedFileName && (
                      <div className="mt-2 bg-[#141810] px-3 py-1 rounded-lg border border-[#304018] text-[#D1FF26] text-xs font-mono flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span className="truncate max-w-xs">{uploadedFileName}</span>
                        <span className="text-[#8E8E96]">({uploadedFileSize})</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Live Preview */}
                {previewMediaUrl && (
                  <div className="flex items-center gap-3 bg-[#0A0A0B] p-2.5 rounded-xl border border-[#2A2A30]">
                    <div className="w-12 h-12 rounded-lg bg-[#18181C] border border-[#2A2A30] flex items-center justify-center text-[#D1FF26] shrink-0 font-mono text-xs font-bold">
                      PDF
                    </div>
                    <div className="text-xs space-y-0.5 truncate font-mono">
                      <span className="font-bold text-[#D1FF26] flex items-center gap-1 uppercase tracking-wider text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5" /> PDF Loaded &amp; Ready
                      </span>
                      <p className="text-[#8E8E96] text-[11px] font-mono truncate max-w-xs">
                        {uploadedFileName || previewMediaUrl}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 1: Photo / Image Config */}
            {mediaType === 'photo' && (
              <div className="space-y-4 bg-[#0E0E10] p-4 rounded-2xl border border-[#222226]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-[#D1FF26]" />
                    Select Photo File
                  </span>
                </div>

                <div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/png, image/jpeg, image/jpg, image/webp, image/gif"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-[#2A2A30] hover:border-[#D1FF26] bg-[#0A0A0B] p-5 rounded-2xl text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#18181C] group-hover:bg-[#141810] text-[#8E8E96] group-hover:text-[#D1FF26] border border-[#2A2A30] group-hover:border-[#304018] flex items-center justify-center transition">
                      <UploadCloud className="w-5 h-5" />
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                        Click to Browse or Drop Photo
                      </p>
                      <p className="text-[11px] text-[#8E8E96] font-mono">
                        PNG, JPG, WebP or GIF (Up to 15MB)
                      </p>
                    </div>
                    {uploadedFileName && (
                      <div className="mt-2 bg-[#141810] px-3 py-1 rounded-lg border border-[#304018] text-[#D1FF26] text-xs font-mono flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span className="truncate max-w-xs">{uploadedFileName}</span>
                        <span className="text-[#8E8E96]">({uploadedFileSize})</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Presets */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] font-mono text-[#8E8E96] uppercase tracking-wider block">
                    Quick Sample Presets:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {PHOTO_PRESETS.map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handlePresetSelect(p)}
                        className="px-2.5 py-1 bg-[#0A0A0B] hover:bg-[#18181C] text-[#D0D0D5] hover:text-[#D1FF26] border border-[#2A2A30] rounded-lg text-[11px] font-mono transition cursor-pointer"
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Live Preview */}
                {previewMediaUrl && (
                  <div className="flex items-center gap-3 bg-[#0A0A0B] p-2.5 rounded-xl border border-[#2A2A30]">
                    <img
                      src={previewMediaUrl}
                      alt="Preview"
                      className="w-16 h-16 object-cover rounded-lg border border-[#222226]"
                      onError={(e) => ((e.target as HTMLElement).style.display = 'none')}
                    />
                    <div className="text-xs space-y-0.5 truncate font-mono">
                      <span className="font-bold text-[#D1FF26] flex items-center gap-1 uppercase tracking-wider text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Photo Loaded &amp; Ready
                      </span>
                      <p className="text-[#8E8E96] text-[11px] font-mono truncate max-w-xs">
                        {uploadedFileName || previewMediaUrl}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: Direct Video (MP4/WebM) Config */}
            {mediaType === 'video' && (
              <div className="space-y-4 bg-[#0E0E10] p-4 rounded-2xl border border-[#222226]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Film className="w-4 h-4 text-[#D1FF26]" />
                    Direct Video Source (MP4 / WebM)
                  </span>
                </div>

                <div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="video/mp4, video/webm, video/ogg"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-[#2A2A30] hover:border-[#D1FF26] bg-[#0A0A0B] p-5 rounded-2xl text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#18181C] group-hover:bg-[#141810] text-[#8E8E96] group-hover:text-[#D1FF26] border border-[#2A2A30] group-hover:border-[#304018] flex items-center justify-center transition">
                      <FileVideo className="w-5 h-5" />
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                        Click to Browse or Drop MP4 Video
                      </p>
                      <p className="text-[11px] text-[#8E8E96] font-mono">
                        Standard MP4 or WebM video file (Up to 35MB)
                      </p>
                    </div>
                    {uploadedFileName && (
                      <div className="mt-2 bg-[#141810] px-3 py-1 rounded-lg border border-[#304018] text-[#D1FF26] text-xs font-mono flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span className="truncate max-w-xs">{uploadedFileName}</span>
                        <span className="text-[#8E8E96]">({uploadedFileSize})</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Presets */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] font-mono text-[#8E8E96] uppercase tracking-wider block">
                    Quick Sample Presets:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {VIDEO_PRESETS.map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handlePresetSelect(p)}
                        className="px-2.5 py-1 bg-[#0A0A0B] hover:bg-[#18181C] text-[#D0D0D5] hover:text-[#D1FF26] border border-[#2A2A30] rounded-lg text-[11px] font-mono transition cursor-pointer"
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Live Preview */}
                {previewMediaUrl && (
                  <div className="bg-[#0A0A0B] p-2.5 rounded-xl border border-[#2A2A30] space-y-2">
                    <div className="flex items-center gap-2 text-xs font-mono text-[#D1FF26]">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span className="font-bold uppercase tracking-wider">Video Stream Preview:</span>
                    </div>
                    <video
                      src={previewMediaUrl}
                      controls
                      playsInline
                      className="w-full max-h-36 rounded-lg bg-black border border-[#222226] object-contain"
                    />
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: YouTube Config */}
            {mediaType === 'youtube' && (
              <div className="space-y-4 bg-[#0E0E10] p-4 rounded-2xl border border-[#222226]">
                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Play className="w-3.5 h-3.5 fill-current text-[#D1FF26]" />
                    YouTube URL <span className="text-[#D1FF26]">*</span>
                  </label>
                  <input
                    type="url"
                    required
                    placeholder="https://www.youtube.com/watch?v=..."
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    className="w-full bg-[#0A0A0B] border border-[#2A2A30] rounded-xl px-3.5 py-2.5 text-xs text-[#F0F0F2] placeholder:text-[#52525B] focus:outline-none focus:border-[#D1FF26] transition font-mono"
                  />
                </div>

                {/* Quick Presets */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-mono text-[#8E8E96] uppercase tracking-wider block">
                    Quick Sample Presets:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {YOUTUBE_PRESETS.map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handlePresetSelect(p)}
                        className="px-2.5 py-1 bg-[#0A0A0B] hover:bg-[#18181C] text-[#D0D0D5] hover:text-[#D1FF26] border border-[#2A2A30] rounded-lg text-[11px] font-mono transition cursor-pointer"
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* YouTube Video Preview Thumbnail */}
                {videoId && (
                  <div className="flex items-center gap-3 bg-[#0A0A0B] p-2.5 rounded-xl border border-[#2A2A30]">
                    <img
                      src={getYouTubeThumbnailUrl(videoId)}
                      alt="Thumbnail"
                      className="w-20 h-12 object-cover rounded-lg border border-[#222226]"
                      onError={(e) => ((e.target as HTMLElement).style.display = 'none')}
                    />
                    <div className="text-xs space-y-0.5 truncate font-mono">
                      <span className="font-bold text-[#D1FF26] flex items-center gap-1 uppercase tracking-wider text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Valid YouTube Video
                      </span>
                      <p className="text-[#8E8E96] text-[11px] font-mono">ID: {videoId}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Field: Custom Title */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono font-bold text-[#D0D0D5] uppercase tracking-wider">
                Title / Name <span className="text-[#D1FF26]">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Blunt Air Max Earbuds"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="w-full bg-[#0A0A0B] border border-[#2A2A30] rounded-xl px-3.5 py-2.5 text-xs text-[#F0F0F2] placeholder:text-[#52525B] focus:outline-none focus:border-[#D1FF26] transition font-mono"
              />
            </div>

            {/* Field: Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono font-bold text-[#D0D0D5] uppercase tracking-wider">
                Description <span className="text-[#71717A] text-[11px]">(Optional)</span>
              </label>
              <textarea
                rows={2}
                placeholder="Buy Blunt Air Max | Balanced Sound..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-[#0A0A0B] border border-[#2A2A30] rounded-xl px-3.5 py-2.5 text-xs text-[#F0F0F2] placeholder:text-[#52525B] focus:outline-none focus:border-[#D1FF26] transition resize-none font-sans"
              />
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-4 bg-[#D1FF26] hover:bg-[#bfe822] text-black rounded-xl font-mono font-bold uppercase tracking-wider text-xs transition duration-150 shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Sparkles className="w-4 h-4 text-black" />
                )}
                <span>
                  {isSubmitting
                    ? 'Generating Item Link...'
                    : `Generate ${
                        mediaType === 'pdf'
                          ? 'PDF'
                          : mediaType === 'photo'
                          ? 'Photo'
                          : mediaType === 'video'
                          ? 'Direct Video'
                          : 'YouTube'
                      } Public Link`}
                </span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
