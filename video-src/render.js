#!/usr/bin/env node
/**
 * Render film.html menjadi MP4 deterministik.
 * Setiap frame digambar lewat window.renderAt(t) lalu dikirim ke ffmpeg
 * sebagai PNG melalui stdin (image2pipe). Tidak ada timing runtime.
 */
const puppeteer = require('puppeteer-core');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const FPS = 30;
const DURATION = 60;
const W = 1920;
const H = 1080;
const TOTAL_FRAMES = FPS * DURATION;
const FFMPEG = process.env.FFMPEG || '/tmp/bin/ffmpeg';
const OUT = process.argv[2] || path.join(__dirname, 'warung-go-digital.mp4');
const CHROME = process.env.CHROME || '/usr/bin/chromium';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'shell',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--force-color-profile=srgb',
      '--font-render-hinting=none',
      `--window-size=${W},${H}`,
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
  await page.goto('file://' + path.join(__dirname, 'film.html'), { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await new Promise((r) => setTimeout(r, 400));

  const ffmpeg = spawn(FFMPEG, [
    '-y',
    '-f', 'image2pipe',
    '-framerate', String(FPS),
    '-vcodec', 'png',
    '-i', '-',
    '-c:v', 'libx264',
    '-preset', 'slow',
    '-crf', '18',
    '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
    OUT,
  ], { stdio: ['pipe', 'inherit', 'inherit'] });

  let ffErr = null;
  ffmpeg.on('error', (e) => { ffErr = e; });

  const writeFrame = (buf) => new Promise((resolve) => {
    const ok = ffmpeg.stdin.write(buf);
    if (ok) resolve(); else ffmpeg.stdin.once('drain', resolve);
  });

  const t0 = Date.now();
  for (let f = 0; f < TOTAL_FRAMES; f++) {
    const t = f / FPS;
    await page.evaluate((tt) => window.renderAt(tt), t);
    const buf = await page.screenshot({ type: 'png', optimizeForSpeed: true });
    await writeFrame(buf);
    if (f % 150 === 0 || f === TOTAL_FRAMES - 1) {
      const done = f + 1;
      const pct = ((done / TOTAL_FRAMES) * 100).toFixed(1);
      const secs = (Date.now() - t0) / 1000;
      const eta = secs / done * (TOTAL_FRAMES - done);
      process.stdout.write(`\rframe ${done}/${TOTAL_FRAMES} (${pct}%) ~${eta.toFixed(0)}s sisa   `);
    }
  }
  process.stdout.write('\n');

  await new Promise((resolve, reject) => {
    ffmpeg.on('close', (code) => code === 0 ? resolve() : reject(new Error('ffmpeg keluar dengan kode ' + code)));
    ffmpeg.stdin.end();
    if (ffErr) reject(ffErr);
  });

  await browser.close();
  const size = fs.statSync(OUT).size;
  console.log(`Selesai: ${OUT} (${(size / 1024 / 1024).toFixed(2)} MB) dalam ${((Date.now() - t0) / 1000).toFixed(0)}s`);
})().catch((e) => { console.error(e); process.exit(1); });
