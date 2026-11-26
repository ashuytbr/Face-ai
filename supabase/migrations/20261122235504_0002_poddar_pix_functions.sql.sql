/*
# PODDAR PIX — Database Functions

Adds SECURITY DEFINER functions for:
1. Event-scoped face similarity search (service_role only — embeddings never exposed to frontend).
2. Photographer dashboard stats aggregation.
3. Admin dashboard stats aggregation.
*/

-- =============================================================
-- Event-scoped face similarity search
-- =============================================================
CREATE OR REPLACE FUNCTION search_faces_in_event(
  p_event_id uuid,
  p_query_embedding vector(512),
  p_threshold real DEFAULT 0.5,
  p_max_results int DEFAULT 100
)
RETURNS TABLE (
  photo_id uuid,
  face_id uuid,
  similarity real,
  file_name text,
  storage_key text,
  width int,
  height int,
  bbox_x real,
  bbox_y real,
  bbox_w real,
  bbox_h real
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    fe.photo_id,
    fe.face_id,
    (1 - (fe.embedding <=> p_query_embedding))::real AS similarity,
    p.file_name,
    p.storage_key,
    p.width,
    p.height,
    f.bbox_x,
    f.bbox_y,
    f.bbox_w,
    f.bbox_h
  FROM face_embeddings fe
  JOIN photos p ON p.id = fe.photo_id
  JOIN faces f ON f.id = fe.face_id
  WHERE fe.event_id = p_event_id
    AND p.status = 'processed'
    AND (1 - (fe.embedding <=> p_query_embedding)) >= p_threshold
  ORDER BY fe.embedding <=> p_query_embedding
  LIMIT p_max_results;
END;
$$;

REVOKE EXECUTE ON FUNCTION search_faces_in_event(uuid, vector(512), real, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION search_faces_in_event(uuid, vector(512), real, int) TO service_role;

-- =============================================================
-- Photographer dashboard stats
-- =============================================================
CREATE OR REPLACE FUNCTION get_photographer_stats(p_user_id uuid)
RETURNS TABLE (
  total_events bigint,
  total_photos bigint,
  photos_processing bigint,
  photos_processed bigint,
  total_searches bigint,
  storage_bytes bigint,
  total_faces bigint
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT count(*)::bigint FROM events WHERE user_id = p_user_id),
    (SELECT count(*)::bigint FROM photos WHERE user_id = p_user_id),
    (SELECT count(*)::bigint FROM photos WHERE user_id = p_user_id AND status = 'processing'),
    (SELECT count(*)::bigint FROM photos WHERE user_id = p_user_id AND status = 'processed'),
    (SELECT count(*)::bigint FROM guest_search_sessions g JOIN events e ON e.id = g.event_id WHERE e.user_id = p_user_id),
    (SELECT COALESCE(sum(bytes_used), 0)::bigint FROM storage_usage WHERE user_id = p_user_id),
    (SELECT count(*)::bigint FROM faces f JOIN events e ON e.id = f.event_id WHERE e.user_id = p_user_id);
END;
$$;

REVOKE EXECUTE ON FUNCTION get_photographer_stats(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION get_photographer_stats(uuid) TO authenticated;

-- =============================================================
-- Admin dashboard stats
-- =============================================================
CREATE OR REPLACE FUNCTION get_admin_stats()
RETURNS TABLE (
  total_users bigint,
  total_photographers bigint,
  total_events bigint,
  total_photos bigint,
  total_storage_bytes bigint,
  photos_processing bigint,
  total_searches bigint
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT count(*)::bigint FROM auth.users),
    (SELECT count(*)::bigint FROM photographer_profiles WHERE role = 'photographer'),
    (SELECT count(*)::bigint FROM events),
    (SELECT count(*)::bigint FROM photos),
    (SELECT COALESCE(sum(bytes_used), 0)::bigint FROM storage_usage),
    (SELECT count(*)::bigint FROM photos WHERE status = 'processing'),
    (SELECT count(*)::bigint FROM guest_search_sessions);
END;
$$;

REVOKE EXECUTE ON FUNCTION get_admin_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION get_admin_stats() TO authenticated;
