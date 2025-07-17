const http = require('node:http');
const { exec } = require('node:child_process');

const PORT = process.env.PORT || 8080;

const server = http.createServer((req, res) => {
  if (req.method !== 'POST' || req.url !== '/transcode') {
    res.writeHead(404);
    return res.end('Not found');
  }

  let body = '';
  req.on('data', (chunk) => (body += chunk));
  req.on('end', () => {
    try {
      const { inputUrl, outputUrl } = JSON.parse(body.toString());
      if (!inputUrl || !outputUrl) throw new Error('Invalid JSON');

      // ffmpeg command to 360p H.264 fast proxy
      const cmd = `ffmpeg -y -i "${inputUrl}" -vf scale=w=640:h=-2 -r 30 -g 15 -c:v libx264 -preset veryfast -crf 28 -c:a aac -movflags +faststart -pix_fmt yuv420p -profile:v baseline -level 3.0 -f mp4 "${outputUrl}"`;
      console.log('Running', cmd);
      exec(cmd, (err, stdout, stderr) => {
        if (err) {
          console.error(stderr);
          res.writeHead(500);
          res.end('ffmpeg failed');
          return;
        }
        console.log('Done');
        res.writeHead(200);
        res.end('ok');
      });
    } catch (e) {
      res.writeHead(400);
      res.end('Bad Request');
    }
  });
});

server.listen(PORT, () => {
  console.log('FFmpeg proxy server listening on', PORT);
}); 