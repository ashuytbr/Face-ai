/*
# PODDAR PIX — Core Tables

Creates the full database for an AI-powered event photo discovery SaaS.

## 1. New Tables
- `photographer_profiles` — extends auth.users with photographer details
- `events` — photography events owned by a photographer
- `photos` — individual photographs within an event
- `faces` — detected faces within a photo (bounding box metadata)
- `face_embeddings` — 512-dim pgvector embeddings for each face
- `guest_search_sessions` — a guest's selfie search within an event
- `download_records` — audit log of photo downloads
- `storage_usage` — per-photographer storage accounting
- `processing_jobs` — background face-indexing jobs

## 2. Extensions
- Enables `vector` (pgvector) for face embedding similarity search.

## 3. Security
- RLS enabled on every table.
- Face embeddings never exposed to frontend (service_role only).
- Guest-accessible event lookup + selfie search paths use anon role.
*/

CREATE EXTENSION IF NOT EXISTS vector;

-- =============================================================
-- photographer_profiles
-- =============================================================
CREATE TABLE IF NOT EXISTS photographer_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  studio_name text,
  bio text,
  avatar_url text,
  portfolio_url text,
  role text NOT NULL DEFAULT 'photographer' CHECK (role IN ('super_admin','photographer','event_manager')),
  is_suspended boolean NOT NULL DEFAULT false,
  storage_limit_bytes bigint NOT NULL DEFAULT 5368709120,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

ALTER TABLE photographer_profiles ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON photographer_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON photographer_profiles TO service_role;

DROP POLICY IF EXISTS "profiles_select_own" ON photographer_profiles;
CREATE POLICY "profiles_select_own"
ON photographer_profiles FOR SELECT
TO authenticated USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM photographer_profiles p WHERE p.user_id = auth.uid() AND p.role = 'super_admin'));

DROP POLICY IF EXISTS "profiles_insert_own" ON photographer_profiles;
CREATE POLICY "profiles_insert_own"
ON photographer_profiles FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "profiles_update_own" ON photographer_profiles;
CREATE POLICY "profiles_update_own"
ON photographer_profiles FOR UPDATE
TO authenticated USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM photographer_profiles p WHERE p.user_id = auth.uid() AND p.role = 'super_admin'))
WITH CHECK (auth.uid() = user_id OR EXISTS (SELECT 1 FROM photographer_profiles p WHERE p.user_id = auth.uid() AND p.role = 'super_admin'));

-- =============================================================
-- events
-- =============================================================
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  event_type text NOT NULL DEFAULT 'other' CHECK (event_type IN ('wedding','birthday','engagement','corporate','party','other')),
  event_date date,
  venue text,
  cover_url text,
  photographer_name text,
  visibility text NOT NULL DEFAULT 'private' CHECK (visibility IN ('public','private','link_only')),
  slug text NOT NULL,
  expires_at timestamptz,
  selfi_match_enabled boolean NOT NULL DEFAULT true,
  downloads_enabled boolean NOT NULL DEFAULT true,
  watermark_enabled boolean NOT NULL DEFAULT false,
  watermark_text text,
  similarity_threshold real NOT NULL DEFAULT 0.5,
  is_suspended boolean NOT NULL DEFAULT false,
  is_demo boolean NOT NULL DEFAULT false,
  total_photos int NOT NULL DEFAULT 0,
  total_faces int NOT NULL DEFAULT 0,
  total_searches int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (slug)
);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON events TO service_role;
GRANT SELECT ON events TO anon;

DROP POLICY IF EXISTS "events_select_own_or_guest" ON events;
CREATE POLICY "events_select_own_or_guest"
ON events FOR SELECT
TO anon, authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (SELECT 1 FROM photographer_profiles p WHERE p.user_id = auth.uid() AND p.role = 'super_admin')
  OR (is_suspended = false AND (expires_at IS NULL OR expires_at > now()))
);

DROP POLICY IF EXISTS "events_insert_own" ON events;
CREATE POLICY "events_insert_own"
ON events FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "events_update_own" ON events;
CREATE POLICY "events_update_own"
ON events FOR UPDATE
TO authenticated USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM photographer_profiles p WHERE p.user_id = auth.uid() AND p.role = 'super_admin'))
WITH CHECK (auth.uid() = user_id OR EXISTS (SELECT 1 FROM photographer_profiles p WHERE p.user_id = auth.uid() AND p.role = 'super_admin'));

DROP POLICY IF EXISTS "events_delete_own" ON events;
CREATE POLICY "events_delete_own"
ON events FOR DELETE
TO authenticated USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM photographer_profiles p WHERE p.user_id = auth.uid() AND p.role = 'super_admin'));

-- =============================================================
-- photos
-- =============================================================
CREATE TABLE IF NOT EXISTS photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_key text NOT NULL,
  file_name text NOT NULL,
  file_size bigint NOT NULL DEFAULT 0,
  mime_type text NOT NULL DEFAULT 'image/jpeg',
  width int,
  height int,
  status text NOT NULL DEFAULT 'uploaded' CHECK (status IN ('uploaded','processing','processed','failed','no_faces')),
  face_count int NOT NULL DEFAULT 0,
  error_message text,
  file_hash text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON photos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON photos TO service_role;
GRANT SELECT ON photos TO anon;

DROP POLICY IF EXISTS "photos_select_owner_or_guest" ON photos;
CREATE POLICY "photos_select_owner_or_guest"
ON photos FOR SELECT
TO anon, authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (SELECT 1 FROM photographer_profiles p WHERE p.user_id = auth.uid() AND p.role = 'super_admin')
  OR EXISTS (SELECT 1 FROM events e WHERE e.id = photos.event_id AND e.is_suspended = false AND (e.expires_at IS NULL OR e.expires_at > now()))
);

DROP POLICY IF EXISTS "photos_insert_owner" ON photos;
CREATE POLICY "photos_insert_owner"
ON photos FOR INSERT
TO authenticated WITH CHECK (
  auth.uid() = user_id AND EXISTS (SELECT 1 FROM events e WHERE e.id = event_id AND e.user_id = auth.uid())
);

DROP POLICY IF EXISTS "photos_update_owner" ON photos;
CREATE POLICY "photos_update_owner"
ON photos FOR UPDATE
TO authenticated USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM photographer_profiles p WHERE p.user_id = auth.uid() AND p.role = 'super_admin'))
WITH CHECK (auth.uid() = user_id OR EXISTS (SELECT 1 FROM photographer_profiles p WHERE p.user_id = auth.uid() AND p.role = 'super_admin'));

DROP POLICY IF EXISTS "photos_delete_owner" ON photos;
CREATE POLICY "photos_delete_owner"
ON photos FOR DELETE
TO authenticated USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM photographer_profiles p WHERE p.user_id = auth.uid() AND p.role = 'super_admin'));

CREATE INDEX IF NOT EXISTS idx_photos_event_id ON photos (event_id);
CREATE INDEX IF NOT EXISTS idx_photos_status ON photos (status);
CREATE INDEX IF NOT EXISTS idx_photos_file_hash ON photos (file_hash);

-- =============================================================
-- faces
-- =============================================================
CREATE TABLE IF NOT EXISTS faces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id uuid NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  bbox_x real NOT NULL,
  bbox_y real NOT NULL,
  bbox_w real NOT NULL,
  bbox_h real NOT NULL,
  confidence real NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE faces ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON faces TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON faces TO service_role;

DROP POLICY IF EXISTS "faces_select_owner" ON faces;
CREATE POLICY "faces_select_owner"
ON faces FOR SELECT
TO authenticated USING (
  EXISTS (SELECT 1 FROM photos p WHERE p.id = faces.photo_id AND p.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM photographer_profiles p WHERE p.user_id = auth.uid() AND p.role = 'super_admin')
);

CREATE INDEX IF NOT EXISTS idx_faces_event_id ON faces (event_id);
CREATE INDEX IF NOT EXISTS idx_faces_photo_id ON faces (photo_id);

-- =============================================================
-- face_embeddings (pgvector)
-- =============================================================
CREATE TABLE IF NOT EXISTS face_embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  face_id uuid NOT NULL REFERENCES faces(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  photo_id uuid NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
  embedding vector(512) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE face_embeddings ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, DELETE ON face_embeddings TO service_role;

DROP POLICY IF EXISTS "face_embeddings_service_only" ON face_embeddings;
CREATE POLICY "face_embeddings_service_only"
ON face_embeddings FOR SELECT
TO service_role USING (true);

DROP POLICY IF EXISTS "face_embeddings_insert_service" ON face_embeddings;
CREATE POLICY "face_embeddings_insert_service"
ON face_embeddings FOR INSERT
TO service_role WITH CHECK (true);

DROP POLICY IF EXISTS "face_embeddings_delete_service" ON face_embeddings;
CREATE POLICY "face_embeddings_delete_service"
ON face_embeddings FOR DELETE
TO service_role USING (true);

CREATE INDEX IF NOT EXISTS idx_face_embeddings_event_id ON face_embeddings (event_id);
CREATE INDEX IF NOT EXISTS idx_face_embeddings_embedding ON face_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- =============================================================
-- guest_search_sessions
-- =============================================================
CREATE TABLE IF NOT EXISTS guest_search_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  selfie_storage_key text,
  consent_given boolean NOT NULL DEFAULT false,
  match_count int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','searching','completed','failed','no_match')),
  error_message text,
  selfie_deleted boolean NOT NULL DEFAULT false,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE guest_search_sessions ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON guest_search_sessions TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON guest_search_sessions TO service_role;

DROP POLICY IF EXISTS "guest_sessions_select" ON guest_search_sessions;
CREATE POLICY "guest_sessions_select"
ON guest_search_sessions FOR SELECT
TO anon, authenticated
USING (
  EXISTS (SELECT 1 FROM events e WHERE e.id = guest_search_sessions.event_id AND e.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM photographer_profiles p WHERE p.user_id = auth.uid() AND p.role = 'super_admin')
);

DROP POLICY IF EXISTS "guest_sessions_insert" ON guest_search_sessions;
CREATE POLICY "guest_sessions_insert"
ON guest_search_sessions FOR INSERT
TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "guest_sessions_update" ON guest_search_sessions;
CREATE POLICY "guest_sessions_update"
ON guest_search_sessions FOR UPDATE
TO anon, authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_guest_sessions_event_id ON guest_search_sessions (event_id);

-- =============================================================
-- download_records
-- =============================================================
CREATE TABLE IF NOT EXISTS download_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id uuid NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id uuid REFERENCES guest_search_sessions(id) ON DELETE SET NULL,
  is_guest boolean NOT NULL DEFAULT false,
  file_size bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE download_records ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON download_records TO anon, authenticated;
GRANT SELECT, INSERT, DELETE ON download_records TO service_role;

DROP POLICY IF EXISTS "downloads_select_owner" ON download_records;
CREATE POLICY "downloads_select_owner"
ON download_records FOR SELECT
TO authenticated USING (
  auth.uid() = user_id
  OR EXISTS (SELECT 1 FROM events e WHERE e.id = download_records.event_id AND e.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM photographer_profiles p WHERE p.user_id = auth.uid() AND p.role = 'super_admin')
);

DROP POLICY IF EXISTS "downloads_insert_any" ON download_records;
CREATE POLICY "downloads_insert_any"
ON download_records FOR INSERT
TO anon, authenticated WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_downloads_event_id ON download_records (event_id);

-- =============================================================
-- storage_usage
-- =============================================================
CREATE TABLE IF NOT EXISTS storage_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  bytes_used bigint NOT NULL DEFAULT 0,
  file_count int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, event_id)
);

ALTER TABLE storage_usage ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON storage_usage TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON storage_usage TO service_role;

DROP POLICY IF EXISTS "storage_usage_select_own" ON storage_usage;
CREATE POLICY "storage_usage_select_own"
ON storage_usage FOR SELECT
TO authenticated USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM photographer_profiles p WHERE p.user_id = auth.uid() AND p.role = 'super_admin'));

DROP POLICY IF EXISTS "storage_usage_insert_own" ON storage_usage;
CREATE POLICY "storage_usage_insert_own"
ON storage_usage FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "storage_usage_update_own" ON storage_usage;
CREATE POLICY "storage_usage_update_own"
ON storage_usage FOR UPDATE
TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "storage_usage_delete_own" ON storage_usage;
CREATE POLICY "storage_usage_delete_own"
ON storage_usage FOR DELETE
TO authenticated USING (auth.uid() = user_id);

-- =============================================================
-- processing_jobs
-- =============================================================
CREATE TABLE IF NOT EXISTS processing_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id uuid NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  job_type text NOT NULL DEFAULT 'face_index' CHECK (job_type IN ('face_index','retry','reprocess')),
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','processing','completed','failed')),
  attempts int NOT NULL DEFAULT 0,
  max_attempts int NOT NULL DEFAULT 3,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz
);

ALTER TABLE processing_jobs ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON processing_jobs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON processing_jobs TO service_role;

DROP POLICY IF EXISTS "jobs_select_owner" ON processing_jobs;
CREATE POLICY "jobs_select_owner"
ON processing_jobs FOR SELECT
TO authenticated USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM photographer_profiles p WHERE p.user_id = auth.uid() AND p.role = 'super_admin'));

DROP POLICY IF EXISTS "jobs_insert_owner" ON processing_jobs;
CREATE POLICY "jobs_insert_owner"
ON processing_jobs FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "jobs_update_owner" ON processing_jobs;
CREATE POLICY "jobs_update_owner"
ON processing_jobs FOR UPDATE
TO authenticated USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM photographer_profiles p WHERE p.user_id = auth.uid() AND p.role = 'super_admin'))
WITH CHECK (auth.uid() = user_id OR EXISTS (SELECT 1 FROM photographer_profiles p WHERE p.user_id = auth.uid() AND p.role = 'super_admin'));

CREATE INDEX IF NOT EXISTS idx_jobs_status ON processing_jobs (status);
CREATE INDEX IF NOT EXISTS idx_jobs_event_id ON processing_jobs (event_id);

-- =============================================================
-- updated_at triggers
-- =============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_updated ON photographer_profiles;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON photographer_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_events_updated ON events;
CREATE TRIGGER trg_events_updated BEFORE UPDATE ON events FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_photos_updated ON photos;
CREATE TRIGGER trg_photos_updated BEFORE UPDATE ON photos FOR EACH ROW EXECUTE FUNCTION update_updated_at();
