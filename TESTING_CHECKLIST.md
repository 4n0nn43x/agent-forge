# ✅ Testing Checklist

Complete testing checklist before hackathon submission.

---

## 🚀 Pre-Test Setup

```bash
# 1. Clean start
docker-compose down -v
rm -rf backend/data backend/chroma_data

# 2. Set environment variables
cp .env.example .env
nano .env  # Add your API keys

# 3. Start fresh
docker-compose up -d

# 4. Wait for services to be ready (~30 seconds)
docker-compose ps
```

---

## 1️⃣ Health Checks

### Backend Health
```bash
# Should return: {"status": "healthy", "service": "agentforge"}
curl http://localhost:8000/health

# Should return: {"name": "AgentForge API", ...}
curl http://localhost:8000/

# Check API docs are accessible
open http://localhost:8000/docs
```

**✅ Pass Criteria:**
- All endpoints return 200 OK
- API docs load properly
- No errors in logs: `docker-compose logs backend`

### Frontend Health
```bash
# Should return: "healthy"
curl http://localhost:3000/health

# Open in browser
open http://localhost:3000
```

**✅ Pass Criteria:**
- Page loads without errors
- No console errors in browser DevTools
- Styling looks correct

---

## 2️⃣ Backend API Tests

### Test Templates Endpoint
```bash
curl http://localhost:8000/api/agents/templates | jq
```

**✅ Pass Criteria:**
- Returns 4 templates
- Each template has name, description, system_prompt

### Test Create Agent
```bash
curl -X POST http://localhost:8000/api/agents/ \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Agent",
    "description": "Testing",
    "llm_model": "gpt-4",
    "system_prompt": "You are a helpful assistant",
    "temperature": 0.7,
    "max_tokens": 1000,
    "personality": "professional"
  }' | jq
```

**✅ Pass Criteria:**
- Returns 200 with agent object
- Agent has an ID
- All fields match input

### Test List Agents
```bash
curl http://localhost:8000/api/agents/ | jq
```

**✅ Pass Criteria:**
- Returns array with created agent
- Includes document_count and conversation_count

---

## 3️⃣ Frontend UI Tests

### Dashboard
- [ ] Dashboard loads without errors
- [ ] "Create Agent" button visible and clickable
- [ ] If no agents: shows empty state with helpful message
- [ ] If agents exist: shows agent cards in grid
- [ ] Search bar works (if agents exist)

### Agent Creation - Step 1: Templates
- [ ] All 4 templates displayed
- [ ] Can click on a template (highlights in blue)
- [ ] Can click "Build from Scratch"
- [ ] "Next" button advances to Step 2
- [ ] Progress indicators show current step

### Agent Creation - Step 2: Basic Config
- [ ] Agent name field works
- [ ] Description field works
- [ ] Model dropdown shows all options
- [ ] Personality buttons work (3 options)
- [ ] System prompt field shows template prompt (if template selected)
- [ ] "Create Agent" button works
- [ ] Validation: empty name shows error

### Agent Creation - Step 3: Documents
- [ ] Upload area is visible
- [ ] Can select files (.pdf, .txt, .md, .docx)
- [ ] Upload progress shows
- [ ] Successful upload shows in list
- [ ] Document shows filename, size, chunk count
- [ ] Info box explains how RAG works

### Agent Creation - Step 4: Advanced
- [ ] Advanced settings are collapsible
- [ ] Temperature slider works
- [ ] Max tokens input works
- [ ] Guardrails field works
- [ ] Summary shows all configuration
- [ ] "Finish & Start Chatting" navigates to chat

### Chat Interface
- [ ] Chat interface loads
- [ ] Agent name displayed in header
- [ ] "New Chat" button visible
- [ ] Document count button shows
- [ ] Empty state shows when no messages
- [ ] Can type in message input
- [ ] Enter key sends message
- [ ] Shift+Enter adds new line
- [ ] Send button works
- [ ] User message appears immediately
- [ ] Loading indicator shows while waiting
- [ ] Agent response appears
- [ ] Source citations show (if documents uploaded)
- [ ] Can copy agent messages
- [ ] Timestamps display correctly

### Agent Management
- [ ] Can navigate back to dashboard
- [ ] Agent card shows all info
- [ ] Three-dot menu works
- [ ] "Duplicate" creates copy
- [ ] "Delete" removes agent (with confirmation)
- [ ] Stats (docs, chats) are accurate

---

## 4️⃣ Document Upload Tests

### Prepare Test Documents

Create these test files:

**test.txt:**
```
This is a test document about Python programming.
Python is a high-level programming language.
It was created by Guido van Rossum in 1991.
```

**test.md:**
```markdown
# Test Document

This is a markdown test file.

## Section 1
Content here.
```

### Upload Tests
- [ ] Upload .txt file - Success
- [ ] Upload .md file - Success
- [ ] Upload .pdf file - Success (if you have one)
- [ ] Try to upload .exe or unsupported file - Error shown
- [ ] Try to upload file > 10MB - Error shown
- [ ] Upload multiple files at once - All process
- [ ] Documents appear in list
- [ ] Chunk counts are reasonable

---

## 5️⃣ RAG Functionality Tests

### Create Agent with Documents

1. Create "Test Agent" with Technical Docs template
2. Upload test.txt with Python content
3. Go to chat interface

### Test Queries

**Query 1: Content in document**
```
Q: "Who created Python?"
Expected: Agent says "Guido van Rossum" and cites test.txt
```

**Query 2: Content NOT in document**
```
Q: "What is JavaScript?"
Expected: Agent says information not in knowledge base
```

**Query 3: Complex query**
```
Q: "When was Python created and by whom?"
Expected: Agent combines info from document (1991, Guido van Rossum)
```

**✅ Pass Criteria:**
- Agent uses document content
- Shows source citations
- Doesn't make up information
- Responses are relevant

---

## 6️⃣ Multi-Agent Tests

### Create Multiple Agents

1. Create "Support Bot" with Customer Support template
2. Create "Docs Bot" with Technical Docs template
3. Create "Custom Bot" from scratch

### Test Isolation
- [ ] Each agent has separate knowledge base
- [ ] Documents uploaded to one don't affect others
- [ ] Each agent maintains own conversation history
- [ ] Can chat with multiple agents simultaneously

---

## 7️⃣ Error Handling Tests

### API Errors
- [ ] Invalid agent ID returns 404
- [ ] Missing required fields returns 400
- [ ] Large file upload returns 400
- [ ] Invalid file type returns 400

### Frontend Errors
- [ ] Backend down shows error message
- [ ] Network error shows helpful message
- [ ] Form validation works
- [ ] No console errors during normal use

### Recovery
- [ ] Can dismiss error messages
- [ ] Can retry failed operations
- [ ] App doesn't crash on errors

---

## 8️⃣ Docker & Deployment Tests

### Container Health
```bash
# All containers should be "healthy"
docker-compose ps

# No critical errors in logs
docker-compose logs backend | grep ERROR
docker-compose logs frontend | grep ERROR
```

### Restart Test
```bash
# Restart and verify persistence
docker-compose restart

# Wait 30 seconds
sleep 30

# Check health
curl http://localhost:8000/health
```

**✅ Pass Criteria:**
- Agents still exist after restart
- Documents still exist
- Conversations preserved
- No data loss

### Clean Restart Test
```bash
# Full stop and start
docker-compose down
docker-compose up -d

# Wait for startup
sleep 30

# Verify
curl http://localhost:8000/health
```

**✅ Pass Criteria:**
- Services start successfully
- Data persists (in volumes)
- No startup errors

---

## 9️⃣ Performance Tests

### Response Time
- [ ] Agent creation: < 2 seconds
- [ ] Document upload (1MB): < 10 seconds
- [ ] Chat response: < 5 seconds
- [ ] Dashboard load: < 1 second

### Resource Usage
```bash
# Check resource usage
docker stats
```

**✅ Pass Criteria:**
- Backend: < 2GB RAM
- Frontend: < 100MB RAM
- Total: < 2.5GB RAM

### Concurrent Users (Optional)
- [ ] Can open multiple browser tabs
- [ ] Each tab works independently
- [ ] No conflicts or race conditions

---

## 🔟 Browser Compatibility

Test in multiple browsers:

### Chrome/Edge
- [ ] All features work
- [ ] Styling correct
- [ ] No console errors

### Firefox
- [ ] All features work
- [ ] Styling correct
- [ ] No console errors

### Safari (if available)
- [ ] All features work
- [ ] Styling correct
- [ ] No console errors

---

## 1️⃣1️⃣ Mobile Responsiveness (Optional)

Test on mobile/tablet:
- [ ] Dashboard is usable
- [ ] Agent creation wizard works
- [ ] Chat interface is functional
- [ ] Buttons are tap-friendly

---

## 1️⃣2️⃣ Documentation Tests

### README
- [ ] All links work
- [ ] Code examples are correct
- [ ] Quick start instructions work
- [ ] Screenshots/diagrams are clear (if added)

### API Documentation
- [ ] http://localhost:8000/docs loads
- [ ] Can test endpoints from Swagger UI
- [ ] All endpoints documented
- [ ] Request/response schemas correct

### Deployment Guide
- [ ] Instructions are clear
- [ ] Commands work as written
- [ ] Environment variables explained
- [ ] Troubleshooting section helpful

---

## 🎯 Final Pre-Submission Checklist

### Code Quality
- [ ] No debug prints or console.logs
- [ ] No TODO comments in critical paths
- [ ] No hardcoded secrets or API keys
- [ ] .env.example is complete
- [ ] .gitignore includes .env

### Documentation
- [ ] README.md is complete
- [ ] DEPLOYMENT.md is accurate
- [ ] DEMO_SCRIPT.md is ready
- [ ] QUICK_START.md works
- [ ] All links are updated

### Demo Preparation
- [ ] Sample documents prepared
- [ ] Demo script practiced
- [ ] Recording software tested
- [ ] Audio quality checked
- [ ] Screen resolution set (1080p)

### Deployment
- [ ] Docker images build successfully
- [ ] docker-compose.yml is correct
- [ ] Health checks work
- [ ] Volumes persist data
- [ ] Environment variables documented

### Hackathon Requirements
- [ ] Docker image functional
- [ ] Can deploy on NodeOps infrastructure
- [ ] Production-ready (not just a demo)
- [ ] Documentation complete
- [ ] Demo video ready

---

## 🐛 Common Issues & Fixes

### Issue: Backend won't start
```bash
# Check logs
docker-compose logs backend

# Common causes:
# - Missing API key
# - Port 8000 in use
# - Python dependency issues
```

### Issue: Frontend shows blank page
```bash
# Check logs
docker-compose logs frontend

# Check browser console
# Common causes:
# - API URL incorrect
# - CORS issues
# - Build errors
```

### Issue: Chat doesn't work
```bash
# Verify API key is set
docker-compose exec backend env | grep API_KEY

# Check agent configuration
curl http://localhost:8000/api/agents/
```

### Issue: Document upload fails
```bash
# Check file size
ls -lh your-file.pdf

# Check backend logs
docker-compose logs backend

# Common causes:
# - File too large (>10MB)
# - Unsupported file type
# - Disk space full
```

---

## ✅ Sign-Off

Once all tests pass:

```bash
# Tag your version
git tag -a v1.0.0 -m "NodeOps Hackathon Submission"
git push origin v1.0.0

# Create final build
docker-compose build

# Export images (optional)
docker save agentforge-backend:latest | gzip > agentforge-backend.tar.gz
docker save agentforge-frontend:latest | gzip > agentforge-frontend.tar.gz
```

---

**🎉 Ready to submit! Good luck with the hackathon!**
