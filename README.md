# 🤖 AgentForge

**No-Code AI Agent Builder** - Create powerful conversational AI agents in minutes, not hours.

Built for the [NodeOps Proof of Build Hackathon](https://nodeops.xyz) (October 2025)

---

## 📖 Overview

**AgentForge** is a comprehensive, modern platform that empowers anyone to create, deploy, and integrate custom conversational AI agents without writing a single line of code. Whether you're a business looking to automate customer support, a developer wanting to integrate AI into your application, or a team building an internal knowledge assistant, AgentForge has you covered.

### 🎯 What is AgentForge?

AgentForge transforms your documents and data into intelligent AI agents capable of answering questions, providing support, and conversing naturally with your users. The platform uses **RAG (Retrieval-Augmented Generation)** to ensure your agents provide accurate responses based on your specific content, not just general knowledge.

### 🔑 Core Features

#### 1. **Intuitive No-Code Interface** 🎨
- **3-step creation wizard**: Choose a template, configure your agent, upload documents
- **Centralized dashboard**: Manage all your agents from a modern interface
- **Ready-to-use templates**: Customer support, technical documentation, lead qualification, general assistant
- **Advanced configuration**: Customize system prompts, temperature, tokens, and guardrails

#### 2. **Powerful RAG System** 📚
- **Document upload**: Support for PDF, TXT, MD, DOCX files
- **Automatic processing**: Your documents are automatically chunked, indexed, and vectorized
- **Semantic search**: ChromaDB for fast and relevant retrieval
- **Source citations**: Every response includes the sources used for transparency
- **Dynamic knowledge base**: Add or remove documents at any time

#### 3. **Multi-LLM Support** 🔌
- **OpenAI**: GPT-4, GPT-4 Turbo, GPT-3.5 Turbo
- **Anthropic**: Claude 3.5 Sonnet, Claude 3 Opus
- **Flexible configuration**: Choose the model suited for your use case and budget
- **Behavior customization**: Adjust temperature, max_tokens, and personality

#### 4. **Modern Chat Interface** 💬
- **Real-time chat**: Responsive and fluid interface
- **Conversation history**: All conversations are saved and searchable
- **Cited sources**: See which documents were used for each response
- **Multi-conversations**: Create and manage multiple conversations per agent
- **Smart filtering**: Separates platform conversations from widget/API conversations

#### 5. **Public REST API** 🔑
- **API Key authentication**: Secured with Bearer tokens
- **Rate limiting**: Control usage with configurable limits
- **Key management**: Create, activate, deactivate, and delete API keys
- **Allowed origins**: Configure CORS to restrict access to specific domains
- **Usage tracking**: Monitor the last usage of each key
- **OpenAPI documentation**: Interactive API docs at `/docs`

#### 6. **Embeddable Widget** 🎨
- **2-line integration**: Add a chatbot to any website
- **100% customizable**: Colors, position, texts, avatar
- **Responsive**: Works on mobile and desktop
- **Persistent conversations**: History saved across page reloads
- **Welcome message**: Greet your visitors with a custom message
- **Zero dependencies**: Pure vanilla JavaScript
- **Secure**: API key authentication with CORS support

#### 7. **History & Traceability** 📊
- **Automatic saving**: All conversations are recorded
- **Source separation**: Widget conversations don't clutter your platform interface
- **Timestamped messages**: Precise timestamp for each message
- **Token counting**: Track your usage and costs
- **Easy retrieval**: API to list and retrieve conversations

#### 8. **Security & Control** 🔒
- **Secure API Keys**: `af_` prefix with 32-character random token
- **Configured CORS**: Protection against unauthorized access
- **Rate limiting**: Abuse prevention with per-hour limits
- **Quick deactivation**: Toggle on/off for compromised keys
- **Permanent deletion**: Remove keys you no longer need

#### 9. **Easy Deployment** 🐳
- **Docker Compose**: Start with a single command
- **Environment variables**: Centralized configuration via `.env`
- **Health checks**: Built-in service health monitoring
- **Persistent volumes**: Your data survives restarts
- **Structured logs**: Simplified debugging and monitoring
- **Production-ready**: Designed for NodeOps deployment

### 💡 Use Cases

AgentForge is perfect for:

- ✅ **24/7 Customer Support**: Instantly answer frequently asked questions with your FAQs
- ✅ **Documentation Assistant**: Help developers navigate your technical documentation
- ✅ **Lead Qualification**: Engage and qualify visitors before routing them to sales
- ✅ **Internal Knowledge Base**: AI assistant for your team with access to all internal documents
- ✅ **E-commerce Assistant**: Help customers find products and answer their questions
- ✅ **Educational Tutor**: Create specialized learning assistants by subject
- ✅ **Automated Onboarding**: Guide new users with an interactive assistant
- ✅ **HR Assistant**: Answer employee questions about policies and benefits

### 🏆 Why Choose AgentForge?

- **Speed**: From idea to working agent in 5 minutes
- **Flexibility**: Use as web platform, REST API, or embedded widget
- **Scalability**: Docker architecture ready for production
- **Transparency**: Open-source code, no vendor lock-in
- **Cost-effective**: Use your own LLM API keys, control your costs
- **Modern**: Latest tech stack (React 18, FastAPI, LangChain)

---

## 🚀 Quick Start

### Prerequisites

- Docker and Docker Compose
- At least one LLM API key (OpenAI or Anthropic)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/4n0nn43x/agent-forge
cd agent-forge
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

AgentForge provides two API interfaces:

### 1. **Internal API** (Dashboard & Agent Management)

Once running, visit http://localhost:8000/docs for interactive API documentation.

#### Key Endpoints

```bash
# Agent Management
GET  /api/agents/templates           # List available templates
POST /api/agents/                    # Create an agent
GET  /api/agents/                    # List all agents
GET  /api/agents/{id}                # Get agent details
PUT  /api/agents/{id}                # Update agent
DELETE /api/agents/{id}              # Delete agent

# Documents
POST /api/agents/{id}/documents      # Upload document
GET  /api/agents/{id}/documents      # List documents
DELETE /api/agents/{id}/documents/{doc_id}  # Delete document

# Chat
POST /api/agents/{id}/chat           # Send message
GET  /api/agents/{id}/conversations  # List conversations
GET  /api/conversations/{id}/messages # Get conversation messages

# API Keys (New!)
POST /api/agents/{id}/api-keys       # Generate API key
GET  /api/agents/{id}/api-keys       # List API keys
DELETE /api/agents/{id}/api-keys/{key_id}  # Delete API key
PATCH /api/agents/{id}/api-keys/{key_id}/toggle  # Enable/disable key
```

### 2. **Public API** (External Integrations) ✨ NEW!

Use the Public API to integrate your agents into websites, mobile apps, or other services.

#### Authentication

All public API requests require authentication via API Key:

```bash
Authorization: Bearer af_xxxxxxxxxxxxx
```

#### Public Endpoints

```bash
# Chat
POST /api/v1/public/chat             # Send message to agent
GET  /api/v1/public/conversations    # List conversations
GET  /api/v1/public/conversations/{id}/messages  # Get messages
GET  /api/v1/public/agent            # Get agent info
```

#### Example: Send a Message

```bash
curl -X POST "http://localhost:8000/api/v1/public/chat" \
  -H "Authorization: Bearer af_xxxxxxxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What are your business hours?",
    "conversation_id": "optional-conversation-id"
  }'
```

#### Response

```json
{
  "response": "Our business hours are Monday to Friday, 9 AM to 5 PM EST.",
  "conversation_id": "uuid-here",
  "tokens_used": 45,
  "sources": [
    {
      "content": "Business hours: Mon-Fri 9-5 EST",
      "source": "company_info.pdf"
    }
  ]
}
```

---

## 🎨 Embeddable Widget ✨ NEW!

Turn your agent into a chat widget that can be embedded on any website!

### Quick Start

1. **Generate an API Key** from your agent's dashboard
2. **Add this code** to your website (before `</body>`):

```html
<!-- AgentForge Widget -->
<script src="https://your-domain.com/agentforge-widget.js"></script>
<script>
  AgentForge.init({
    apiKey: 'af_xxxxxxxxxxxxx',
    apiUrl: 'https://your-api.com/api/v1/public',
    position: 'bottom-right',
    primaryColor: '#3B82F6',
    title: 'Chat with us!',
    subtitle: 'We typically reply in a few minutes'
  });
</script>
```

### Configuration Options

```javascript
AgentForge.init({
  // Required
  apiKey: 'af_xxxxxxxxxxxxx',      // Your API key
  apiUrl: 'https://api.example.com/api/v1/public',

  // Optional - Appearance
  position: 'bottom-right',         // 'bottom-right' or 'bottom-left'
  primaryColor: '#3B82F6',          // Brand color (hex)
  title: 'Chat with us!',           // Widget title
  subtitle: 'We\'re here to help',  // Widget subtitle
  placeholder: 'Type a message...', // Input placeholder
  avatar: 'https://...',            // Avatar URL (optional)
  zIndex: 9999                      // CSS z-index
});
```

### Features

- ✅ **Lightweight** - Pure vanilla JavaScript, no dependencies
- ✅ **Responsive** - Works on mobile and desktop
- ✅ **Customizable** - Match your brand colors and style
- ✅ **Persistent** - Conversation continues across page reloads
- ✅ **Easy Integration** - Just 2 lines of code
- ✅ **Secure** - API key authentication with CORS support

### Widget Demo

Visit `/widget-demo.html` for a live demo and more examples.

### How to Get Your API Key

1. Go to your AgentForge dashboard
2. Select your agent
3. Navigate to **Settings** → **API Keys**
4. Click **"Generate New API Key"**
5. Give it a name (e.g., "Website Widget")
6. Set allowed origins (optional, for security)
7. Copy the generated key and use it in your widget

### Security Best Practices

- Only use API keys on domains you trust
- Set **allowed origins** in API key settings to restrict usage
- Monitor API usage in the dashboard
- Rotate API keys periodically
- Disable unused keys immediately

---

## 🔑 API Key Management

### Creating an API Key

```bash
curl -X POST "http://localhost:8000/api/agents/1/api-keys" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Production Website",
    "rate_limit": 100,
    "allowed_origins": "https://mywebsite.com,https://www.mywebsite.com"
  }'
```

### Response

```json
{
  "id": 1,
  "agent_id": 1,
  "key": "af_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "name": "Production Website",
  "is_active": true,
  "rate_limit": 100,
  "allowed_origins": "https://mywebsite.com,https://www.mywebsite.com",
  "created_at": "2025-10-07T12:00:00",
  "last_used_at": null
}
```

### Managing API Keys

```bash
# List all API keys for an agent
GET /api/agents/{agent_id}/api-keys

# Delete an API key
DELETE /api/agents/{agent_id}/api-keys/{key_id}

# Enable/disable an API key
PATCH /api/agents/{agent_id}/api-keys/{key_id}/toggle
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

## 💡 Use Cases & Examples

### 1. **Customer Support Chatbot**

Create a support agent with your FAQ and documentation:

```bash
# Step 1: Create the agent
curl -X POST "http://localhost:8000/api/agents/" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Support Bot",
    "description": "24/7 customer support assistant",
    "llm_model": "gpt-4",
    "personality": "friendly",
    "system_prompt": "You are a helpful customer support agent. Be concise and friendly."
  }'

# Step 2: Upload your documentation
curl -X POST "http://localhost:8000/api/agents/1/documents" \
  -F "file=@faq.pdf"

# Step 3: Generate API key
curl -X POST "http://localhost:8000/api/agents/1/api-keys" \
  -H "Content-Type: application/json" \
  -d '{"name": "Website Widget"}'

# Step 4: Embed on your website (see Widget section)
```

### 2. **Internal Knowledge Base**

Build a private AI assistant for your team:

```javascript
// React/Next.js integration example
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/api/v1/public',
  headers: {
    'Authorization': 'Bearer af_xxxxxxxxxxxxx'
  }
});

async function askQuestion(question) {
  const response = await api.post('/chat', {
    message: question
  });

  return response.data;
}
```

### 3. **Lead Qualification Bot**

Qualify leads automatically before routing to sales:

```python
# Python SDK example
import requests

API_KEY = "af_xxxxxxxxxxxxx"
API_URL = "http://localhost:8000/api/v1/public"

def qualify_lead(visitor_message):
    response = requests.post(
        f"{API_URL}/chat",
        headers={"Authorization": f"Bearer {API_KEY}"},
        json={
            "message": visitor_message,
            "conversation_id": session.get('conv_id')
        }
    )

    data = response.json()
    session['conv_id'] = data['conversation_id']

    return data['response']
```

### 4. **E-commerce Product Assistant**

Help customers find products and answer questions:

```javascript
// Vue.js integration
export default {
  data() {
    return {
      messages: [],
      apiKey: 'af_xxxxxxxxxxxxx',
      apiUrl: 'http://localhost:8000/api/v1/public'
    }
  },

  methods: {
    async sendMessage(message) {
      const response = await fetch(`${this.apiUrl}/chat`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message })
      });

      const data = await response.json();
      this.messages.push({
        role: 'assistant',
        content: data.response,
        sources: data.sources
      });
    }
  }
}
```

### 5. **Documentation Helper**

Create an AI that understands your codebase:

1. Upload all documentation files (README, API docs, tutorials)
2. Configure with technical personality
3. Embed widget in your docs site or use in IDE

### 6. **Educational Tutor**

Build a subject-specific tutor:

```bash
# Upload textbooks, course materials
for file in course_materials/*.pdf; do
  curl -X POST "http://localhost:8000/api/agents/1/documents" \
    -F "file=@$file"
done
```

---

## 📊 Integration Examples

### JavaScript/TypeScript

```typescript
// TypeScript SDK
interface ChatResponse {
  response: string;
  conversation_id: string;
  tokens_used?: number;
  sources?: Array<{content: string; source: string}>;
}

class AgentForgeClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl: string) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  async chat(message: string, conversationId?: string): Promise<ChatResponse> {
    const response = await fetch(`${this.baseUrl}/chat`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message,
        conversation_id: conversationId
      })
    });

    return response.json();
  }
}

// Usage
const client = new AgentForgeClient('af_xxxxx', 'http://localhost:8000/api/v1/public');
const result = await client.chat('Hello!');
console.log(result.response);
```

### Python

```python
# Python integration
from typing import Optional, Dict, Any
import requests

class AgentForgeClient:
    def __init__(self, api_key: str, base_url: str):
        self.api_key = api_key
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json'
        })

    def chat(self, message: str, conversation_id: Optional[str] = None) -> Dict[str, Any]:
        response = self.session.post(
            f'{self.base_url}/chat',
            json={
                'message': message,
                'conversation_id': conversation_id
            }
        )
        response.raise_for_status()
        return response.json()

    def get_conversations(self):
        response = self.session.get(f'{self.base_url}/conversations')
        response.raise_for_status()
        return response.json()

# Usage
client = AgentForgeClient('af_xxxxx', 'http://localhost:8000/api/v1/public')
result = client.chat('What are your business hours?')
print(result['response'])
```

### cURL Examples

```bash
# Send a message
curl -X POST "http://localhost:8000/api/v1/public/chat" \
  -H "Authorization: Bearer af_xxxxxxxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello, I need help with my order",
    "conversation_id": null
  }'

# List conversations
curl -X GET "http://localhost:8000/api/v1/public/conversations" \
  -H "Authorization: Bearer af_xxxxxxxxxxxxx"

# Get conversation messages
curl -X GET "http://localhost:8000/api/v1/public/conversations/uuid-here/messages" \
  -H "Authorization: Bearer af_xxxxxxxxxxxxx"

# Get agent info
curl -X GET "http://localhost:8000/api/v1/public/agent" \
  -H "Authorization: Bearer af_xxxxxxxxxxxxx"
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

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/4n0nn43x/agent-forge/issues)
- **Documentation**: [Full Docs](./docs/)
- **Demo Video**: [Watch on YouTube](#)

---

**Built with ❤️ for the DePin community**

🚀 Create your first agent today!
