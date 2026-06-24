"""Generate images with Gemini and save them into the backend's data/images folder.

Like the answer-checking LLM, this requires ``GOOGLE_API_KEY``. Unlike that module there is no
deterministic fallback — image generation is the whole point — so calls raise ``ImageGenerationError``
when the key is missing or the model returns no image, and the API layer turns that into a clean HTTP
error.
"""

from __future__ import annotations

import io
import logging
import os
import re
from functools import lru_cache
from pathlib import Path

from PIL import Image

# The image folder is owned by the core app; reuse it so generated art is served immediately.
from app.vocabulary import IMAGES_DIR

logger = logging.getLogger("playground.gemini_image")

# Gemini's native image generation model ("Nano Banana" family). The 3.1 Flash Image model
# generates via generate_content() and returns the image as inline_data bytes (parsed below).
DEFAULT_MODEL = os.getenv("GEMINI_IMAGE_MODEL", "gemini-3.1-flash-image")

# gemini-3.1-flash-image renders at fixed tiers (1K/2K/4K), not arbitrary pixel sizes. We request
# the cheapest square 1K image (~$0.067) and downscale it to 512x512 locally for the flashcards.
OUTPUT_SIZE = 512

_ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}


class ImageGenerationError(RuntimeError):
    """Raised when an image cannot be generated (no API key, model error, no image returned)."""


@lru_cache(maxsize=1)
def _get_client():
    """Build the Gemini client once, or raise if it can't be configured."""
    if not os.getenv("GOOGLE_API_KEY"):
        raise ImageGenerationError("GOOGLE_API_KEY is not set — cannot generate images.")
    try:
        from google import genai

        return genai.Client()  # reads GOOGLE_API_KEY from the environment
    except Exception as exc:  # noqa: BLE001 - surface any import/config failure as our error type
        logger.exception("Failed to initialize the Gemini client")
        raise ImageGenerationError(f"Could not initialize Gemini client: {exc}") from exc


def _safe_filename(filename: str) -> str:
    """Turn a user-supplied name into a safe ``data/images`` file name.

    Strips any directory components, keeps a sensible image extension (defaulting to ``.png``), and
    replaces unfriendly characters so the result is safe to serve as a static path.
    """
    name = Path(filename.strip()).name  # drop any path components / traversal
    if not name:
        raise ImageGenerationError("filename must not be empty.")

    stem, ext = os.path.splitext(name)
    ext = ext.lower()
    if ext not in _ALLOWED_EXTENSIONS:
        stem, ext = name, ".png"  # no/unknown extension → treat the whole thing as the stem

    stem = re.sub(r"[^A-Za-z0-9._-]+", "-", stem).strip("-._")
    if not stem:
        raise ImageGenerationError("filename has no usable characters.")
    return f"{stem}{ext}"


def _extract_image_bytes(response) -> bytes | None:
    """Pull the first inline image payload out of a generate_content response."""
    for candidate in getattr(response, "candidates", None) or []:
        content = getattr(candidate, "content", None)
        for part in getattr(content, "parts", None) or []:
            inline = getattr(part, "inline_data", None)
            if inline and getattr(inline, "data", None):
                return inline.data
    return None


def generate_image(filename: str, description: str, *, overwrite: bool = False) -> Path:
    """Generate an image from ``description`` and save it to ``data/images/<filename>``.

    Returns the path to the written file. Raises ``ImageGenerationError`` on any failure.
    """
    if not description or not description.strip():
        raise ImageGenerationError("description must not be empty.")

    safe_name = _safe_filename(filename)
    IMAGES_DIR.mkdir(parents=True, exist_ok=True)
    target = IMAGES_DIR / safe_name
    if target.exists() and not overwrite:
        raise ImageGenerationError(
            f"{safe_name} already exists. Pass overwrite=true to replace it."
        )

    client = _get_client()
    from google.genai import types

    prompt = (
        "Generate a single, clear illustration for a vocabulary flashcard. "
        "Square composition, simple background, no text or watermarks. "
        f"Subject: {description.strip()}"
    )
    # Cheapest tier: a square 1K image. We downscale to 512x512 below.
    config = types.GenerateContentConfig(
        image_config=types.ImageConfig(aspect_ratio="1:1", image_size="1K"),
    )

    try:
        response = client.models.generate_content(
            model=DEFAULT_MODEL, contents=prompt, config=config
        )
    except Exception as exc:  # noqa: BLE001
        logger.exception("Gemini image generation failed")
        raise ImageGenerationError(f"Gemini request failed: {exc}") from exc

    image_bytes = _extract_image_bytes(response)
    if not image_bytes:
        raise ImageGenerationError("Gemini returned no image for that description.")

    _save_resized(image_bytes, target)
    logger.info("Saved %dx%d image to %s", OUTPUT_SIZE, OUTPUT_SIZE, target)
    return target


def _save_resized(image_bytes: bytes, target: Path) -> None:
    """Downscale the generated image to OUTPUT_SIZE x OUTPUT_SIZE and save it to ``target``.

    The model renders at a fixed 1K tier, so we resize locally. The format is inferred from the
    target's extension (JPEG output is flattened to RGB since it has no alpha channel).
    """
    try:
        image = Image.open(io.BytesIO(image_bytes))
        image = image.resize((OUTPUT_SIZE, OUTPUT_SIZE), Image.LANCZOS)
        if target.suffix.lower() in {".jpg", ".jpeg"} and image.mode != "RGB":
            image = image.convert("RGB")
        image.save(target)
    except Exception as exc:  # noqa: BLE001
        logger.exception("Failed to resize/save the generated image")
        raise ImageGenerationError(f"Could not process the generated image: {exc}") from exc
