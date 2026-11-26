# Project memory

## Product intent & audience

- **Product:** PODDAR PIX — SaaS platform for event photographers to upload photos, and guests to find photos of themselves via selfie-based AI face recognition.
- **Audience:** Photographers/organizers (paid, account-based) and event guests (no account, QR/link access).

## Brand personality & voice

- Premium, trustworthy, privacy-conscious. Emphasizes biometric data handling and automatic selfie deletion.

## Visual design & UX direction

- Dark-first premium UI with violet accent; fully responsive.
- Mobile-first guest flow (consent → selfie capture → animated searching → results gallery with similarity scores + download).
- Photographer dashboard with live stats; event details page uses six tabs (overview, gallery, upload, processing status, QR code, settings).
- Drag-and-drop bulk upload with duplicate detection (SHA-256) and retry.
- Admin panel: platform dashboard, user/photographer/event management, system status with error logs.
- Built with Tailwind + shadcn/ui + lucide-react (per `.bolt/prompt` constraints).

## Decisions, constraints & rationale

- **Framework:** Next.js App Router.
- **Backend:** Supabase (auth, Postgres + pgvector for face embeddings, RLS on all 9 tables, SECURITY DEFINER functions for event-scoped search/stats), 4 storage buckets, 2 deployed edge functions (face matching, photo processing).
- **Upload progress:** Supabase `upload()` lacks `onUploadProgress`; simulate progress or use `uploadByChunks`.
- **SSR/build fixes:** `qrcode` library breaks SSR — dynamically import in event-qr; event details page dynamically imports heavy components. Exclude edge function files from `tsconfig`.
- **Face recognition:** Edge function calls separate Python/InsightFace + ONNX Runtime service via `FACE_SERVICE_URL`; falls back to demo mode (with clear message) when not configured. Setup documented in README.
- **Compliance with `.bolt/prompt`:** `"use client"` on hook-using components; avoid `require` in SSR; no extra UI/icon packages beyond shadcn/ui + lucide-react.

## Open questions & assumptions

- Real face matching depends on deploying the external Python service; everything else works standalone.
- Assumes Supabase project, storage buckets, edge functions, and DB schema migrations are provisioned/deployed.
- Storage policies and RLS assumed correctly configured per the 9-table schema.