FROM python:3.12-slim

WORKDIR /app

# Install deps first for better layer caching.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# App code and scripts (course data lives inside app/courses/*/data/).
# The SQLite DB (data/app.db) is created on first run; ensure the dir exists.
COPY app ./app
COPY scripts ./scripts
RUN mkdir -p data

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
