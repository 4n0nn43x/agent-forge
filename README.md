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

#### 9. **Webhook Integrations** 🔗
- **Event-driven automation**: Trigger external services on agent events
- **5 supported events**: message.sent, conversation.started, conversation.ended, document.uploaded, agent.updated
- **Secure payloads**: HMAC-SHA256 signature verification for webhook security
- **Intelligent retry logic**: Automatic retries with exponential backoff (up to 10 attempts)
- **Delivery tracking**: Complete logs of all webhook deliveries with success/failure status
- **Test mode**: Send test payloads to verify your webhook endpoints
- **Popular integrations**: Works with Slack, Discord, Zapier, Make, n8n, or any custom HTTP endpoint
- **Flexible configuration**: Custom headers, retry counts, and event filtering per webhook

#### 10. **Easy Deployment** 🐳
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
- At least one LLM API key:
  - OpenAI API key (for GPT models)
  - Anthropic API key (for Claude models)

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
# LLM Providers (at least one required)
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

# API Keys
POST /api/agents/{id}/api-keys       # Generate API key
GET  /api/agents/{id}/api-keys       # List API keys
DELETE /api/agents/{id}/api-keys/{key_id}  # Delete API key
PATCH /api/agents/{id}/api-keys/{key_id}/toggle  # Enable/disable key

# Webhooks (New!)
POST /api/agents/{id}/webhooks       # Create webhook
GET  /api/agents/{id}/webhooks       # List webhooks
GET  /api/agents/{id}/webhooks/{webhook_id}  # Get webhook details
PUT  /api/agents/{id}/webhooks/{webhook_id}  # Update webhook
DELETE /api/agents/{id}/webhooks/{webhook_id}  # Delete webhook
PATCH /api/agents/{id}/webhooks/{webhook_id}/toggle  # Enable/disable webhook
POST /api/agents/{id}/webhooks/{webhook_id}/test  # Test webhook
GET  /api/agents/{id}/webhooks/{webhook_id}/logs  # View delivery logs
GET  /api/agents/webhooks/events/supported  # List supported events
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

## 🔗 Webhook Integrations

Connect your agents to external services and automate workflows with webhooks. Get real-time notifications when important events occur.

### What are Webhooks?

Webhooks allow AgentForge to send HTTP POST requests to external URLs when specific events happen. This enables you to:
- Send Slack/Discord notifications when users ask questions
- Create tickets in your support system automatically
- Log conversations to external databases
- Trigger workflows in Zapier, Make, or n8n
- Update your CRM when leads are qualified
- And much more!

### Supported Events

AgentForge triggers webhooks for these events:

| Event | Description | Triggered When |
|-------|-------------|----------------|
| `message.sent` | User sends a message and gets a response | After agent responds to a message |
| `conversation.started` | A new conversation begins | First message in a conversation |
| `conversation.ended` | A conversation is closed | Conversation is marked as ended |
| `document.uploaded` | A document is added to the knowledge base | Document is successfully processed |
| `agent.updated` | Agent configuration changes | Agent settings are modified |

### Creating a Webhook

#### Via Dashboard (Recommended)

1. Go to your agent's page
2. Click the **"Webhooks"** tab
3. Click **"New Webhook"**
4. Configure your webhook:
   - **Name**: Descriptive name (e.g., "Slack Notifications")
   - **URL**: The endpoint to receive webhooks
   - **Events**: Select which events to trigger on
   - **Secret** (optional): For payload verification
   - **Retry Count**: Number of retry attempts (0-10)

#### Via API

```bash
curl -X POST "http://localhost:8000/api/agents/1/webhooks" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Slack Notifications",
    "url": "https://hooks.slack.com/services/YOUR/WEBHOOK/URL",
    "events": ["message.sent", "conversation.started"],
    "secret": "your-secret-key",
    "retry_count": 3
  }'
```

### Webhook Payload

When an event occurs, AgentForge sends a POST request to your webhook URL with this structure:

```json
{
  "event": "message.sent",
  "timestamp": "2025-10-08T12:34:56.789Z",
  "agent_id": 1,
  "agent_name": "Support Bot",
  "data": {
    "conversation_id": "uuid-here",
    "user_message": "What are your business hours?",
    "assistant_response": "Our business hours are Monday to Friday, 9 AM to 5 PM EST.",
    "tokens_used": 45,
    "sources": [
      {
        "content": "Business hours: Mon-Fri 9-5 EST",
        "source": "company_info.pdf"
      }
    ]
  }
}
```

### Verifying Webhook Signatures

For security, AgentForge signs all webhook payloads with HMAC-SHA256. Here's how to verify them:

**Python Example:**
```python
import hmac
import hashlib

def verify_webhook(payload, signature, secret):
    """Verify webhook signature"""
    expected = hmac.new(
        secret.encode('utf-8'),
        payload.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()

    return hmac.compare_digest(expected, signature)

# Usage
signature = request.headers.get('X-Webhook-Signature')
is_valid = verify_webhook(request.body, signature, 'your-secret-key')
```

**Node.js Example:**
```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(signature)
  );
}

// Usage (Express)
app.post('/webhook', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const isValid = verifyWebhook(
    JSON.stringify(req.body),
    signature,
    'your-secret-key'
  );

  if (!isValid) {
    return res.status(401).send('Invalid signature');
  }

  // Process webhook...
});
```

### Integration Examples

#### 1. Slack Notifications

Send agent conversations to a Slack channel:

```bash
# Create a Slack incoming webhook: https://api.slack.com/messaging/webhooks
# Then create an AgentForge webhook:

curl -X POST "http://localhost:8000/api/agents/1/webhooks" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Slack - Customer Support",
    "url": "https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXX",
    "events": ["message.sent"],
    "retry_count": 3
  }'
```

**Note**: Slack webhooks expect a specific format. You may need a middleware to transform the payload.

#### 2. Discord Notifications

```bash
# Get Discord webhook URL from Server Settings → Integrations → Webhooks
# Create AgentForge webhook:

curl -X POST "http://localhost:8000/api/agents/1/webhooks" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Discord Alerts",
    "url": "https://discord.com/api/webhooks/123456789/abcdefghijklmnop",
    "events": ["message.sent", "conversation.started"],
    "retry_count": 2
  }'
```

#### 3. Zapier Integration

Connect AgentForge to 5000+ apps via Zapier:

1. Create a new Zap in Zapier
2. Choose **"Webhooks by Zapier"** as the trigger
3. Select **"Catch Hook"**
4. Copy the webhook URL provided by Zapier
5. Create a webhook in AgentForge with that URL
6. Configure your Zap action (e.g., create Google Sheets row, send email, etc.)

#### 4. Make (formerly Integromat)

Similar to Zapier:

1. Create a new scenario in Make
2. Add a **"Webhooks"** module as the first step
3. Choose **"Custom webhook"**
4. Copy the webhook URL
5. Create a webhook in AgentForge
6. Build your automation workflow

#### 5. Custom Node.js Endpoint

```javascript
const express = require('express');
const app = express();

app.post('/agentforge-webhook', express.json(), (req, res) => {
  const { event, data, agent_name } = req.body;

  console.log(`[${agent_name}] Event: ${event}`);

  if (event === 'message.sent') {
    // Log to database
    db.conversations.insert({
      conversation_id: data.conversation_id,
      user_message: data.user_message,
      bot_response: data.assistant_response,
      timestamp: new Date()
    });

    // Send notification
    if (data.user_message.toLowerCase().includes('urgent')) {
      sendSMSAlert(data.user_message);
    }
  }

  res.status(200).json({ received: true });
});

app.listen(3000);
```

#### 6. Python Flask Endpoint

```python
from flask import Flask, request, jsonify
import hmac
import hashlib

app = Flask(__name__)
WEBHOOK_SECRET = 'your-secret-key'

@app.route('/webhook', methods=['POST'])
def handle_webhook():
    # Verify signature
    signature = request.headers.get('X-Webhook-Signature')
    payload = request.get_data(as_text=True)

    expected = hmac.new(
        WEBHOOK_SECRET.encode(),
        payload.encode(),
        hashlib.sha256
    ).hexdigest()

    if not hmac.compare_digest(expected, signature):
        return jsonify({'error': 'Invalid signature'}), 401

    # Process webhook
    data = request.json
    event = data['event']

    if event == 'message.sent':
        # Store in database
        save_conversation(data['data'])

        # Send to analytics
        track_user_engagement(data['data'])

    return jsonify({'status': 'success'}), 200

if __name__ == '__main__':
    app.run(port=5000)
```

### Webhook Delivery & Retry Logic

**Delivery Behavior:**
- Webhooks are sent asynchronously (won't slow down chat responses)
- 5-second timeout per request
- Automatic retries with exponential backoff

**Retry Schedule:**
- Attempt 1: Immediate
- Attempt 2: After 1 second
- Attempt 3: After 2 seconds
- Attempt 4: After 4 seconds
- Attempt 5: After 8 seconds
- And so on (2^attempt seconds)

**Success Criteria:**
- HTTP status code 2xx (200-299)

**Failure Handling:**
- Non-2xx responses trigger retries
- After all retries fail, the delivery is marked as failed
- All attempts are logged for debugging

### Monitoring Webhook Deliveries

**Via Dashboard:**
1. Go to agent → Webhooks tab
2. Click the "eye" icon next to a webhook
3. View recent deliveries with:
   - Event type
   - Timestamp
   - Status code
   - Success/failure status
   - Error messages (if any)

**Via API:**
```bash
# Get delivery logs for a webhook
curl -X GET "http://localhost:8000/api/agents/1/webhooks/123/logs" \
  -H "Content-Type: application/json"
```

**Response:**
```json
[
  {
    "id": 1,
    "webhook_id": 123,
    "event_type": "message.sent",
    "status_code": 200,
    "success": true,
    "error_message": null,
    "created_at": "2025-10-08T12:34:56Z"
  },
  {
    "id": 2,
    "webhook_id": 123,
    "event_type": "message.sent",
    "status_code": 500,
    "success": false,
    "error_message": "Internal Server Error",
    "created_at": "2025-10-08T12:35:12Z"
  }
]
```

### Testing Webhooks

Before going live, test your webhook endpoint:

**Via Dashboard:**
1. Go to Webhooks tab
2. Click the "play" icon next to your webhook
3. A test payload will be sent immediately

**Via API:**
```bash
curl -X POST "http://localhost:8000/api/agents/1/webhooks/123/test" \
  -H "Content-Type: application/json"
```

**Test Payload:**
```json
{
  "event": "test.webhook",
  "timestamp": "2025-10-08T12:34:56.789Z",
  "agent_id": 1,
  "agent_name": "Your Agent Name",
  "data": {
    "test": true,
    "message": "This is a test webhook from AgentForge"
  }
}
```

### Best Practices

1. **Use HTTPS**: Always use HTTPS URLs for production webhooks
2. **Verify Signatures**: Always verify the `X-Webhook-Signature` header
3. **Respond Quickly**: Return 200 OK as fast as possible (process data async)
4. **Handle Duplicates**: Same event may be sent multiple times (use idempotent handlers)
5. **Set Retry Count**: Start with 3 retries for production
6. **Monitor Failures**: Check webhook logs regularly
7. **Use Secrets**: Always set a secret for payload verification
8. **Test First**: Use the test feature before enabling webhooks

### Troubleshooting

**Webhook not firing?**
- Check that the webhook is enabled (active)
- Verify the event type matches what you selected
- Check webhook logs for error messages

**Getting authentication errors?**
- Ensure your endpoint is publicly accessible
- Check CORS settings if applicable
- Verify your server accepts POST requests

**Signature verification failing?**
- Make sure you're using the exact secret from the webhook
- Verify you're computing HMAC-SHA256 correctly
- Check that you're hashing the raw request body

**Deliveries failing?**
- Check your endpoint returns 2xx status codes
- Increase timeout if your server is slow
- Review webhook logs for specific error messages

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
- **Demo Video**: [Watch on YouTube](#)

---

**Built with ❤️ for the DePin community**

🚀 Create your first agent today!
