"""Pydantic schemas for the image-generation playground endpoint."""

from __future__ import annotations

from pydantic import BaseModel, Field


class GenerateImageRequest(BaseModel):
    """A request to generate an image from a text description and save it to disk."""

    filename: str = Field(
        description="Target file name, e.g. 'running.png'. Extension is optional (defaults to .png).",
    )
    description: str = Field(
        description="What to draw, e.g. 'a child running across a sunny park, flat illustration'.",
    )
    overwrite: bool = Field(
        default=False,
        description="If False (default), fail when a file with this name already exists.",
    )


class GenerateImageResponse(BaseModel):
    """The saved image's location."""

    filename: str = Field(description="The (sanitized) file name written to data/images/")
    url: str = Field(description="Full static URL the image is served from")
    model: str = Field(description="The Gemini model used to generate the image")
