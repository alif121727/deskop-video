/**
 * Pustaka template prompt video AI.
 *
 * Setiap template punya:
 *   id, name, tagline, category, duration, aspects[], platforms[]
 *   scene: slot S.C.E.N.E. (subject, context, event, nuance, exclusions)
 *   base:  prompt bahasa Inggris siap pakai (mengikuti konvensi tool video)
 *   tips:  catatan singkat kenapa prompt ini ditulis begitu
 *   locked: slot yang sebaiknya tidak diubah saat membuat varian
 */

export const CATEGORIES = [
  { id: 'produk', label: 'Produk & E-commerce' },
  { id: 'ugc', label: 'Gaya UGC Sosial' },
  { id: 'brand', label: 'Cerita Merek' },
  { id: 'platform', label: 'Khusus Platform' },
  { id: 'industri', label: 'Khusus Industri' },
  { id: 'lanjutan', label: 'Teknik Lanjutan' },
];

export const TEMPLATES = [
  {
    id: 'product-hero',
    name: 'Product Hero',
    tagline: 'Satu produk, satu gerakan kamera, komposisi bersih.',
    category: 'produk',
    duration: 8,
    aspects: ['16:9', '1:1', '9:16'],
    platforms: ['Landing page', 'Peluncuran produk', 'Paid social'],
    locked: ['subject', 'nuance'],
    scene: {
      subject: '[produk] on [surface/background]',
      context: '[brand style] lighting, clean composition, subtle background motion',
      event: 'The product stays centered while the camera slowly pushes in.',
      nuance: 'Make the product feel [premium/practical/playful/minimal].',
      exclusions: 'distorted labels, extra products, fake logos, unreadable text, clutter',
    },
    base:
      'Create an {duration}-second product hero video of {subject}. {event} Use {context}. The video should {nuance} Keep the product shape, color, label, and packaging consistent. Avoid {exclusions}.',
    tips:
      'Kunci subjek dan gerakan kamera. Saat klien minta permukaan lain, ganti hanya bagian permukaannya — hero shot-nya tetap utuh.',
  },
  {
    id: 'product-in-use',
    name: 'Produk Sedang Dipakai',
    tagline: 'Demonstrasi natural, bukan iklan yang terasa diiklankan.',
    category: 'produk',
    duration: 14,
    aspects: ['9:16', '1:1', '16:9'],
    platforms: ['Bukti sosial', 'Konten tutorial'],
    locked: ['subject'],
    scene: {
      subject: '[produk] used by [person description]',
      context: '[setting], natural and warm lighting',
      event:
        'The person picks up the product, uses it as intended, and shows subtle satisfaction.',
      nuance: 'Smooth handheld camera follows the action.',
      exclusions: 'exaggerated reactions, unrealistic settings, distorted product proportions',
    },
    base:
      'Show {subject} in {context}. {event} {nuance} Keep the product label readable throughout. Avoid {exclusions}.',
    tips:
      'Kepuasan yang "subtle" justru lebih meyakinkan. Reaksi berlebihan adalah tanda paling cepat bahwa penonton menutup video.',
  },
  {
    id: 'before-after',
    name: 'Sebelum–Sesudah',
    tagline: 'Transformasi yang dipercaya, bukan dilebih-lebihkan.',
    category: 'produk',
    duration: 11,
    aspects: ['9:16', '1:1'],
    platforms: ['Iklan masalah–solusi', 'Perawatan kulit', 'Pembersih'],
    locked: ['context'],
    scene: {
      subject: '[problem state] transforming to [solution state] using [produk]',
      context: 'Split-screen or time-lapse, consistent lighting throughout',
      event: 'Start close on the problem, show the product applied, reveal the result.',
      nuance: 'The transformation should feel believable, not exaggerated.',
      exclusions: 'fake comparisons, unrealistic timelines, sudden lighting changes',
    },
    base:
      'Create a {duration}-second split-screen or time-lapse video showing {subject}. {event} Use {context}. {nuance} Avoid {exclusions}.',
    tips:
      'Cahaya harus konsisten di kedua sisi. Kalau cahaya berubah, penonton membaca itu sebagai penipuan.',
  },
  {
    id: 'unboxing',
    name: 'Unboxing Premium',
    tagline: 'Tangan, kemasan, dan satu momen pengungkapan.',
    category: 'produk',
    duration: 18,
    aspects: ['9:16', '16:9'],
    platforms: ['Peluncuran produk', 'Positioning premium'],
    locked: ['nuance'],
    scene: {
      subject: '[produk] unboxing with hands opening the packaging',
      context: 'Soft directional lighting that creates depth',
      event:
        'Hands carefully open packaging, reveal the product, and lift it into frame. Camera starts overhead, then moves to eye level.',
      nuance: 'The packaging and product should feel premium and tactile.',
      exclusions: 'rushed movements, poorly lit shots, damaged-looking packaging',
    },
    base:
      'Film a {duration}-second unboxing sequence for {subject}. {event} Use {context}. {nuance} Avoid {exclusions}.',
    tips:
      'Kecepatan tangan menentukan kesan harga. Gerakan cepat membuat produk terasa murah, bahkan kalau kemasannya mahal.',
  },
  {
    id: 'rotation-360',
    name: 'Rotasi 360°',
    tagline: 'Produk diam di tengah, kamera yang bekerja.',
    category: 'produk',
    duration: 9,
    aspects: ['1:1', '16:9', '9:16'],
    platforms: ['Halaman detail', 'Pembelian dengan pertimbangan'],
    locked: ['event', 'context'],
    scene: {
      subject: '[produk] on [surface]',
      context: 'Clean, consistent background throughout the rotation',
      event: 'The product rotates slowly 360 degrees while the camera stays fixed.',
      nuance: 'Lighting highlights texture and material quality.',
      exclusions: 'reflections that obscure product details, uneven rotation speed',
    },
    base:
      'Create a smooth 360-degree rotation of {subject}. {event} {context}. {nuance} Avoid {exclusions}.',
    tips:
      'Ini template yang paling untung dari image-to-video. Pakai foto produk yang sudah disetujui sebagai gambar acuan.',
  },
  {
    id: 'talking-head',
    name: 'Talking-Head Review',
    tagline: 'Terasa seperti teman bicara, bukan merek menjual.',
    category: 'ugc',
    duration: 13,
    aspects: ['9:16'],
    platforms: ['Iklan TikTok', 'Instagram Reels', 'Listing marketplace'],
    locked: ['nuance'],
    scene: {
      subject: '[person description] filming themselves in [setting]',
      context: 'Natural lighting, not studio-perfect',
      event:
        'They express frustration with [problem], show [produk], demonstrate using it, and react with real surprise.',
      nuance: 'Handheld, slightly shaky, like a selfie video.',
      exclusions: 'overly polished looks, scripted delivery, product-first framing',
    },
    base:
      '{subject}. They are genuinely frustrated with [problem]. They show [produk], demonstrate using it, and react with real surprise at the result. Camera is handheld, slightly shaky, like a selfie video. {context}. Avoid {exclusions}.',
    tips:
      'Produk muncul di detik ketiga, bukan detik pertama. Framing yang langsung ke produk adalah tanda iklan.',
  },
  {
    id: 'tiktok-hook',
    name: 'Hook TikTok',
    tagline: 'Enam detik untuk menghentikan jempol.',
    category: 'ugc',
    duration: 7,
    aspects: ['9:16'],
    platforms: ['Iklan TikTok', 'Pembuka yang menghentikan gulir'],
    locked: ['event', 'nuance'],
    scene: {
      subject: '[attention-grabbing visual or statement]',
      context: 'Vertical 9:16 format, energetic pacing, trending visual style',
      event: 'Within 2 seconds, reveal [produk] using fast cuts.',
      nuance: 'The hook should create curiosity before showing the product.',
      exclusions: 'slow openings, landscape format, traditional ad looks',
    },
    base:
      'Create a TikTok-style hook that stops the scroll. Open with {subject}. {event} Use {context}. {nuance} Avoid {exclusions}.',
    tips:
      'Rasa penasaran harus muncul sebelum produk. Kalau produk muncul lebih dulu, tidak ada yang perlu ditunggu.',
  },
  {
    id: 'reel-hook',
    name: 'Hook Instagram Reel',
    tagline: 'Dibuat untuk ditonton tanpa suara.',
    category: 'ugc',
    duration: 9,
    aspects: ['9:16'],
    platforms: ['Instagram Reels', 'Feed penemuan'],
    locked: ['nuance'],
    scene: {
      subject: '[visually striking moment]',
      context: 'Trending look of [style reference], minimal readable text overlays',
      event: 'Transition smoothly to show [produk] in context.',
      nuance: 'Vertical 9:16 optimized for sound-off viewing.',
      exclusions: 'cluttered compositions, slow reveals',
    },
    base:
      'Open with {subject} that creates immediate curiosity. {event} Use {context}. {nuance} Avoid {exclusions}.',
    tips:
      'Kalau pesannya hanya masuk lewat audio, separuh penonton tidak akan pernah menerimanya.',
  },
  {
    id: 'founder-authentic',
    name: 'Pendiri Autentik',
    tagline: 'Ruang kerja asli, bukan studio.',
    category: 'ugc',
    duration: 18,
    aspects: ['9:16', '1:1', '16:9'],
    platforms: ['Kepercayaan merek', 'Kampanye langsung ke konsumen'],
    locked: ['context', 'nuance'],
    scene: {
      subject:
        'A founder-type figure speaking directly to camera about why they created [produk]',
      context: 'Their actual workspace or home, not a studio',
      event: 'They hold the product naturally while explaining its purpose.',
      nuance:
        'Camera is stable but intimate, like a video call. Tone is genuine and conversational.',
      exclusions: 'teleprompter-reading energy, overly lit studio settings, corporate language',
    },
    base: '{subject}. {context}. {event} {nuance} Avoid {exclusions}.',
    tips:
      'Kamera yang stabil tapi terasa dekat mengalahkan kamera sinematik di format ini.',
  },
  {
    id: 'luxury',
    name: 'Mewah / Premium',
    tagline: 'Tiga detik pertama, tanpa satu pun potongan tajam.',
    category: 'brand',
    duration: 10,
    aspects: ['16:9', '9:16', '1:1'],
    platforms: ['Kecantikan', 'Parfum', 'Produk kelas atas'],
    locked: ['nuance', 'exclusions'],
    scene: {
      subject: 'Floating textures in soft light',
      context: 'Dreamlike, calm, elegant tone',
      event:
        'Slow reveal of floating textures, then a clean close-up of [produk], centered and glowing.',
      nuance: 'Smooth, drifting camera movement with no sharp cuts.',
      exclusions: 'fast movements, harsh lighting, busy backgrounds',
    },
    base:
      '{context}. Begin with a slow reveal of {subject}. Use {nuance} The scene should feel luxurious and intriguing. Finish with a clean close-up of [produk], centered and glowing. Avoid {exclusions}.',
    tips:
      'Satu klip, satu gerakan. Kesan mewah datang dari tidak terburu-buru, bukan dari banyak efek.',
  },
  {
    id: 'emotional-story',
    name: 'Cerita Emosional',
    tagline: 'Produk masuk sebagai bagian cerita, bukan sisipan.',
    category: 'brand',
    duration: 20,
    aspects: ['16:9', '9:16'],
    platforms: ['Kesadaran merek', 'Pemasaran sosial'],
    locked: ['context'],
    scene: {
      subject: 'A brief emotional story about [theme]',
      context: 'Warm, nostalgic color grading',
      event:
        'Open with a quiet, contemplative moment. Build to a turning point where [produk/brand] appears naturally.',
      nuance: 'Camera movements are deliberate and meaningful. Music guides emotional pacing.',
      exclusions: 'forced product placement, heavy-handed messaging',
    },
    base:
      'Tell a brief emotional story about [theme]. Open with a quiet, contemplative moment. Build to a turning point where [produk/brand] appears naturally within the narrative. Use {context}. {nuance} Avoid {exclusions}.',
    tips:
      'Ini template yang paling butuh dipecah jadi beberapa klip. Satu klip hanya bisa menanggung satu emosi.',
  },
  {
    id: 'motivational',
    name: 'Energi Motivasi / Olahraga',
    tagline: 'Potongan cepat, ritme mengikuti musik.',
    category: 'brand',
    duration: 13,
    aspects: ['9:16', '16:9'],
    platforms: ['Merek kebugaran', 'Pakaian olahraga'],
    locked: ['nuance'],
    scene: {
      subject: 'A high-energy montage of [athletic activity]',
      context: 'Dramatic lighting with high contrast',
      event:
        'Quick cuts between dynamic movements. [produk] appears naturally as part of the action, not the focus.',
      nuance:
        'Music-driven editing rhythm. Camera captures both wide establishing shots and tight detail moments.',
      exclusions: 'slow pacing, static compositions',
    },
    base:
      'Create a high-energy montage of [athletic activity]. {event} {context}. {nuance} Avoid {exclusions}.',
    tips:
      'Produk jadi bagian gerakan, bukan pusatnya. Begitu produk jadi pusat, energinya hilang.',
  },
  {
    id: 'seasonal',
    name: 'Kampanye Musiman',
    tagline: 'Suasana musim lewat cahaya, bukan properti berlebihan.',
    category: 'brand',
    duration: 12,
    aspects: ['9:16', '1:1', '16:9'],
    platforms: ['Promosi hari raya', 'Peluncuran musiman'],
    locked: ['subject'],
    scene: {
      subject: '[produk] as a natural part of the scene',
      context: 'Setting reflects the season through lighting, decor, and atmosphere',
      event: '[produk] appears as a gift being unwrapped, or a seasonal essential being packed.',
      nuance: 'Mood should be [festive/cozy/energetic].',
      exclusions: 'overused imagery, forced holiday themes',
    },
    base:
      'Create a [holiday/season]-themed video featuring [produk]. {context}. {event} {nuance} Avoid {exclusions}.',
    tips:
      'Ganti tahun dan produk, pertahankan cahaya dan posisinya. Itu inti produksi varian.',
  },
  {
    id: 'youtube-preroll',
    name: 'YouTube Pre-Roll (Bisa Dilewati)',
    tagline: 'Lima detik sebelum tombol lewati muncul.',
    category: 'platform',
    duration: 25,
    aspects: ['16:9'],
    platforms: ['Iklan YouTube', 'Kampanye kesadaran'],
    locked: ['event'],
    scene: {
      subject: '[visual surprise / bold statement / immediate benefit]',
      context: '16:9 horizontal format',
      event:
        'The first 5 seconds must hook viewers before the skip button appears, then demonstrate [product value] clearly.',
      nuance: 'Include a clear call-to-action in the final 3 seconds.',
      exclusions: 'slow introductions, brand-first openings',
    },
    base:
      'Create a YouTube pre-roll ad. {event} Use {subject}. {context}. {nuance} Avoid {exclusions}.',
    tips:
      'Pecah jadi empat klip 6 detik. Jangan minta satu klip 25 detik — model akan memotongnya sendiri.',
  },
  {
    id: 'shorts-hook',
    name: 'YouTube Shorts',
    tagline: 'Vertikal, cepat, dan ditonton sampai habis.',
    category: 'platform',
    duration: 30,
    aspects: ['9:16'],
    platforms: ['YouTube Shorts', 'Penemuan vertikal'],
    locked: ['nuance'],
    scene: {
      subject: '[visual or statement] that creates immediate watch-through',
      context: 'Text overlays for key points, pacing native to short-form',
      event: 'Show [produk] solving [problem] in an entertaining way.',
      nuance: 'Pacing should feel native to short-form content.',
      exclusions: 'horizontal framing, slow reveals, traditional ad structure',
    },
    base:
      'Create a vertical video optimized for YouTube Shorts. Open with {subject}. {event} Use {context}. {nuance} Avoid {exclusions}.',
    tips:
      'Teks di layar menggantikan narasi. Tanpa teks, penonton tanpa suara kehilangan isi videonya.',
  },
  {
    id: 'facebook-feed',
    name: 'Iklan Feed Facebook',
    tagline: 'Dibuat untuk ditonton dalam keadaan bisu.',
    category: 'platform',
    duration: 22,
    aspects: ['1:1', '4:5'],
    platforms: ['Feed Facebook', 'Iklan bertarget'],
    locked: ['context'],
    scene: {
      subject: '[produk] benefit, clear within the first 3 seconds',
      context: 'Text overlays and captions, movement that catches attention while scrolling',
      event: 'Communicate the key message through on-screen text as the product is shown.',
      nuance: 'Optimized for sound-off viewing.',
      exclusions: 'relying on audio for comprehension',
    },
    base:
      'Create a Facebook feed video optimized for sound-off viewing. Open with {subject}. Use {context}. {event} Avoid {exclusions}.',
    tips:
      'Kalau pesannya hanya masuk lewat audio, separuh penonton tidak akan pernah menerimanya.',
  },
  {
    id: 'food',
    name: 'Iklan Makanan',
    tagline: 'Tekstur, uap, dan satu gerakan yang bikin lapar.',
    category: 'industri',
    duration: 13,
    aspects: ['9:16', '1:1', '16:9'],
    platforms: ['Restoran', 'Pesan-antar makanan', 'Merek makanan'],
    locked: ['subject'],
    scene: {
      subject: '[food item]',
      context: 'Lighting that makes colors vibrant and textures irresistible',
      event:
        'Extreme close-ups showing texture and steam, camera slowly pulls back to reveal the full dish, with subtle motion like sauce being drizzled.',
      nuance: 'Appetizing and warm throughout.',
      exclusions: 'unappetizing angles, cold-looking food',
    },
    base:
      'Create an appetizing video of {subject}. Use extreme close-ups that show texture and steam. {event} {context}. Avoid {exclusions}.',
    tips:
      'Uap adalah isyarat suhu. Makanan yang tidak beruap selalu terlihat sudah dingin.',
  },
  {
    id: 'real-estate',
    name: 'Teaser Properti',
    tagline: 'Kamera berjalan seperti calon pembeli.',
    category: 'industri',
    duration: 25,
    aspects: ['16:9', '9:16'],
    platforms: ['Listing properti', 'Pemasaran properti'],
    locked: ['nuance'],
    scene: {
      subject: '[property type]',
      context: 'Natural daylight streaming through windows',
      event:
        'Camera moves smoothly through spaces as if the viewer is walking through, highlighting [kitchen/view/outdoor space].',
      nuance: 'Transitions between rooms should feel continuous.',
      exclusions: 'fisheye distortion, shaky movement, empty-feeling spaces',
    },
    base:
      'Create a walkthrough teaser of {subject}. {event} Use {context}. {nuance} Avoid {exclusions}.',
    tips:
      'Ruangan kosong terasa lebih kecil. Minta beberapa perabot agar proporsinya terbaca.',
  },
  {
    id: 'app-demo',
    name: 'Demo Aplikasi',
    tagline: 'Masalah dulu, antarmuka kemudian.',
    category: 'industri',
    duration: 18,
    aspects: ['9:16', '16:9'],
    platforms: ['Produk SaaS', 'Aplikasi seluler'],
    locked: ['event'],
    scene: {
      subject: '[app name] solving [user problem]',
      context: 'Screen recording style with subtle device mockup',
      event:
        'Open with the frustration of the problem, then show the app interface making it simple, highlighting 2-3 key features with smooth transitions.',
      nuance: 'Clear and unhurried.',
      exclusions: 'overwhelming feature dumps, technical language',
    },
    base: 'Show {subject}. {event} Use {context}. Avoid {exclusions}.',
    tips:
      'Dua sampai tiga fitur, tidak lebih. Semakin banyak fitur ditampilkan, semakin sedikit yang diingat.',
  },
  {
    id: 'fashion-beauty',
    name: 'Kampanye Fesyen / Kecantikan',
    tagline: 'Pandangan penuh dan detail produk, dalam satu gerakan.',
    category: 'industri',
    duration: 13,
    aspects: ['9:16', '1:1', '4:5'],
    platforms: ['Pakaian', 'Kosmetik', 'Aksesori'],
    locked: ['nuance'],
    scene: {
      subject: '[model description] wearing or using [produk] in [setting]',
      context:
        'Lighting flatters both the model and the product, color grading matches brand look',
      event: 'Camera captures both full looks and detail shots of the product.',
      nuance: 'Movement should be confident and elegant.',
      exclusions: 'unflattering angles, lighting that distorts product colors',
    },
    base: 'Feature {subject}. {event} {context}. {nuance} Avoid {exclusions}.',
    tips:
      'Warna produk adalah hal pertama yang dikomplain klien. Sebut "color grading matches brand look" sejak awal.',
  },
  {
    id: 'cinematic-broll',
    name: 'B-Roll Sinematik',
    tagline: 'Satu gerakan kamera, satu sumber cahaya.',
    category: 'lanjutan',
    duration: 10,
    aspects: ['16:9', '9:16', '2.39:1'],
    platforms: ['Footage pendukung', 'Film merek'],
    locked: ['event'],
    scene: {
      subject: '[subject]',
      context:
        '[natural/dramatic/soft] lighting with [time of day] quality, color grade leans [warm/cool/neutral]',
      event: 'Camera executes a slow [dolly/tracking/crane] movement.',
      nuance:
        'Depth of field isolates the subject from background. Motion feels deliberate and controlled.',
      exclusions: 'handheld shakiness, flat lighting, unmotivated camera movement',
    },
    base:
      'Create cinematic b-roll of {subject}. {event} Use {context}. {nuance} Avoid {exclusions}.',
    tips:
      'Sebut nama gerakan kameranya. "Kamera bagus" tidak memberi tahu model apa yang harus bergerak.',
  },
  {
    id: 'multi-scene',
    name: 'Sekuens Tiga Beat',
    tagline: 'Susun cerita utuh dengan menyambung klip, bukan memanjangkannya.',
    category: 'lanjutan',
    duration: 40,
    aspects: ['16:9', '9:16'],
    platforms: ['Narasi panjang', 'Film peluncuran'],
    locked: ['context'],
    scene: {
      subject: 'A three-beat video sequence',
      context: 'Consistent lighting and color grade across all beats',
      event:
        'Beat 1: establish [setting/character/problem] with a wide shot. Beat 2: show [produk/solution] with medium shots and detail inserts. Beat 3: resolve with [outcome/emotion/call-to-action].',
      nuance: 'Transitions should feel intentional.',
      exclusions: 'jarring tone shifts between scenes',
    },
    base:
      'Create a three-beat video sequence. Beat 1: establish [setting/character/problem] with a wide shot. Beat 2: show [produk/solution] with medium shots and detail inserts. Beat 3: resolve with [outcome/emotion/call-to-action]. Maintain {context}. {nuance} Avoid {exclusions}.',
    tips:
      'Buka papan cerita untuk memecah ini. Setiap beat adalah satu klip terpisah dengan deskripsi subjek yang sama persis.',
  },
  {
    id: 'script-to-video',
    name: 'Skrip ke Video',
    tagline: 'Dari beat yang sudah disetujui menjadi footage draf pertama.',
    category: 'lanjutan',
    duration: 30,
    aspects: ['16:9', '9:16'],
    platforms: ['Kampanye dengan papan cerita', 'Pra-visualisasi'],
    locked: [],
    scene: {
      subject: '[Beat 1 description]',
      context: '[reference] visual style, pacing matches [energy level]',
      event: '[Beat 2 description] then [Beat 3 description]',
      nuance:
        'Each beat flows naturally into the next while maintaining a distinct visual purpose.',
      exclusions: 'inconsistent visual style between beats',
    },
    base:
      'Generate video from the following script beats: [Beat 1 description]. [Beat 2 description]. [Beat 3 description]. Visual style should be [reference]. Pacing matches [energy level]. Each beat should flow naturally into the next while maintaining distinct visual purpose. {nuance}',
    tips:
      'Pakai tabel papan cerita: setiap baris jadi satu klip, lalu tempel per baris ke tool video.',
  },
  {
    id: 'style-transfer',
    name: 'Alih Gaya dari Referensi',
    tagline: 'Ambil inti gayanya, bukan salinannya.',
    category: 'lanjutan',
    duration: 10,
    aspects: ['16:9', '9:16'],
    platforms: ['Konsistensi merek', 'Penyelarasan look'],
    locked: ['nuance'],
    scene: {
      subject: '[subject description]',
      context:
        'Match the [color palette / lighting quality / camera movement style] of [reference]',
      event: '[action description]',
      nuance: 'Maintain the look consistency of the reference while creating original footage.',
      exclusions: 'exact replication',
    },
    base:
      'Create video in the visual style of [reference]. Match the {context}. Subject is {subject}. Action is {event} {nuance} Avoid {exclusions} — capture the essence of the style.',
    tips:
      'Sebut tiga hal yang mau diambil (palet warna, kualitas cahaya, gaya kamera). Sebutkan juga apa yang tidak boleh disalin.',
  },
  {
    id: 'localization',
    name: 'Template Siap Lokalisasi',
    tagline: 'Produk tetap, sisanya bisa diganti per pasar.',
    category: 'lanjutan',
    duration: 15,
    aspects: ['9:16', '1:1', '16:9'],
    platforms: ['Kampanye multi-pasar', 'Produksi varian'],
    locked: ['subject', 'nuance'],
    scene: {
      subject: '[produk] as the consistent element',
      context:
        'Fixed: product position, lighting style, camera movement. Variable: background, talent demographics, language text.',
      event: 'Show the product being used the same way in every market version.',
      nuance: 'Structure supports easy regional adaptation without regenerating core footage.',
      exclusions: 'changing product position, lighting, or camera movement between markets',
    },
    base:
      'Create a video template where {subject} while [setting/talent/text] can be modified for different markets. Maintain fixed: [product position, lighting style, camera movement]. Variable elements clearly separated: [background, talent demographics, language text]. {nuance} Avoid {exclusions}.',
    tips:
      'Tulis dua daftar terpisah: yang tetap dan yang berubah. Pemasok lokalisasi hanya perlu mengubah daftar kedua.',
  },
];

/** Template gambar pendamping (poster, ikon logo, bahan iklan). */
export const IMAGE_TEMPLATES = [
  {
    id: 'poster-clean',
    name: 'Poster dengan Ruang Teks',
    tagline: 'Minta bidang kosong, bukan huruf yang digambar model.',
    ratio: '3:4',
    scene: {
      subject: 'Poster bergaya minimalis untuk [acara]',
      context: 'Bidang atas berisi bentuk geometris biru tua yang saling tumpang tindih',
      event: 'Dua pertiga bawah dibiarkan putih polos sebagai tempat menaruh teks',
      nuance: 'Bersih, tenang, tanpa ornamen tambahan',
      exclusions: 'tanpa tulisan apa pun di dalam gambar',
    },
    base:
      'Poster bergaya minimalis untuk [acara]. Bidang atas berisi bentuk geometris biru tua yang saling tumpang tindih. Dua pertiga bawah dibiarkan putih polos sebagai tempat menaruh teks. Tanpa tulisan apa pun di dalam gambar. Rasio {ratio}.',
    tips:
      'Meminta bidang kosong jauh lebih aman daripada meminta model menuliskan judul acara. Teks Anda pasang sendiri di aplikasi desain.',
  },
  {
    id: 'logo-mark',
    name: 'Ikon Logo Tanpa Huruf',
    tagline: 'Lambang saja, nama usaha dipasang belakangan.',
    ratio: '1:1',
    scene: {
      subject: 'Ikon logo sederhana berbentuk siluet [bentuk] dilihat dari samping',
      context: 'Tersusun dari satu garis tebal yang tidak terputus',
      event: 'Satu warna [warna] di atas latar putih polos',
      nuance: 'Rata, tanpa bayangan, siap dijadikan titik awal diskusi desainer',
      exclusions: 'tanpa huruf, tanpa bayangan, tanpa gradasi',
    },
    base:
      'Ikon logo sederhana berbentuk siluet [bentuk] dilihat dari samping, tersusun dari satu garis tebal yang tidak terputus. Satu warna [warna] di atas latar putih polos. Tanpa huruf, tanpa bayangan. Rasio {ratio}.',
    tips:
      'Huruf yang dihasilkan model masih sering meleset. Hasilnya juga gambar biasa, bukan vektor — perlakukan sebagai bahan diskusi.',
  },
  {
    id: 'ad-still',
    name: 'Foto Suasana untuk Iklan',
    tagline: 'Sisakan ruang untuk teks penawaran sejak awal.',
    ratio: '4:5',
    scene: {
      subject: 'Foto suasana [produk] di atas meja kayu berisi [perlengkapan]',
      context: 'Cahaya utama dari produk itu sendiri, sisa ruangan gelap lembut',
      event: 'Difoto dari samping pada malam hari',
      nuance: 'Sisakan ruang kosong di sepertiga atas gambar',
      exclusions: 'tanpa teks, tanpa merek tambahan',
    },
    base:
      'Foto suasana [produk] menyala di atas meja kayu berisi [perlengkapan], difoto dari samping pada malam hari. Cahaya utama datang dari produk itu sendiri, sisa ruangan gelap lembut. Sisakan ruang kosong di sepertiga atas gambar. Rasio {ratio}.',
    tips:
      'Ruang kosong di sepertiga atas jauh lebih mudah disiapkan sejak awal daripada memaksa teks masuk ke gambar yang sudah penuh.',
  },
];

/** Template teks (naskah, sudut penawaran, kerangka akademik). */
export const TEXT_TEMPLATES = [
  {
    id: 'affiliate-script',
    name: 'Naskah Video Affiliate',
    tagline: 'Naskah dipecah mengikuti batas durasi klip.',
    base:
      'Susun naskah video ulasan {duration} detik untuk {produk} seharga {harga}. Pecah menjadi {bagian} bagian yang masing-masing muat dalam klip 8 detik. Tiap bagian tuliskan dua baris: satu kalimat yang diucapkan, dan satu deskripsi gambar yang tampil. Pembacanya {pembaca}. Sebut hanya hal yang terlihat pada produk, jangan menambahkan angka spesifikasi.',
    tips:
      'Pembagian delapan detik bukan pilihan gaya, melainkan mengikuti batas durasi klip. Naskah tanpa pembagian sulit diterjemahkan jadi video.',
  },
  {
    id: 'offer-angles',
    name: 'Tiga Sudut Penawaran',
    tagline: 'Satu produk, tiga alasan membeli yang berbeda.',
    base:
      'Saya menjual {produk} seharga {harga}. Tuliskan tiga sudut penawaran yang berbeda untuk produk yang sama: satu menekan {sudut1}, satu menekan {sudut2}, satu menekan {sudut3}. Tiap sudut maksimal 35 kata. Jangan menyebutkan angka teknis atau garansi yang belum saya periksa.',
    tips:
      'Kalimat larangan di akhir adalah bagian terpenting. Model cenderung menambahkan spesifikasi yang terdengar meyakinkan.',
  },
  {
    id: 'paper-outline',
    name: 'Kerangka Makalah',
    tagline: 'Berhenti di kerangka, larang model mengarang sumber.',
    base:
      'Saya menulis makalah {jumlah} kata tentang {topik}. Susun kerangka bab beserta pertanyaan yang harus dijawab tiap bab. Untuk setiap klaim yang membutuhkan data, beri tanda [perlu sumber] dan sebutkan jenis sumber yang cocok. Jangan menuliskan nama penulis, judul jurnal, atau tahun terbit apa pun.',
    tips:
      'Larangan menyebut nama penulis mencegah sitasi yang terdengar meyakinkan padahal tidak pernah ada.',
  },
  {
    id: 'script-to-slides',
    name: 'Naskah ke Slide Presentasi',
    tagline: 'Batas jumlah kata untuk setiap unsur slide.',
    base:
      'Ubah naskah di bawah ini menjadi {jumlah} slide. Tiap slide berisi satu judul maksimal delapan kata, tiga poin maksimal dua belas kata, dan satu catatan pembicara maksimal empat puluh kata. Tandai satu slide yang paling cocok diberi grafik, dan sebutkan jenis grafiknya. Naskahnya:\n[tempel naskah Anda di sini]',
    tips:
      'Tanpa batas jumlah kata, catatan pembicara keluar sepanjang paragraf dan poinnya tidak muat di layar.',
  },
  {
    id: 'layered-explanation',
    name: 'Penjelasan Bertingkat',
    tagline: 'Tiga tingkat kesulitan, satu konsep.',
    base:
      'Jelaskan konsep {konsep} tiga kali berturut-turut: pertama untuk anak SMP, kedua untuk mahasiswa semester awal, ketiga untuk menjawab soal ujian akhir. Sertakan satu analogi yang tidak memakai contoh {contoh yang dilarang}. Tutup dengan tiga pertanyaan untuk menguji apakah saya benar-benar paham.',
    tips:
      'Analoginya dilarang memakai contoh yang sudah klise, supaya penjelasannya benar-benar dipikirkan ulang.',
  },
  {
    id: 'feedback-themes',
    name: 'Kelompokkan Masukan Pelanggan',
    tagline: 'Struktur mengikuti anjuran Anthropic (tag XML).',
    provider: 'claude',
    base:
      '<instruksi>\nKelompokkan masukan pelanggan menjadi paling banyak {jumlah} tema. Beri nama tiap tema maksimal empat kata dan sebutkan jumlahnya. Tulis satu kalimat ringkasan bernada netral profesional.\n</instruksi>\n<contoh>\nMasukan: "Aplikasinya sering keluar sendiri."\nTema: Kestabilan aplikasi\n</contoh>\n<masukan>\n[tempel di sini]\n</masukan>',
    tips:
      'Anthropic menyarankan bagian yang berbeda jenis dibungkus tag XML masing-masing supaya tidak tertukar.',
  },
  {
    id: 'tone-paragraph',
    name: 'Ringkasan Bernada (ChatGPT)',
    tagline: 'Satu paragraf mengalir, asal nadanya disebut.',
    provider: 'chatgpt',
    base:
      'Kelompokkan masukan pelanggan di bawah ini menjadi paling banyak {jumlah} tema. Beri nama tiap tema maksimal empat kata, sebutkan jumlah masukan di dalamnya, lalu tulis satu kalimat ringkasan bernada {nada}. Masukannya:\n[tempel di sini]',
    tips:
      'OpenAI menyarankan permintaan yang jelas dan spesifik, ditambah kata sifat untuk menentukan nada.',
  },
  {
    id: 'design-brief',
    name: 'Brief Desain (Canva)',
    tagline: 'Bukan kalimat perintah, melainkan keterangan desain.',
    provider: 'canva',
    base:
      'Slide ringkasan hasil {topik} untuk rapat {acara}. {jumlah} kotak berjajar dalam dua baris, warna {warna}, huruf tebal tanpa serif, banyak ruang kosong.',
    tips:
      'Canva meminta tujuan gambar lebih dulu, baru gaya, sudut, cahaya, dan warna. Bentuknya seperti keterangan desain.',
  },
];

/** Kerangka isian untuk input "buat prompt sendiri". */
export const SCENE_FIELDS = [
  {
    key: 'subject',
    label: 'Subject — apa yang tampil',
    hint: 'Benda, orang, atau bahan yang Anda punya. Ini bagian yang paling sering lupa diganti.',
    placeholder: 'satu bungkus keripik singkong kemasan plastik berdiri tegak',
  },
  {
    key: 'context',
    label: 'Context — latar dan cahaya',
    hint: 'Tempat, waktu, dan arah cahaya. Menghapus tebakan model soal suasana.',
    placeholder: 'di atas meja kayu terang, cahaya lembut dari kiri atas, bayangan tipis ke kanan',
  },
  {
    key: 'event',
    label: 'Event — apa yang terjadi',
    hint: 'Satu klip hanya memuat satu gerakan. Bukan satu rangkaian kejadian.',
    placeholder: 'kamera menyorot mendekat perlahan, kemasan tidak bergerak',
  },
  {
    key: 'nuance',
    label: 'Nuance — gaya, mood, gerakan kamera',
    hint: 'Gaya visual dan gerakan kamera. Sebut nama gerakannya, bukan kata "bagus".',
    placeholder: 'gaya sinematik, warna hangat, kamera diam setinggi meja',
  },
  {
    key: 'exclusions',
    label: 'Exclusions — apa yang harus dihindari',
    hint: 'Hal yang paling sering muncul padahal tidak Anda minta.',
    placeholder: 'tulisan pada kemasan, produk tambahan, latar ramai',
  },
];

/** Kata penilaian tanpa ukuran yang sebaiknya diganti. */
export const VAGUE_WORDS = [
  'bagus',
  'keren',
  'menarik',
  'estetik',
  'aesthetic',
  'profesional',
  'indah',
  'cantik',
  'luar biasa',
  'modern',
  'nice',
  'beautiful',
  'stunning',
  'amazing',
  'high quality',
  'good',
  'best',
];
