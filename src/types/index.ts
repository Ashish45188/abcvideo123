export type SessionStatus =
  | 'waiting'
  | 'active'
  | 'stopped_by_visitor'
  | 'stopped_by_admin'
  | 'permission_denied'
  | 'location_unavailable'
  | 'expired';

export type MediaType = 'youtube' | 'video' | 'photo';

export interface VideoLink {
  id: string;
  share_id: string;
  custom_name: string;
  description?: string | null;
  media_type?: MediaType; // 'youtube' | 'video' | 'photo' (defaults to 'youtube')
  media_url?: string | null; // Direct image URL or direct video URL / Base64 data URL
  thumbnail_url?: string | null; // Custom or extracted thumbnail
  youtube_url?: string;
  youtube_video_id?: string;
  active: boolean;
  created_at: string;
}

export interface VisitorSession {
  id: string;
  video_link_id: string;
  visitor_id: string;
  status: SessionStatus;
  consent_given: boolean;
  started_at?: string | null;
  stopped_at?: string | null;
  stop_reason?: string | null;
  last_seen?: string | null;
  created_at: string;
  // Joined fields for convenience
  video_link?: VideoLink;
}

export interface LocationUpdate {
  id: string;
  session_id: string;
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  altitude?: number | null;
  altitude_accuracy?: number | null;
  heading?: number | null;
  speed?: number | null;
  created_at: string;
}

export interface CurrentLocation {
  session_id: string;
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  altitude?: number | null;
  altitude_accuracy?: number | null;
  heading?: number | null;
  speed?: number | null;
  updated_at: string;
}

export interface GeoLocationPayload {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  altitude: number | null;
  altitudeAccuracy: number | null;
  heading: number | null;
  speed: number | null;
  timestamp: number;
}

export interface SessionWithLocation extends VisitorSession {
  current_location?: CurrentLocation | null;
  video_link?: VideoLink | null;
  location_count?: number;
}

export interface CreateVideoLinkInput {
  media_type?: MediaType;
  youtube_url?: string;
  media_url?: string;
  thumbnail_url?: string;
  custom_name: string;
  description?: string;
}

export interface DashboardStats {
  totalLinks: number;
  activeSessions: number;
  totalSessions: number;
  activeVisitors: number;
}
