/**
 * Data untuk rencana konten dan jalur pendapatan.
 *
 * Bagian ini yang membedakan studio ini dari sekadar kumpulan prompt:
 * template menghasilkan video, rencana di bawah menentukan video mana
 * yang layak dibuat dan dari mana uangnya datang.
 */

/** Batas teknis yang harus dipatuhi supaya hasil tidak terasa terpotong. */
export const VIDEO_LIMITS = {
  durations: [4, 6, 8],
  note: 'Satu klip Veo hanya 4, 6, atau 8 detik. Durasi 8 detik hanya tersedia pada resolusi 1080p/4K atau saat menyertakan gambar acuan.',
  aspects: ['16:9', '9:16'],
  retention: 'Video hasil disimpan di server selama dua hari sebelum dihapus. Unduh segera.',
  continuity:
    'Model tidak mengingat klip sebelumnya. Deskripsi subjek harus diulang dengan kata yang sama persis di setiap klip.',
};

/** Tiga jenis isyarat suara di dalam prompt video. */
export const AUDIO_CUES = [
  {
    key: 'dialog',
    label: 'Dialog',
    rule: 'Ditulis di dalam tanda kutip, lengkap dengan siapa yang mengucapkannya.',
    example: '"Alamatnya benar, tapi namanya beda satu huruf," kata kurir itu.',
    exampleEn: '"This must be the key," he murmured.',
  },
  {
    key: 'sfx',
    label: 'Efek suara',
    rule: 'Dideskripsikan secara eksplisit sebagai bunyi, bukan disiratkan lewat gambar.',
    example: 'Terdengar suara plastik pembungkus yang diremas dan derak pintu.',
    exampleEn: 'tires screeching loudly, engine roaring',
  },
  {
    key: 'ambience',
    label: 'Suara latar',
    rule: 'Ditulis sebagai gambaran lanskap suara ruangannya.',
    example: 'Dengung samar dan menyeramkan bergema di latar belakang.',
    exampleEn: 'A faint, eerie hum resonates in the background.',
  },
];

/** Empat kebiasaan bahasa Indonesia yang membuat instruksi bermakna ganda. */
export const LANGUAGE_FIXES = [
  {
    problem: 'Kata kerja yang tidak menentukan hasil',
    detail:
      '"Buatkan", "susun", "perbaiki", dan "periksa" menghasilkan pekerjaan yang berbeda.',
    wrong: 'Perbaiki paragraf ini',
    right: 'Periksa paragraf ini dan sebutkan apa yang salah',
    why: '"Perbaiki" membuat model menulis ulang. "Periksa" membuatnya menahan diri dan hanya menunjukkan temuan.',
  },
  {
    problem: 'Jumlah yang tidak ditandai',
    detail: 'Bahasa Indonesia tidak menandai bentuk jamak, sehingga jumlahnya harus disebut.',
    wrong: 'Buatkan variasi judul',
    right: 'Buatkan tiga variasi judul',
    why: 'Tanpa angka, model memilih jumlahnya sendiri.',
  },
  {
    problem: 'Kata penilaian tanpa ukuran',
    detail: '"Menarik", "estetik", dan "profesional" berarti berbeda bagi tiap orang, termasuk bagi model.',
    wrong: 'Buat desain yang menarik',
    right: 'Gunakan warna biru tua dan putih, maksimal 40 kata, tanpa istilah teknis',
    why: 'Ukuran yang bisa diperiksa menggantikan selera yang tidak bisa diperiksa.',
  },
  {
    problem: 'Angka dan satuan yang disingkat',
    detail: 'Satuan yang samar akan ditebak, dan tebakan itu ikut masuk ke hasil.',
    wrong: 'Harga 89 ribuan, ukuran sedang',
    right: 'Harga Rp89.000, kemasan 200 gram',
    why: 'Tulis lengkap. Tebakan model tidak bisa diperiksa.',
  },
];

/** Preset niche: dari produk apa uangnya datang dan bagaimana caranya. */
export const NICHES = [
  {
    id: 'affiliate',
    name: 'Affiliate Produk',
    hook: 'Produk murah, masalah jelas, solusi terlihat dalam 8 detik.',
    templates: ['talking-head', 'tiktok-hook', 'product-in-use'],
    monetize: [
      'Komisi marketplace (Shopee/TikTok Shop) 5–20% per penjualan',
      'Link affiliate di bio + keranjang kuning',
      'Konten ulasan berbayar setelah ada 5.000 pengikut',
    ],
    moneyMath:
      'Produk Rp89.000, komisi 10% = Rp8.900 per penjualan. Seratus penjualan sebulan = Rp890.000 dari satu video yang sudah jadi.',
    cadence: '1 video per hari, 3 varian hook per produk.',
    caution:
      'Setiap angka dan klaim menjadi tanggung jawab Anda. Larang model menambah spesifikasi di prompt.',
  },
  {
    id: 'kuliner',
    name: 'Kuliner & UMKM Makanan',
    hook: 'Uap, tekstur, dan satu suapan yang membuat orang lapar.',
    templates: ['food', 'product-in-use', 'before-after'],
    monetize: [
      'Iklan berbayar untuk warung dan katering sekitar (Rp300.000–1.500.000 per paket)',
      'Komisi pesanan dari tautan pesan-antar',
      'Konten resep bersponsor merek bumbu atau peralatan dapur',
    ],
    moneyMath:
      'Satu paket iklan untuk lima UMKM sebulan, masing-masing Rp500.000, menghasilkan Rp2.500.000 dengan footage yang bisa dipakai ulang per kategori produk.',
    cadence: '3 video per minggu, satu per kategori menu.',
    caution:
      'Makanan yang tidak beruap terlihat dingin. Selalu sebut steam atau asap di prompt.',
  },
  {
    id: 'fashion',
    name: 'Fesyen & Kecantikan',
    hook: 'Satu look, satu gerakan percaya diri, warna produk yang akurat.',
    templates: ['fashion-beauty', 'luxury', 'reel-hook'],
    monetize: [
      'Konten lookbook berbayar untuk label lokal',
      'Komisi afiliasi kosmetik 10–25%',
      'Paket bulanan konten untuk satu merek (retainer)',
    ],
    moneyMath:
      'Retainer konten 12 video sebulan untuk satu merek lokal Rp4.000.000–8.000.000, dengan template yang sama dan talenta yang diganti.',
    cadence: '4 video per minggu, 2 lookbook dan 2 ulasan.',
    caution:
      'Klien paling sering mengeluh soal warna produk. Sebut color grading sejak baris pertama prompt.',
  },
  {
    id: 'properti',
    name: 'Properti & Interior',
    hook: 'Kamera berjalan seperti calon pembeli, cahaya alami dari jendela.',
    templates: ['real-estate', 'cinematic-broll', 'multi-scene'],
    monetize: [
      'Paket teaser per unit (Rp750.000–2.000.000)',
      'Langganan bulanan untuk agen dengan banyak listing',
      'Komisi rujukan dari agen yang videonya menghasilkan pembeli',
    ],
    moneyMath:
      'Sepuluh listing sebulan dengan tarif Rp900.000 = Rp9.000.000. Footage b-roll kawasan bisa dipakai ulang untuk semua listing.',
    cadence: 'Sesuai listing, minimal 2 video per minggu.',
    caution:
      'Ruangan kosong terasa lebih kecil. Minta beberapa perabot supaya proporsinya terbaca.',
  },
  {
    id: 'edukasi',
    name: 'Edukasi & Kursus',
    hook: 'Satu masalah nyata, satu penjelasan yang bisa ditonton tanpa suara.',
    templates: ['shorts-hook', 'app-demo', 'talking-head'],
    monetize: [
      'Penjualan kelas atau e-book dari tautan bio',
      'Konten penjelas berbayar untuk platform kursus',
      'Program afiliasi produk belajar (lampu, tablet, alat tulis)',
    ],
    moneyMath:
      'Kelas Rp149.000 dengan konversi 1% dari 10.000 tayangan = 100 pembeli = Rp14.900.000 dari satu rangkaian video evergreen.',
    cadence: '1 video pendek per hari, 1 video panjang per minggu.',
    caution:
      'Untuk pekerjaan akademik, bahaya terbesarnya bukan hasil buruk melainkan hasil rapi tapi salah. Larang model menyebut sumber.',
  },
  {
    id: 'jasa',
    name: 'Jasa Lokal & B2B',
    hook: 'Sebelum–sesudah pekerjaan, dengan bukti yang bisa dipercaya.',
    templates: ['before-after', 'app-demo', 'founder-authentic'],
    monetize: [
      'Paket konten bulanan untuk bisnis lokal (Rp2.000.000–6.000.000)',
      'Iklan berbayar per kampanye',
      'Video pendiri untuk membangun kepercayaan sebelum penjualan',
    ],
    moneyMath:
      'Tiga klien retainer Rp2.500.000 = Rp7.500.000 sebulan, dikerjakan dengan enam template yang sama dan produk yang diganti.',
    cadence: 'Sesuai klien, 2 video per klien per minggu.',
    caution:
      'Video pendiri berhasil karena terasa asli. Ruang kerja asli mengalahkan studio yang bercahaya berlebih.',
  },
];

/** Jadwal 30 hari: pola produksi yang bisa diulang setiap bulan. */
export const CONTENT_PLAN = [
  { day: 1, type: 'Hook', template: 'tiktok-hook', goal: 'Uji tiga hook berbeda untuk satu produk' },
  { day: 2, type: 'Bukti', template: 'product-in-use', goal: 'Tunjukkan produk dipakai secara natural' },
  { day: 3, type: 'Cerita', template: 'founder-authentic', goal: 'Bangun alasan mempercayai merek' },
  { day: 4, type: 'Hook', template: 'reel-hook', goal: 'Varian vertikal untuk penonton tanpa suara' },
  { day: 5, type: 'Bukti', template: 'before-after', goal: 'Tunjukkan perubahan yang dipercaya' },
  { day: 6, type: 'Detail', template: 'rotation-360', goal: 'Jawab keraguan soal bentuk dan bahan' },
  { day: 7, type: 'Evaluasi', template: null, goal: 'Lihat data: hook mana yang paling ditonton habis' },
  { day: 8, type: 'Hook', template: 'tiktok-hook', goal: 'Ulangi hook terbaik dengan produk berbeda' },
  { day: 9, type: 'Produk', template: 'product-hero', goal: 'Bahan untuk halaman jualan dan iklan berbayar' },
  { day: 10, type: 'Cerita', template: 'emotional-story', goal: 'Sisipkan produk ke dalam cerita nyata' },
  { day: 11, type: 'Bukti', template: 'unboxing', goal: 'Tingkatkan kesan harga produk' },
  { day: 12, type: 'Hook', template: 'shorts-hook', goal: 'Perpanjang jangkauan ke YouTube' },
  { day: 13, type: 'Detail', template: 'cinematic-broll', goal: 'Footage pendukung untuk semua video' },
  { day: 14, type: 'Evaluasi', template: null, goal: 'Tandai dua video terbaik, jadikan acuan gaya' },
  { day: 15, type: 'Hook', template: 'tiktok-hook', goal: 'Sudut penawaran baru dari produk yang sama' },
  { day: 16, type: 'Produk', template: 'product-in-use', goal: 'Varian lokalisasi: ganti talenta dan latar' },
  { day: 17, type: 'Cerita', template: 'motivational', goal: 'Uji energi tinggi untuk audiens baru' },
  { day: 18, type: 'Bukti', template: 'before-after', goal: 'Versi kedua dengan masalah berbeda' },
  { day: 19, type: 'Hook', template: 'reel-hook', goal: 'Uji pembuka tanpa produk di detik pertama' },
  { day: 20, type: 'Detail', template: 'app-demo', goal: 'Jelaskan cara pakai dalam dua fitur saja' },
  { day: 21, type: 'Evaluasi', template: null, goal: 'Hitung biaya per video dan waktu per video' },
  { day: 22, type: 'Hook', template: 'tiktok-hook', goal: 'Pembuka musiman atau peristiwa terkini' },
  { day: 23, type: 'Produk', template: 'seasonal', goal: 'Siapkan bahan kampanye musim berikutnya' },
  { day: 24, type: 'Cerita', template: 'luxury', goal: 'Naikkan kesan premium untuk harga lebih tinggi' },
  { day: 25, type: 'Bukti', template: 'talking-head', goal: 'Ulasan jujur, termasuk satu kekurangan' },
  { day: 26, type: 'Hook', template: 'youtube-preroll', goal: 'Versi horizontal untuk iklan berbayar' },
  { day: 27, type: 'Detail', template: 'style-transfer', goal: 'Selaraskan look dengan merek klien' },
  { day: 28, type: 'Evaluasi', template: null, goal: 'Pilih tiga video untuk dijadikan template tetap' },
  { day: 29, type: 'Produk', template: 'localization', goal: 'Siapkan versi multi-pasar dari video terbaik' },
  { day: 30, type: 'Cerita', template: 'multi-scene', goal: 'Susun satu cerita utuh dari footage yang sudah ada' },
];

/** Tujuh jalur pendapatan, dari yang paling cepat dimulai. */
export const MONETIZATION_PATHS = [
  {
    id: 'affiliate',
    name: 'Afiliasi produk',
    timeToMoney: '1–7 hari',
    effort: 'Rendah',
    detail:
      'Buat video ulasan satu produk, taruh tautan afiliasi di bio. Komisi dibayar per penjualan.',
    firstStep: 'Pilih satu produk di bawah Rp150.000 yang masalahnya mudah dilihat.',
  },
  {
    id: 'adsense',
    name: 'Dana kreator platform',
    timeToMoney: '30–90 hari',
    effort: 'Sedang',
    detail:
      'Unggah video pendek secara rutin sampai memenuhi ambang penayangan platform (Reels, Shorts, TikTok).',
    firstStep: 'Unggah satu video per hari selama 30 hari dengan pola dari tab Rencana.',
  },
  {
    id: 'iklan',
    name: 'Iklan berbayar untuk UMKM',
    timeToMoney: '7–30 hari',
    effort: 'Sedang',
    detail:
      'Tawarkan paket lima video untuk satu usaha lokal. Anda dibayar per paket, bukan per penjualan.',
    firstStep: 'Susun portofolio tiga video contoh untuk satu kategori usaha.',
  },
  {
    id: 'retainer',
    name: 'Konten bulanan (retainer)',
    timeToMoney: '14–45 hari',
    effort: 'Tinggi',
    detail:
      'Satu merek membayar tetap setiap bulan untuk sejumlah video. Pendapatan paling stabil.',
    firstStep: 'Tentukan paket: 8 video per bulan dengan dua kali revisi.',
  },
  {
    id: 'jasa-ai',
    name: 'Jasa pembuatan video AI',
    timeToMoney: '7–30 hari',
    effort: 'Sedang',
    detail:
      'Klien memberi bahan mentah, Anda mengubahnya jadi video jadi. Cocok untuk agen properti dan pemilik toko.',
    firstStep: 'Pasang harga per video, bukan per jam. Rp250.000–750.000 per video pendek.',
  },
  {
    id: 'produk-digital',
    name: 'Produk digital',
    timeToMoney: '30–90 hari',
    effort: 'Tinggi',
    detail:
      'Jual preset, template, atau panduan yang lahir dari proses Anda sendiri.',
    firstStep: 'Kumpulkan sepuluh template prompt terbaik yang sudah terbukti.',
  },
  {
    id: 'kelas',
    name: 'Kelas atau bimbingan',
    timeToMoney: '45–120 hari',
    effort: 'Tinggi',
    detail:
      'Ajarkan proses ini ke pemilik usaha lokal. Harga kelas lebih tinggi daripada video satuan.',
    firstStep: 'Rekam satu kelas dua jam dari alur kerja tab Studio.',
  },
];

/** Ukuran keberhasilan: apa yang diperiksa, bukan apa yang dirasakan. */
export const METRICS = [
  {
    label: 'Tiga detik pertama',
    target: '> 60% penonton masih menonton',
    why: 'Kalau angka ini rendah, masalahnya di hook, bukan di produk.',
  },
  {
    label: 'Ditonton sampai habis',
    target: '> 40% untuk video di bawah 15 detik',
    why: 'Video panjang dipecah jadi klip pendek kalau angka ini rendah.',
  },
  {
    label: 'Rasio simpan dan bagikan',
    target: '> 2% dari penayangan',
    why: 'Ini penanda bahwa videonya berguna, bukan hanya lewat.',
  },
  {
    label: 'Biaya per video',
    target: 'Catat biaya kredit AI dibagi jumlah video yang dipakai',
    why: 'Angka ini yang menentukan harga jasa Anda berikutnya.',
  },
];
