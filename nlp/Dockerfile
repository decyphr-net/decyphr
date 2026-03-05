FROM python:3.11-slim

WORKDIR /app

# install deps
COPY requirements.txt .
RUN apt-get update && apt-get install -y --no-install-recommends build-essential \
    && awk '!/^torch==/' requirements.txt > /tmp/requirements.no-torch.txt \
    && pip install --no-cache-dir --index-url https://download.pytorch.org/whl/cpu torch==2.5.1 \
    && pip install --no-cache-dir -r /tmp/requirements.no-torch.txt \
    && rm -f /tmp/requirements.no-torch.txt \
    && apt-get purge -y --auto-remove build-essential \
    && rm -rf /var/lib/apt/lists/*

ENV STANZA_RESOURCES_DIR=/opt/stanza_resources
RUN python -c "import stanza; stanza.download('ga', processors='tokenize,pos,lemma')"

# copy app
COPY app ./app

ENV PORT=8300
EXPOSE 8300

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8300", "--workers", "1"]
