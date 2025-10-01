# 🤖 AgentForge

**No-Code AI Agent Builder** - Create powerful conversational AI agents in minutes, not hours.

Built for the [NodeOps Proof of Build Hackathon](https://nodeops.xyz) (October 2025)

---

## 📖 Overview

AgentForge is a production-ready platform that enables anyone to create custom AI agents without writing a single line of code. Upload your documents, configure your agent's personality, and deploy a fully functional chatbot powered by RAG (Retrieval-Augmented Generation).

### ✨ Key Features

- **🎨 No-Code Interface**: Intuitive 3-step wizard to create agents
- **📚 RAG-Powered**: Upload documents (PDF, TXT, MD, DOCX) to form your agent's knowledge base
- **🎭 Pre-built Templates**: Ready-to-use templates for common use cases
- **🔌 Multi-LLM Support**: Works with OpenAI (GPT-4) and Anthropic (Claude)
- **💬 Beautiful Chat Interface**: Real-time conversations with source citations
- **🐳 Docker-Ready**: One-command deployment
- **🌐 DePin Infrastructure**: Designed for NodeOps deployment

---

## 🚀 Quick Start

### Prerequisites

- Docker and Docker Compose
- At least one LLM API key (OpenAI or Anthropic)

### Installation

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd agentforge
```

2. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env and add your API keys
nano .env
```

3. **Start the application**
```bash
docker-compose up -d
```

4. **Access the application**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

That's it! 🎉

---

## 🎯 Why AgentForge over n8n?

| Feature | n8n | AgentForge |
|---------|-----|------------|
| **Learning Curve** | Technical, requires workflow knowledge | Non-technical friendly, 3-step wizard |
| **AI Agent Focus** | Generic automation nodes | 100% optimized for conversational AI |
| **RAG Setup** | Manual configuration required | Built-in, automatic document processing |
| **Time to First Agent** | 2-3 hours | 5 minutes |
| **Templates** | General automation | AI-specific: support, docs, sales, etc. |
| **Conversational Memory** | Manual setup | Automatic context management |
| **Web3 Native** | No | Yes (designed for DePin) |

### Use AgentForge when you need:
- ✅ Customer support chatbot with your documentation
- ✅ Internal knowledge base assistant
- ✅ Lead qualification bot
- ✅ Technical documentation helper
- ✅ Quick AI agent prototypes

### Use n8n when you need:
- ✅ Complex multi-step workflows
- ✅ Integration with 300+ services
- ✅ Scheduled tasks and automation
- ✅ Data transformation pipelines

---

## 📚 Usage Guide

### Creating Your First Agent

1. **Choose a Template** (or start from scratch)
   - Customer Support Agent
   - Technical Documentation Assistant
   - Lead Qualification Bot
   - General Purpose Assistant

2. **Configure Basic Settings**
   - Agent name and description
   - Choose your LLM (GPT-4, Claude, etc.)
   - Set personality (Professional, Friendly, Technical)

3. **Upload Documents** (Optional)
   - PDF, TXT, MD, or DOCX files
   - Documents are automatically processed and indexed
   - Agent uses these for accurate, sourced responses

4. **Advanced Settings** (Optional)
   - Custom system prompts
   - Temperature and token limits
   - Guardrails and limitations

5. **Start Chatting!**
   - Test your agent immediately
   - Iterate and improve based on responses

### Managing Agents

- **Dashboard**: View all your agents
- **Edit**: Update configuration anytime
- **Duplicate**: Clone successful agents
- **Delete**: Remove agents you no longer need
- **Documents**: Add/remove knowledge base files

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────┐
│           Frontend (React)              │
│  - Vite + TailwindCSS                   │
│  - Agent Builder Wizard                 │
│  - Chat Interface                       │
│  - Dashboard                            │
└──────────────┬──────────────────────────┘
               │ REST API
┌──────────────▼──────────────────────────┐
│         Backend (FastAPI)               │
│  - Agent Management                     │
│  - LangChain Orchestration              │
│  - Document Processing                  │
└──────┬───────────────┬──────────────────┘
       │               │
       ▼               ▼
┌──────────────┐  ┌─────────────────┐
│   SQLite     │  │   ChromaDB      │
│  (Metadata)  │  │ (Vector Store)  │
└──────────────┘  └─────────────────┘
```

### Tech Stack

**Backend:**
- Python 3.11 + FastAPI
- LangChain for AI orchestration
- ChromaDB for vector storage
- SQLite for metadata
- Support for OpenAI & Anthropic

**Frontend:**
- React 18 + Vite
- TailwindCSS for styling
- Zustand for state management
- Axios for API calls

**Infrastructure:**
- Docker + Docker Compose
- Nginx for frontend serving
- Health checks and logging

---

## 🔧 Configuration

### Environment Variables

See `.env.example` for all available options. Key variables:

```bash
# Required: At least one API key
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Optional
ENV=production
LOG_LEVEL=INFO
MAX_UPLOAD_SIZE_MB=10
EMBEDDING_MODEL=sentence-transformers
```

### Supported LLM Models

**OpenAI:**
- gpt-4
- gpt-4-turbo
- gpt-3.5-turbo

**Anthropic:**
- claude-3-5-sonnet-20241022
- claude-3-opus-20240229

---

## 📦 API Documentation

Once running, visit http://localhost:8000/docs for interactive API documentation.

### Key Endpoints

```
GET  /api/agents/templates       # List available templates
POST /api/agents/                # Create an agent
GET  /api/agents/                # List all agents
GET  /api/agents/{id}            # Get agent details
POST /api/agents/{id}/documents  # Upload document
POST /api/agents/{id}/chat       # Send message
```

---

## 🧪 Development

### Local Development (without Docker)

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

### Project Structure

```
agentforge/
├── backend/
│   ├── app/
│   │   ├── agents/         # Agent logic & templates
│   │   ├── api/            # API routes
│   │   ├── utils/          # Utilities
│   │   ├── models.py       # Database models
│   │   ├── database.py     # DB configuration
│   │   └── main.py         # FastAPI app
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── services/       # API client
│   │   ├── store/          # State management
│   │   └── App.jsx
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml
└── README.md
```

---

## 🚢 Deployment

### NodeOps Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed NodeOps deployment instructions.

### General Docker Deployment

1. Build images:
```bash
docker-compose build
```

2. Start services:
```bash
docker-compose up -d
```

3. View logs:
```bash
docker-compose logs -f
```

4. Stop services:
```bash
docker-compose down
```

---

## 🤝 Contributing

This is a hackathon project, but contributions are welcome!

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

## 📝 License

MIT License - See LICENSE file for details

---

## 🙏 Acknowledgments

- Built for [NodeOps Proof of Build Hackathon](https://nodeops.xyz)
- Powered by [LangChain](https://langchain.com)
- UI components inspired by [shadcn/ui](https://ui.shadcn.com)

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/agentforge/issues)
- **Documentation**: [Full Docs](./docs/)
- **Demo Video**: [Watch on YouTube](#)

---

## 🎯 Roadmap

Future enhancements (post-hackathon):

- [ ] Website crawling for knowledge base
- [ ] Multi-modal support (images in chat)
- [ ] Advanced analytics dashboard
- [ ] Agent marketplace
- [ ] API key management UI
- [ ] Webhook integrations
- [ ] Multi-language support

---

**Built with ❤️ for the DePin community**

🚀 Create your first agent today!
