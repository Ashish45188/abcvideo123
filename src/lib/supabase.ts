import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Configuration keys in localStorage for easy runtime setup in preview
const STORAGE_URL_KEY = 'geovideo_supabase_url';
const STORAGE_KEY_KEY = 'geovideo_supabase_anon_key';

export function getSupabaseConfig(): { url: string; anonKey: string; isConfigured: boolean } {
  const metaEnv = typeof import.meta !== 'undefined' ? (import.meta as any).env || {} : {};
  const envUrl = metaEnv.VITE_SUPABASE_URL || '';
  const envKey = metaEnv.VITE_SUPABASE_ANON_KEY || '';

  const localUrl = localStorage.getItem(STORAGE_URL_KEY) || '';
  const localKey = localStorage.getItem(STORAGE_KEY_KEY) || '';

  const url = localUrl || envUrl;
  const anonKey = localKey || envKey;

  const isConfigured = Boolean(
    url &&
    anonKey &&
    url.startsWith('https://') &&
    url.includes('supabase.co') &&
    anonKey.length > 20
  );

  return { url, anonKey, isConfigured };
}

export function saveSupabaseConfig(url: string, anonKey: string): void {
  if (url) localStorage.setItem(STORAGE_URL_KEY, url.trim());
  else localStorage.removeItem(STORAGE_URL_KEY);

  if (anonKey) localStorage.setItem(STORAGE_KEY_KEY, anonKey.trim());
  else localStorage.removeItem(STORAGE_KEY_KEY);
}

let supabaseInstance: SupabaseClient | null = null;
let currentConfigKey = '';

export function getSupabaseClient(): SupabaseClient | null {
  const { url, anonKey, isConfigured } = getSupabaseConfig();

  if (!isConfigured) {
    return null;
  }

  const configKey = `${url}_${anonKey}`;
  if (!supabaseInstance || currentConfigKey !== configKey) {
    supabaseInstance = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
    currentConfigKey = configKey;
  }

  return supabaseInstance;
}

export async function uploadMediaToSupabaseStorage(file: File): Promise<string | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  try {
    const targetBucket = 'whatsapp-thumbnails';

    // Inspect existing buckets to reuse an available bucket or check whatsapp-thumbnails
    let bucketToUse = targetBucket;
    const { data: buckets, error: listBucketsError } = await supabase.storage.listBuckets();
    if (!listBucketsError && buckets) {
      const foundTarget = buckets.find((b) => b.name === targetBucket);
      if (foundTarget) {
        bucketToUse = foundTarget.name;
      } else {
        const foundMedia = buckets.find((b) => b.name === 'media');
        if (foundMedia) {
          bucketToUse = foundMedia.name;
        } else {
          // Attempt to create target bucket if permitted
          const { error: createError } = await supabase.storage.createBucket(targetBucket, {
            public: true,
          });
          if (!createError) {
            bucketToUse = targetBucket;
          }
        }
      }
    }

    const ext = file.name.split('.').pop() || 'jpg';
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
    const filePath = `uploads/${fileName}`;

    const { error } = await supabase.storage
      .from(bucketToUse)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (error) {
      console.warn(`Supabase Storage upload error for bucket '${bucketToUse}':`, error.message);
      return null;
    }

    const { data: publicUrlData } = supabase.storage.from(bucketToUse).getPublicUrl(filePath);
    return publicUrlData?.publicUrl || null;
  } catch (err) {
    console.warn('Failed to upload file to Supabase Storage:', err);
    return null;
  }
}
