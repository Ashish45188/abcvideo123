import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const shareId = url.searchParams.get('watch') || url.searchParams.get('share_id') || '';

    let title = 'Shared Document';
    let description = 'Tap to view the shared document.';
    let imageUrl = 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80';
    const siteUrl = `https://${req.headers.host || 'geovideo-tracker.vercel.app'}${req.url}`;

    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

    if (shareId && supabaseUrl && supabaseAnonKey) {
      try {
        const fetchUrl = `${supabaseUrl}/rest/v1/video_links?share_id=eq.${encodeURIComponent(shareId)}&active=eq.true&select=*`;
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

            if (link.media_type === 'photo' && link.media_url) {
              imageUrl = link.media_url;
            } else if (link.thumbnail_url) {
              imageUrl = link.thumbnail_url;
            } else if (link.youtube_video_id) {
              imageUrl = `https://img.youtube.com/vi/${link.youtube_video_id}/hqdefault.jpg`;
            } else if (link.media_url && link.media_url.match(/\.(jpeg|jpg|png|gif|webp)(\?.*)?$/i)) {
              imageUrl = link.media_url;
            }
          }
        }
      } catch (err) {
        console.error('Error fetching share link metadata:', err);
      }
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
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>GeoVideo Tracker</title>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`;
    }

    // Helper escape for HTML attribute values
    const escapeHtml = (str) =>
      String(str)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    const safeTitle = escapeHtml(title);
    const safeDesc = escapeHtml(description);
    const safeImage = escapeHtml(imageUrl);
    const safeUrl = escapeHtml(siteUrl);

    // Replace title
    html = html.replace(/<title>.*?<\/title>/i, `<title>${safeTitle}</title>`);

    // Helper function to replace or inject meta tags safely
    const setOrReplaceMeta = (htmlContent, attrName, attrVal, contentVal) => {
      const regex = new RegExp(`<meta\\s+${attrName}=["']${attrVal}["']\\s+content=["'].*?["']\\s*\\/?>`, 'gi');
      if (regex.test(htmlContent)) {
        return htmlContent.replace(regex, `<meta ${attrName}="${attrVal}" content="${contentVal}" />`);
      } else {
        return htmlContent.replace('</head>', `  <meta ${attrName}="${attrVal}" content="${contentVal}" />\n</head>`);
      }
    };

    html = setOrReplaceMeta(html, 'property', 'og:type', 'website');
    html = setOrReplaceMeta(html, 'property', 'og:title', safeTitle);
    html = setOrReplaceMeta(html, 'property', 'og:description', safeDesc);
    html = setOrReplaceMeta(html, 'property', 'og:image', safeImage);
    html = setOrReplaceMeta(html, 'property', 'og:url', safeUrl);

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
