# Education Site — AI Study Wizard

An educational exercise system with **accounts and progress tracking**. After signing in, a learner
lands on a **dashboard** showing their progress, then drills into:

```
Dashboard → Course ("Learn Basic English") → Module ("Learn Vocabulary") → Learn | Practice
```

- **Learn** — a calm, self-paced gallery. Tap any word to see the picture big with the name below,
  hear it spoken (auto-plays), and flip through cards with prev/next or the arrow keys. Studied words
  count toward your progress.
- **Practice** — a scored session that serves **8 different exercise types in random order**. Your
  score is saved to your account.

- **Frontend** — Vite + React + Tailwind. UI only; it ships **no data** and fetches everything from the API.
- **Backend** — FastAPI. **Owns the data** (the vocabulary JSON + the image/audio files), stores
  **accounts and progress in SQLite**, and judges free-text answers using **Gemini via LangChain**
  (with a deterministic fallback when no API key is set).

```
education_site/
  frontend/   # Vite + React app (auth, dashboard, courses, learn/practice)
  backend/    # FastAPI app + the dataset/media + SQLite (data/app.db)
```

## Accounts & progress

- Register or log in with email + password. Passwords are hashed with **PBKDF2** (standard library);
  login issues a bearer token stored in the `sessions` table.
- Progress is tracked per account: **words studied** in Learn mode and **scores** of finished Practice
  sessions, aggregated on the dashboard (words learned, sessions played, best score, stars).
- Everything persists in **`backend/data/app.db`** (plain `sqlite3`, created automatically on first
  run, git-ignored, and bind-mounted in Docker so it survives restarts).

## The 8 exercise types

| Exercise | What the learner does | Checked by |
|----------|----------------------|-----------|
| Choose the sentence | See an image, pick the right sentence (5 options) | client |
| Type the word | See an image, type what it is | **LLM** |
| Match the pairs | Match 4 words to their images | client |
| Pick the picture | See a word, choose the matching image (of 4) | client |
| Fill the blank | Type the missing word in a sentence | **LLM** |
| Unscramble | Rearrange letter tiles to spell the word | client |
| Listen & choose | Hear the word (TTS), pick the matching image | client |
| True or False | Decide whether a sentence matches the image | client |

Only **Type the word** and **Fill the blank** call the backend LLM. Everything else runs in the browser,
so the app is fully playable even without a Gemini key (those two then fall back to tolerant matching).

## Running it

### Option A — Docker (one command)

```bash
cp .env.example .env     # optional: paste your Gemini key into GOOGLE_API_KEY
docker compose up --build
```

- Frontend → http://localhost:5173
- Backend  → http://localhost:8000

`backend/data/` is bind-mounted, so you can edit `vocabulary.json` or drop images into
`backend/data/images/` and just refresh the browser — no rebuild needed. Stop with `Ctrl+C` (or
`docker compose down`).

### Option B — Run locally

### 1. Backend

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env        # then paste your Gemini key into GOOGLE_API_KEY (optional)
uvicorn app.main:app --reload --port 8000
```

- `GET  http://localhost:8000/api/vocabulary` — the dataset (image/audio fields are full URLs)
- `GET  http://localhost:8000/api/courses` — the course catalog for the dashboard
- `POST http://localhost:8000/api/check-answer` — LLM answer judging
- `POST http://localhost:8000/api/auth/register` · `login` · `logout`, `GET /api/auth/me` — accounts
- `POST http://localhost:8000/api/progress/learned` · `practice`, `GET /api/progress/summary` — progress (auth required)
- `GET  http://localhost:8000/api/health`
- Get a Gemini key at https://aistudio.google.com/app/apikey (optional — only the two typed exercises use it).

### 2. Frontend

```bash
cd frontend
npm install
npm run dev                 # http://localhost:5173
```

`frontend/.env` sets `VITE_API_BASE` (default `http://localhost:8000`). If you run the backend on a
different port, update it there. The backend already allows the Vite dev origins on ports 5173–5175.

## Adding / changing vocabulary

All data lives in the **backend** — the frontend never holds data files.

1. Add an image to `backend/data/images/` (e.g. `running.png`).
2. Add a row to `backend/data/vocabulary.json`:

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

- `image` is just the filename inside `backend/data/images/`; the backend serves it at
  `/static/images/<file>` and rewrites it to a full URL in `GET /api/vocabulary`.
- `audio` is derived automatically: the backend serves `backend/data/audio/<id>.mp3` at
  `/static/audio/<id>.mp3` and adds the full URL to each row. Learning mode auto-plays it (and falls
  back to browser speech synthesis if the clip is missing).
- `category` groups items so distractors and True/False swaps stay plausible.
- `altWords` are accepted synonyms used by distractors and the fallback checker.
- Missing image files are logged as warnings but don't break the app — entries still appear with a
  placeholder while you add art.

The seeded dataset has 10 items (running, dancing, walking, talking, eating, sleeping, angry, sad,
happy, scared). Drop matching PNGs into `backend/data/images/` to see the real pictures.

## Generating images and audio (OpenAI)

Both generators read `backend/data/vocabulary.json` and write next to it, one item at a time. They
need `OPENAI_API_KEY` in your `.env`, and skip files that already exist (pass `overwrite=True` in code
to regenerate).

```bash
cd backend
python -m scripts.image_gen.generate   # pictures    -> data/images/<image>   (uses each row's imagePrompt)
python -m scripts.audio_gen.generate   # spoken word -> data/audio/<id>.mp3   (text-to-speech of the word)
```

## Adding a new exercise type

Exercises are plugins. Create `frontend/src/exercises/MyExercise.jsx` that default-exports
`{ id, name, needs, usesLLM, Component }`, where `Component({ items, pool, onResult })` calls
`onResult(correct, { message })` when answered, then register it in
`frontend/src/exercises/registry.js`. That's it.
