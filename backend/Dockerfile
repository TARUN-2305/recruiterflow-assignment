# Recruiter Bot API image (optional: the host workflow in README.md works without Docker).
FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Dependencies first so code changes do not invalidate this layer. Runtime deps only.
COPY requirements.txt .
RUN pip install -r requirements.txt

# Run as an unprivileged user.
RUN useradd --create-home --uid 10001 app

COPY app ./app
COPY scripts ./scripts
COPY migrations ./migrations
COPY seed ./seed
COPY sql_detective ./sql_detective

USER app
EXPOSE 8000

# DATABASE_URL (and SQL_DETECTIVE_DATABASE_URL) come from the environment at run time;
# no credentials are baked into the image.
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD python -c "import sys, urllib.request; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=2).status == 200 else 1)"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
