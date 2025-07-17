# syntax=docker/dockerfile:1
FROM node:20-slim

# Install ffmpeg (no GUI deps)
RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg ca-certificates && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY server.js ./

ENV PORT=8080

EXPOSE 8080

CMD ["node", "server.js"] 