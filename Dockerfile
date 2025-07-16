FROM node:20-bullseye-slim

# -------------------------------------------------------------
# System dependencies required for Remotion headless rendering
# -------------------------------------------------------------
# 1. ffmpeg        – video encoding/decoding
# 2. chromium & libs – Puppeteer / Remotion renderer browser
# 3. Fonts         – default fallback + emoji support
RUN apt-get update && apt-get install -y \
    ffmpeg \
    chromium \
    wget \
    ca-certificates \
    fonts-noto-color-emoji \
    # Puppeteer/Chromium runtime deps
    libglib2.0-0 libnss3 libxss1 libasound2 libatk-bridge2.0-0 \
    libgtk-3-0 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 \
    libxdamage1 libxrandr2 libxkbcommon0 libdrm2 libxext6 libgbm1 \
    libpango-1.0-0 libpangocairo-1.0-0 libatspi2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# -------------------------------------------------------------
# Create app directory & install NPM deps
# -------------------------------------------------------------
WORKDIR /app

# Copy package manifests first for better build caching
COPY package*.json ./

# Install **all** deps (including dev) because the worker relies on tsx
RUN npm ci --ignore-scripts

# Copy the rest of the project
COPY . .

# -------------------------------------------------------------
# Default command = invoke the TypeScript render worker
# Pass-through of CLI args lets callers specify props/output paths
# Example:
#   docker run --rm -v "$PWD:/data" render-worker timeline.json out/video.mp4
# -------------------------------------------------------------
ENTRYPOINT ["npx", "tsx", "scripts/render-worker.ts"] 