/*
# PODDAR PIX — Helper Functions

Adds:
1. increment_event_searches — atomically increments the total_searches counter on an event.
2. upsert_storage_usage — upserts storage accounting for a user+event pair.
*/

CREATE OR REPLACE FUNCTION increment_event_searches(p_event_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE events SET total_searches = total_searches + 1 WHERE id = p_event_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION increment_event_searches(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION increment_event_searches(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION upsert_storage_usage(
  p_user_id uuid,
  p_event_id uuid,
  p_bytes bigint,
  p_files int
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO storage_usage (user_id, event_id, bytes_used, file_count)
  VALUES (p_user_id, p_event_id, p_bytes, p_files)
  ON CONFLICT (user_id, event_id)
  DO UPDATE SET bytes_used = storage_usage.bytes_used + p_bytes, file_count = storage_usage.file_count + p_files, updated_at = now();
END;
$$;

REVOKE EXECUTE ON FUNCTION upsert_storage_usage(uuid, uuid, bigint, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION upsert_storage_usage(uuid, uuid, bigint, int) TO authenticated, service_role;
