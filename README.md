# Sinema AI Studio

Studio produksi video AI untuk konten media sosial: menyusun prompt yang siap tempel,
memecah cerita menjadi klip bersambung, lalu mengubahnya menjadi pendapatan.

Dibuat untuk kebutuhan nyata pembuat konten: membuat klip 4–8 detik dengan model
video AI (Veo, Kling, Luma, Runway, Firefly), menghindari artefak seperti gerakan
aneh dan produk yang berubah bentuk, lalu mengunggahnya sebagai stok video atau
konten media sosial.

## Menjalankan

```bash
npm start            # default port 12000
PORT=12001 npm start # port lain
```

Buka `http://localhost:12000`. Tanpa dependensi: hanya Node.js 18+.

## Tujuh bagian

| Bagian | Isinya |
| --- | --- |
| **Studio** | Lima slot S.C.E.N.E. (Subject, Context, Event, Nuance, Exclusions), isian cepat placeholder, pengaturan rasio/durasi, isyarat suara, lalu prompt akhir dengan pemeriksaan mutu. |
| **Pustaka Template** | 25 template video siap isi (produk, UGC, cerita merek, khusus platform, khusus industri, teknik lanjutan), plus template gambar dan teks. |
| **Papan Cerita** | Memecah cerita menjadi klip 4/6/8 detik. Kunci kontinuitas mengulang deskripsi subjek dengan kata yang sama persis di setiap klip. |
| **Rencana & Cuan** | Pemilihan niche, jadwal produksi 30 hari, tujuh jalur pendapatan, dan ukuran keberhasilan yang bisa diperiksa. |
| **Panduan Prompt** | Kerangka S.C.E.N.E., empat kebiasaan bahasa Indonesia yang menyesatkan, cara menulis suara, dan pemeriksa prompt interaktif. |
| **Proyek** | Semua yang disimpan, tersimpan di browser. Bisa diekspor sebagai cadangan JSON. |
| **Pengaturan** | Kunci API dan profil merek. Kunci disimpan di perangkat Anda sendiri. |

## Kunci API

Kunci API dimasukkan di tab **Pengaturan** dan disimpan di penyimpanan browser
perangkat ini, bukan di server. Kunci dikirim dari browser pada setiap permintaan
ke penyedia AI, dipakai sekali, lalu dibuang.

- **Google Gemini / Veo** — untuk teks dan video. Perlu akses Veo.
- **OpenAI atau penyedia kompatibel** — untuk teks saja.

Tanpa kunci pun Studio tetap berguna: susun prompt, lalu salin ke tool video
pilihan Anda.

## Bagaimana kunci kontinuitas bekerja

Model video tidak mengingat klip sebelumnya. Karena itu deskripsi subjek diulang
dengan kata yang sama persis di setiap klip, bukan diganti menjadi "perempuan tadi".
Saat Anda mengubah kalimat kunci, seluruh pratinjau prompt klip ikut diperbarui.

## Struktur berkas

```
server.js                 server statis + proksi penyedia AI
public/index.html         kerangka aplikasi
public/css/app.css        tampilan
public/js/app.js          perutean dan kerangka halaman
public/js/state.js        keadaan bersama antar tab
public/js/data/           template, rencana, batas klip, isyarat suara
public/js/lib/            penyusun prompt, penyimpanan, klien AI, utilitas
public/js/views/          satu berkas per tab
```

## Batas yang perlu diketahui

- Satu klip Veo hanya 4, 6, atau 8 detik. Rasio 16:9 dan 9:16. Hasil disimpan
  di server penyedia selama dua hari — unduh segera.
- Setiap angka dan klaim pada konten promosi menjadi tanggung jawab Anda. Prompt
  yang baik melarang model menambahkan spesifikasi yang tidak Anda sebutkan.
- Selalu centang label konten generatif AI saat mengunggah, dan jangan memakai
  wajah selebritas, karakter berhak cipta, atau merek dagang terkenal.
