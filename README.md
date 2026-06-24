# Education Site — AI Study Wizard

A modular learning platform that **hosts multiple courses** (Vocabulary, Comprehensive Reading,
Grammar, …). Each course is a self-contained plugin that owns its data, routes, and per-course
progress — so courses never interfere with each other and new ones drop in without touching shared
code.

After signing in, a learner lands on a **welcome page** with a hero, their cross-course progress,
and the course catalog, then drills into a course's activities:

```
Landing → Course (Vocabulary) → Learn | Practice
```

- **Learn** — a calm, self-paced gallery. Tap any word to see the picture big with the name below,
  hear it spoken (auto-plays), and flip through cards with prev/next or the arrow keys. Studied
  words count toward your progress.
- **Practice** — a scored session of **15 rounds**, mixed exercise types. Items are **biased toward
  words you haven't been asked before**, so multiple sessions cover the whole dataset. Your score is
  saved to your account, per course.

- **Frontend** — Vite + React + Tailwind. UI only; it ships **no data** and fetches everything from the API.
- **Backend** — FastAPI. **Owns the data** (the vocabulary JSON + the image/audio files), stores
  **accounts and per-course progress in SQLite**, and judges free-text answers using **Gemini via
  LangChain** (with a deterministic fallback when no API key is set).

```
education_site/
  frontend/   # Vite + React app (auth, landing, courses, learn/practice)
  backend/    # FastAPI app + per-course data + SQLite (data/app.db)
```

## Modular course architecture

Each course is a plugin on both sides — adding a course is a drop-in operation.

### Backend (`backend/app/courses/`)

```
backend/app/courses/
  __init__.py            # Course base class + registry (auto-discovers courses)
  vocabulary/
    course.py            # Course metadata + router (mounted at /api/courses/vocabulary)
    data.py              # dataset loader/validator
    llm.py               # Gemini answer checker (with fallback)
    data/
      vocabulary.json
      images/*.png
      audio/*.mp3
```

A course subclasses `Course` (in `app/courses/__init__.py`), sets its metadata and media dirs, and
optionally overrides `router()` to expose endpoints under `/api/courses/{id}`. To add a new course:

1. Create `app/courses/<your_course>/course.py` exporting a `course: Course` instance.
2. Add the subpackage name to `COURSE_PACKAGES` in `app/courses/__init__.py`.

That's it — the registry mounts its router and static media automatically.

### Frontend (`frontend/src/courses/`)

```
frontend/src/courses/
  registry.js            # maps course id -> activity components
  vocabulary/
    index.js             # descriptor: { id, activities: { learn, practice } }
    Learn.jsx
    Practice.jsx
```

Add the course folder, export a descriptor from `index.js`, and register it in
`frontend/src/courses/registry.js`.

## Accounts & per-course progress

- Register or log in with email + password. Passwords are hashed with **PBKDF2** (standard library);
  login issues a bearer token stored in the `sessions` table.
- **Progress is tracked per account *and per course*** — records for Vocabulary never intermingle
  with Grammar, etc. Each course's page shows its own tracking panel (items learned, practice
  sessions, best score, stars, progress bar).
- **Practice exposure tracking**: the items shown in each practice session are recorded per
  (user, course), and future sessions **down-weight already-asked items** so the whole dataset gets
  covered across multiple practices.
- Everything persists in **`backend/data/app.db`** (plain `sqlite3`, created automatically on first
  run, git-ignored, and bind-mounted in Docker so it survives restarts).

## The exercise types

| Exercise | What the learner does | Checked by |
|----------|----------------------|-----------|
| Match the pairs | Match 4 words to their images | client |
| Pick the picture | See a word, choose the matching image (of 4) | client |
| Unscramble | Rearrange letter tiles to spell the word | client |
| Listen & choose | Hear the word (TTS), pick the matching image | client |

All exercise types run entirely in the browser, so the app is fully playable without any API key.

## Running it

### Option A — Docker (one command)

```bash
cp .env.example .env     # optional: paste your Gemini key into GOOGLE_API_KEY
docker compose up --build
```

- Frontend → http://localhost:5173
- Backend  → http://localhost:8000

The vocabulary course's data (`backend/app/courses/vocabulary/data/`) is bind-mounted, so you can
edit `vocabulary.json` or drop images into its `images/` folder and just refresh the browser — no
rebuild needed. Stop with `Ctrl+C` (or `docker compose down`).

### Option B — Run locally

#### 1. Backend

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env        # then paste your Gemini key into GOOGLE_API_KEY (optional)
uvicorn app.main:app --reload --port 8000
```

API endpoints:

- `GET  /api/health`
- `GET  /api/courses` — the course catalog
- `GET  /api/courses/vocabulary/content` — the vocabulary dataset (image/audio fields are full URLs)
- `POST /api/courses/vocabulary/check-answer` — LLM answer judging (optional)
- `POST /api/auth/register` · `login` · `logout`, `GET /api/auth/me` — accounts
- `GET  /api/progress/summary` — cross-course progress overview (auth required)
- `POST /api/courses/vocabulary/progress/learned` · `practice`,
  `GET /api/courses/vocabulary/progress/summary` · `exposures` — per-course progress (auth required)

Static media is served per course at `/static/courses/{course_id}/images/...` and
`/static/courses/{course_id}/audio/...`.

#### 2. Frontend

```bash
cd frontend
npm install
npm run dev                 # http://localhost:5173
```

`frontend/.env` sets `VITE_API_BASE` (default `http://localhost:8000`). If you run the backend on a
different port, update it there. The backend already allows the Vite dev origins on ports 5173–5175.

## Adding / changing vocabulary

All data lives in the **backend**, inside the vocabulary course's own folder — the frontend never
holds data files.

1. Add an image to `backend/app/courses/vocabulary/data/images/` (e.g. `running.png`).
2. Add a row to `backend/app/courses/vocabulary/data/vocabulary.json`:

   ```json
   {
     "id": "running",
     "word": "running",
     "sentence": "The boy is running.",
     "category": "action",
     "image": "running.png",
     "altWords": ["run", "jog"]
   }
   ```

- `image` is just the filename; the backend serves it at
  `/static/courses/vocabulary/images/<file>` and rewrites it to a full URL in the content endpoint.
- `audio` is derived automatically: the backend serves `.../audio/<id>.mp3` and adds the full URL
  to each row. Learning mode auto-plays it (and falls back to browser speech synthesis if the clip is
  missing).
- `category` groups items so distractors stay plausible.
- `altWords` are accepted synonyms used by distractors and the fallback checker.
- Missing image files are logged as warnings but don't break the app — entries still appear with a
  placeholder while you add art.

## Generating images and audio (OpenAI)

Both generators read the vocabulary course's `data/vocabulary.json` and write next to it, one item at
a time. They need `OPENAI_API_KEY` in your `.env`, and skip files that already exist (pass
`overwrite=True` in code to regenerate).

```bash
cd backend
python -m scripts.image_gen.generate   # pictures    -> courses/vocabulary/data/images/<image>
python -m scripts.audio_gen.generate   # spoken word -> courses/vocabulary/data/audio/<id>.mp3
```

## Adding a new course

1. **Backend** — create `backend/app/courses/<id>/course.py` exporting a `course: Course` instance
   (subclass `Course`, set metadata + media dirs, override `router()` for course-scoped endpoints).
   Add `"<id>"` to `COURSE_PACKAGES` in `backend/app/courses/__init__.py`.
2. **Frontend** — create `frontend/src/courses/<id>/index.js` exporting a descriptor
   `{ id, activities: { ... } }`, and add it to `frontend/src/courses/registry.js`.

Each course automatically gets isolated progress tracking (the `learned_items` and
`practice_results` tables carry a `course_id` column), so records never intermingle.

## Adding a new exercise type

Exercises are plugins. Create `frontend/src/exercises/MyExercise.jsx` that default-exports
`{ id, name, needs, usesLLM, Component }`, where `Component({ items, pool, onResult })` calls
`onResult(correct, { message })` when answered, then register it in
`frontend/src/exercises/registry.js`. That's it.
