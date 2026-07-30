# syntax=docker/dockerfile:1
#
# Single image: nginx serves the built React app and proxies /api to FastAPI,
# both supervised in one container. Only port 3000 is exposed.
#
# The `# syntax` line above enables BuildKit, which keeps intermediate build
# stages in the build cache instead of leaving them behind as dangling
# `<none>:<none>` images. Build with `docker compose build` (BuildKit is the
# default) or `DOCKER_BUILDKIT=1 docker build .`.

# ==========================================
# Stage 1: Build Frontend (React + Vite)
# ==========================================
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

COPY frontend/package*.json ./
# npm ci is reproducible and faster than install; the cache mount keeps the
# downloaded tarballs out of the image layers.
RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --no-fund

COPY frontend/ ./

# Vite inlines env vars at build time. Building without VITE_API_URL makes the
# bundle use relative paths, which nginx then proxies to the backend — so no
# .env file must leak in from the build context.
RUN rm -f .env .env.production .env.local .env.development \
    && npm run build


# ==========================================
# Stage 2: Build Python Dependencies
# ==========================================
FROM python:3.12-slim AS python-builder

ENV PIP_DISABLE_PIP_VERSION_CHECK=1

RUN apt-get update && apt-get install -y --no-install-recommends \
        gcc \
        g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY backend/requirements.txt ./
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --prefix=/install -r requirements.txt

# ChromaDB pulls these in for its *default* embedding function, which AgentForge
# never uses — embeddings run on Ollama. Removing them saves ~117 MB.
#
# They have to be deleted rather than `pip uninstall`ed: uninstall only knows
# about the interpreter's own environment, not a tree installed with --prefix.
#
# grpcio deliberately stays: unlike these four, ChromaDB imports it eagerly, and
# the probe below fails the build without it.
RUN set -eux; \
    site="$(echo /install/lib/python*/site-packages)"; \
    for pkg in onnxruntime kubernetes tokenizers hf_xet; do \
        rm -rf "$site/$pkg" "$site/${pkg}"-*.dist-info "$site/${pkg}"-*.egg-info; \
    done

# Drop bytecode and vendored test suites; regenerated or unused at runtime.
RUN find /install -type d -name '__pycache__' -prune -exec rm -rf {} + \
    && find /install -type d -name 'tests' -prune -exec rm -rf {} + \
    && find /install -type f -name '*.pyc' -delete

# Fail the build rather than ship an image whose vector store is broken by the
# pruning above.
RUN PYTHONPATH="$(echo /install/lib/python*/site-packages)" python - <<'PY'
import hashlib, tempfile
from chromadb.api.types import EmbeddingFunction
import chromadb

class FakeEF(EmbeddingFunction):
    def __init__(self): pass
    def __call__(self, input):
        return [[b / 255.0 for b in hashlib.sha256(t.encode()).digest()[:8]] for t in input]
    def name(self): return "fake"

with tempfile.TemporaryDirectory() as tmp:
    client = chromadb.PersistentClient(path=tmp)
    col = client.get_or_create_collection(name="probe", embedding_function=FakeEF())
    col.add(documents=["alpha", "beta"], ids=["a", "b"], metadatas=[{"i": 0}, {"i": 1}])
    got = col.query(query_texts=["alpha"], n_results=1)["documents"][0]
    assert got == ["alpha"], got
print("chromadb vector path OK after pruning")
PY


# ==========================================
# Stage 3: Final Production Image
# ==========================================
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    # Defaults baked into the image so a bare `docker run -v ...:/app/data` puts
    # every piece of state (database, vectors, settings key) inside the volume.
    # docker-compose can still override them.
    DATABASE_URL=sqlite+aiosqlite:////app/data/agentforge.db \
    CHROMA_PERSIST_DIRECTORY=/app/data/chroma_data

# nginx + supervisor to run both processes; libmagic for file type sniffing.
# No curl: the healthcheck uses the Python interpreter already present.
RUN apt-get update && apt-get install -y --no-install-recommends \
        nginx \
        supervisor \
        libmagic1 \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

WORKDIR /app

COPY --from=python-builder /install /usr/local

COPY backend/ ./
COPY --from=frontend-builder /app/frontend/dist /var/www/html

RUN rm -f /etc/nginx/sites-enabled/default
COPY nginx.conf /etc/nginx/sites-available/agentforge
COPY supervisord.conf /etc/supervisor/supervisord.conf
RUN ln -s /etc/nginx/sites-available/agentforge /etc/nginx/sites-enabled/

# Run unprivileged. nginx needs to own its runtime dirs, and /app/data holds the
# SQLite file, the Chroma store and the generated settings encryption key.
RUN useradd --create-home --uid 1000 agentforge \
    && mkdir -p /app/data /var/log/supervisor /var/log/nginx \
                /var/lib/nginx/body /var/cache/nginx /run/nginx \
    # nginx's pid, logs and temp paths all default to root-owned locations.
    # Move the pid, drop the `user` directive (meaningless when not root) and
    # send logs to the container's stdout/stderr instead of files.
    && sed -i 's#^pid .*#pid /run/nginx/nginx.pid;#' /etc/nginx/nginx.conf \
    && sed -i '/^user /d' /etc/nginx/nginx.conf \
    && sed -i 's#^\s*error_log .*#error_log /dev/stderr warn;#' /etc/nginx/nginx.conf \
    && sed -i 's#^\s*access_log .*#access_log /dev/stdout;#' /etc/nginx/nginx.conf \
    && chown -R agentforge:agentforge \
        /app /var/log/supervisor /var/log/nginx /var/lib/nginx /var/cache/nginx \
        /run/nginx /var/www/html

USER agentforge

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:3000/health', timeout=5).status == 200 else 1)"

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/supervisord.conf"]
