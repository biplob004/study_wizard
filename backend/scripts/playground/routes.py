"""API routes for the image-generation playground."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request

from .gemini_image import DEFAULT_MODEL, ImageGenerationError, generate_image
from .schemas import GenerateImageRequest, GenerateImageResponse

router = APIRouter(prefix="/api/playground", tags=["playground"])


@router.post("/generate-image", response_model=GenerateImageResponse)
def generate(req: GenerateImageRequest, request: Request) -> GenerateImageResponse:
    """Generate an image from a text description and save it under data/images/.

    The saved file is immediately served at ``/static/images/<filename>``, the same place the
    vocabulary endpoints look, so a generated image can be referenced from ``vocabulary.json`` right
    away.
    """
    try:
        path = generate_image(req.filename, req.description, overwrite=req.overwrite)
    except ImageGenerationError as exc:
        # No API key / name clash / empty input → client error; model failures → upstream error.
        message = str(exc)
        status = 502 if "Gemini request failed" in message or "returned no image" in message else 400
        raise HTTPException(status_code=status, detail=message) from exc

    base = str(request.base_url).rstrip("/")
    return GenerateImageResponse(
        filename=path.name,
        url=f"{base}/static/images/{path.name}",
        model=DEFAULT_MODEL,
    )
