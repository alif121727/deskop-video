#!/usr/bin/env python3
"""Musik latar untuk film: pad hangat lembut + whoosh tiap ganti adegan +
pop kecil di momen kunci. Tanpa vokal. Output WAV 48 kHz stereo, 60 detik."""
import math, struct, wave, random

SR = 48000
DUR = 60.0
N = int(SR * DUR)

SCENES = [0, 3, 8, 15, 22, 29, 36, 43, 55, 60]
# chord root per adegan (Hz) -> nuansa naik-turun yang lembut
ROOTS = [110.00, 130.81, 146.83, 130.81, 164.81, 146.83, 174.61, 130.81, 146.83, 110.00]

rnd = random.Random(20261115)

# --- pad: tiga suara sine + detune halus, amplitudo naik-turun lambat ---
def pad_value(t):
    # cari root aktif dan lakukan crossfade lembut antar adegan
    idx = 0
    for i in range(len(SCENES) - 1):
        if SCENES[i] <= t < SCENES[i + 1]:
            idx = i
            break
    root = ROOTS[idx]
    s = 0.0
    for k, (mul, amp) in enumerate(((1.0, 0.5), (1.5, 0.32), (2.0, 0.24), (2.5, 0.16), (3.0, 0.10))):
        f = root * mul
        det = 1.0 + 0.0016 * math.sin(2 * math.pi * 0.07 * t + k)
        env = 0.72 + 0.28 * math.sin(2 * math.pi * (0.05 + 0.013 * k) * t + k * 1.7)
        s += amp * env * math.sin(2 * math.pi * f * det * t)
    # busur pelan keseluruhan
    s *= 0.62 + 0.38 * math.sin(2 * math.pi * 0.021 * t - 0.4)
    return s

# --- whoosh: noise + filter satu kutub, dengan amplop naik-turun ---
class OnePole:
    def __init__(self, a): self.a = a; self.y = 0.0
    def run(self, x): self.y = self.a * self.y + (1 - self.a) * x; return self.y

WH = [s for s in SCENES[1:-1]]
wh_len = 0.9
wh_data = []  # (start, samples)
for s in WH:
    lp = OnePole(0.90); hp_prev = 0.0; hp = OnePole(0.985)
    n = int(SR * wh_len)
    buf = []
    for i in range(n):
        k = i / n
        env = math.sin(math.pi * k) ** 1.4          # naik lalu turun
        x = rnd.uniform(-1, 1)
        v = lp.run(x)
        hpv = hp.run(v) - hp_prev; hp_prev = hp.run(v)
        sweep = 0.6 + 0.4 * math.sin(math.pi * k)
        buf.append((hpv * 0.9 + v * 0.4) * env * sweep)
    wh_data.append((int(s * SR), buf))

# --- pop: blip sine pendek dengan peluruhan cepat ---
POPS = [0.35, 3.25, 5.6, 8.35, 15.3, 18.2, 22.4, 25.6, 29.4, 32.6, 36.3, 39.5, 43.3, 49.2, 55.4]
pop_data = []
for s in POPS:
    n = int(SR * 0.16)
    buf = []
    for i in range(n):
        k = i / n
        env = math.exp(-9 * k)
        f = 620 + 240 * (1 - k)
        buf.append(0.5 * env * math.sin(2 * math.pi * f * (i / SR)))
    pop_data.append((int(s * SR), buf))

# --- render ---
out = wave.open('/tmp/render/audio.wav', 'wb')
out.setnchannels(2); out.setsampwidth(2); out.setframerate(SR)

# siapkan buffer campuran untuk whoosh & pop
mix = [0.0] * N
for start, buf in wh_data + pop_data:
    for i, v in enumerate(buf):
        j = start + i
        if j < N: mix[j] += v

CH = 1024
frames = bytearray()
peak = 0.0
data = []
for i in range(N):
    t = i / SR
    p = pad_value(t)
    m = mix[i]
    left = p * 0.42 + m * 0.30
    right = p * 0.42 + m * 0.30 * 0.96
    # reverb sederhana: delay pendek (echo halus)
    data.append((left, right))

# echo halus
d1 = int(SR * 0.16); d2 = int(SR * 0.29)
for i in range(N):
    l, r = data[i]
    if i + d1 < N: data[i + d1] = (data[i + d1][0] + l * 0.16, data[i + d1][1] + r * 0.16)
    if i + d2 < N: data[i + d2] = (data[i + d2][0] + l * 0.09, data[i + d2][1] + r * 0.09)

# fade in/out
fi = int(SR * 1.2); fo = int(SR * 1.6)
for i in range(N):
    l, r = data[i]
    g = 1.0
    if i < fi: g *= i / fi
    if i > N - fo: g *= (N - i) / fo
    l *= g; r *= g
    peak = max(peak, abs(l), abs(r))
    data[i] = (l, r)

norm = (0.89 / peak) if peak > 0 else 1.0
for l, r in data:
    frames += struct.pack('<hh', int(max(-1, min(1, l * norm)) * 32767),
                                int(max(-1, min(1, r * norm)) * 32767))
out.writeframes(bytes(frames))
out.close()
print('audio.wav ditulis:', N, 'sample,', round(N / SR, 2), 'detik')
