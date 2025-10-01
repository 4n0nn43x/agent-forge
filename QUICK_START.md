# ⚡ Quick Start Guide

Get AgentForge running in 5 minutes!

---

## Prerequisites

- Docker and Docker Compose installed
- One API key: OpenAI **OR** Anthropic

---

## Installation Steps

### 1. Clone & Navigate
```bash
git clone <your-repo-url>
cd agentforge
```

### 2. Set API Keys
```bash
# Copy example env file
cp .env.example .env

# Edit and add your API key
nano .env
```

Add at least one:
```bash
OPENAI_API_KEY=sk-your-key-here
# OR
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

### 3. Start Application
```bash
docker-compose up -d
```

### 4. Access Application
- **Frontend**: http://localhost:3000
- **API Docs**: http://localhost:8000/docs
- **Health**: http://localhost:8000/health

---

## First Agent in 3 Steps

### Step 1: Click "Create Agent"
On the dashboard, click the "Create Agent" button.

### Step 2: Choose Template
Select a template (e.g., "Customer Support Agent") or "Build from Scratch".

### Step 3: Configure & Chat
- Enter agent name
- Optionally upload documents
- Click "Finish & Start Chatting"

Done! 🎉

---

## Testing

```bash
# Check if services are running
docker-compose ps

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

---

## Troubleshooting

### Issue: "No LLM API keys found"
**Fix**: Check your `.env` file has the correct API key format.

### Issue: Frontend shows connection error
**Fix**: Make sure backend is running: `docker-compose logs backend`

### Issue: Port already in use
**Fix**: Change ports in `docker-compose.yml`:
```yaml
ports:
  - "8001:8000"  # Change 8000 to 8001
```

---

## Next Steps

- Read [README.md](./README.md) for full documentation
- Check [DEPLOYMENT.md](./DEPLOYMENT.md) for production deployment
- Review [DEMO_SCRIPT.md](./DEMO_SCRIPT.md) for demo video guide

---

## Support

- **Issues**: GitHub Issues
- **Docs**: See README.md
- **API Docs**: http://localhost:8000/docs

---

**Happy Building! 🚀**
