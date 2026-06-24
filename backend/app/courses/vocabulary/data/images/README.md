# Vocabulary images

Drop one image file here for every entry in `../vocabulary.json`.

- The `image` field in each vocabulary entry is **just the filename** (e.g. `running.png`).
- If you generate images with `backend/scripts/generate_vocabulary_images_hf.py`, you can add an
  optional `imagePrompt` field to a vocabulary row and the generator will use that full description
  directly.
- The backend serves this folder as static files at `/static/images/<filename>` and rewrites the
  `image` field into a full URL when the frontend calls `GET /api/vocabulary`.
- Recommended: square-ish PNG/JPG/SVG, clearly showing the action or emotion.

Example vocabulary row with a custom generation prompt:

```json
{
  "id": "dragon",
  "word": "dragon",
  "sentence": "The dragon is flying.",
  "category": "animal",
  "image": "dragon.png",
  "imagePrompt": "A majestic dragon soaring through clouds at sunset, scales shimmering with iridescent colors, detailed fantasy art style"
}
```

Optional:

- `imagePromptSuffix`: appended after `imagePrompt` if you want extra constraints beyond the default
  `no text / no watermark / no borders` suffix.

Expected filenames for the seeded dataset:

```
running.png  dancing.png  walking.png  talking.png  eating.png
sleeping.png angry.png    sad.png      happy.png    scared.png
```

Any entry whose image file is missing will be logged as a warning on startup but still served, so the
app keeps working while you add art. To add new vocabulary, add a row to `vocabulary.json` and drop a
matching image here.
