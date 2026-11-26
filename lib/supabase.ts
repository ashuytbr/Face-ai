import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export const STORAGE_BUCKET = 'event-photos';
export const SELFIE_BUCKET = 'guest-selfies';
export const COVER_BUCKET = 'event-covers';
export const AVATAR_BUCKET = 'avatars';

export type EventType = 'wedding' | 'birthday' | 'engagement' | 'corporate' | 'party' | 'other';
export type EventVisibility = 'public' | 'private' | 'link_only';
export type PhotoStatus = 'uploaded' | 'processing' | 'processed' | 'failed' | 'no_faces';
export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed';
export type SessionStatus = 'pending' | 'searching' | 'completed' | 'failed' | 'no_match';
export type UserRole = 'super_admin' | 'photographer' | 'event_manager';

export interface PhotographerProfile {
  id: string;
  user_id: string;
  display_name: string;
  studio_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  portfolio_url: string | null;
  role: UserRole;
  is_suspended: boolean;
  storage_limit_bytes: number;
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: string;
  user_id: string;
  name: string;
  event_type: EventType;
  event_date: string | null;
  venue: string | null;
  cover_url: string | null;
  photographer_name: string | null;
  visibility: EventVisibility;
  slug: string;
  expires_at: string | null;
  selfi_match_enabled: boolean;
  downloads_enabled: boolean;
  watermark_enabled: boolean;
  watermark_text: string | null;
  similarity_threshold: number;
  is_suspended: boolean;
  total_photos: number;
  total_faces: number;
  total_searches: number;
  created_at: string;
  updated_at: string;
}

export interface Photo {
  id: string;
  event_id: string;
  user_id: string;
  storage_key: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  width: number | null;
  height: number | null;
  status: PhotoStatus;
  face_count: number;
  error_message: string | null;
  file_hash: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProcessingJob {
  id: string;
  photo_id: string;
  event_id: string;
  user_id: string;
  job_type: 'face_index' | 'retry' | 'reprocess';
  status: JobStatus;
  attempts: number;
  max_attempts: number;
  error_message: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface GuestSearchSession {
  id: string;
  event_id: string;
  selfie_storage_key: string | null;
  consent_given: boolean;
  match_count: number;
  status: SessionStatus;
  error_message: string | null;
  selfie_deleted: boolean;
  created_at: string;
  completed_at: string | null;
}

export interface MatchResult {
  photo_id: string;
  face_id: string;
  similarity: number;
  file_name: string;
  storage_key: string;
  width: number | null;
  height: number | null;
  bbox_x: number;
  bbox_y: number;
  bbox_w: number;
  bbox_h: number;
}

export interface PhotographerStats {
  total_events: number;
  total_photos: number;
  photos_processing: number;
  photos_processed: number;
  total_searches: number;
  storage_bytes: number;
  total_faces: number;
}

export interface AdminStats {
  total_users: number;
  total_photographers: number;
  total_events: number;
  total_photos: number;
  total_storage_bytes: number;
  photos_processing: number;
  total_searches: number;
}
