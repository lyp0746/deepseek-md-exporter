import math
import random
import struct
import subprocess
import wave

DURATION = 18.0
SR = 44100
BPM = 120
BEAT_SEC = 60.0 / BPM
NUM_SAMPLES = int(DURATION * SR)
TWO_PI = 2.0 * math.pi

CHORD_PROG = [
    [130.81, 164.81, 196.00],
    [110.00, 138.59, 164.81],
    [146.83, 185.00, 220.00],
    [130.81, 164.81, 196.00],
]
CHORD_BEATS = 4
CHORD_CYCLE = CHORD_BEATS * len(CHORD_PROG)

ARPEGGIO_NOTES = [261.63, 329.63, 392.00, 523.25, 392.00, 329.63]


def _env_gate(t, period, gate, decay):
    phase = t % period
    if phase > gate:
        return 0.0
    return math.exp(-phase * decay)


def kick(i, freq=55, decay=10):
    t = i / SR
    phase = t % BEAT_SEC
    if phase > 0.25:
        return 0.0
    pitch_drop = freq * math.exp(-phase * 20) + freq * 0.5
    env = math.exp(-phase * decay)
    return math.sin(TWO_PI * pitch_drop * phase) * env


def snare(i, freq=220, decay=20):
    t = i / SR
    offset = BEAT_SEC / 2
    phase = (t - offset) % BEAT_SEC
    if phase < 0 or phase > 0.12:
        return 0.0
    env = math.exp(-phase * decay)
    tone = math.sin(TWO_PI * freq * t) * 0.6
    noise = (random.random() * 2 - 1) * 0.4
    return (tone + noise) * env


def hihat(i, decay=40):
    t = i / SR
    eighth = BEAT_SEC / 2
    phase = t % eighth
    if phase > 0.04:
        return 0.0
    env = math.exp(-phase * decay)
    noise = random.random() * 2 - 1
    return noise * env


def open_hihat(i, decay=12):
    t = i / SR
    measure = BEAT_SEC * 4
    offset = BEAT_SEC * 3.5
    phase = (t - offset) % measure
    if phase < 0 or phase > 0.15:
        return 0.0
    env = math.exp(-phase * decay)
    noise = random.random() * 2 - 1
    return noise * env


def sub_bass(i):
    t = i / SR
    beat_in_cycle = (t / BEAT_SEC) % CHORD_CYCLE
    chord_idx = int(beat_in_cycle / CHORD_BEATS) % len(CHORD_PROG)
    freq = CHORD_PROG[chord_idx][0] * 0.5
    env = 0.25 + 0.08 * math.sin(TWO_PI * 2 * t)
    return math.sin(TWO_PI * freq * t) * env


def chord_pad(i):
    t = i / SR
    beat_in_cycle = (t / BEAT_SEC) % CHORD_CYCLE
    chord_idx = int(beat_in_cycle / CHORD_BEATS) % len(CHORD_PROG)
    chord = CHORD_PROG[chord_idx]
    lfo = 0.7 + 0.3 * math.sin(TWO_PI * 0.25 * t)
    val = 0.0
    for freq in chord:
        val += math.sin(TWO_PI * freq * t) * 0.08
        val += math.sin(TWO_PI * freq * 2.01 * t) * 0.03
    return val * lfo


def arpeggio(i):
    t = i / SR
    sixteenth = BEAT_SEC / 4
    note_idx = int(t / sixteenth) % len(ARPEGGIO_NOTES)
    beat_in_cycle = (t / BEAT_SEC) % CHORD_CYCLE
    chord_idx = int(beat_in_cycle / CHORD_BEATS) % len(CHORD_PROG)
    base_ratio = CHORD_PROG[chord_idx][0] / CHORD_PROG[0][0]
    freq = ARPEGGIO_NOTES[note_idx] * base_ratio
    phase = t % sixteenth
    if phase > 0.08:
        return 0.0
    env = math.exp(-phase * 25)
    return math.sin(TWO_PI * freq * t) * env


def melody(i):
    t = i / SR
    measure = BEAT_SEC * 4
    measure_pos = t % measure
    beat_in_cycle = (t / BEAT_SEC) % CHORD_CYCLE
    chord_idx = int(beat_in_cycle / CHORD_BEATS) % len(CHORD_PROG)

    if chord_idx == 0:
        notes = [(0.0, 392.00), (BEAT_SEC * 2, 440.00)]
    elif chord_idx == 1:
        notes = [(0.0, 329.63), (BEAT_SEC * 1.5, 349.23)]
    elif chord_idx == 2:
        notes = [(0.0, 440.00), (BEAT_SEC, 523.25), (BEAT_SEC * 2.5, 440.00)]
    else:
        notes = [(0.0, 349.23), (BEAT_SEC * 2, 392.00)]

    val = 0.0
    for start, freq in notes:
        local_t = measure_pos - start
        if 0 <= local_t < BEAT_SEC * 1.5:
            env = math.exp(-local_t * 4) * (1 - math.exp(-local_t * 30))
            val += math.sin(TWO_PI * freq * t) * env * 0.12
    return val


def riser(i):
    t = i / SR
    cycle = BEAT_SEC * CHORD_CYCLE
    pos = t % cycle
    progress = pos / cycle
    if progress < 0.7:
        return 0.0
    intensity = (progress - 0.7) / 0.3
    noise = (random.random() * 2 - 1) * 0.5
    sweep_freq = 200 + 2000 * intensity
    tone = math.sin(TWO_PI * sweep_freq * t) * 0.3
    return (noise + tone) * intensity * 0.08


print(f"Generating {NUM_SAMPLES} samples ({DURATION}s at {SR}Hz, BPM={BPM})...")
samples = []
peak = 0.0

for i in range(NUM_SAMPLES):
    s = (
        kick(i, freq=55, decay=10) * 0.60
        + kick(i, freq=82, decay=14) * 0.25
        + snare(i, freq=220, decay=20) * 0.30
        + hihat(i, decay=40) * 0.08
        + open_hihat(i, decay=12) * 0.06
        + sub_bass(i) * 0.20
        + chord_pad(i) * 0.40
        + arpeggio(i) * 0.15
        + melody(i) * 0.50
        + riser(i) * 0.30
    )
    abs_s = abs(s)
    if abs_s > peak:
        peak = abs_s
    samples.append(s)

print(f"Peak before normalize: {peak:.4f}")

if peak > 0:
    scale = 0.90 / peak
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
    ["ffmpeg", "-y", "-i", wav_path, "-c:a", "libmp3lame", "-b:a", "192k", mp3_path],
    capture_output=True,
    text=True,
)

print(result.stderr[-600:] if len(result.stderr) > 600 else result.stderr)
print(f"MP3 written: {mp3_path}")