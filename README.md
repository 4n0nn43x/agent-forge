<p align="center">
  <img src="frontend/public/logo.svg" width="56" alt="">
</p>

<h1 align="center">AgentForge</h1>

<p align="center">
  Turn your documents into a chat agent, then put it anywhere.<br>
  No-code builder, REST API, and an embeddable widget — self-hosted, one container.
</p>

<p align="center">
  <a href="#quick-start">Quick start</a> ·
  <a href="#embeddable-widget">Widget</a> ·
  <a href="#api-documentation">API</a> ·
  <a href="#webhook-integrations">Webhooks</a>
</p>

![The agent dashboard](docs/screenshots/dashboard.png)

---

## What it is

You upload documents. AgentForge chunks and indexes them, then answers questions
against them instead of against the model's general knowledge — retrieval-augmented
generation, without writing any of it yourself.

Every answer shows the passages it came from, so you can tell whether it actually
read your material or improvised.

![A conversation, with the token count and the passages behind the answer](docs/screenshots/chat.png)

Three ways to use an agent once it exists:

| | |
|---|---|
| **In the app** | The chat above, with conversation history and document management |
| **Over HTTP** | A public REST API, scoped by API keys with an origin allowlist and hourly rate limit |
| **On your site** | A widget in one script tag, style-isolated and themed by CSS custom properties |

Two providers, and no others: **OpenRouter** for hosted models, **Ollama** for local
ones. The provider is inferred from the model id, so `openai/gpt-4o` and `llama3.2`
both just work.

## Setup takes one screen

First run walks the two decisions that gate a working install, checks them live, and
gets out of the way. No hunting through a settings page.

![First-run setup](docs/screenshots/onboarding.png)

API keys, endpoints, model names and upload limits are stored in the database and
edited in the UI — not in `.env`. Secrets are encrypted at rest. An empty `.env` is a
valid `.env`.

## Events go where you need them

Webhooks post a signed JSON body when something happens. Every delivery keeps the
exact request body and the endpoint's response, so a failure tells you what went
wrong instead of just showing a status code — and you can replay it once you've fixed
your end.

![Webhook deliveries, with the request body and the response](docs/screenshots/webhooks.png)

## The widget adapts to the host page

It renders inside a shadow root: your CSS can't reach into it and its CSS can't leak
onto your page. Appearance is a contract of CSS custom properties you set from your own
stylesheet.

![Live theming of the embeddable widget](docs/screenshots/widget-theming.png)

Try it at `/widget-demo.html` on your own instance.

---

## Quick Start

### Prerequisites

- Docker and Docker Compose
- [Ollama](https://ollama.com) — **required**, it provides the embeddings that power document search:
  ```bash
  ollama pull nomic-embed-text
  ```
- An [OpenRouter API key](https://openrouter.ai/keys) — optional, only if you want hosted
  models. Without it, agents run entirely on local Ollama models.

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/4n0nn43x/agent-forge
cd agent-forge
```

2. **Start the application** — no configuration file needed
```bash
docker compose up -d --build
```

3. **Create the admin account**

The first start prints a one-time setup link in the logs:
```bash
docker compose logs agentforge | grep setup
#   http://<this host>:3000/setup?token=...
```
Open it and choose a username and password. Only someone who can read the server
logs can do this, so a stranger who finds a fresh instance on the network cannot
claim it. A new link is printed at each restart until setup is done.

4. **Configure it in the browser**

The first-run flow then asks for your providers; later, everything is at
http://localhost:3000/settings:

| Setting | Value |
|---|---|
| OpenRouter API key | your key, if you want hosted models |
| Ollama endpoint | `http://host.docker.internal:11434` from Docker |

Then hit **Test connection** to confirm both providers answer.

5. **Access the application**
- App and API: http://localhost:3000
- API docs: http://localhost:3000/docs

That's it! 🎉

> **Everything runs in one container.** nginx serves the built frontend and
> proxies `/api` to FastAPI, both supervised in the same image, exposing only
> port 3000. There is a single `Dockerfile` and a single `docker-compose.yml`.

### Configuration lives in the UI, not in `.env`

API keys, endpoints, model names and upload limits are stored in the database and
edited at `/settings`. Secrets are encrypted at rest with a key that is generated
under the data directory on first run.

`.env` is optional and holds only what is needed before the database can be read:

| Variable | Default | Purpose |
|---|---|---|
| `DATABASE_URL` | SQLite under `/app/data` | Point at PostgreSQL to use one instead |
| `CHROMA_PERSIST_DIRECTORY` | `/app/data/chroma_data` | Vector store location |
| `REDIS_URL` | *(unset)* | Shares the API-key rate limiter across workers |
| `CORS_ORIGINS` | *(empty = any)* | Allowlist; empty is what the widget needs |
| `SECRET_KEY` | auto-generated | Encryption key for stored secrets |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | *(unset)* | Create the admin without the setup link (headless installs); ignored once an admin exists |
| `LOG_LEVEL` / `DEBUG` | `INFO` / `False` | |

Environment variables still act as a fallback for any UI setting, so an
orchestrator can inject values without a UI round-trip.

### Admin access

Everything except the public API (`/api/v1/public`) requires the admin to be
signed in. Sessions are an HttpOnly cookie, marked `Secure` whenever the app is
reached over HTTPS (also through a TLS reverse proxy in front of the container),
and end after 7 days unused or 30 days in any case. Writes from another site are
refused, and the admin API sends no CORS headers. Five sign-in attempts for an
account from one address in 15 minutes pause further attempts from that address
(20 per address for all accounts), for up to 15 minutes.

Behind your own reverse proxy (Traefik, Caddy...), let the app see the real
client address, or every visitor shares the proxy's limit: set
`FORWARDED_ALLOW_IPS=127.0.0.1,<proxy address>`. Keep `127.0.0.1`, which is the
container's own nginx; `*` also works if only the proxy can reach the container.

Locked out? Reset the password from the server; every session is signed out:
```bash
docker exec -it agentforge python -m app.cli reset-password
```

### Reusing an existing PostgreSQL / Redis

Neither is required — the defaults are SQLite and an in-process rate limiter. If
you already run them, set the URLs and attach to their network in
`docker-compose.yml`:

```bash
DATABASE_URL=postgresql+asyncpg://user:password@postgres:5432/agentforge
REDIS_URL=redis://redis:6379/0
```

Redis matters only if you run more than one uvicorn worker: without it each
worker keeps its own counters, so the effective rate limit is multiplied by the
worker count.

---

## Usage Guide

### Creating Your First Agent

1. **Choose a Template** (or start from scratch)
   - Customer Support Agent
   - Technical Documentation Assistant
   - Lead Qualification Bot
   - General Purpose Assistant

2. **Configure Basic Settings**
   - Agent name and description
   - Pick a model — recommended ones are listed first, with a note on why
   - Set personality (Professional, Friendly, Technical)

3. **Upload Documents** (Optional)
   - PDF, TXT, MD, or DOCX files
   - Chunked and indexed automatically; needs Ollama for the embeddings
   - Answers then cite the passages they came from

4. **Advanced Settings** (Optional)
   - Custom system prompts
   - Temperature and token limits
   - Guardrails and limitations

5. **Start chatting**
   - Test it immediately, then iterate on the prompt

### Managing Agents

- **Dashboard**: View all your agents
- **Edit**: Update configuration anytime
- **Duplicate**: Clone successful agents
- **Delete**: Remove agents you no longer need
- **Documents**: Add/remove knowledge base files

---

## Architecture

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
┌────────────────────┐  ┌─────────────────┐
│  SQLite / Postgres │  │   ChromaDB      │
│ (metadata+settings)│  │ (Vector Store)  │
└────────────────────┘  └─────────────────┘
```

### Tech Stack

**Backend:**
- Python 3.12 + FastAPI
- LangChain for AI orchestration
- ChromaDB for vector storage
- SQLite by default, PostgreSQL optional (`asyncpg`)
- Redis optional, for shared API-key rate limiting
- OpenRouter (hosted) + Ollama (local) as LLM providers

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

## Configuration

### Settings (in the UI, at `/settings`)

| Group | Setting | Default |
|---|---|---|
| OpenRouter | API key | *(empty)* |
| | Base URL | `https://openrouter.ai/api/v1` |
| | App name / Site URL | `AgentForge` / *(empty)* — optional attribution |
| Ollama | Endpoint | `http://localhost:11434` |
| | Embedding model | `nomic-embed-text` |
| Models | Default model | `openai/gpt-4o-mini` |
| Documents | Max upload size (MB) | `10` |
| | Allowed file types | `pdf,txt,md,docx` |
| Webhooks | Allow private addresses | off (SSRF guard) |

The **Test connection** button validates the OpenRouter key and checks that
Ollama answers with the embedding model pulled.

For the handful of bootstrap variables that remain in `.env`, see
[Configuration lives in the UI](#configuration-lives-in-the-ui-not-in-env) above.

### Supported LLM Models

The provider is derived from the model id:

| Model id | Provider | Example |
|---|---|---|
| `vendor/model` | OpenRouter | `openai/gpt-4o`, `anthropic/claude-sonnet-4.5` |
| plain tag | Ollama | `llama3.2`, `qwen2.5:7b`, `mistral` |
| `openrouter:…` / `ollama:…` | forced | `ollama:hf.co/user/model` |

`GET /api/agents/models` returns the recommended OpenRouter models plus whatever
is actually pulled on your local Ollama; the agent builder populates its
dropdown from it.

> **Embeddings note.** OpenRouter exposes no embeddings endpoint, so document
> indexing and retrieval always go through Ollama. Even an OpenRouter-only setup
> needs a reachable Ollama with `nomic-embed-text` pulled.

### Upgrading from the OpenAI/Anthropic version

Existing installs need a one-off migration, for two reasons: stored model ids
like `gpt-4` no longer resolve to a provider, and vectors embedded with
`text-embedding-ada-002` (1536 dimensions) are incompatible with the Ollama
embedding model (768), so ChromaDB rejects any query against them.

```bash
cd backend
python -m migrations.migrate_to_openrouter_ollama --dry-run   # preview
python -m migrations.migrate_to_openrouter_ollama             # apply
```

It rewrites model ids to their OpenRouter equivalents and drops the stale
collections. **Documents must be re-uploaded afterwards** — their text only ever
lived in ChromaDB, so it cannot be re-embedded automatically.

---

## API Documentation

AgentForge provides two API interfaces:

### 1. **Internal API** (Dashboard & Agent Management)

Once running, visit http://localhost:3000/docs for interactive API documentation.

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
DELETE /api/agents/{id}/documents     # Remove all documents

# Chat
POST /api/agents/{id}/chat           # Send message
GET  /api/agents/{id}/conversations  # List conversations
GET  /api/conversations/{id}/messages # Get conversation messages

# API Keys
POST /api/agents/{id}/api-keys       # Generate API key
GET  /api/agents/{id}/api-keys       # List API keys
DELETE /api/agents/{id}/api-keys/{key_id}  # Delete API key
PATCH /api/agents/{id}/api-keys/{key_id}/toggle  # Enable/disable key

# Webhooks
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

### 2. **Public API** (External Integrations)

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
curl -X POST "http://localhost:3000/api/v1/public/chat" \
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

## Embeddable Widget

Turn your agent into a chat widget that can be embedded on any website!

### Quick Start

1. **Generate an API Key** from your agent's dashboard
2. **Add this code** to your website (before `</body>`):

```html
<!-- before </body> -->
<script src="https://your-domain.com/agentforge-widget.js"></script>
<script>
  AgentForge.init({
    apiKey: 'af_xxxxxxxxxxxxx',
    apiUrl: 'https://your-api.com/api/v1/public'
  });
</script>
```

### Configuration

```javascript
AgentForge.init({
  // Required
  apiKey: 'af_xxxxxxxxxxxxx',
  apiUrl: 'https://api.example.com/api/v1/public',

  name: 'Support',                  // launcher label and panel title
  subtitle: '',                     // optional line under the name
  placeholder: 'Ask a question',
  welcomeMessage: '',               // empty uses the built-in empty state
  avatar: 'https://…',              // optional image

  position: 'bottom-right',         // or 'bottom-left'
  theme: 'auto',                    // 'auto' | 'light' | 'dark'
  openOnLoad: false,
  zIndex: 2147483000,

  tokens: { accent: '#0e6f7e' }     // any token below, minus the --af- prefix
});
```

### Theming

The widget renders inside a **shadow root**: your CSS cannot reach into it, and its
CSS cannot leak onto your page. Appearance is a contract of CSS custom properties
you set on the element — from your own stylesheet, with no JavaScript:

```css
agentforge-widget {
  --af-accent: #6d28d9;
  --af-radius: 2px;
  --af-font: inherit;   /* the default: adopt your page's type stack */
}
```

| Property | Paints |
|---|---|
| `--af-accent` / `--af-accent-fg` | Launcher, send button, focus rings, and the text on them |
| `--af-surface` / `--af-ground` | Header and bubbles / the message log behind them |
| `--af-text` / `--af-muted` | Body text / subtitle, sources, hints |
| `--af-border` | Every hairline |
| `--af-user-bg` | The visitor's own messages |
| `--af-radius` / `--af-radius-sm` | Panel corners / bubbles, inputs, buttons |
| `--af-font` / `--af-font-mono` | Type stack / source citations |
| `--af-width` / `--af-height` | Panel size, both capped to the viewport |
| `--af-shadow` | The panel's and launcher's elevation |

#### Source citations are off by default

A retrieval score means nothing to a visitor, and a filename can reveal more than
you intend — `handbook.pdf` is harmless, `layoffs-2026.docx` is not. So the public
chat response omits `sources` entirely unless you enable **Return source citations
on the public API** in Settings, and the widget only draws them with
`showSources: true`.

The server-side switch is the one that matters: hiding them in the widget alone
would be cosmetic, since the filenames would still sit in the JSON for anyone who
opens their browser's network tab. Your own dashboard always shows them, with the
relevance scores — that is where they belong.

Each colour token has a light and a dark value; `theme: 'auto'` follows the
visitor's OS and keeps following it if they change it. `::part(launcher)`,
`::part(panel)` and `::part(log)` are pierceable when a token isn't enough, and
`AgentForge.setTokens({…})` / `.setTheme('dark')` change things at runtime.

> **Upgrading?** `primaryColor` and `title` still work — they map onto
> `tokens.accent` and `name`. Nothing to change unless you want the new tokens.

### What it gives you

- Pure vanilla JavaScript, no dependencies, ~14 kB
- Style-isolated in both directions, so it cannot break your page or be broken by it
- Light, dark, or follow-the-OS, with `prefers-reduced-motion` respected
- The conversation survives page reloads
- Answers cite the passages they came from
- API keys are scoped by origin allowlist and hourly rate limit, both enforced server-side

### Widget Demo

Visit `/widget-demo.html` for a live demo and more examples.

### How to Get Your API Key

1. Go to your AgentForge dashboard
2. Select your agent
3. Navigate to **Settings** → **API Keys**
4. Click **"Generate New API Key"**
5. Give it a name (e.g., "Website Widget")
6. Set allowed origins (optional, for security)
7. Copy the generated key and use it in your widget. It is shown once: only a hash is
   stored, so a lost key cannot be recovered, only replaced by a new one

### Security Best Practices

- Only use API keys on domains you trust
- Set **allowed origins** in API key settings to restrict usage
- Monitor API usage in the dashboard
- Rotate API keys periodically
- Disable unused keys immediately

---

## API Key Management

### Creating an API Key

```bash
curl -X POST "http://localhost:3000/api/agents/1/api-keys" \
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

## Webhook Integrations

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
| `document.uploaded` | A document is added to the knowledge base | Document is successfully processed |
| `agent.updated` | Agent configuration changes | Agent settings are modified |

`GET /api/agents/{id}/webhooks/events/supported` returns this list together with a
full sample envelope for each event and the signature contract — the same data the
dashboard renders, so you never have to guess the JSON shape.

Every event listed is one the server actually emits. A fifth,
`conversation.ended`, used to be advertised and offered in the dashboard but could
never fire: nothing marks a conversation as ended, so it was removed rather than
left as a checkbox that delivers nothing.

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
curl -X POST "http://localhost:3000/api/agents/1/webhooks" \
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

curl -X POST "http://localhost:3000/api/agents/1/webhooks" \
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

curl -X POST "http://localhost:3000/api/agents/1/webhooks" \
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
curl -X GET "http://localhost:3000/api/agents/1/webhooks/123/logs" \
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
curl -X POST "http://localhost:3000/api/agents/1/webhooks/123/test" \
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

## Development

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

## Deployment

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

## Use Cases & Examples

### 1. **Customer Support Chatbot**

Create a support agent with your FAQ and documentation:

```bash
# Step 1: Create the agent
curl -X POST "http://localhost:3000/api/agents/" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Support Bot",
    "description": "24/7 customer support assistant",
    "llm_model": "openai/gpt-4o-mini",
    "personality": "friendly",
    "system_prompt": "You are a helpful customer support agent. Be concise and friendly."
  }'

# Step 2: Upload your documentation
curl -X POST "http://localhost:3000/api/agents/1/documents" \
  -F "file=@faq.pdf"

# Step 3: Generate API key
curl -X POST "http://localhost:3000/api/agents/1/api-keys" \
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
  baseURL: 'http://localhost:3000/api/v1/public',
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
API_URL = "http://localhost:3000/api/v1/public"

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
      apiUrl: 'http://localhost:3000/api/v1/public'
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
  curl -X POST "http://localhost:3000/api/agents/1/documents" \
    -F "file=@$file"
done
```

---

## Integration Examples

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
const client = new AgentForgeClient('af_xxxxx', 'http://localhost:3000/api/v1/public');
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
client = AgentForgeClient('af_xxxxx', 'http://localhost:3000/api/v1/public')
result = client.chat('What are your business hours?')
print(result['response'])
```

### cURL Examples

```bash
# Send a message
curl -X POST "http://localhost:3000/api/v1/public/chat" \
  -H "Authorization: Bearer af_xxxxxxxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello, I need help with my order",
    "conversation_id": null
  }'

# List conversations
curl -X GET "http://localhost:3000/api/v1/public/conversations" \
  -H "Authorization: Bearer af_xxxxxxxxxxxxx"

# Get conversation messages
curl -X GET "http://localhost:3000/api/v1/public/conversations/uuid-here/messages" \
  -H "Authorization: Bearer af_xxxxxxxxxxxxx"

# Get agent info
curl -X GET "http://localhost:3000/api/v1/public/agent" \
  -H "Authorization: Bearer af_xxxxxxxxxxxxx"
```

---

## Contributing

Issues and pull requests are welcome. Two things worth knowing before you start:

- There is **no authentication** on the management API (`/api/agents/*`). Anyone who
  can reach the instance can read conversations, create agents, and write provider
  credentials. Treat it as single-user and keep it off the open internet until that
  changes — it is the most useful thing anyone could contribute.
- There is no test suite yet. If you touch the retrieval, webhook or settings paths,
  say in the PR how you verified it.

---

## License

MIT License - See LICENSE file for details

---

## Support

[GitHub Issues](https://github.com/4n0nn43x/agent-forge/issues)

---

Winner of the [NodeOps Proof of Build Hackathon](https://nodeops.xyz), October 2025.
