"""Generate vocabulary images with OpenAI's image model.

Run it to generate an image for every entry in data/vocabulary.json (one at a
time) and save each into data/images/:

    python -m scripts.image_gen.generate

Requires OPENAI_API_KEY in the environment (or a .env file).
"""

import base64
import json
from pathlib import Path

from openai import OpenAI

# data/vocabulary.json -> data/images/, both live under the vocabulary course
# package (backend/app/courses/vocabulary/data/).
DATA_DIR = Path(__file__).resolve().parents[2] / "app" / "courses" / "vocabulary" / "data"
VOCAB_PATH = DATA_DIR / "vocabulary.json"
IMAGES_DIR = DATA_DIR / "images"

MODEL = "gpt-image-2"  # documented model; swap to "gpt-image-2" if available to you
SIZE = "1024x1024"     # also: 1024x1536, 1536x1024
QUALITY = "low"        # low | medium | high | auto

# Pricing in USD per 1,000,000 tokens. Edit to match your model's current rates.
# Defaults follow OpenAI's published gpt-image token pricing.
PRICE_TEXT_INPUT_PER_M = 5.00     # text input tokens
PRICE_IMAGE_INPUT_PER_M = 10.00   # image input tokens (only used for edits/variations)
PRICE_IMAGE_OUTPUT_PER_M = 30.00  # generated image output tokens

client = OpenAI()  # reads OPENAI_API_KEY

_total_cost = 0.0  # running total across this process


def _report_usage(usage) -> float:
    """Print token counts and price for one response, update the running total,
    and return this call's cost in USD."""
    global _total_cost
    if usage is None:
        print("  usage: not reported by API", flush=True)
        return 0.0

    input_tokens = getattr(usage, "input_tokens", 0) or 0
    output_tokens = getattr(usage, "output_tokens", 0) or 0
    total_tokens = getattr(usage, "total_tokens", input_tokens + output_tokens) or 0

    details = getattr(usage, "input_tokens_details", None)
    text_tokens = getattr(details, "text_tokens", None) if details else None
    image_input_tokens = getattr(details, "image_tokens", None) if details else None
    if text_tokens is None:  # no breakdown -> treat all input as text
        text_tokens = input_tokens
        image_input_tokens = 0

    cost = (
        text_tokens * PRICE_TEXT_INPUT_PER_M
        + (image_input_tokens or 0) * PRICE_IMAGE_INPUT_PER_M
        + output_tokens * PRICE_IMAGE_OUTPUT_PER_M
    ) / 1_000_000
    _total_cost += cost

    print(
        f"  tokens: input={input_tokens} (text={text_tokens}, "
        f"image={image_input_tokens or 0}), output={output_tokens}, total={total_tokens}",
        flush=True,
    )
    print(f"  cost: ${cost:.4f}   running total: ${_total_cost:.4f}", flush=True)
    return cost


def generate_image(prompt: str, out_path: Path, *, size: str = SIZE, quality: str = QUALITY) -> Path:
    """Generate a single image from `prompt` and write it to `out_path`."""
    response = client.images.generate(
        model=MODEL,
        prompt=prompt,
        size=size,
        quality=quality,
        n=1,
    )
    _report_usage(getattr(response, "usage", None))
    # gpt-image-* always returns base64 in data[0].b64_json (data is a list even for n=1)
    image_bytes = base64.b64decode(response.data[0].b64_json)
    out_path = Path(out_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_bytes(image_bytes)
    return out_path


def generate_from_vocabulary(*, overwrite: bool = False) -> list[Path]:
    """Generate an image for each vocabulary entry that has an `imagePrompt`, one at
    a time. Skips entries whose target file already exists unless `overwrite=True`."""
    entries = json.loads(VOCAB_PATH.read_text())
    written: list[Path] = []
    failed: list[str] = []
    for entry in entries:
        prompt = entry.get("imagePrompt")
        filename = entry.get("image")
        if not prompt or not filename:
            continue
        out_path = IMAGES_DIR / filename
        if out_path.exists() and not overwrite:
            print(f"skip {filename} (exists)", flush=True)
            continue
        print(f"generating {filename} ...", flush=True)
        try:
            generate_image(prompt, out_path)
        except Exception as exc:
            failed.append(filename)
            print(f"  ERROR generating {filename}: {exc}", flush=True)
            continue
        written.append(out_path)
    print(f"\nwrote {len(written)} image(s) | total cost: ${_total_cost:.4f}", flush=True)
    if failed:
        print(f"failed {len(failed)} image(s): {', '.join(failed)}", flush=True)
    return written


def main() -> None:
    paths = generate_from_vocabulary()
    print(f"wrote {len(paths)} image(s) to {IMAGES_DIR}", flush=True)


if __name__ == "__main__":
    main()
