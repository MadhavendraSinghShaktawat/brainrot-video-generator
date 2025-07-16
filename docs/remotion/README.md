# Remotion – Developer Guide

This folder collects the minimal docs you need to preview and render **Json-driven videos** without hunting through chat history.

---

## 1  Preview / Studio (local)

### One-liner (Windows / PowerShell)
```powershell
npx remotion preview --composition=JsonDrivenVideo --props="D:\Startup\Social Shifu\brainrot-video-generator\timeline.json"
```
*(Copy-paste exactly as shown; keep the equals signs and the escaped path in quotes.)*

* **`--composition`** – The ID defined in `remotion/index.tsx`.
* **`--props`** – Path to a JSON file. On Windows you must pass a **file**, not an inline JSON string, and you must use an **equals sign**.

Once the server is up it opens `http://localhost:3000`.

### Hot-reloading timeline
If you keep the Studio open and modify `timeline.json`, Remotion automatically reloads the props.

### Editing props in the UI
Click the **Props** button (top-right). You can tweak numbers / text live, then **Save default props** if you want to persist them.

---

## 2  Timeline JSON schema

```jsonc
{
  "timeline": {
    "fps": 30,
    "width": 1920,
    "height": 1080,
    "background": "#000000",   // optional (default black)
    "events": [
      {
        "id": "caption-1",      // unique
        "type": "caption",      // video | audio | image | caption
        "text": "Hello",        // caption only
        "src": "…/clip.mp4",    // video/image/audio only
        "start": 0,              // frame index
        "end": 150,
        "layer": 1,              // optional – higher = on top
        "style": { "fontSize": 80, "color": "#fff" }
      }
    ]
  }
}
```

Frame numbers = seconds × fps (e.g. 5 s @ 30 fps ⇒ 150).

---

## 3  RunPod render-worker

The container entry-point already understands both **local** and **remote** timeline paths:

```bash
# inside container
tsx scripts/render-worker.ts <timelinePath|URL> <outFile> [compositionId]
```

Examples:
```bash
# Remote JSON in GCS
tsx scripts/render-worker.ts \
  "https://storage.googleapis.com/brainrot-timelines/my.json" \
  /workspace/out/video.mp4

# Mounted local file (during development)
tsx scripts/render-worker.ts /data/timeline.json /data/out/video.mp4
```

The worker prints the version banner and uploads the MP4 to the configured GCS bucket.

---

## 4  Troubleshooting checklist

1. **Still seeing “Hello Remotion!”?**   Ensure you used `--props=` not `--props-file=`.
2. **Props show an empty `events` array?**   Double-check the JSON path – Studio prints the full props in DevTools.
3. **Upload fails in RunPod?**   Verify the three GCS env vars are marked ✅ in the worker’s startup log.

---

## 5  Handy terminal commands

| Task | Command |
|------|---------|
| **Preview in Studio (load timeline)** | `npx remotion preview --composition=JsonDrivenVideo --props="D:\Startup\Social Shifu\brainrot-video-generator\timeline.json"` |
| **Render locally to MP4** | `npx tsx scripts/render-worker.ts timeline.json out/video.mp4` |
| **Build Docker image** | `docker build -t buildwithmadhav/brainrot-render:latest .` |
| **Push image to Docker Hub** | `docker push buildwithmadhav/brainrot-render:latest` |
| **Run container locally (mount data folder)** | `docker run --rm -v %cd%:/data buildwithmadhav/brainrot-render:latest /data/timeline.json /data/out/video.mp4` |

Replace paths and tags as needed for your environment. 