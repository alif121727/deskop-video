# Sinema AI Studio — wadah produksi.
#
# Aplikasi ini TIDAK bisa dihosting sebagai situs statis (GitHub Pages,
# Netlify, Vercel statis) karena server.js juga menjadi perantara (proxy)
# ke penyedia AI supaya bebas CORS. Jadi harus proses Node yang berjalan.
#
# Uji lokal:
#   docker build -t sinema-ai-studio .
#   docker run --rm -p 12000:12000 sinema-ai-studio

FROM node:20-alpine

ENV NODE_ENV=production
WORKDIR /app

# Tanpa dependensi: cukup berkas sumber, tidak perlu npm install.
COPY package.json ./
COPY server.js ./
COPY public ./public

# Nilai bawaan. Platform (Render/Railway/Koyeb) biasanya menyuntikkan PORT
# sendiri dan akan menimpa nilai ini.
ENV PORT=12000
EXPOSE 12000

# Jalankan sebagai pengguna tanpa hak istimewa.
USER node

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/api/health" >/dev/null 2>&1 || exit 1

CMD ["node", "server.js"]
