import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  try {
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'geovideo-tracker.vercel.app';
    const proto = req.headers['x-forwarded-proto'] || 'https';

    // Parse URL path and query parameters
    const requestUrl = new URL(req.url, `${proto}://${host}`);

    // Extract share_id / watch from query params or URL path (e.g., /watch/abc123 or /item/abc123)
    let shareId = req.query?.watch || req.query?.share_id || requestUrl.searchParams.get('watch') || requestUrl.searchParams.get('share_id') || '';

    if (!shareId && requestUrl.pathname) {
      const match = requestUrl.pathname.match(/\/(?:watch|item)\/([^/]+)/);
      if (match && match[1]) {
        shareId = match[1];
      }
    }

    let title = 'Shared Media Item';
    let description = 'Tap to view this shared item.';
    let imageUrl = 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80';

    const canonicalUrl = shareId
      ? `${proto}://${host}/watch/${encodeURIComponent(shareId)}`
      : `${proto}://${host}${req.url}`;

    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

    if (shareId && supabaseUrl && supabaseAnonKey) {
      try {
        const fetchUrl = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/video_links?share_id=eq.${encodeURIComponent(shareId)}&active=eq.true&select=*`;
        const response = await fetch(fetchUrl, {
          headers: {
            apikey: supabaseAnonKey,
            Authorization: `Bearer ${supabaseAnonKey}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data) && data.length > 0) {
            const link = data[0];
            if (link.custom_name) {
              title = link.custom_name;
            }
            if (link.description) {
              description = link.description;
            }

            const isValidImageUrl = (url) => {
              if (!url || typeof url !== 'string') return false;
              if (url.startsWith('data:') || url.startsWith('blob:')) return false;
              return true;
            };

            if (link.thumbnail_url && isValidImageUrl(link.thumbnail_url)) {
              imageUrl = link.thumbnail_url;
            } else if (link.media_type === 'photo' && link.media_url && isValidImageUrl(link.media_url)) {
              imageUrl = link.media_url;
            } else if (link.youtube_video_id) {
              imageUrl = `https://img.youtube.com/vi/${link.youtube_video_id}/hqdefault.jpg`;
            } else if (link.media_type === 'pdf') {
              imageUrl = 'https://images.unsplash.com/photo-1568667256549-094345857637?auto=format&fit=crop&w=1200&q=80';
            } else if (link.media_url && isValidImageUrl(link.media_url) && link.media_url.match(/\.(jpeg|jpg|png|gif|webp)(\?.*)?$/i)) {
              imageUrl = link.media_url;
            }
          }
        }
      } catch (err) {
        console.error('Error fetching share link metadata:', err);
      }
    }

    // Ensure absolute image URL with https
    if (imageUrl.startsWith('//')) {
      imageUrl = `https:${imageUrl}`;
    } else if (imageUrl.startsWith('/')) {
      imageUrl = `https://${host}${imageUrl}`;
    } else if (imageUrl.startsWith('http://')) {
      imageUrl = imageUrl.replace('http://', 'https://');
    }

    // Load dist/index.html if built, otherwise index.html from root
    let htmlPath = path.join(process.cwd(), 'dist', 'index.html');
    if (!fs.existsSync(htmlPath)) {
      htmlPath = path.join(process.cwd(), 'index.html');
    }

    let html = '';
    if (fs.existsSync(htmlPath)) {
      html = fs.readFileSync(htmlPath, 'utf8');
    } else {
      html = `<!doctype html>
<html lang="en" prefix="og: http://ogp.me/ns#">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Shared Content</title>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`;
    }

    const escapeAttr = (str) =>
      String(str)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    const safeTitle = escapeAttr(title);
    const safeDesc = escapeAttr(description);
    const safeImage = escapeAttr(imageUrl);
    const safeUrl = escapeAttr(canonicalUrl);

    // Replace <title>
    html = html.replace(/<title>.*?<\/title>/i, `<title>${safeTitle}</title>`);

    // Helper function to replace or inject meta tags cleanly
    const setOrReplaceMeta = (htmlContent, attrKey, attrVal, contentVal) => {
      const pattern = new RegExp(
        `<meta\\s+[^>]*?${attrKey}=["']${attrVal}["'][^>]*?>`,
        'i'
      );
      const newMeta = `<meta ${attrKey}="${attrVal}" content="${contentVal}" />`;

      if (pattern.test(htmlContent)) {
        return htmlContent.replace(pattern, newMeta);
      } else {
        return htmlContent.replace('</head>', `  ${newMeta}\n</head>`);
      }
    };

    html = setOrReplaceMeta(html, 'name', 'description', safeDesc);

    html = setOrReplaceMeta(html, 'property', 'og:title', safeTitle);
    html = setOrReplaceMeta(html, 'property', 'og:description', safeDesc);
    html = setOrReplaceMeta(html, 'property', 'og:image', safeImage);
    html = setOrReplaceMeta(html, 'property', 'og:url', safeUrl);
    html = setOrReplaceMeta(html, 'property', 'og:type', 'website');
    html = setOrReplaceMeta(html, 'property', 'og:site_name', host);
    html = setOrReplaceMeta(html, 'property', 'og:image:secure_url', safeImage);

    html = setOrReplaceMeta(html, 'name', 'twitter:card', 'summary_large_image');
    html = setOrReplaceMeta(html, 'name', 'twitter:title', safeTitle);
    html = setOrReplaceMeta(html, 'name', 'twitter:description', safeDesc);
    html = setOrReplaceMeta(html, 'name', 'twitter:image', safeImage);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    return res.status(200).send(html);
  } catch (error) {
    console.error('Serverless function error:', error);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(500).send('Internal Server Error');
  }
}
