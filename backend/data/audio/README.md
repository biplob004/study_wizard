# Vocabulary audio

Spoken-word clips for each entry in `../vocabulary.json`, one per word.

- The filename is the entry's **id** plus `.mp3` (e.g. `running.mp3`), so the backend can derive the
  URL without storing it in `vocabulary.json`.
- Generate them with `python -m scripts.audio_gen.generate` (uses OpenAI text-to-speech and saves
  here, mirroring how `scripts/image_gen/generate.py` saves images).
- The backend serves this folder as static files at `/static/audio/<id>.mp3` and adds an `audio`
  field (full URL) to every row returned by `GET /api/vocabulary`.
- A clip simply says the word, so Learning mode can auto-play it next to the picture.

Any entry whose clip is missing still works: the frontend falls back to the browser's built-in speech
synthesis (Web Speech API). Run the generator again to fill in the real audio.
