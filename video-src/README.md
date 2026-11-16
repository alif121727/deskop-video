# Sumber video "Tugas Video – Alif Fadilah Raditya"

Video dibuat **dengan kode** (bukan generator video AI), supaya teks tajam dan
durasi penuh 60 detik. Isi folder ini:

- `film.html` — seluruh animasi (9 adegan, 1920x1080). Fungsi `window.renderAt(t)`
  menggambar keadaan pada detik `t` secara deterministik.
- `render.js` — ambil 1800 frame (60s x 30fps) lewat Chromium headless, pipa PNG
  ke ffmpeg (libx264, crf 18).
- `audio.py` — buat `audio.wav` (pad hangat + whoosh + pop, tanpa vokal).
- `fonts/` — Inter (400/600/700/800/900), agar tidak bergantung font sistem.

## Cara render ulang

```bash
pip install imageio-ffmpeg && cp "$(python3 -c 'import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())')" /tmp/bin/ffmpeg
npm install puppeteer-core@23
node render.js out.mp4                      # 1800 frame, ~9 menit
python3 audio.py                            # audio.wav 60 detik
ffmpeg -i out.mp4 -i audio.wav -c:v copy -c:a aac -b:a 192k -shortest warung-final.mp4
```

Butuh Chromium di `/usr/bin/chromium` (atau set `CHROME`) dan ffmpeg (atau set `FFMPEG`).
