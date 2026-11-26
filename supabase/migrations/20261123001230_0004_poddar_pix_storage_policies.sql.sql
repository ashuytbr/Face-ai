/*
# PODDAR PIX — Storage Policies

Sets RLS policies on storage buckets:
- event-photos: private, only owner can upload/read/delete (RLS via auth.uid on path prefix)
- guest-selfies: guests (anon + authenticated) can upload; service_role manages cleanup
- event-covers: public read, authenticated can upload
- avatars: public read, authenticated can upload
*/

-- event-photos: private bucket, owner-scoped via path prefix (user_id/event_id/...)
DROP POLICY IF EXISTS "event_photos_select" ON storage.objects;
CREATE POLICY "event_photos_select"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'event-photos' AND (auth.uid()::text = (storage.foldername(name))[1]));

DROP POLICY IF EXISTS "event_photos_insert" ON storage.objects;
CREATE POLICY "event_photos_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'event-photos' AND (auth.uid()::text = (storage.foldername(name))[1]));

DROP POLICY IF EXISTS "event_photos_update" ON storage.objects;
CREATE POLICY "event_photos_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'event-photos' AND (auth.uid()::text = (storage.foldername(name))[1]))
WITH CHECK (bucket_id = 'event-photos' AND (auth.uid()::text = (storage.foldername(name))[1]));

DROP POLICY IF EXISTS "event_photos_delete" ON storage.objects;
CREATE POLICY "event_photos_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'event-photos' AND (auth.uid()::text = (storage.foldername(name))[1]));

-- Service role full access on event-photos
DROP POLICY IF EXISTS "event_photos_service" ON storage.objects;
CREATE POLICY "event_photos_service"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'event-photos')
WITH CHECK (bucket_id = 'event-photos');

-- guest-selfies: guests can upload to selfies/ path, service_role manages cleanup
DROP POLICY IF EXISTS "guest_selfies_insert" ON storage.objects;
CREATE POLICY "guest_selfies_insert"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'guest-selfies');

DROP POLICY IF EXISTS "guest_selfies_select" ON storage.objects;
CREATE POLICY "guest_selfies_select"
ON storage.objects FOR SELECT
TO anon, authenticated, service_role
USING (bucket_id = 'guest-selfies');

DROP POLICY IF EXISTS "guest_selfies_delete" ON storage.objects;
CREATE POLICY "guest_selfies_delete"
ON storage.objects FOR DELETE
TO anon, authenticated, service_role
USING (bucket_id = 'guest-selfies');

-- event-covers: public read, authenticated upload
DROP POLICY IF EXISTS "event_covers_select" ON storage.objects;
CREATE POLICY "event_covers_select"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'event-covers');

DROP POLICY IF EXISTS "event_covers_insert" ON storage.objects;
CREATE POLICY "event_covers_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'event-covers');

DROP POLICY IF EXISTS "event_covers_update" ON storage.objects;
CREATE POLICY "event_covers_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'event-covers')
WITH CHECK (bucket_id = 'event-covers');

DROP POLICY IF EXISTS "event_covers_delete" ON storage.objects;
CREATE POLICY "event_covers_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'event-covers');

-- avatars: public read, authenticated upload
DROP POLICY IF EXISTS "avatars_select" ON storage.objects;
CREATE POLICY "avatars_select"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatars_insert" ON storage.objects;
CREATE POLICY "avatars_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatars_update" ON storage.objects;
CREATE POLICY "avatars_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars')
WITH CHECK (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatars_delete" ON storage.objects;
CREATE POLICY "avatars_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'avatars');
