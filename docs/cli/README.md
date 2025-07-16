# Brainrot Video Generator – CLI Script Cheatsheet

All helper scripts live in the project‐root `scripts/` folder and are written in TypeScript. Run them with **npx tsx** so you don’t need a separate build step.

> ℹ️ All commands assume you are in the repository root (`brainrot-video-generator/`).

## Prerequisites

1. **Install deps** once:

   ```bash
   pnpm i         # or npm i / yarn install
   ```

2. **Environment variables** – the Google Cloud helpers need these in your shell or in a `.env` file:

   ```bash
   GOOGLE_CLOUD_PROJECT_ID=your-project
   GOOGLE_CLOUD_CLIENT_EMAIL=service-account@your-project.iam.gserviceaccount.com
   GOOGLE_CLOUD_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n…\n-----END PRIVATE KEY-----\n"

   # optional overrides
   GCS_TIMELINES_BUCKET=brainrot-timelines
   GCS_VIDEOS_BUCKET=brainrot-generated-videos
   ```

---

## Script catalogue

| Script | Purpose | Bash / Z-sh | PowerShell |
|--------|---------|------------|-------------|
| `create-timeline-bucket.ts` | Create (and make public) the timelines bucket. | `npx tsx scripts/create-timeline-bucket.ts` | `npx tsx scripts/create-timeline-bucket.ts` |
| `upload-timeline.ts` | Upload a timeline JSON file and print the public URL. | `npx tsx scripts/upload-timeline.ts ./timeline.json my-tl.json` | `npx tsx scripts\upload-timeline.ts .\timeline.json my-tl.json` |
| `render-worker.ts` | Bundle + render locally and upload the MP4. | `npx tsx scripts/render-worker.ts timeline.json out/test.mp4` | `npx tsx scripts\render-worker.ts timeline.json out\test.mp4` |
| `delete-from-buckets.ts` | Delete the file from both buckets. | `npx tsx scripts/delete-from-buckets.ts my-tl.json` | `npx tsx scripts\delete-from-buckets.ts my-tl.json` |

---

## Examples

### 1  Upload a new timeline and kick off a remote render

```bash
# 1. Upload timeline
TL_URL=$( npx tsx scripts/upload-timeline.ts timeline.json | awk '/https/ {print $NF}' )

# 2. Call RunPod endpoint (example)
curl -X POST \
     -H "Authorization: Bearer $API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"input": {"timelineUrl": "' 