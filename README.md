# PODDAR PIX

**AI-Powered Event Photo Finder SaaS**

> Every face. Every moment. Every memory.

PODDAR PIX is a professional SaaS platform for photographers, studios, and event organizers. Photographers bulk-upload event photos, and guests find their own pictures in seconds using a selfie — powered by AI facial recognition.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Features](#features)
- [User Roles](#user-roles)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Database Schema](#database-schema)
- [Face Recognition Service](#face-recognition-service)
- [Cloud Storage (R2)](#cloud-storage-r2)
- [Privacy & Security](#privacy--security)
- [Demo Event Mode](#demo-event-mode)
- [API Reference](#api-reference)
- [Environment Variables](#environment-variables)

---

## Overview

PODDAR PIX solves a real problem in event photography: delivering thousands of photos to hundreds of guests. Instead of manually tagging or sharing galleries, guests simply upload a selfie and the AI finds every photo they appear in.

### Core Flow

1. **Photographer** creates an event and bulk-uploads photos
2. **AI** detects faces in every photo and generates 512-dimensional embeddings
3. **Photographer** shares a QR code / link with guests
4. **Guest** scans the QR code, uploads a selfie (no account needed)
5. **AI** generates an embedding from the selfie and searches only within that event
6. **Guest** previews and downloads their matched photos
7. **Selfie is deleted** immediately after matching

---

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Next.js App   │────▶│  Supabase Auth   │     │  PostgreSQL     │
│  (Frontend)     │     │  (Email/Pass)    │     │  + pgvector     │
└────────┬────────┘     └──────────────────┘     └─────────────────┘
         │
         ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ Supabase Edge   │────▶│  Face Recognition │────▶│ Cloudflare R2   │
│ Functions (Deno)│     │  Service (Python) │     │ / Supabase Store│
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

### Components

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Frontend | Next.js 13, TypeScript, Tailwind CSS | Photographer dashboard, guest experience, admin panel |
| Auth | Supabase Auth (email/password) | Photographer accounts, role-based access |
| Database | Supabase PostgreSQL + pgvector | All data storage, vector similarity search |
| Storage | Supabase Storage (R2-compatible) | Private photo storage with signed URLs |
| Edge Functions | Supabase Edge Functions (Deno) | Face matching proxy, photo processing |
| Face Recognition | Python + FastAPI + InsightFace + ONNX Runtime | Face detection, embedding generation |

---

## Features

### Photographer
- Dashboard with stats (events, photos, faces indexed, searches, storage)
- Create events with cover photos, venue, date, custom URL
- Bulk photo upload with drag-and-drop, progress, retry, duplicate detection
- Real-time processing status with indexing progress bar
- Event gallery with fullscreen preview, multi-select download
- QR code generation and download
- Event settings (visibility, expiry, watermark, similarity threshold)
- Profile management with avatar and portfolio

### Guest
- Scan QR code or open event link — no account required
- Clear consent screen explaining how face matching works
- Camera capture or file upload for selfie
- Animated searching state
- Results gallery with similarity scores
- Download individual or all matched photos
- Selfie deleted immediately after matching

### Super Admin
- Platform-wide dashboard
- User management (suspend/reinstate)
- Photographer management with per-user stats
- Event management (suspend/reinstate)
- System status monitoring
- Error log viewing
- Subscription management placeholder

---

## User Roles

| Role | Permissions |
|------|------------|
| `super_admin` | Full platform access, manage all users/events |
| `photographer` | Manage own events, photos, profile |
| `event_manager` | Assist with event management (team feature) |
| Guest (no account) | Access events via QR/link, selfie search |

---

## Tech Stack

- **Frontend**: Next.js 13 (App Router), TypeScript, Tailwind CSS, shadcn/ui, Lucide icons
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **AI**: InsightFace + ONNX Runtime + OpenCV (Python FastAPI service)
- **Vector Search**: pgvector with IVFFlat index
- **QR Codes**: qrcode npm library

---

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase project (already provisioned in Bolt)
- Python 3.10+ (for face recognition service, optional for demo)

### Installation

```bash
# Install dependencies
npm install

# Run the development server
npm run dev

# Build for production
npm run build
```

### Database Setup

The database migrations are automatically applied via Supabase. The schema includes:

1. `0001_poddar_pix_core_schema.sql` — All tables, RLS policies, indexes
2. `0002_poddar_pix_functions.sql` — SECURITY DEFINER functions for search and stats
3. `0003_poddar_pix_helper_functions.sql` — Counter and storage upsert helpers

### Storage Buckets

Create these buckets in Supabase Storage (set as **private**):

| Bucket | Purpose |
|--------|---------|
| `event-photos` | Original event photographs (private) |
| `guest-selfies` | Temporary guest selfies (private, auto-deleted) |
| `event-covers` | Event cover images |
| `avatars` | Photographer profile images |

---

## Database Schema

### Tables

| Table | Description |
|-------|------------|
| `photographer_profiles` | Extends auth.users with display name, studio, role, suspension state |
| `events` | Photography events with slug, visibility, expiry, settings |
| `photos` | Individual photos with storage key, status, face count |
| `faces` | Detected faces with bounding box metadata |
| `face_embeddings` | 512-dim pgvector embeddings (service_role only) |
| `guest_search_sessions` | Guest selfie search sessions with consent tracking |
| `download_records` | Audit log of all downloads |
| `storage_usage` | Per-photographer storage accounting |
| `processing_jobs` | Background face indexing jobs |

### Security

- **RLS enabled** on every table
- **Face embeddings** are never readable from the frontend (service_role only)
- **SECURITY DEFINER** functions for search and stats
- **Event-scoped search**: embeddings are only compared within a single event
- **Guest access**: anon role can read non-suspended, non-expired events and create search sessions

---

## Face Recognition Service

The face recognition service is a **separate Python deployment** that runs InsightFace with ONNX Runtime.

### Setup (Separate Deployment Required)

```bash
cd face-service
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Download InsightFace model
python -c "from insightface.app import FaceAnalysis; app = FaceAnalysis(); app.prepare(ctx_id=-1)"

# Start the service
uvicorn main:app --host 0.0.0.0 --port 8000
```

### `face-service/requirements.txt`

```
fastapi==0.104.1
uvicorn==0.24.0
insightface==0.7.3
onnxruntime==1.16.3
opencv-python-headless==4.8.1.78
numpy==1.24.3
python-multipart==0.0.6
```

### `face-service/main.py`

```python
from fastapi import FastAPI, UploadFile, File
from insightface.app import FaceAnalysis
import numpy as np

app = FaceAnalysis(name='buffalo_l')
app.prepare(ctx_id=-1, det_size=(640, 640))

api = FastAPI()

@api.post("/embed")
async def embed(image: UploadFile = File(...)):
    img = await image.read()
    img_array = np.frombuffer(img, np.uint8)
    import cv2
    img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
    faces = app.get(img)
    if not faces:
        return {"faces_detected": 0, "embedding": []}
    return {"faces_detected": len(faces), "embedding": faces[0].embedding.tolist()}

@api.post("/detect")
async def detect(image: UploadFile = File(...)):
    img = await image.read()
    img_array = np.frombuffer(img, np.uint8)
    import cv2
    img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
    h, w = img.shape[:2]
    faces = app.get(img)
    return {
        "width": w,
        "height": h,
        "faces": [{
            "bbox": f.bbox.tolist(),
            "confidence": float(f.det_score),
            "embedding": f.embedding.tolist()
        } for f in faces]
    }
```

### Connecting the Service

Set the `FACE_SERVICE_URL` environment variable in your Supabase project's edge function secrets:

```bash
# Via Supabase Dashboard > Edge Functions > Secrets
FACE_SERVICE_URL=https://your-face-service.example.com
```

**Without the face service configured**, the app runs in demo mode:
- Photos upload and store correctly
- Processing jobs queue but await the service
- Guest selfie search returns no matches with a clear message
- All other features (auth, events, gallery, QR, admin) work fully

---

## Cloud Storage (R2)

The app uses Supabase Storage (which is S3-compatible and works with R2). For production with Cloudflare R2:

### Environment Variables (for R2 direct integration)

```env
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=poddarpix-photos
R2_ENDPOINT=https://your_account_id.r2.cloudflarestorage.com
R2_PUBLIC_URL=https://cdn.yourdomain.com  # optional
```

The current implementation uses Supabase Storage for simplicity, which provides:
- Private buckets with signed URLs
- Upload progress tracking
- Automatic CDN delivery
- RLS-based access control

---

## Privacy & Security

This application processes **biometric data**. The following protections are implemented:

### Consent
- Explicit consent screen before any facial recognition
- Clear explanation of how selfie matching works
- No recognition without consent

### Data Minimization
- Guest selfies are **deleted immediately** after matching
- No biometric profile is created about guests
- No cross-event face tracking

### Storage Security
- All original photos in **private buckets**
- Access via **signed URLs** only (time-limited)
- R2 secret keys never exposed in frontend

### Database Security
- **RLS on every table**
- Face embeddings readable only by `service_role`
- Event-scoped search (never cross-event)
- `SECURITY DEFINER` functions with locked `search_path`

### Guest Privacy
- No account required for guests
- Selfie storage key deleted after matching
- Configurable face embedding deletion
- Event expiry and automatic inaccessibility

### Rate Limiting
- Selfie search sessions are tracked per event
- Edge function validates event state before processing

---

## Demo Event Mode

To test the full flow without the face recognition service:

1. **Sign up** as a photographer
2. **Create an event** — it will have a unique slug and QR code
3. **Upload photos** — they'll upload and store correctly
4. **Share the QR code** or event link (`/e/your-slug`)
5. **Open the guest page** — consent, upload selfie, see the search flow

Without `FACE_SERVICE_URL` configured, the guest search returns no matches with a clear message. All other features (upload, gallery, QR, admin, settings) work fully.

---

## API Reference

### Edge Functions

#### `POST /functions/v1/face-match`
Guest selfie matching. Called from the guest flow after selfie upload.

```json
{
  "event_id": "uuid",
  "session_id": "uuid",
  "selfie_key": "selfies/event-id/session-id-timestamp.jpg"
}
```

Response:
```json
{
  "matches": [
    {
      "photo_id": "uuid",
      "similarity": 0.87,
      "file_name": "IMG_001.jpg",
      "storage_key": "user-id/event-id/hash.jpg",
      "width": 4032,
      "height": 3024
    }
  ]
}
```

#### `POST /functions/v1/process-photos`
Photo face indexing. Called when a photo needs processing.

```json
{
  "photo_id": "uuid"
}
```

### Database RPCs

| Function | Access | Purpose |
|----------|--------|---------|
| `search_faces_in_event` | service_role | Event-scoped vector similarity search |
| `get_photographer_stats` | authenticated | Photographer dashboard aggregation |
| `get_admin_stats` | authenticated | Admin dashboard aggregation |
| `increment_event_searches` | anon, authenticated | Atomic search counter |
| `upsert_storage_usage` | authenticated, service_role | Storage accounting upsert |

---

## Environment Variables

### Automatically Configured (Bolt)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_DB_URL`

### Optional (for Production)
- `FACE_SERVICE_URL` — URL of the Python face recognition service
- `R2_*` — Cloudflare R2 credentials (if using R2 directly instead of Supabase Storage)

---

## Build & Deploy

```bash
# Type check
npm run typecheck

# Lint
npm run lint

# Build
npm run build

# Start production server
npm start
```

The app is configured for Netlify deployment via `netlify.toml`.

---

## License

© PODDAR PIX. All rights reserved.
