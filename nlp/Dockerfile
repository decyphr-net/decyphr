FROM python:3.11-slim

WORKDIR /app

# install deps
COPY requirements.txt .
RUN apt-get update && apt-get install -y build-essential \
    && pip install --no-cache-dir -r requirements.txt \
    && apt-get purge -y --auto-remove build-essential \
    && rm -rf /var/lib/apt/lists/*

# copy app
COPY app ./app

# optionally: pre-download stanza models (example for 'ga')
# RUN python -c "import stanza; stanza.download('ga')"

ENV PORT=8300
EXPOSE 8300

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8300", "--workers", "1"]
