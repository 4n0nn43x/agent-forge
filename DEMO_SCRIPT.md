# 🎬 AgentForge Demo Script

Video demo script for NodeOps Hackathon submission (5-7 minutes recommended)

---

## 🎯 Demo Objectives

1. Show how easy it is to create an AI agent (< 5 minutes)
2. Demonstrate RAG capabilities with document upload
3. Highlight key differentiators vs alternatives
4. Prove production-ready deployment

---

## 📝 Script

### SCENE 1: Introduction (30 seconds)

**[Screen: AgentForge homepage]**

> "Hi! I'm [Your Name], and I built AgentForge for the NodeOps Proof of Build Hackathon.
>
> AgentForge is a no-code platform that lets anyone create production-ready AI agents in minutes.
> While tools like n8n are great for general automation, AgentForge is laser-focused on one thing:
> making it dead simple to build conversational AI agents powered by RAG.
>
> Let me show you how it works."

---

### SCENE 2: The Problem (30 seconds)

**[Screen: Show typical problems]**

> "Today, if you want to create an AI chatbot for your documentation or customer support, you need to:
> - Set up vector databases
> - Write code to chunk and embed documents
> - Configure LLM APIs
> - Build a chat interface
> - Deploy everything
>
> This takes days or weeks. With AgentForge, it takes 5 minutes. Let me prove it."

---

### SCENE 3: Creating an Agent - Step 1: Template (45 seconds)

**[Screen: AgentForge dashboard, click "Create Agent"]**

> "I'm starting from the dashboard. I'll click 'Create Agent' and we're taken to a simple 3-step wizard.
>
> **Step 1: Choose a template.**
>
> We have 4 pre-built templates optimized for common use cases:
> - Customer Support for handling tickets
> - Technical Documentation for developer Q&A
> - Lead Qualification for sales
> - General Purpose for anything else
>
> I'll choose the Technical Documentation Assistant because I want to build a bot that answers questions
> about Python's FastAPI framework."

**[Click: Technical Documentation template]**

> "Notice how each template comes with a pre-written system prompt, personality settings, and recommended
> configuration. No need to be a prompt engineer."

**[Click: Next]**

---

### SCENE 4: Creating an Agent - Step 2: Basic Config (1 minute)

**[Screen: Basic configuration form]**

> "**Step 2: Basic configuration.**
>
> I'll name this agent 'FastAPI Expert' and add a description."

**[Type: Agent name and description]**

> "Now I choose which LLM to use. AgentForge supports both OpenAI's GPT models and Anthropic's Claude.
> I'll go with GPT-4 for this demo."

**[Select: GPT-4]**

> "I can also set the personality. The template already chose 'Technical' which is perfect for
> documentation, but I could change it to 'Friendly' or 'Professional' depending on my use case."

**[Show personality options]**

> "The system prompt is already configured from the template, but I can customize it if needed.
> For now, the template is perfect."

**[Click: Create Agent]**

> "And just like that, my agent is created! That was less than 2 minutes."

---

### SCENE 5: Creating an Agent - Step 3: Upload Documents (1.5 minutes)

**[Screen: Document upload interface]**

> "**Step 3: Upload documents.**
>
> This is where the magic happens. AgentForge uses RAG - Retrieval-Augmented Generation - which means
> the agent will only answer based on the documents I provide. No hallucinations, no made-up answers.
>
> I'm going to upload the FastAPI documentation. I have it as PDFs here."

**[Upload: 2-3 PDF files, show upload progress]**

> "Watch what's happening behind the scenes:
> - The PDF is being parsed and text extracted
> - The content is split into smart chunks with overlap
> - Each chunk is embedded using a sentence transformer model
> - Everything is stored in ChromaDB, our vector database
>
> And it's all automatic. No configuration needed."

**[Show: Uploaded documents list with chunk counts]**

> "See? My 3 documents are now processed into 127 chunks. The agent can now search through all of this
> content to find relevant information when users ask questions."

**[Click: Finish & Start Chatting]**

---

### SCENE 6: Testing the Agent (2 minutes)

**[Screen: Chat interface]**

> "Now we're in the chat interface. Let's test if the agent actually knows about FastAPI.
>
> I'll ask: 'How do I create a POST endpoint in FastAPI?'"

**[Type and send message]**

> "And look at that! The agent responds with accurate information **from the documentation I uploaded**.
>
> Notice down here - it shows me the sources it used. It pulled from 'fastapi-tutorial.pdf',
> and even shows me a relevance score."

**[Show: Sources dropdown]**

> "Let me try something harder: 'What's the difference between Depends and dependency injection?'"

**[Type and send message]**

> "Perfect! Again, it's giving me information straight from the docs, not from its general training.
> This is the power of RAG - grounded, factual responses."

**[Show: Response with code examples]**

> "It even formats code examples nicely with markdown. This would be production-ready for a documentation
> site right now."

---

### SCENE 7: Key Features Walkthrough (1 minute)

**[Screen: Show different features]**

> "Let me quickly show you the other key features:
>
> **Dashboard** - Here's where I see all my agents. I can create multiple agents for different purposes.
> Each agent has its own knowledge base and configuration."

**[Show: Dashboard with multiple agents]**

> "**Document Management** - I can add more documents anytime. Click here, upload new files, and the
> knowledge base updates automatically."

**[Show: Document panel]**

> "**Copy Responses** - Users can copy any response for their own use."

**[Show: Copy button]**

> "**Conversation History** - Every conversation is saved. Users can pick up where they left off."

**[Show: Conversations list]**

---

### SCENE 8: Production Deployment (45 seconds)

**[Screen: Show docker-compose.yml or deployment docs]**

> "And here's the best part - deploying to production is just as easy.
>
> AgentForge is fully containerized with Docker. To deploy on NodeOps or any other platform:
> - Run `docker-compose up`
> - That's it.
>
> Everything is production-ready:
> - Health checks for monitoring
> - Persistent volumes for data
> - Automatic restarts
> - Proper logging
> - Security best practices
>
> No additional configuration needed."

**[Show: docker-compose.yml file]**

---

### SCENE 9: Why AgentForge vs Alternatives (45 seconds)

**[Screen: Comparison slide or README section]**

> "So why AgentForge instead of n8n or other tools?
>
> **Time to value:** n8n takes 2-3 hours to set up a RAG agent with all the nodes and connections.
> AgentForge takes 5 minutes.
>
> **Focus:** n8n is a general automation tool. AgentForge is built specifically for conversational AI
> with RAG. Everything is optimized for this one use case.
>
> **Ease of use:** No-code means literally anyone can build an agent. Your marketing team, support team,
> anyone.
>
> **Web3 native:** Built specifically for DePin infrastructure like NodeOps. This isn't an afterthought."

---

### SCENE 10: Closing (30 seconds)

**[Screen: Back to dashboard]**

> "And that's AgentForge! In less than 7 minutes, I:
> - Created a production-ready AI agent
> - Uploaded documentation
> - Got accurate, sourced responses
> - Showed you how to deploy it
>
> All without writing a single line of code.
>
> AgentForge is perfect for:
> - Customer support teams
> - Documentation sites
> - Internal knowledge bases
> - Sales qualification
> - Any use case where you need an AI that knows YOUR content
>
> Thanks for watching! Check out the GitHub repo for the full code, documentation, and deployment guide.
> Link in the description.
>
> Built with ❤️ for the NodeOps community. Let's make AI accessible to everyone!"

**[Screen: Show GitHub repo and final credits]**

---

## 🎬 Recording Tips

### Before Recording

- [ ] Test everything works perfectly
- [ ] Prepare sample documents (clean, relevant PDFs)
- [ ] Clear browser cache/data
- [ ] Close unnecessary tabs
- [ ] Set up a clean demo account
- [ ] Practice the script 2-3 times
- [ ] Set up good lighting if showing face
- [ ] Test microphone quality

### During Recording

- [ ] Use 1080p or 1440p resolution
- [ ] Keep cursor movements smooth
- [ ] Pause between major sections (easier to edit)
- [ ] Speak clearly and at moderate pace
- [ ] Show enthusiasm but stay professional
- [ ] If you mess up, just pause and restart that section

### Screen Recording Settings

- **Tool:** OBS Studio, Loom, or ScreenFlow
- **Resolution:** 1920x1080 (1080p)
- **FPS:** 30fps
- **Audio:** Clear microphone (test first!)
- **Cursor:** Highlight enabled

### What to Show

✅ **DO:**
- Clean, organized desktop
- Professional browser with no random tabs
- Smooth cursor movements
- Clear, readable text sizes
- Working features

❌ **DON'T:**
- Show personal emails or sensitive data
- Include unrelated tabs or windows
- Make super fast cursor movements
- Use tiny fonts
- Show errors (unless intentional)

---

## 📹 Video Sections (with timings)

| Section | Duration | Focus |
|---------|----------|-------|
| Intro | 0:00 - 0:30 | Hook the viewer |
| Problem | 0:30 - 1:00 | Why this matters |
| Create Agent | 1:00 - 4:00 | Show the magic |
| Test Agent | 4:00 - 6:00 | Prove it works |
| Features | 6:00 - 6:30 | Quick highlights |
| Deployment | 6:30 - 7:15 | Production-ready |
| Comparison | 7:15 - 8:00 | Why choose this |
| Closing | 8:00 - 8:30 | Call to action |

**Total: ~8 minutes** (edit down to 7 if needed)

---

## 🎨 Visual Enhancements (Optional)

- Add text overlays for key points
- Zoom in on important UI elements
- Add smooth transitions between sections
- Include background music (low volume, non-distracting)
- Show GitHub stars/metrics if available
- Add your social media handles

---

## 📤 Submission Checklist

- [ ] Video exported in 1080p MP4
- [ ] File size < 500MB (compress if needed)
- [ ] Audio levels normalized
- [ ] Subtitles/captions added (accessibility bonus!)
- [ ] Thumbnail created (1280x720)
- [ ] Video uploaded to YouTube (unlisted or public)
- [ ] Description includes:
  - [ ] GitHub repo link
  - [ ] Demo site link (if available)
  - [ ] Your contact info
  - [ ] NodeOps Hackathon mention
- [ ] Video link submitted to hackathon
- [ ] Shared on social media

---

## 🏆 Bonus Points

To really impress the judges:

1. **Show a second use case** (e.g., customer support agent)
2. **Demo API integration** (show curl commands)
3. **Highlight NodeOps-specific features** (deployment, monitoring)
4. **Show mobile responsiveness** (if time permits)
5. **Include community testimonials** (if you get early users)

---

## 💡 Alternative Demo Angles

### Technical Deep Dive (for developer-focused judging)

- Show the architecture diagram
- Explain RAG in detail
- Demo API endpoints with Swagger UI
- Show Docker setup
- Discuss scaling considerations

### Business Value (for business-focused judging)

- Lead with ROI (time/cost savings)
- Show before/after comparisons
- Demo multiple agent types
- Discuss enterprise use cases
- Show analytics/metrics

### User-Focused (for general audience)

- Lead with problem (frustrated customer support)
- Show empathy for non-technical users
- Emphasize "no-code" throughout
- Demo with real-world example
- End with emotional appeal

---

**🎥 Good luck with your demo! You've got this!**

*Remember: Judges want to see that your project works, solves a real problem, and is production-ready.
AgentForge checks all those boxes. Just show it with confidence!*
