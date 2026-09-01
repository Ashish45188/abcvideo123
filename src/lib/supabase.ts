import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Configuration keys in localStorage for easy runtime setup in preview
const STORAGE_URL_KEY = 'geovideo_supabase_url';
const STORAGE_KEY_KEY = 'geovideo_supabase_anon_key';

export function getSupabaseConfig(): { url: string; anonKey: string; isConfigured: boolean } {
  const metaEnv = typeof import.meta !== 'undefined' ? (import.meta as any).env || {} : {};
  const processEnv = typeof process !== 'undefined' ? (process.env as any) || {} : {};

  const envUrl =
    metaEnv.VITE_SUPABASE_URL ||
    metaEnv.SUPABASE_URL ||
    metaEnv.VITE_PUBLIC_SUPABASE_URL ||
    metaEnv.PUBLIC_SUPABASE_URL ||
    processEnv.VITE_SUPABASE_URL ||
    processEnv.SUPABASE_URL ||
    processEnv.VITE_PUBLIC_SUPABASE_URL ||
    processEnv.PUBLIC_SUPABASE_URL ||
    '';

  const envKey =
    metaEnv.VITE_SUPABASE_ANON_KEY ||
    metaEnv.SUPABASE_ANON_KEY ||
    metaEnv.VITE_PUBLIC_SUPABASE_ANON_KEY ||
    metaEnv.PUBLIC_SUPABASE_ANON_KEY ||
    processEnv.VITE_SUPABASE_ANON_KEY ||
    processEnv.SUPABASE_ANON_KEY ||
    processEnv.VITE_PUBLIC_SUPABASE_ANON_KEY ||
    processEnv.PUBLIC_SUPABASE_ANON_KEY ||
    '';

  let localUrl = '';
  let localKey = '';
  if (typeof localStorage !== 'undefined') {
    localUrl = localStorage.getItem(STORAGE_URL_KEY) || '';
    localKey = localStorage.getItem(STORAGE_KEY_KEY) || '';
  }

  const url = (localUrl || envUrl).trim();
  const anonKey = (localKey || envKey).trim();

  let isValidUrl = false;
  try {
    if (url) {
      const parsed = new URL(url);
      isValidUrl = parsed.protocol === 'https:' || parsed.protocol === 'http:';
    }
  } catch {
    isValidUrl = false;
  }

  const isConfigured = Boolean(
    url &&
    anonKey &&
    isValidUrl &&
    anonKey.length > 20
  );

  return { url, anonKey, isConfigured };
}

export function saveSupabaseConfig(url: string, anonKey: string): void {
  if (typeof localStorage === 'undefined') return;
  const trimmedUrl = url.trim();
  const trimmedKey = anonKey.trim();

  if (trimmedUrl) localStorage.setItem(STORAGE_URL_KEY, trimmedUrl);
  else localStorage.removeItem(STORAGE_URL_KEY);

  if (trimmedKey) localStorage.setItem(STORAGE_KEY_KEY, trimmedKey);
  else localStorage.removeItem(STORAGE_KEY_KEY);
}

let supabaseInstance: SupabaseClient | null = null;
let currentConfigKey = '';

export function getSupabaseClient(): SupabaseClient | null {
  const { url, anonKey, isConfigured } = getSupabaseConfig();

  if (!isConfigured) {
    supabaseInstance = null;
    currentConfigKey = '';
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

export interface UploadMediaResult {
  publicImageUrl: string | null;
  storagePath: string | null;
  error?: {
    message: string;
    status?: number | string;
    statusCode?: number | string;
  } | null;
}

export async function uploadMediaToSupabaseStorage(
  file: File
): Promise<UploadMediaResult> {
  console.log('Selected file:', file);

  const config = getSupabaseConfig();
  console.log('Supabase configured:', config.isConfigured);
  console.log('Supabase URL present:', !!config.url);
  console.log('Supabase anon key present:', !!config.anonKey);

  const supabase = getSupabaseClient();
  if (!supabase) {
    console.warn('Supabase client is not configured.');
    return {
      publicImageUrl: null,
      storagePath: null,
      error: {
        message: 'Supabase client is not configured. Please connect Supabase in settings.',
      },
    };
  }

  try {
    const targetBucket = 'whatsapp-thumbnails';
    const ext = file.name.split('.').pop() || 'jpg';
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
    const filePath = `uploads/${fileName}`;

    const uploadResult = await supabase.storage
      .from(targetBucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      });

    console.log('Supabase upload result:', uploadResult);

    if (uploadResult.error) {
      const errObj = uploadResult.error as any;
      console.error(`Supabase Storage upload error for bucket '${targetBucket}':`, {
        message: errObj.message,
        status: errObj.status,
        statusCode: errObj.statusCode,
      });
      return {
        publicImageUrl: null,
        storagePath: filePath,
        error: {
          message: errObj.message || 'Storage upload failed',
          status: errObj.status,
          statusCode: errObj.statusCode,
        },
      };
    }

    const { data: publicUrlData } = supabase.storage.from(targetBucket).getPublicUrl(filePath);
    const publicImageUrl = publicUrlData?.publicUrl || null;

    console.log('SUPABASE PUBLIC URL:', publicImageUrl);

    if (!publicImageUrl || !publicImageUrl.startsWith('https://')) {
      console.warn('Invalid public URL generated from Supabase Storage:', publicImageUrl);
      return {
        publicImageUrl: null,
        storagePath: filePath,
        error: {
          message: 'Generated public URL is not a valid HTTPS URL.',
        },
      };
    }

    return { publicImageUrl, storagePath: filePath, error: null };
  } catch (err: any) {
    console.error('Failed to upload file to Supabase Storage:', err);
    return {
      publicImageUrl: null,
      storagePath: null,
      error: {
        message: err?.message || 'An unexpected error occurred during storage upload.',
      },
    };
  }
}
