/**
 * YouTube URL parser and video ID extractor
 * Supports:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/shorts/VIDEO_ID
 * - https://youtube.com/shorts/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://m.youtube.com/watch?v=VIDEO_ID
 */

export function extractYouTubeVideoId(url: string): string | null {
  if (!url || typeof url !== 'string') return null;

  const trimmed = url.trim();

  // If user pasted just a 11-char video ID (e.g. dQw4w9WgXcQ)
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  try {
    // Regex for various YouTube URL patterns
    const patterns = [
      /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/i,
      /^https?:\/\/(?:www\.|m\.)?youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/i,
      /^https?:\/\/youtu\.be\/([a-zA-Z0-9_-]{11})/i,
      /^https?:\/\/(?:www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/i,
      /^https?:\/\/(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/i,
    ];

    for (const pattern of patterns) {
      const match = trimmed.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    // Try URL parsing
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      const parsedUrl = new URL(trimmed);
      if (parsedUrl.hostname.includes('youtube.com')) {
        const vParam = parsedUrl.searchParams.get('v');
        if (vParam && /^[a-zA-Z0-9_-]{11}$/.test(vParam)) {
          return vParam;
        }
        if (parsedUrl.pathname.startsWith('/shorts/')) {
          const id = parsedUrl.pathname.split('/')[2];
          if (id && /^[a-zA-Z0-9_-]{11}$/.test(id)) return id;
        }
        if (parsedUrl.pathname.startsWith('/embed/')) {
          const id = parsedUrl.pathname.split('/')[2];
          if (id && /^[a-zA-Z0-9_-]{11}$/.test(id)) return id;
        }
      } else if (parsedUrl.hostname.includes('youtu.be')) {
        const id = parsedUrl.pathname.replace(/^\//, '');
        if (id && /^[a-zA-Z0-9_-]{11}$/.test(id)) return id;
      }
    }
  } catch (e) {
    console.error('Error parsing YouTube URL:', e);
  }

  return null;
}

export function isValidYouTubeUrl(url: string): boolean {
  return extractYouTubeVideoId(url) !== null;
}

export function getYouTubeEmbedUrl(videoId: string, autoplay = true): string {
  const params = new URLSearchParams({
    autoplay: autoplay ? '1' : '0',
    rel: '0',
    modestbranding: '1',
    playsinline: '1',
    enablejsapi: '1',
  });
  return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`;
}

export function getYouTubeThumbnailUrl(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}
