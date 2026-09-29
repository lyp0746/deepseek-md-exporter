import math
import random
import struct
import subprocess
import wave
import array

DURATION = 18.0
SR = 44100
BPM = 120
BEAT_SEC = 60.0 / BPM
NUM_SAMPLES = int(DURATION * SR)

TWO_PI = 2.0 * math.pi


def kick(i, freq=55, decay=10):
    t = i / SR
    phase = t % BEAT_SEC
    if phase > 0.3:
        return 0.0
    env = math.exp(-phase * decay)
    return math.sin(TWO_PI * freq * t) * env


def snare(i, freq=200, decay=18):
    t = i / SR
    offset = BEAT_SEC / 2
    phase = (t - offset) % BEAT_SEC
    if phase < 0 or phase > 0.15:
        return 0.0
    env = math.exp(-phase * decay)
    tone = math.sin(TWO_PI * freq * t) * 0.7
    noise = (random.random() * 2 - 1) * 0.3
    return (tone + noise) * env


def hihat(i, decay=35):
    t = i / SR
    eighth = BEAT_SEC / 2
    phase = t % eighth
    if phase > 0.05:
        return 0.0
    env = math.exp(-phase * decay)
    noise = random.random() * 2 - 1
    return noise * env


def pad(i, freq=110, lfo_rate=0.5, lfo_depth=0.3):
    t = i / SR
    lfo = 1.0 + lfo_depth * math.sin(TWO_PI * lfo_rate * t)
    return math.sin(TWO_PI * freq * t) * lfo * 0.15


def sub_bass(i, freq=55):
    t = i / SR
    env = 0.3 + 0.1 * math.sin(TWO_PI * 0.25 * t)
    return math.sin(TWO_PI * freq * t) * env


print(f"Generating {NUM_SAMPLES} samples ({DURATION}s at {SR}Hz)...")
samples = []
peak = 0.0

for i in range(NUM_SAMPLES):
    s = (
        kick(i, freq=55, decay=10) * 0.70
        + kick(i, freq=82, decay=12) * 0.35
        + snare(i, freq=200, decay=18) * 0.35
        + hihat(i, decay=35) * 0.12
        + pad(i, freq=110, lfo_rate=0.5) * 0.05
        + pad(i, freq=165, lfo_rate=0.3) * 0.03
        + sub_bass(i, freq=55) * 0.06
    )
    abs_s = abs(s)
    if abs_s > peak:
        peak = abs_s
    samples.append(s)

print(f"Peak before normalize: {peak:.4f}")

if peak > 0:
    scale = 0.85 / peak
    samples = [s * scale for s in samples]

max_after = max(abs(s) for s in samples)
print(f"Peak after normalize: {max_after:.4f}")

pcm_bytes = bytearray()
for s in samples:
    val = max(-32768, min(32767, int(s * 32767)))
    pcm_bytes.extend(struct.pack("<h", val))

wav_path = "public/bgm_gen.wav"
mp3_path = "public/bgm.mp3"

with wave.open(wav_path, "wb") as wf:
    wf.setnchannels(1)
    wf.setsampwidth(2)
    wf.setframerate(SR)
    wf.writeframes(bytes(pcm_bytes))

print(f"WAV written: {wav_path} ({len(pcm_bytes)} bytes, {len(samples)} frames)")

result = subprocess.run(
    [
        "ffmpeg", "-y", "-i", wav_path,
        "-c:a", "libmp3lame", "-b:a", "192k", mp3_path,
    ],
    capture_output=True,
    text=True,
)

print(result.stderr[-800:] if len(result.stderr) > 800 else result.stderr)
print(f"MP3 written: {mp3_path}")