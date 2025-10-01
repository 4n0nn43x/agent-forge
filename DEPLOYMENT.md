# 🚀 AgentForge Deployment Guide

Complete guide for deploying AgentForge on NodeOps and other platforms.

---

## 📋 Table of Contents

1. [NodeOps Deployment](#nodeops-deployment)
2. [Docker Deployment](#docker-deployment)
3. [Environment Configuration](#environment-configuration)
4. [Troubleshooting](#troubleshooting)
5. [Performance Optimization](#performance-optimization)

---

## 🌐 NodeOps Deployment

### Prerequisites

- NodeOps account with deployment credits
- LLM API key (OpenAI or Anthropic)
- Docker image built and tested locally

### Step 1: Build Production Image

```bash
# Navigate to project root
cd agentforge

# Build the full application
docker-compose build

# Tag images for NodeOps
docker tag agentforge-backend:latest yourusername/agentforge-backend:v1.0.0
docker tag agentforge-frontend:latest yourusername/agentforge-frontend:v1.0.0
```

### Step 2: Push to Container Registry

```bash
# Login to Docker Hub (or your preferred registry)
docker login

# Push images
docker push yourusername/agentforge-backend:v1.0.0
docker push yourusername/agentforge-frontend:v1.0.0
```

### Step 3: Configure NodeOps

Create a `nodeops-config.yaml`:

```yaml
version: "1.0"
services:
  backend:
    image: yourusername/agentforge-backend:v1.0.0
    ports:
      - "8000:8000"
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - ENV=production
      - LOG_LEVEL=INFO
    volumes:
      - agentforge-data:/app/data
      - agentforge-chroma:/app/chroma_data
    resources:
      memory: 2Gi
      cpu: 1

  frontend:
    image: yourusername/agentforge-frontend:v1.0.0
    ports:
      - "3000:3000"
    environment:
      - VITE_API_URL=https://your-backend-url.nodeops.xyz
    depends_on:
      - backend
    resources:
      memory: 512Mi
      cpu: 0.5

volumes:
  agentforge-data:
  agentforge-chroma:
```

### Step 4: Deploy to NodeOps

1. **Via NodeOps CLI:**
```bash
nodeops deploy --config nodeops-config.yaml
```

2. **Via NodeOps Dashboard:**
   - Login to NodeOps dashboard
   - Create new deployment
   - Upload `docker-compose.yml` or paste config
   - Set environment variables
   - Click "Deploy"

### Step 5: Configure Environment Variables

In the NodeOps dashboard, set these secrets:

```
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

### Step 6: Verify Deployment

1. Check health endpoints:
```bash
curl https://your-backend-url.nodeops.xyz/health
curl https://your-frontend-url.nodeops.xyz/health
```

2. Test API:
```bash
curl https://your-backend-url.nodeops.xyz/api/agents/templates
```

3. Access frontend:
   - Open: https://your-frontend-url.nodeops.xyz
   - Create a test agent
   - Verify functionality

---

## 🐳 Docker Deployment (General)

### Single-Host Deployment

1. **Clone repository on server:**
```bash
git clone https://github.com/yourusername/agentforge.git
cd agentforge
```

2. **Configure environment:**
```bash
cp .env.example .env
nano .env  # Add your API keys
```

3. **Start services:**
```bash
docker-compose up -d
```

4. **Check status:**
```bash
docker-compose ps
docker-compose logs -f
```

### Using Pre-built Images

```yaml
# docker-compose.yml
services:
  backend:
    image: yourusername/agentforge-backend:latest
    # ... rest of config

  frontend:
    image: yourusername/agentforge-frontend:latest
    # ... rest of config
```

```bash
docker-compose pull
docker-compose up -d
```

---

## ⚙️ Environment Configuration

### Required Variables

```bash
# At least one of these is REQUIRED
OPENAI_API_KEY=sk-...        # For GPT models
ANTHROPIC_API_KEY=sk-ant-... # For Claude models
```

### Optional Variables

```bash
# Application
ENV=production              # production | development
DEBUG=False                 # True | False
LOG_LEVEL=INFO             # DEBUG | INFO | WARNING | ERROR

# API Configuration
API_HOST=0.0.0.0
API_PORT=8000
CORS_ORIGINS=http://localhost:3000  # Comma-separated

# Database
DATABASE_URL=sqlite+aiosqlite:///./data/agentforge.db

# Vector Store
CHROMA_PERSIST_DIRECTORY=./data/chroma_data

# Embeddings
EMBEDDING_MODEL=sentence-transformers  # or "openai"
EMBEDDING_MODEL_NAME=all-MiniLM-L6-v2

# Document Upload
MAX_UPLOAD_SIZE_MB=10
ALLOWED_EXTENSIONS=pdf,txt,md,docx

# Rate Limiting
CHAT_RATE_LIMIT=60  # requests per minute
```

### Frontend Variables

```bash
# API URL (must be accessible from browser)
VITE_API_URL=http://localhost:8000
```

---

## 🔍 Troubleshooting

### Common Issues

#### 1. "No LLM API keys found"

**Problem:** Backend starts but can't create agents.

**Solution:**
```bash
# Check if environment variables are set
docker-compose exec backend env | grep API_KEY

# If missing, add to .env file
echo "OPENAI_API_KEY=sk-your-key" >> .env
docker-compose restart backend
```

#### 2. Frontend can't connect to backend

**Problem:** Chat fails with network error.

**Solution:**
```bash
# Check CORS settings
# In .env, ensure frontend URL is in CORS_ORIGINS
CORS_ORIGINS=http://localhost:3000,https://your-frontend-url.com

# Restart backend
docker-compose restart backend
```

#### 3. Document upload fails

**Problem:** "File too large" error.

**Solution:**
```bash
# Increase max upload size
echo "MAX_UPLOAD_SIZE_MB=20" >> .env
docker-compose restart backend
```

#### 4. ChromaDB errors

**Problem:** "Collection already exists" or similar.

**Solution:**
```bash
# Reset vector database (WARNING: deletes all documents)
docker-compose down
docker volume rm agentforge_chroma-data
docker-compose up -d
```

#### 5. Database locked errors

**Problem:** SQLite database locked.

**Solution:**
```bash
# Ensure only one backend instance is running
docker-compose ps
docker-compose restart backend
```

### Health Check Commands

```bash
# Check all services
docker-compose ps

# Check logs
docker-compose logs backend
docker-compose logs frontend

# Check health endpoints
curl http://localhost:8000/health
curl http://localhost:3000/health

# Check disk usage
docker-compose exec backend du -sh /app/data
docker-compose exec backend du -sh /app/chroma_data
```

### Performance Monitoring

```bash
# Container stats
docker stats

# Backend metrics
curl http://localhost:8000/
curl http://localhost:8000/docs

# Database size
docker-compose exec backend ls -lh /app/data/
```

---

## ⚡ Performance Optimization

### 1. Resource Allocation

```yaml
# docker-compose.yml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G
        reservations:
          cpus: '1'
          memory: 2G
```

### 2. ChromaDB Optimization

```python
# For large document collections, use batching
# Automatically handled in current implementation
# Batch size: 1000 documents per batch
```

### 3. Caching

```bash
# Enable Redis for session caching (future enhancement)
# Current version uses in-memory caching
```

### 4. Database Optimization

```bash
# Vacuum SQLite database periodically
docker-compose exec backend sqlite3 /app/data/agentforge.db "VACUUM;"
```

### 5. Log Rotation

```yaml
# docker-compose.yml
services:
  backend:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

---

## 🔒 Security Considerations

### Production Checklist

- [ ] API keys stored as secrets (not in code)
- [ ] HTTPS enabled for all endpoints
- [ ] CORS origins restricted to your domain
- [ ] File upload size limits enforced
- [ ] Rate limiting enabled
- [ ] Health check endpoints don't expose sensitive data
- [ ] Regular security updates

### Recommended .env Security

```bash
# Never commit .env to git
echo ".env" >> .gitignore

# Set proper permissions
chmod 600 .env

# Use secrets management for production
# NodeOps: Use built-in secrets
# AWS: Use Secrets Manager
# GCP: Use Secret Manager
```

---

## 📊 Monitoring

### Logs

```bash
# Real-time logs
docker-compose logs -f

# Backend only
docker-compose logs -f backend

# Last 100 lines
docker-compose logs --tail=100
```

### Metrics to Monitor

- API response times
- Document processing times
- Vector search latency
- LLM token usage
- Error rates
- Disk space usage

---

## 🔄 Updates and Maintenance

### Updating AgentForge

```bash
# Pull latest code
git pull origin main

# Rebuild images
docker-compose build

# Restart with new images
docker-compose up -d

# Check health
docker-compose ps
```

### Backup

```bash
# Backup volumes
docker run --rm \
  -v agentforge_backend-data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/agentforge-backup-$(date +%Y%m%d).tar.gz /data

# Restore
docker run --rm \
  -v agentforge_backend-data:/data \
  -v $(pwd):/backup \
  alpine tar xzf /backup/agentforge-backup-20251001.tar.gz -C /
```

---

## 📞 Support

- **Documentation**: See README.md
- **Issues**: GitHub Issues
- **NodeOps Support**: support@nodeops.xyz

---

**🎉 Happy Deploying!**
