# Deploy Sinema AI Studio

Aplikasi ini **bukan situs statis**. Selain menyajikan berkas di `public/`, `server.js`
juga menjadi perantara (proxy) ke penyedia AI supaya browser bebas dari galat CORS.
Karena itu ia harus berjalan sebagai **proses Node yang hidup terus**.

> **Jangan pakai GitHub Pages, Netlify, atau Vercel statis.** Ketiganya hanya menyajikan
> berkas statis, jadi `/api/ai/*` tidak ada. Akibatnya tombol AI gagal karena CORS dan
> kunci API ikut bocor dari browser. Pilih salah satu cara di bawah.

Tanpa dependensi: hanya Node.js 18+. Semua konfigurasi di repo ini sudah siap pakai.

---

## Pilihan cepat

| Cara | Butuh akun | Biaya | Catatan |
| --- | --- | --- | --- |
| **Render** (`render.yaml`) | Render | Ada paket gratis | Paling mudah; gratis tidur setelah ~15 menit menganggur |
| **Fly.io** (`fly.toml` + `Dockerfile`) | Fly.io | Ada kuota gratis | Perlu pasang CLI `flyctl` |
| **Railway** (`railway.json` + `Dockerfile`) | Railway | Kredit awal | Deploy dari GitHub, sedikit klik |
| **Koyeb** (`Dockerfile`) | Koyeb | Ada paket gratis | Pilih builder Dockerfile |
| **VPS sendiri** (`Dockerfile`) | VPS | Sewa bulanan | Kontrol penuh, pakai domain sendiri |

---

## 1. Render (paling mudah)

1. Masuk ke [render.com](https://render.com) lalu hubungkan akun GitHub Anda.
2. **New +** → **Blueprint** → pilih repo `alif121727/deskop-video`.
3. Render membaca `render.yaml` dan menyiapkan layanan web otomatis. Tekan **Apply**.
4. Tunggu build selesai. Tautan permanen muncul di atas, misalnya
   `https://sinema-ai-studio.onrender.com`.

Paket gratis tidur setelah ~15 menit tanpa trafik. Saat dibuka lagi, tunggu ~1 menit.

---

## 2. Fly.io

```bash
# Pasang flyctl sekali: https://fly.io/docs/flyctl/install/
fly auth login
fly launch --no-deploy   # ikuti panduan, pakai fly.toml yang sudah ada
fly deploy
fly open                 # buka tautan aplikasi
```

Berkas `fly.toml` sudah menyetel `internal_port = 8080` dan health check ke
`/api/health`. Mesin berhenti sendiri saat menganggur dan hidup lagi saat diakses.

---

## 3. Railway

1. [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**.
2. Pilih repo `alif121727/deskop-video`. Railway membaca `railway.json` dan memakai
   `Dockerfile`.
3. Setelah selesai, buka **Settings → Networking → Generate Domain** untuk tautan publik.

---

## 4. Koyeb

1. [koyeb.com](https://koyeb.com) → **Create Service** → **GitHub**.
2. Pilih repo, lalu pilih builder **Dockerfile**. Port: **12000** (atau biarkan Koyeb
   menyuntikkan `PORT` sendiri).
3. Deploy. Koyeb memberi domain `*.koyeb.app`.

---

## 5. VPS sendiri (Docker)

```bash
git clone https://github.com/alif121727/deskop-video.git
cd deskop-video
docker build -t sinema-ai-studio .
docker run -d --name sinema --restart unless-stopped -p 12000:12000 sinema-ai-studio
```

Buka `http://IP-SERVER:12000`. Untuk domain + HTTPS, taruh Nginx atau Caddy di depannya.

Tanpa Docker:

```bash
git clone https://github.com/alif121727/deskop-video.git
cd deskop-video
PORT=12000 npm start
```

Supaya tetap hidup setelah sesi SSH ditutup, jalankan lewat `systemd` atau `pm2`.

---

## Variabel lingkungan

| Nama | Bawaan | Keterangan |
| --- | --- | --- |
| `PORT` | `12000` | Port HTTP. Sebagian besar platform menyuntikkan nilainya sendiri. |
| `HOST` | `0.0.0.0` | Antarmuka bind. Biarkan apa adanya di dalam wadah. |

Tidak ada variabel rahasia. **Kunci API tidak disimpan di server** — diisi pengguna di
tab **Pengaturan** dan hanya hidup di penyimpanan browser perangkatnya.

---

## Pemeriksaan setelah deploy

```bash
curl https://TAUTAN-ANDA/api/health
# {"ok":true,"port":...,"now":"..."}
```

Buka tautannya di browser, lalu:

1. Tab **Pengaturan** → tempel kunci Google AI Studio (perlu akses Veo) → **Uji kunci**.
2. Tab **Studio** → isi slot S.C.E.N.E. → **▶ Buat video sekarang**.

Kalau muncul **"Tidak bisa menghubungi server"**, berarti proses Node-nya mati atau
sedang bangun dari tidur — muat ulang halaman sebentar lagi.

---

## Deploy ulang

Semua platform di atas menarik dari cabang `main`. Cukup `git push` ke `main`, dan
platform akan membangun ulang otomatis (kecuali VPS — jalankan `docker build` +
`docker run` lagi).
