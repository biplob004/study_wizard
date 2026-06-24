"""Generate spoken-word audio for vocabulary with OpenAI's text-to-speech model.

Run it to generate an audio clip for every entry in data/vocabulary.json (one at
a time) and save each into data/audio/ as ``<id>.mp3``:

    python -m scripts.audio_gen.generate

Each clip simply speaks the vocabulary word (e.g. "running"), so Learning mode can
auto-play it next to the picture. This mirrors scripts/image_gen/generate.py.

Requires OPENAI_API_KEY in the environment (or a .env file).
"""

import json
from pathlib import Path

from openai import OpenAI

# data/vocabulary.json -> data/audio/, both live under backend/ (two levels up from
# backend/scripts/audio_gen/).
DATA_DIR = Path(__file__).resolve().parents[2] / "data"
VOCAB_PATH = DATA_DIR / "vocabulary.json"
AUDIO_DIR = DATA_DIR / "audio"

MODEL = "tts-1-hd"         # modern TTS model; "tts-1" / "tts-1-hd" also work
VOICE = "alloy"            # alloy | echo | fable | onyx | nova | shimmer
FORMAT = "mp3"             # mp3 | opus | aac | flac | wav | pcm

# A short instruction to keep delivery clear and learner-friendly (gpt-4o-mini-tts only).
INSTRUCTIONS = "Speak the single word clearly and slowly, in a friendly, encouraging tone. For vocabulary learning."

# Rough cost estimate in USD per 1,000,000 input characters. Edit to match your model's
# current rates. gpt-4o-mini-tts bills per token; this character estimate is just a guide.
PRICE_PER_1M_CHARS = 30.0

client = OpenAI()  # reads OPENAI_API_KEY

_total_chars = 0  # running total of characters synthesized across this process


def generate_audio(text: str, out_path: Path, *, voice: str = VOICE, fmt: str = FORMAT) -> Path:
    """Synthesize speech for `text` and write it to `out_path`."""
    global _total_chars
    out_path = Path(out_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    kwargs = dict(model=MODEL, voice=voice, input=text, response_format=fmt)
    if MODEL.startswith("gpt-4o"):
        kwargs["instructions"] = INSTRUCTIONS

    # Stream the audio straight to disk (recommended for the speech endpoint).
    with client.audio.speech.with_streaming_response.create(**kwargs) as response:
        response.stream_to_file(out_path)

    _total_chars += len(text)
    est_cost = _total_chars / 1_000_000 * PRICE_PER_1M_CHARS
    print(f"  chars: {len(text)}   est. running total: ${est_cost:.4f}", flush=True)
    return out_path


def generate_from_vocabulary(*, overwrite: bool = False) -> list[Path]:
    """Generate a spoken clip for each vocabulary entry, one at a time. The clip says the
    entry's `word`. Skips entries whose target file already exists unless `overwrite=True`."""
    entries = json.loads(VOCAB_PATH.read_text())
    written: list[Path] = []
    failed: list[str] = []
    for entry in entries:
        word = entry.get("word")
        entry_id = entry.get("id")
        if not word or not entry_id:
            continue
        filename = f"{entry_id}.{FORMAT}"
        out_path = AUDIO_DIR / filename
        if out_path.exists() and not overwrite:
            print(f"skip {filename} (exists)", flush=True)
            continue
        print(f"generating {filename} ...", flush=True)
        try:
            generate_audio(word, out_path)
        except KeyboardInterrupt:
            # Drop the partial file so a later run retries it, then stop.
            out_path.unlink(missing_ok=True)
            print(f"\ninterrupted while generating {filename}; stopping.", flush=True)
            raise
        except Exception as exc:
            failed.append(filename)
            print(f"  ERROR generating {filename}: {exc}", flush=True)
            # Remove any partial file so a later run retries this entry.
            out_path.unlink(missing_ok=True)
            continue
        written.append(out_path)
    est_cost = _total_chars / 1_000_000 * PRICE_PER_1M_CHARS
    print(f"\nwrote {len(written)} clip(s) | est. cost: ${est_cost:.4f}", flush=True)
    if failed:
        print(f"failed {len(failed)} clip(s): {', '.join(failed)}", flush=True)
    return written


def main() -> None:
    paths = generate_from_vocabulary()
    print(f"wrote {len(paths)} clip(s) to {AUDIO_DIR}", flush=True)


if __name__ == "__main__":
    main()
