<p align="center">
  <img src="frontend/public/app_name.png" height="70" alt="InfiChat Logo">
</p>

<p align="center">
  <img src="Demo.gif" width="90%" alt="InfiChat Demo" />
  <br>
  <em>▶️ InfiChat Platform Demonstration — Real-Time Streaming & Multi-Agent Code Execution</em>
</p>

<p align="center">
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="MIT License"></a>
  <a href="https://www.python.org/downloads/release/python-3110/"><img src="https://img.shields.io/badge/Python-3.11-3776AB?logo=python&logoColor=white" alt="Python 3.11"></a>
  <a href="https://react.dev/"><img src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white" alt="React 18"></a>
  <a href="https://fastapi.tiangolo.com/"><img src="https://img.shields.io/badge/FastAPI-0.109-009688?logo=fastapi&logoColor=white" alt="FastAPI"></a>
  <a href="https://www.docker.com/"><img src="https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white" alt="Docker Ready"></a>
  <a href="https://www.postgresql.org/"><img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white" alt="PostgreSQL"></a>
  <a href="https://www.electronjs.org/"><img src="https://img.shields.io/badge/Electron-Desktop-47848F?logo=electron&logoColor=white" alt="Electron"></a>
  <img src="https://img.shields.io/badge/Version-2.0.0-10A37F.svg" alt="Version 2.0.0">
  <img src="https://img.shields.io/badge/Status-Production--Ready-brightgreen" alt="Production Ready">
</p>

<p align="center">
  <strong>The Ultimate AI Command Center — All Your Intelligence, Unified.</strong>
</p>

> [!WARNING]
> **🚧 Active Development Notice**
>
> InfiChat is continuously evolving. We are actively adding new features, optimizing performance, and refining the architecture. Expect frequent updates!

<p align="center">
  A production-grade, self-hosted generative AI platform featuring multi-provider LLM streaming, autonomous multi-agent code execution, professional Indic voice AI (TTS/STT), Retrieval-Augmented Generation (RAG), deep research & thinking engines, an enterprise admin command center, subscription management, and a native desktop application via Electron.
</p>

---

> [!NOTE]
> **🚀 Complete Platform Access**
>
> This repository contains the **complete source code** for the InfiChat platform. You have full access to:
>
> - `backend/app/` — FastAPI core, API routes, models, schemas, and AI services.
> - `frontend/src/` — React UI, streaming chat, and components.
> - `admin-frontend/src/` — 25+ command center governance modules.
> - `TTS and STT/` — Custom voice AI pipelines (TTS/STT).
> - `frontend/electron/` — Native desktop application shell.
> - `README.md` — Full documentation and architecture reference.
> - `package.json` & `requirements.txt` — Complete dependency manifests.
>
> *Note: For security and privacy, local `.env` files, proprietary database automation scripts (`schema.sql`, `fix_db_schema.py`), migration histories (`alembic/`), and user data volumes (`data/`, `redis/`) are intentionally excluded via `.gitignore`.*
>
> For licensing, collaboration, or access inquiries, please contact the author directly.

---

## 📑 Table of Contents

- [🛡️ Our Mission](#️-our-mission)
- [✨ Feature Highlights](#-feature-highlights)
- [🏗️ System Architecture](#️-system-architecture)
- [🛠️ Technology Stack](#️-technology-stack)
- [📋 Prerequisites](#-prerequisites)
- [⚡ Quick Start](#-quick-start-windows)
- [🔧 Manual Setup](#-manual-setup)
- [🗝️ API Keys & Configuration](#️-api-keys--configuration)
- [📁 Project Structure](#-project-structure)
- [📡 API Reference](#-api-reference)
- [🔐 Security Model](#-security-model)
- [🚀 Deployment](#-deployment)
- [🎙️ Voice System Deep Dive](#️-voice-system-deep-dive)
- [📚 RAG System Deep Dive](#-rag-system-deep-dive)
- [🤖 Code Agent Deep Dive](#-code-agent-deep-dive)
- [🧠 Deep Research & Thinking](#-deep-research--thinking-engines)
- [🎛️ Admin Command Center](#️-admin-command-center-deep-dive)
- [💳 Subscription System](#-subscription-system)
- [🖥️ Desktop Application](#️-desktop-application-electron)
- [🐛 Troubleshooting](#-troubleshooting)
- [🤝 Contributing](#-contributing)
- [📜 License](#-license)

---

## 🛡️ Our Mission

**InfiChat** was built on a single principle: **combining the world's best AI models into one unified, seamless command center — entirely under your control.**

Instead of switching between ChatGPT, Claude, and specialized coding models, InfiChat dynamically routes your requests to the optimal AI provider — whether that's Groq for lightning-fast inference, Google Gemini for multimodal vision, NVIDIA NIM for enterprise-grade autonomous coding, or DuckDuckGo + Arxiv for deep research synthesis.

| Capability                               | Standard Chatbots | **InfiChat** |
| :--------------------------------------- | :---------------: | :----------: |
| Multi-Provider Dynamic LLM Routing       |        ❌         |      ✅      |
| Autonomous Multi-Agent Code Execution    |        ❌         |      ✅      |
| Deep Research & Extended Thinking Modes  |        ❌         |      ✅      |
| Professional Indic Voice AI (TTS + STT)  |        ❌         |      ✅      |
| RAG with Local Vector Embeddings         |        ❌         |      ✅      |
| AI Image Generation                      |        ❌         |      ✅      |
| Enterprise Admin Command Center (25+ Modules) |   ❌         |      ✅      |
| Subscription & Usage Metering            |        ❌         |      ✅      |
| Native Desktop Application (Electron)    |        ❌         |      ✅      |
| Self-Hosted — Zero Data Leaves Your Machine |     ❌         |      ✅      |

> **InfiChat is designed as a production-ready enterprise AI gateway for professionals who want ChatGPT-level UX powered seamlessly by the best APIs on the market — fully self-hosted.**

---

## ✨ Feature Highlights

### 💬 Multi-Provider Streaming Chat

InfiChat's **Smart Router** (`llm_router.py`) dynamically routes requests to the optimal LLM provider based on task type, model availability, and cost efficiency.

| Provider          | Model                   | Speed        | Use Case                          |
| :---------------- | :---------------------- | :----------: | :-------------------------------- |
| **Groq**          | Llama 3.3 70B           | ~300 tok/s   | General chat, summarization       |
| **NVIDIA NIM**    | StarCoder2 7B           | Ultra-fast   | Autonomous multi-agent coding     |
| **Google Gemini** | Flash 2.0               | Ultra-fast   | Vision, multimodal, long documents|
| **OpenRouter**    | DeepSeek V3, Claude 3.5 | Varies       | Specialized cognitive tasks       |
| **Ollama**        | Local models            | Hardware-dependent | 100% offline private inference |

**Core Capabilities:**

- Real-time **Server-Sent Events (SSE)** streaming with token-by-token output
- Persistent multi-turn conversation history with session archiving
- Shareable conversation links with access-controlled public URLs
- **PII scrubbing** — automatically redacts personally identifiable information before logging
- **Token usage tracking** — per-message and per-session token metering with visual badges
- **Accent color theming** — user-customizable interface colors
- **Command palette** (`⌘K`) — instant navigation and action shortcuts

---

### 🎙️ Professional Indic Voice AI (TTS / STT)

InfiChat features a best-in-class voice pipeline tailored for multilingual Indian users, with a dedicated standalone **Voice AI Agent** module (`TTS and STT/`).

#### Text-to-Speech (TTS) Voice Profiles

| Profile                     | Locale  | Voice           | Character                        |
| :-------------------------- | :------ | :-------------- | :------------------------------- |
| 🔊 **Professional English** | `en-IN` | `PrabhatNeural` | Authoritative, broadcast-quality |
| 🔊 **Corporate Hindi**      | `hi-IN` | `SwaraNeural`   | Warm, professional female        |
| 🔊 **Empathetic Telugu**    | `te-IN` | `MohanNeural`   | Calm, reassuring male            |
| 🔊 **Alert Hindi (Fast)**   | `hi-IN` | `Swara`         | Rapid, notification-style        |

**Voice Configuration** (`voice_config.json`):

- **Persona tuning** — tone, energy, confidence, warmth controls
- **Delivery parameters** — speaking speed, clarity, pause models (comma: 180ms, full-stop: 320ms)
- **Pronunciation rules** — abbreviation expansion (AI → "A I", OTP → "O T P"), year styles, technical term mode
- **Dialogue rules** — polite acknowledgement, no Western slang, empathetic error tones
- **Response framework** — acknowledge → state action → give result → offer next help

**Key Capabilities:**

- **Sub-1-second audio latency** — MP3 streaming starts before synthesis completes
- **Native Indian number formatting** — Correctly reads ₹ Lakhs, Crores, and common abbreviations
- **Voice interruption** — User can stop playback mid-sentence
- **Streaming audio chunks** — Progressive delivery over WebSocket

#### Speech-to-Text (STT)

- Powered by **Faster Whisper** (local CTranslate2 inference — no cloud API)
- Works **fully offline** — voice data never leaves your machine
- Supports multilingual transcription across Indian and global languages
- Real-time waveform visualization in the UI

---

### 📚 RAG — Retrieval-Augmented Generation

Transform your static documents into an interactive, AI-powered knowledge base.

**How it works:**

1. Upload **PDF**, **DOCX**, or **TXT** files through the Knowledge Base panel
2. Documents are parsed, chunked, and embedded using `sentence-transformers`
3. Chunks are indexed in **ChromaDB** (production) or **FAISS** (local dev)
4. On each query, semantically relevant chunks are retrieved and injected into the LLM prompt
5. The model responds with citations grounded in your documents

**Technical specs:**

- Embedding model: `all-MiniLM-L6-v2` (runs locally, ~80MB, 384-dim vectors)
- Chunking strategy: Recursive character-aware with 512-token overlap windows
- Retrieval: Cosine similarity with top-k = 5 context injection
- Dual backend: ChromaDB for production Docker, FAISS for lightweight local dev
- Supports multi-document knowledge bases per user
- Advanced parsing: `pypdf`, `pdfplumber`, `python-docx`, `beautifulsoup4`, `trafilatura`

---

### 🤖 Multi-Agent Sandboxed Code Execution

InfiChat utilizes an advanced **Multi-Agent Code Orchestrator** (`code_orchestrator/`) powered by NVIDIA NIM to plan, write, review, and execute code autonomously.

**Agent Pipeline:**

- **Planner Agent** (Llama 3.3): Breaks down complex tasks into manageable steps
- **Coder Agent** (NVIDIA StarCoder2): Generates high-quality enterprise code
- **Reviewer Agent** (NVIDIA StarCoder2): Audits the generated code before execution
- **Orchestrator**: Coordinates the entire agent pipeline with automatic retry logic

**Execution Environment:**

- **Hardened Docker container** — zero host system access
- **Real-time output streaming** via WebSocket — watch code execute live
- **Auto-debugging loop** — the agent reads runtime errors and self-corrects
- **Resource limits** — CPU, memory, and execution time caps enforced
- **Network isolation** — sandbox container has no external network access
- **Ephemeral containers** — destroyed after each session

---

### 🧠 Deep Research & Thinking Engines

InfiChat includes two advanced cognitive processing modes:

#### 🔬 Deep Research (`deep_research/`)

An autonomous multi-agent research pipeline:
- **Query → Web Search** (DuckDuckGo + Arxiv) → **Content Extraction** → **Synthesis**
- Multi-source aggregation with citation tracking
- Academic paper integration via Arxiv API
- Keyword extraction using YAKE and SpaCy NLP
- Real-time progress streaming to the frontend (`DeepResearchProgress.tsx`)

#### 🤔 Deep Thinking (`deep_thinking/`)

Extended reasoning mode:
- Multi-step chain-of-thought processing
- Streaming thinking steps with visual progress indicators (`DeepThinkingProgress.tsx`)
- Configurable thinking depth and iteration limits

---

### 🔐 Authentication & Account Management

Enterprise-grade identity and access management:

- **Email + OTP** two-factor authentication (TOTP-compatible)
- **Google OAuth 2.0** single sign-on — one-click login
- **JWT-based sessions** with configurable access tokens (60min) and refresh tokens (30d)
- **Bcrypt password hashing** (cost factor 12, via `passlib[bcrypt]`)
- **Rate limiting** via `slowapi` — prevents brute-force and abuse
- **RBAC (Role-Based Access Control)** — user, admin, super-admin roles (`rbac.py`)
- **CSRF protection** middleware
- **Input sanitization** middleware with XSS prevention (`bleach`)
- **AI firewall** — request filtering and safety guardrails
- **Audit logging** — all critical actions logged with tamper-proof trails
- Account settings: password reset, profile management, accent color preferences
- Shared chat link generation with expiry controls

---

### 🎛️ Enterprise Admin Command Center

A comprehensive, real-time governance dashboard with **25+ specialized modules**:

| Module | Description |
| :--- | :--- |
| **Dashboard** | Live CPU/RAM telemetry, user stats, system health overview |
| **Analytics** | Usage analytics, trend visualization, data insights |
| **Database Control** | Direct introspection into PostgreSQL, Redis, ChromaDB |
| **Release Management** | Automated rollout, deployment history, rollback, version control |
| **Network Security** | Firewall rules, connection monitoring, threat detection |
| **Subscription Plans** | Plan CRUD, pricing tiers, feature gating |
| **User Plan Manager** | Per-user plan assignment, upgrade/downgrade |
| **RBAC Studio** | Role and permission management interface |
| **Developer Keys** | API key generation, rotation, and revocation |
| **Prompt Firewall** | AI safety rules, prompt injection prevention |
| **Model Hub** | LLM model registry, configuration, and routing |
| **Knowledge Graph** | Visualize document relationships and embeddings |
| **Topology Map** | Infrastructure topology visualization |
| **Cluster Federation** | Multi-node cluster management |
| **Global Broadcast** | System-wide announcement and notification system |
| **Platform Outage** | Incident management and status page |
| **Auto Healing** | Self-healing infrastructure automation |
| **Chaos Monkey** | Resilience testing through controlled failures |
| **DEFCON Controls** | Emergency security posture escalation |
| **Usage Monitoring** | Real-time API usage tracking and quotas |
| **Predictive Scaling** | AI-driven resource scaling recommendations |
| **Telemetry** | Observability metrics and instrumentation |
| **Platform Branding** | White-label customization controls |
| **Tenant Manager** | Multi-tenancy isolation and management |
| **Workflow Orchestrator** | Visual pipeline builder and job orchestration |

---

### 💳 Subscription System

Full-featured subscription and monetization engine:

- **Tiered plans** with configurable feature gates
- **Usage metering** — per-user token counting, API call tracking
- **Subscription service** (`subscription_service.py`) with plan management
- **Seed plans** automation for bootstrapping default tiers
- **Subscription gate** (`SubscriptionGate.tsx`) — frontend enforcement
- **Admin plan management** — create, edit, assign plans via command center

---

### 🖼️ Image Generation

- AI-powered image generation via **Pollinations API** or locally hosted **Stable Diffusion XL**
- Prompt-to-image directly within the chat interface
- Gallery view for generated images with download support
- Dedicated `ImageGen.tsx` page with full controls

---

### 🖥️ Desktop Application (Electron)

InfiChat ships as a native desktop app via **Electron**:

- Cross-platform builds: **Windows (.exe)**, **macOS (.dmg)**, **Linux (.AppImage)**
- Electron main process with custom preload security scripts
- `electron-builder` configuration for portable and installer builds
- NSIS installer support with custom icons and shortcuts
- App ID: `com.infichat.app`

---

## 🏗️ System Architecture

```mermaid
graph TD
    User["👤 User (Browser / Desktop)"]

    subgraph "Frontend Layer"
        UI["Main UI (React 18 + Tailwind)\n(Port 5173)"]
        AdminUI["Admin Command Center (React 18)\n(Port 5174)"]
        Desktop["Electron Desktop Shell"]
    end

    subgraph "API Gateway"
        API["FastAPI Backend\n(Uvicorn • Port 8000/8080)"]
        RL["SlowAPI Rate Limiter"]
        JWT["JWT Auth + RBAC Middleware"]
        CSRF["CSRF Protection"]
        Sanitizer["Input Sanitizer"]
        AuditLog["Audit Logger"]
    end

    subgraph "AI Orchestration Layer"
        Router{"🧠 Smart LLM Router"}
        LLM["☁️ API Providers\n(Groq / Gemini / OpenRouter)"]
        NVIDIA["🟢 NVIDIA NIM\n(Multi-Agent Code Orchestrator)"]
        TTS["🎙️ TTS Engine\n(Edge-TTS + Indic Voice)"]
        STT["🗣️ STT Engine\n(Faster Whisper, Offline)"]
        RAG["📚 RAG Pipeline\n(Sentence Transformers)"]
        Sandbox["🐳 Code Sandbox\n(Isolated Docker)"]
        ImgGen["🖼️ Image Generation\n(Pollinations / SDXL)"]
        Research["🔬 Deep Research\n(DuckDuckGo + Arxiv + NLP)"]
        Thinking["🤔 Deep Thinking\n(Extended Chain-of-Thought)"]
        Firewall["🛡️ AI Firewall"]
    end

    subgraph "Persistent Storage"
        PG[("🐘 PostgreSQL 16\n(Users, Sessions, Chats, Plans)")]
        VDB[("🔵 ChromaDB / FAISS\n(Vector Embeddings)")]
        Cache[("⚡ Redis 7\n(Sessions, Cache, Pub/Sub)")]
        Files["📁 File Storage\n(Uploads, Audio, Voices)"]
    end

    subgraph "Auth Providers"
        Google["🔵 Google OAuth 2.0"]
        OTP["📧 Email OTP (2FA)"]
    end

    User --> UI
    User --> AdminUI
    User --> Desktop
    Desktop --> UI
    UI <-->|"HTTP / SSE / WebSocket"| API
    AdminUI <-->|"HTTP / REST API"| API
    API --> RL --> JWT --> CSRF --> Sanitizer
    Sanitizer --> AuditLog --> Router
    Router --> LLM
    Router --> NVIDIA
    Router --> TTS
    Router --> STT
    Router --> RAG
    Router --> Sandbox
    Router --> ImgGen
    Router --> Research
    Router --> Thinking
    Router --> Firewall
    API --> PG
    API --> VDB
    API --> Cache
    API --> Files
    API --> Google
    API --> OTP
```

### Data Flow for a Chat Request

```
User types message
       │
       ▼
React UI sends POST /api/chat with JWT token
       │
       ▼
FastAPI validates token → rate limit → CSRF check → input sanitization → audit log
       │
       ├─── Deep Research? → DuckDuckGo + Arxiv search → NLP synthesis → stream results
       │
       ├─── Deep Thinking? → Extended chain-of-thought → stream thinking steps
       │
       ├─── RAG enabled? → ChromaDB/FAISS similarity search → inject context
       │
       ├─── Code task? → Multi-Agent Orchestrator → Docker Sandbox → stream stdout/stderr
       │
       └─── Standard chat? → Smart Router → stream SSE tokens from Groq/Gemini/OpenRouter
                                         │
                                         ▼
                              React renders tokens in real-time
                                         │
                                         ▼
                              PostgreSQL persists conversation
                              Redis caches session state
```

---

## 🛠️ Technology Stack

### Frontend (Main UI)

| Technology          | Version | Role                                           |
| :------------------ | :------ | :--------------------------------------------- |
| React               | 18      | UI framework with hooks-based architecture     |
| TypeScript          | 5.x     | Type-safe component development                |
| Vite                | 5.x     | Lightning-fast HMR dev server & bundler        |
| Tailwind CSS        | 3.4     | Utility-first responsive styling               |
| Framer Motion       | 11.x    | Declarative animations and transitions         |
| GSAP                | 3.15    | High-performance scroll and timeline animations|
| Radix UI            | Latest  | Accessible headless component primitives       |
| Monaco Editor       | 0.55    | VS Code-grade in-browser code editor           |
| Zustand             | 4.5     | Lightweight global state management            |
| React Query         | 5.x     | Server state management and caching            |
| React Router        | 6.x     | Client-side routing and navigation             |
| Sonner              | 2.x     | Toast notification system                      |
| cmdk                | 1.x     | Command palette (⌘K) component                |
| Electron            | 41.x    | Native desktop application shell               |

### Frontend (Admin Dashboard)

| Technology          | Version | Role                                           |
| :------------------ | :------ | :--------------------------------------------- |
| React               | 18      | UI framework                                   |
| Tailwind CSS        | 4.2     | Styling (v4 with `@tailwindcss/vite`)          |
| Recharts            | 3.7     | Data visualization and charting                |
| React Flow          | 12.x    | Node-based graph/workflow visualization        |
| React Three Fiber   | 9.x    | 3D WebGL rendering (topology, globe)           |
| Three.js            | 0.183   | 3D graphics engine                             |
| React Globe.gl      | 2.37    | Geographic data globe visualization            |
| React Force Graph 3D| 1.29    | 3D force-directed graph (knowledge graph)      |
| XTerm.js            | 6.0     | Terminal emulator (in-browser shell)           |
| Framer Motion       | 12.x    | Advanced UI animations                         |
| Lucide React        | Latest  | Consistent icon library                        |
| XLSX                | 0.18    | Excel file export capability                   |

### Backend

| Technology         | Version | Role                                          |
| :----------------- | :------ | :-------------------------------------------- |
| FastAPI            | 0.109.2 | Async REST API + WebSocket server             |
| Uvicorn            | 0.27.1  | ASGI server with lifespan management          |
| Pydantic           | 2.6.1   | Data validation and settings management       |
| SQLAlchemy         | 2.0.25  | Async ORM with connection pooling             |
| Alembic            | 1.13.1  | Database migrations and schema versioning     |
| python-jose        | 3.3.0   | JWT token generation and validation           |
| PyJWT              | 2.8.0   | Additional JWT utilities                      |
| passlib/bcrypt     | 1.7.4   | Secure password hashing                       |
| SlowAPI            | 0.1.9   | Request rate limiting                         |
| httpx              | 0.26.0  | Async HTTP client for external API calls      |
| bleach             | 6.1+    | HTML sanitization for XSS prevention          |
| cryptography       | 42.0+   | Encryption primitives and key management      |
| psutil             | 5.9.8   | System resource monitoring (CPU, RAM)         |
| python-magic       | 0.4.27+ | MIME type detection for file uploads          |
| Prometheus Client  | 0.20.0  | Metrics export for observability              |

### AI & ML

| Technology                 | Role                                       |
| :------------------------- | :----------------------------------------- |
| Groq SDK                   | Ultra-fast Llama 3.3 70B inference         |
| Google Generative AI       | Gemini Flash 2.0 multimodal                |
| OpenRouter                 | Gateway to 100+ LLM models                |
| NVIDIA NIM                 | Enterprise multi-agent code generation     |
| ChromaDB ≥0.4.22          | Production vector database for RAG         |
| FAISS (CPU) ≥1.7.4        | Lightweight local vector search            |
| sentence-transformers ≥2.2 | Document embedding (all-MiniLM-L6-v2)     |
| faster-whisper ≥0.10.0    | CTranslate2-based local STT               |
| edge-tts ≥6.1.9           | Microsoft Neural Indic TTS                 |
| SpaCy ≥3.7.0              | NLP pipeline for entity/keyword extraction |
| YAKE ≥0.4.8               | Unsupervised keyword extraction            |
| DuckDuckGo Search ≥5.0    | Web search for deep research               |
| Arxiv ≥2.1.0              | Academic paper search and retrieval        |
| tiktoken ≥0.6.0           | Accurate token counting                    |
| Pillow ≥10.0.0            | Image processing and manipulation          |

### Document Parsing

| Technology         | Role                                          |
| :----------------- | :-------------------------------------------- |
| pypdf ≥4.0.0      | PDF text extraction                           |
| pdfplumber ≥0.10.0| Advanced PDF parsing with layout preservation |
| python-docx ≥1.1.0| Microsoft Word document parsing               |
| beautifulsoup4 ≥4.12 | HTML/XML parsing for web content           |
| trafilatura ≥1.6.0| Web page content extraction and cleaning      |

### Infrastructure

| Technology    | Role                                             |
| :------------ | :----------------------------------------------- |
| PostgreSQL 16 | Primary relational database                      |
| Redis 7       | Session caching, pub/sub, rate limit counters    |
| Docker        | Container runtime + code sandbox isolation       |
| asyncpg       | High-performance async PostgreSQL driver         |
| aiosqlite     | Async SQLite driver for local development        |
| pip-audit     | Dependency vulnerability scanning                |

---

## 📋 Prerequisites

Before installing InfiChat, ensure your system meets the following requirements:

### System Requirements

| Component   |      Minimum       |            Recommended            |
| :---------- | :----------------: | :-------------------------------: |
| **CPU**     |      4 cores       |             8+ cores              |
| **RAM**     |        8 GB        |              16 GB+               |
| **Storage** |       20 GB        |              50 GB+               |
| **OS**      | Windows 10 / Linux |    Windows 11 / Ubuntu 22.04+     |
| **GPU**     |    Not required    | NVIDIA RTX (for Ollama + Whisper) |

### Required Software

- **Python** 3.11+ → [python.org](https://www.python.org/downloads/)
- **Node.js** 20+ → [nodejs.org](https://nodejs.org)
- **Docker Desktop** → [docker.com](https://www.docker.com/products/docker-desktop/)
- **Git** → [git-scm.com](https://git-scm.com)

### Optional Software

- **Ollama** (for offline local models) → [ollama.com](https://ollama.com)
- **NVIDIA GPU drivers** (for Whisper acceleration and local model inference)

---

## ⚡ Quick Start (Windows)

The fastest way to get InfiChat running — one script does everything.

```powershell
# 1. Clone the repository
git clone https://github.com/gugulothubhavith/Self-Hosted-Generative-AI-Chatbot.git
cd Self-Hosted-Generative-AI-Chatbot

# 2. Run the automated setup script
.\setup_windows.ps1
```

**The `setup_windows.ps1` script automatically:**

1. ✅ Verifies Docker Desktop and Python 3.11+ are installed
2. ✅ Prompts for API keys and writes your `.env` file
3. ✅ Creates a Python virtual environment and installs all dependencies
4. ✅ Initializes the PostgreSQL database schema
5. ✅ Builds and launches all services
6. ✅ Opens the application at **`http://localhost:5173`**

> **Tip:** On first run, Docker will pull required images (~2–3 GB). This is a one-time operation.

---

## 🔧 Manual Setup

For advanced users or Linux/macOS deployments:

### Step 1: Clone & Configure

```bash
git clone https://github.com/gugulothubhavith/Self-Hosted-Generative-AI-Chatbot.git
cd Self-Hosted-Generative-AI-Chatbot

# Copy environment template
cp backend/.env.example backend/.env
# Edit .env with your API keys (see configuration section below)
```

### Step 2: Backend Setup

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
.\venv\Scripts\activate          # Windows
# source venv/bin/activate       # Linux/macOS

# Install all Python dependencies
pip install -r requirements.txt

# Initialize the database (ensure PostgreSQL is running)
python fix_db_schema.py
```

### Step 3: Frontend Setup

```bash
cd frontend
npm install

# Admin dashboard (separate terminal)
cd admin-frontend
npm install
```

### Step 4: Start Services

**Option A — Using the monorepo launcher (recommended):**

```bash
# Install root dependencies first
npm install

# Start ALL services concurrently (Backend + Frontend + Admin)
npm run dev

# Or start only the UI layer (Frontend + Admin)
npm run dev:ui
```

**Option B — Using the batch launcher:**

```batch
.\start_all.bat
```

**Option C — Manually (3 terminals):**

```bash
# Terminal 1: Start the FastAPI backend
cd backend
.\venv\Scripts\activate
uvicorn app.main:app --host 0.0.0.0 --port 8080 --reload

# Terminal 2: Start the React frontend
cd frontend
npm run dev

# Terminal 3: Start the Admin dashboard
cd admin-frontend
npm run dev
```

**Option D — Docker Compose:**

```bash
docker compose up --build
```

### Step 5: Access the Application

| Service              | URL                         |
| :------------------- | :-------------------------- |
| **Frontend UI**      | http://localhost:5173       |
| **Admin Dashboard**  | http://localhost:5174       |
| **Backend API**      | http://localhost:8080       |
| **Swagger API Docs** | http://localhost:8080/docs  |
| **ReDoc API Docs**   | http://localhost:8080/redoc |

---

## 🗝️ API Keys & Configuration

### Required API Keys

| Provider             | Purpose                            | Free Tier | Link                                               |
| :------------------- | :--------------------------------- | :-------: | :------------------------------------------------- |
| **Groq**             | Llama 3.3 70B — primary fast chat  |  ✅ Yes   | [console.groq.com](https://console.groq.com)       |
| **Google AI Studio** | Gemini Flash — vision & multimodal |  ✅ Yes   | [aistudio.google.com](https://aistudio.google.com) |
| **OpenRouter**       | DeepSeek, Claude, 100+ models      |  ✅ Yes   | [openrouter.ai](https://openrouter.ai)             |

### Optional Configuration

| Provider         | Purpose                       | Link                                                         |
| :--------------- | :---------------------------- | :----------------------------------------------------------- |
| **Ollama**       | 100% offline local models     | [ollama.com](https://ollama.com)                             |
| **Google OAuth** | Google SSO login              | [console.cloud.google.com](https://console.cloud.google.com) |
| **NVIDIA NIM**   | Enterprise code agent models  | [build.nvidia.com](https://build.nvidia.com)                 |

### Full `.env` Configuration Reference

```ini
# ─────────────────────────────────────────────────────
#  LLM API Keys
# ─────────────────────────────────────────────────────
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
GOOGLE_API_KEY=AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
OPENROUTER_API_KEY=sk-or-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# ─────────────────────────────────────────────────────
#  Database Configuration
# ─────────────────────────────────────────────────────
DATABASE_URL=postgresql://ai:ai_pass@localhost:5432/autoagent
# Or for local dev without Docker:
# DATABASE_URL=sqlite:///./data/infichat.db
REDIS_URL=redis://localhost:6379/0

# ─────────────────────────────────────────────────────
#  Authentication & Security
# ─────────────────────────────────────────────────────
# Generate with: python -c "import secrets; print(secrets.token_hex(32))"
SECRET_KEY=your-256-bit-random-secret-key-here
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=30

# ─────────────────────────────────────────────────────
#  Google OAuth 2.0 (Optional)
# ─────────────────────────────────────────────────────
GOOGLE_CLIENT_ID=xxxxxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxxxxxxxxx
GOOGLE_REDIRECT_URI=http://localhost:8080/api/oauth/google/callback

# ─────────────────────────────────────────────────────
#  NVIDIA NIM & Multi-Agent Keys (Optional)
# ─────────────────────────────────────────────────────
CODER_API_KEY=nvapi-...
REVIEWER_API_KEY=nvapi-...

# ─────────────────────────────────────────────────────
#  Feature Flags
# ─────────────────────────────────────────────────────
ENABLE_PII_SCRUBBING=true
ENABLE_RATE_LIMITING=true
ENABLE_CODE_SANDBOX=true
MAX_UPLOAD_SIZE_MB=50

# ─────────────────────────────────────────────────────
#  Application Settings
# ─────────────────────────────────────────────────────
ENVIRONMENT=development
LOG_LEVEL=INFO
CORS_ORIGINS=http://localhost:5173
```

---

## 📁 Topographical Project Analysis

InfiChat is engineered as a true enterprise monorepo spanning 4 application layers, 25+ admin modules, and over 100+ source files of custom logic.

### 🗺️ Deep-Dive Monorepo Architecture

```text
Self-Hosted-Generative-AI-Chatbot/
│
├── 🐍 backend/                          # [Core Intelligence & API Gateway]
│   │                                    # The brain of InfiChat — all routing, orchestration, and DB logic.
│   │
│   ├── app/
│   │   ├── main.py                      # Application entrypoint, lifespan hooks, CORS, model preloading
│   │   ├── __init__.py
│   │   │
│   │   ├── api/                         # 24 Route Controllers
│   │   │   ├── auth.py                  # Registration, login, logout, password reset, OTP verification
│   │   │   ├── oauth.py                 # Google OAuth 2.0 flow
│   │   │   ├── chat.py                  # LLM streaming chat, history, shared links
│   │   │   ├── voice.py                 # TTS synthesis, STT transcription endpoints
│   │   │   ├── rag.py                   # Document upload, knowledge base query
│   │   │   ├── code_agent.py            # Sandboxed Python execution trigger
│   │   │   ├── image.py                 # AI image generation
│   │   │   ├── research.py              # Deep research mode endpoints
│   │   │   ├── thinking.py              # Deep thinking mode endpoints
│   │   │   ├── snippets.py              # Code snippet CRUD
│   │   │   ├── settings.py              # User preferences and profile
│   │   │   ├── admin.py                 # User management and system stats
│   │   │   ├── admin_governance.py      # Governance policies and compliance
│   │   │   ├── admin_security.py        # Security configuration and key rotation
│   │   │   ├── admin_zero_trust.py      # Zero-trust security posture
│   │   │   ├── subscriptions.py         # Subscription plan management
│   │   │   ├── organizations.py         # Multi-tenant organization management
│   │   │   ├── system.py                # System health, metrics, diagnostics
│   │   │   ├── metrics.py               # Prometheus metrics export
│   │   │   ├── proxy.py                 # API proxy endpoints
│   │   │   ├── ws_agent.py              # WebSocket: agent communication
│   │   │   ├── ws_broadcast.py          # WebSocket: real-time broadcast
│   │   │   └── ws_code.py               # WebSocket: live code execution streaming
│   │   │
│   │   ├── services/                    # Business Logic Layer (19 services + 3 sub-modules)
│   │   │   ├── llm_router.py            # 🧠 Smart LLM Router — Groq/Gemini/OpenRouter/Ollama switching
│   │   │   ├── chat_service.py          # Chat session management, message persistence
│   │   │   ├── voice_service.py         # Voice pipeline: TTS synthesis + STT transcription
│   │   │   ├── indic_voice_service.py   # Indian language voice specialization
│   │   │   ├── rag_service.py           # RAG pipeline: embed, store, retrieve, inject
│   │   │   ├── sandbox_service.py       # Docker sandbox lifecycle management
│   │   │   ├── image_service.py         # Image generation orchestration
│   │   │   ├── email_service.py         # Transactional email (OTP, notifications)
│   │   │   ├── agent_service.py         # Agent task coordination
│   │   │   ├── code_agent.py            # Code execution agent
│   │   │   ├── ai_orchestrator.py       # High-level AI task orchestration
│   │   │   ├── ai_firewall.py           # Prompt safety and injection prevention
│   │   │   ├── memory_service.py        # Conversation memory management
│   │   │   ├── privacy_service.py       # PII detection and scrubbing
│   │   │   ├── data_retention.py        # Data lifecycle and cleanup policies
│   │   │   ├── self_healing.py          # Self-healing infrastructure logic
│   │   │   ├── subscription_service.py  # Plan management and billing logic
│   │   │   ├── seed_admin.py            # Default admin user seeding
│   │   │   ├── seed_plans.py            # Default subscription plan seeding
│   │   │   │
│   │   │   ├── code_orchestrator/       # Multi-Agent Code Pipeline
│   │   │   │   ├── orchestrator.py      # Pipeline coordinator
│   │   │   │   ├── agents.py            # Planner, Coder, Reviewer agent implementations
│   │   │   │   └── models.py            # Agent data models
│   │   │   │
│   │   │   ├── deep_research/           # Autonomous Research Engine
│   │   │   │   ├── orchestrator.py      # Research pipeline coordinator
│   │   │   │   ├── agents/              # Search, synthesis, citation agents
│   │   │   │   ├── models.py            # Research data models
│   │   │   │   └── utils/               # NLP utilities, keyword extraction
│   │   │   │
│   │   │   └── deep_thinking/           # Extended Reasoning Engine
│   │   │       ├── orchestrator.py      # Thinking pipeline coordinator
│   │   │       ├── agents/              # Chain-of-thought reasoning agents
│   │   │       └── models.py            # Thinking data models
│   │   │
│   │   ├── core/                        # Security & Configuration Layer
│   │   │   ├── config.py                # Pydantic Settings (all env vars)
│   │   │   ├── security.py              # JWT signing, token validation
│   │   │   ├── auth.py                  # Authentication utilities
│   │   │   ├── rbac.py                  # Role-Based Access Control
│   │   │   ├── encryption.py            # Field-level encryption
│   │   │   ├── redis_client.py          # Async Redis connection management
│   │   │   ├── deps.py                  # FastAPI dependency injection
│   │   │   ├── compat.py               # Cross-database compatibility layer
│   │   │   └── json_utils.py            # JSON serialization utilities
│   │   │
│   │   ├── middleware/                  # Request Processing Pipeline
│   │   │   ├── audit_logging.py         # Tamper-proof action logging
│   │   │   ├── csrf.py                  # Cross-Site Request Forgery protection
│   │   │   ├── firewall.py              # Application-level firewall rules
│   │   │   ├── input_sanitizer.py       # XSS prevention and input cleaning
│   │   │   ├── tenant.py               # Multi-tenancy request isolation
│   │   │   └── usage_tracker.py         # Per-request usage metering
│   │   │
│   │   ├── models/                      # SQLAlchemy ORM Layer (24 models)
│   │   │   ├── user.py, chat.py, admin.py, subscription.py, ...
│   │   │   ├── security.py, incidents.py, observability.py
│   │   │   ├── organization.py, workspace.py, plugins.py
│   │   │   └── types.py, utils.py
│   │   │
│   │   ├── schemas/                     # Pydantic v2 Validation Schemas
│   │   │   ├── auth.py, chat.py, user.py, voice.py, code.py
│   │   │   └── admin_governance.py, admin_security.py
│   │   │
│   │   ├── database/                    # Database Connection Layer
│   │   │   └── db.py                    # Async engine, session factory, init_db
│   │   │
│   │   └── static/                      # Backend static assets
│   │
│   ├── alembic/                         # Database Migrations
│   │   ├── env.py                       # Alembic environment configuration
│   │   ├── script.py.mako               # Migration template
│   │   └── versions/                    # Migration version history
│   │
│   ├── tests/                           # Backend Test Suite
│   │   ├── conftest.py                  # Pytest fixtures and configuration
│   │   ├── test_auth.py                 # Authentication endpoint tests
│   │   ├── test_database.py             # Database layer tests
│   │   ├── test_health.py               # Health check tests
│   │   └── test_sse.py                  # SSE streaming tests
│   │
│   ├── requirements.txt                 # Python dependency locks (83 packages)
│   ├── Dockerfile                       # Production container blueprint
│   ├── alembic.ini                      # Migration configuration
│   └── .env.example                     # Environment variable template
│
├── ⚛️  frontend/                         # [Primary User Interface]
│   │                                    # High-performance streaming chat with rich UI.
│   │
│   ├── src/
│   │   ├── App.tsx                      # Root application with routing
│   │   ├── main.tsx                     # React DOM render entrypoint
│   │   │
│   │   ├── components/                  # Reusable UI Components
│   │   │   ├── ChatInput.tsx            # Message input with voice, attachments
│   │   │   ├── ChatMessage.tsx          # Message bubble with markdown rendering
│   │   │   ├── Sidebar.tsx              # Navigation sidebar with session list
│   │   │   ├── SettingsModal.tsx         # Comprehensive settings panel
│   │   │   ├── CommandPalette.tsx        # ⌘K quick-action launcher
│   │   │   ├── AgentTaskPlan.tsx         # Multi-agent task visualization
│   │   │   ├── DeepResearchProgress.tsx  # Research pipeline progress UI
│   │   │   ├── DeepThinkingProgress.tsx  # Thinking chain progress UI
│   │   │   ├── TokenUsageBadge.tsx       # Token consumption display
│   │   │   ├── SubscriptionGate.tsx      # Plan enforcement modal
│   │   │   ├── ErrorBoundary.tsx         # Error boundary wrapper
│   │   │   ├── Logo.tsx, ProfileAvatar.tsx, ScrollProvider.tsx
│   │   │   ├── settings/               # Settings sub-components
│   │   │   ├── sidebar/                # Sidebar sub-components
│   │   │   └── ui/                     # Primitives (Button, Card, Input, Switch, Toast, etc.)
│   │   │
│   │   ├── pages/                      # Top-Level Route Views
│   │   │   ├── Chat.tsx                 # Main chat interface
│   │   │   ├── CodeAgent.tsx            # Multi-agent code execution page
│   │   │   ├── ImageGen.tsx             # AI image generation page
│   │   │   ├── RAG.tsx                  # Knowledge base management
│   │   │   ├── Snippets.tsx             # Code snippet manager
│   │   │   ├── Login.tsx                # Authentication page
│   │   │   ├── Register.tsx             # Registration page
│   │   │   ├── SharedChatView.tsx       # Public shared chat viewer
│   │   │   └── Admin.tsx                # Admin redirect
│   │   │
│   │   ├── hooks/                      # Custom React Hooks
│   │   │   ├── useAuth.tsx              # Authentication state & guards
│   │   │   ├── useChatStream.ts         # SSE streaming chat connection
│   │   │   ├── useResearchStream.ts     # Deep research streaming
│   │   │   ├── useThinkingStream.ts     # Deep thinking streaming
│   │   │   └── useAccentColor.ts        # Theme accent color management
│   │   │
│   │   ├── context/                    # React Context Providers
│   │   │   └── ThemeContext.tsx          # Dark/light theme provider
│   │   │
│   │   ├── lib/                        # Utilities
│   │   │   └── utils.ts                 # Helper functions
│   │   │
│   │   └── styles/                     # Design System
│   │       └── design-tokens.css        # CSS custom properties and tokens
│   │
│   ├── electron/                        # Electron Desktop Shell
│   │   ├── main.js                      # Main process: window management, IPC
│   │   └── preload.js                   # Preload: secure context bridge
│   │
│   ├── public/                          # Static Assets
│   ├── build/                           # Electron build resources (icons)
│   ├── index.html                       # HTML entrypoint
│   ├── package.json                     # Dependencies (99 packages)
│   ├── vite.config.ts                   # Vite build configuration
│   ├── tailwind.config.js               # Tailwind CSS customization
│   ├── postcss.config.js                # PostCSS configuration
│   └── tsconfig.json                    # TypeScript configuration
│
├── 🛡️  admin-frontend/                   # [Governance Command Center]
│   │                                    # 25+ specialized admin modules.
│   │
│   ├── src/
│   │   ├── App.tsx                      # Admin app root with routing
│   │   ├── main.tsx                     # React DOM render entrypoint
│   │   │
│   │   ├── components/                  # Admin Components
│   │   │   ├── Layout.tsx               # Admin layout shell with sidebar
│   │   │   ├── CommandPalette.tsx        # Admin ⌘K command palette
│   │   │   └── ui/                     # Admin UI primitives
│   │   │
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx            # Main admin dashboard
│   │   │   ├── Login.tsx                # Admin authentication
│   │   │   └── command-center/          # 25 Specialized Admin Modules
│   │   │       ├── Analytics.tsx, AutoHealing.tsx, ChaosMonkey.tsx
│   │   │       ├── ClusterFederation.tsx, DatabaseControl.tsx
│   │   │       ├── DefconControls.tsx, DeveloperKeys.tsx
│   │   │       ├── GlobalBroadcast.tsx, HardwareGPU.tsx
│   │   │       ├── KnowledgeGraph.tsx, ModelHub.tsx
│   │   │       ├── NetworkSecurity.tsx, PlatformBranding.tsx
│   │   │       ├── PlatformOutage.tsx, PredictiveScaling.tsx
│   │   │       ├── PromptFirewall.tsx, RBACStudio.tsx
│   │   │       ├── ReleaseManagement.tsx, SubscriptionPlans.tsx
│   │   │       ├── Telemetry.tsx, TenantManager.tsx
│   │   │       ├── TopologyMap.tsx, UsageMonitoring.tsx
│   │   │       ├── UserPlanManager.tsx, WorkflowOrchestrator.tsx
│   │   │
│   │   ├── hooks/                      # Admin Hooks
│   │   │   ├── useAuth.tsx              # Admin auth with super-admin RBAC
│   │   │   └── useHasPermission.ts      # Permission checking utility
│   │   │
│   │   └── lib/                        # Admin Utilities
│   │       └── utils.ts
│   │
│   ├── index.html
│   ├── package.json                     # Dependencies (37 packages)
│   ├── vite.config.ts
│   └── tsconfig.json
│
├── 🔊 TTS and STT/                      # [Voice AI Agent — Standalone Module]
│   │                                    # Independent Indian Conversational Voice AI.
│   │
│   ├── main.py                          # CLI / API mode launcher
│   ├── voice_config.json                # Voice persona and delivery configuration
│   ├── pyproject.toml                   # Python project metadata
│   ├── app/
│   │   ├── agent.py                     # Voice AI agent orchestrator
│   │   ├── response_engine.py           # LLM response generation engine
│   │   ├── tts_engine.py                # Text-to-Speech synthesis engine
│   │   ├── stt_engine.py                # Speech-to-Text recognition engine
│   │   ├── tts_formatter.py             # Indian number/abbreviation normalization
│   │   ├── http_api.py                  # FastAPI HTTP server for voice agent
│   │   ├── cli.py                       # Interactive CLI interface
│   │   ├── config.py                    # Voice module configuration
│   │   └── models.py                    # Voice data models
│   └── tests/                           # Voice module test suite
│
├── 💾 data/                             # [Runtime Data Volumes]
│   ├── chromadb/                        # Vector embedding storage
│   ├── models/                          # Downloaded ML model caches
│   ├── postgres/                        # PostgreSQL data directory
│   └── sandbox/                         # Code sandbox working directory
│
├── 📦 redis/                            # [Bundled Redis Server (Windows)]
│                                        # Pre-compiled Redis binaries for Windows dev.
│
├── 🔄 .github/workflows/               # [CI/CD Pipeline]
│   └── ci.yml                           # Backend tests + Frontend/Admin builds
│
├── package.json                         # Monorepo root — concurrently orchestrator
├── .gitignore                           # Proprietary source code protection
└── README.md                            # This file
```

---

## 📡 API Reference

The full interactive Swagger UI is available at **`http://localhost:8080/docs`** when the backend is running.

### Endpoint Groups

| Group              | Base Path           | Description                                    |
| :----------------- | :------------------ | :--------------------------------------------- |
| **Authentication** | `/api/auth/`        | Register, login, logout, OTP, password reset   |
| **OAuth**          | `/api/oauth/`       | Google OAuth 2.0 flow                          |
| **Chat**           | `/api/chat/`        | LLM streaming chat, history, shared links      |
| **Voice**          | `/api/voice/`       | TTS synthesis, STT transcription               |
| **RAG**            | `/api/rag/`         | Document upload, knowledge base, query         |
| **Code Agent**     | `/api/code/`        | Sandboxed Python execution                     |
| **Research**       | `/api/research/`    | Deep research mode with web + academic search  |
| **Thinking**       | `/api/thinking/`    | Extended chain-of-thought reasoning            |
| **Image**          | `/api/image/`       | AI image generation                            |
| **Snippets**       | `/api/snippets/`    | Save and manage code snippets                  |
| **Settings**       | `/api/settings/`    | User preferences and profile                   |
| **Admin**          | `/api/admin/`       | User management, system stats, governance      |
| **Subscriptions**  | `/api/subscriptions/`| Plan management and billing                   |
| **Organizations**  | `/api/organizations/`| Multi-tenant org management                   |
| **System**         | `/api/system/`      | Health checks, diagnostics, system info        |
| **Metrics**        | `/api/metrics/`     | Prometheus metrics export                      |
| **WebSocket**      | `/ws/`              | Agent, broadcast, and code execution streams   |

### Key Endpoints

```http
# Authentication
POST /api/auth/register          # Create account
POST /api/auth/login             # Get JWT token
POST /api/auth/verify-otp        # Verify 2FA OTP
POST /api/auth/refresh           # Refresh JWT token

# Streaming Chat
POST /api/chat/stream            # SSE streaming chat (LLM)
GET  /api/chat/history           # Get conversation history
POST /api/chat/share             # Generate shareable link

# Voice
POST /api/voice/tts              # Text-to-Speech synthesis
POST /api/voice/stt              # Speech-to-Text transcription

# RAG
POST /api/rag/upload             # Upload document to knowledge base
POST /api/rag/query              # Query knowledge base with AI
GET  /api/rag/documents          # List uploaded documents
DELETE /api/rag/documents/{id}   # Remove document

# Deep Research & Thinking
POST /api/research/stream        # Deep research with web + academic search
POST /api/thinking/stream        # Extended chain-of-thought reasoning

# Code Execution
POST /api/code/execute           # Run Python in Docker sandbox
WS   /ws/code                    # Live code execution streaming

# Image
POST /api/image/generate         # AI image generation

# Admin & System
GET  /api/system/health          # System health check
GET  /api/metrics                # Prometheus metrics
```

---

## 🔐 Security Model

InfiChat was built with a **defense-in-depth** security philosophy spanning 6 layers:

### Layer 1: Authentication

- **Bcrypt hashing** (cost factor 12) for all stored passwords
- **JWT tokens** with short-lived access tokens (60min) and refresh tokens (30d)
- **OTP two-factor authentication** for additional login verification
- **Google OAuth 2.0** — tokens validated server-side, never exposed to frontend

### Layer 2: Authorization

- **RBAC** (Role-Based Access Control) — user, admin, super-admin roles
- **Permission guards** on every protected route
- **Admin-only endpoints** with separate authentication flow
- **Two-person authorization** for high-risk admin actions

### Layer 3: Request Pipeline

- **Rate limiting** via SlowAPI on all endpoints — configurable per route
- **CORS** — strict origin allowlist, no wildcard in production
- **CSRF protection** middleware on state-changing requests
- **Input sanitization** — XSS prevention via `bleach` and custom sanitizer
- **AI firewall** — prompt injection detection and blocking

### Layer 4: Data Security

- **Field-level encryption** for sensitive data columns
- **SQL injection prevention** — 100% ORM-based queries (SQLAlchemy)
- **PII scrubbing** — auto-redacts emails, phone numbers, names from logs
- **Sensitive log masking** — passwords, tokens, keys redacted from all log output
- **Audit logging** — tamper-proof trail of all critical actions

### Layer 5: Sandbox Security

- **Docker isolation** — code runs in a dedicated container with no host filesystem access
- **Resource limits** — CPU (50%), memory (256MB), and execution time caps enforced
- **Network isolation** — sandbox container has no external network access
- **Ephemeral containers** — destroyed after each session

### Layer 6: Privacy

- **Local inference** — Whisper STT and embedding models run entirely on-device
- **No telemetry** — zero analytics, zero data collection
- **Self-hosted** — all data stays on your infrastructure

---

## 🚀 Deployment

### Production Docker Compose

```yaml
# docker-compose.prod.yml
version: "3.9"
services:
  backend:
    build: ./backend
    environment:
      - ENVIRONMENT=production
      - DATABASE_URL=${DATABASE_URL}
    restart: unless-stopped
    ports:
      - "8080:8080"

  frontend:
    build: ./frontend
    restart: unless-stopped
    ports:
      - "5173:80"

  admin-frontend:
    build: ./admin-frontend
    restart: unless-stopped
    ports:
      - "5174:80"

  postgres:
    image: postgres:16-alpine
    volumes:
      - pg_data:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: autoagent
      POSTGRES_USER: ai
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    volumes:
      - redis_data:/data

volumes:
  pg_data:
  redis_data:
```

### Reverse Proxy (Nginx)

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:5173;
    }

    location /api/ {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_buffering off;          # Required for SSE streaming
        proxy_cache off;
        proxy_read_timeout 300s;
    }

    location /ws/ {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
    }
}
```

### Environment Notes for Production

- Set `ENVIRONMENT=production` to disable debug mode and Swagger UI exposure
- Rotate `SECRET_KEY` with a cryptographically random 256-bit value
- Enable HTTPS via Let's Encrypt (Certbot) for all public deployments
- Configure PostgreSQL with proper connection pooling (`pgbouncer` recommended)
- Set `CORS_ORIGINS` to your production domain only

---

## 🎙️ Voice System Deep Dive

### TTS Pipeline

```
User requests TTS
      │
      ▼
voice_service.py → edge-tts.Communicate(text, voice=profile)
      │
      ▼
tts_formatter.py → Indian number normalization + abbreviation expansion
      │
      ▼
Async MP3 chunk generator
      │
      ▼
StreamingResponse (MIME: audio/mpeg)
      │
      ▼
Browser Audio element — starts playing on first chunk
```

**Indian Number Normalization Examples:**

| Input        | Spoken Output                    |
| :----------- | :------------------------------- |
| `₹1,50,000`  | "One lakh fifty thousand rupees" |
| `2.5 Cr`     | "Two point five crore"           |
| `10L`        | "Ten lakh"                       |
| `Dr. Sharma` | "Doctor Sharma"                  |

### STT Pipeline

```
User records audio (browser MediaRecorder API)
      │
      ▼
Audio blob → POST /api/voice/stt (multipart)
      │
      ▼
faster_whisper.WhisperModel.transcribe(audio_file)
      │
      ▼
Returns: { text: "...", language: "en", confidence: 0.98 }
```

---

## 📚 RAG System Deep Dive

```
Document Upload → PyPDF / pdfplumber / python-docx / beautifulsoup4 parse
      │
      ▼
Recursive text chunking (512 tokens, 64-token overlap)
      │
      ▼
sentence-transformers encode → 384-dim vectors
      │
      ▼
ChromaDB.add() or FAISS.add() → persisted to local disk
      │
      ▼
On Query: vector_store.query(embedding, n_results=5)
      │
      ▼
Top-k chunks → injected as system context to LLM
      │
      ▼
LLM responds with grounded, document-cited answer
```

**Supported Document Formats:**

| Format | Parser(s)                    | Max Size |
| :----- | :--------------------------- | :------: |
| PDF    | `pypdf` + `pdfplumber`       |  50 MB   |
| DOCX   | `python-docx`                |  50 MB   |
| TXT    | Python built-in              |  50 MB   |
| HTML   | `beautifulsoup4`             |  50 MB   |
| Web URL| `trafilatura`                |    —     |

---

## 🤖 Multi-Agent Code Deep Dive

```
User sends code request → Planner (Llama 3.3) breaks it down
      │
      ▼
Coder Agent (NVIDIA NIM StarCoder2) generates Python code
      │
      ▼
Reviewer Agent (NVIDIA NIM StarCoder2) audits for bugs
      │
      ▼
Orchestrator validates and approves
      │
      ▼
sandbox_service.py → docker.client.containers.run(
    image="python:3.11-slim",
    command=["python", "-c", code],
    mem_limit="256m",
    cpu_period=100000,
    cpu_quota=50000,        # 50% CPU limit
    network_disabled=True,  # No internet
    remove=True             # Ephemeral
)
      │
      ▼
stdout/stderr → streamed via WebSocket to frontend
      │
      ▼
On error: LLM reads traceback → self-debugs → re-executes
```

---

## 🧠 Deep Research & Thinking Engines

### Deep Research Pipeline

```
User submits research query
      │
      ▼
Query Analysis → YAKE keyword extraction + SpaCy NER
      │
      ▼
Parallel Search Dispatch:
  ├── DuckDuckGo web search (top results)
  └── Arxiv academic paper search (relevant papers)
      │
      ▼
Content Extraction → trafilatura (web) + arxiv API (papers)
      │
      ▼
Multi-source Synthesis → LLM aggregation with citations
      │
      ▼
Streaming response with source references → Frontend
```

### Deep Thinking Pipeline

```
User submits complex reasoning task
      │
      ▼
Initial Analysis → Problem decomposition
      │
      ▼
Iterative Thinking Steps:
  ├── Step 1: Hypothesis generation
  ├── Step 2: Evidence gathering
  ├── Step 3: Reasoning validation
  └── Step N: Conclusion synthesis
      │
      ▼
Each step streamed in real-time → DeepThinkingProgress.tsx
      │
      ▼
Final synthesized answer with reasoning chain
```

---

## 🎛️ Admin Command Center Deep Dive

The admin dashboard is a full-scale enterprise control plane built with React 18, Three.js, Recharts, React Flow, and XTerm.js:

| Category | Modules | Technologies |
| :--- | :--- | :--- |
| **Monitoring** | Dashboard, Analytics, Telemetry, Usage Monitoring | Recharts, psutil |
| **Infrastructure** | Hardware/GPU, Topology Map, Cluster Federation, Predictive Scaling | Three.js, React Globe |
| **Security** | Network Security, DEFCON Controls, Prompt Firewall, RBAC Studio | Custom firewall rules |
| **Data** | Database Control, Knowledge Graph | React Flow, Force Graph 3D |
| **Operations** | Release Management, Auto Healing, Chaos Monkey, Platform Outage | XTerm.js |
| **Business** | Subscription Plans, User Plan Manager, Tenant Manager | XLSX export |
| **Platform** | Model Hub, Developer Keys, Global Broadcast, Platform Branding, Workflow Orchestrator | React Flow |

---

## 💳 Subscription System

InfiChat includes a complete SaaS-ready subscription engine:

- **Plan tiers** with feature gating (message limits, model access, storage quotas)
- **Usage tracking** per user with token metering
- **Admin management** — create, edit, and assign plans
- **Frontend gate** — automatic modal when limits are reached
- **Seed automation** — default plans bootstrapped on first launch

---

## 🖥️ Desktop Application (Electron)

InfiChat can run as a native desktop application:

- **Electron 41** with secure preload scripts
- **Cross-platform**: Windows (portable .exe), macOS (.dmg), Linux (.AppImage)
- Build commands:
  ```bash
  npm run build:win    # Windows
  npm run build:mac    # macOS
  npm run build:linux  # Linux
  ```
- Custom installer with desktop/start menu shortcuts (NSIS)
- App ID: `com.infichat.app`

---

## 🐛 Troubleshooting

### Common Issues

**Backend won't start — `ModuleNotFoundError`**

```bash
# Ensure virtual environment is activated
cd backend && .\venv\Scripts\activate
pip install -r requirements.txt
```

**Database connection error**

```bash
# For PostgreSQL:
psql -U ai -d autoagent -h localhost
python fix_db_schema.py

# For SQLite (local dev):
# Database is auto-created at data/infichat.db
```

**Docker sandbox fails**

```bash
# Ensure Docker Desktop is running
docker info
# Pull the Python sandbox image
docker pull python:3.11-slim
```

**TTS produces no audio**

```bash
# Test edge-tts directly
python -m edge_tts --voice en-IN-PrabhatNeural --text "Hello" --write-media test.mp3
```

**Whisper STT is slow**

```bash
# Use a smaller model for faster CPU inference
# In config.py: whisper_model = "tiny" or "base"
```

**ChromaDB vector dimension mismatch**

```bash
# Delete the ChromaDB collection and re-upload documents
rm -rf data/chromadb/
```

**Redis connection refused**

```bash
# If using bundled Redis (Windows):
cd redis && redis-server.exe redis.windows.conf

# Or install Redis via Docker:
docker run -d -p 6379:6379 redis:7-alpine
```

### Logs

| Log Location                 | Contents                    |
| :--------------------------- | :-------------------------- |
| `backend/backend_errors.log` | Backend Python errors       |
| Browser DevTools → Network   | Frontend API call errors    |
| `docker logs <container_id>` | Docker container logs       |
| Terminal (uvicorn)           | Real-time backend stdout    |

---

## 🤝 Contributing

We welcome contributions from the community! Here's how to get involved:

### Getting Started

1. **Fork** the repository on GitHub
2. **Clone** your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/Self-Hosted-Generative-AI-Chatbot.git
   ```
3. **Create** a feature branch:
   ```bash
   git checkout -b feature/your-amazing-feature
   ```
4. **Make** your changes following our code style
5. **Test** your changes thoroughly
6. **Commit** with a descriptive message:
   ```bash
   git commit -m "feat: add support for Whisper large-v3 model"
   ```
7. **Push** and open a Pull Request:
   ```bash
   git push origin feature/your-amazing-feature
   ```

### Contribution Guidelines

- Follow **PEP 8** for Python code
- Use **TypeScript** (not plain JavaScript) for all frontend changes
- Add **docstrings** to all new Python functions
- Write **descriptive commit messages** (conventional commits preferred)
- Include **documentation updates** for any new features
- Ensure no **API keys or secrets** are committed (check `.gitignore`)

### Areas We'd Love Help With

- [ ] Mobile-responsive UI improvements
- [ ] Additional LLM provider integrations (Anthropic, Mistral, Cohere)
- [ ] i18n / internationalization support
- [ ] Automated test suite expansion (pytest + Playwright)
- [ ] Helm chart for Kubernetes deployment
- [ ] Additional Indic language TTS voices
- [ ] WebRTC real-time voice chat
- [ ] Plugin system for custom extensions

---

## 📜 License

This project is licensed under the **MIT License** — you are free to use, modify, and distribute it for any purpose.

```
MIT License

Copyright (c) 2025 Guguloth Ubhavith

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
```

See the [LICENSE](LICENSE) file for full details.

---

## 🙏 Acknowledgements

InfiChat is built on the shoulders of incredible open-source projects:

- [**FastAPI**](https://fastapi.tiangolo.com/) — The world's fastest Python web framework
- [**React**](https://react.dev/) — A performant UI library by Meta
- [**ChromaDB**](https://www.trychroma.com/) — The AI-native open-source embedding database
- [**FAISS**](https://github.com/facebookresearch/faiss) — Efficient similarity search by Meta
- [**Faster Whisper**](https://github.com/SYSTRAN/faster-whisper) — CTranslate2-powered speech recognition
- [**Edge TTS**](https://github.com/rany2/edge-tts) — Microsoft Edge's neural TTS engine
- [**Ollama**](https://ollama.com/) — Local LLM runner made simple
- [**sentence-transformers**](https://www.sbert.net/) — State-of-the-art sentence embeddings
- [**Electron**](https://www.electronjs.org/) — Cross-platform desktop applications
- [**Three.js**](https://threejs.org/) — JavaScript 3D library
- [**Recharts**](https://recharts.org/) — Composable charting library for React
- [**Radix UI**](https://www.radix-ui.com/) — Accessible component primitives

---

<p align="center">
  <strong>Built with ❤️ for the Open Source AI Community</strong><br>
  <em>Empowering individuals and organizations to own their AI — privately, securely, and completely.</em>
</p>

<p align="center">
  <a href="https://github.com/gugulothubhavith/Self-Hosted-Generative-AI-Chatbot/issues">🐛 Report a Bug</a> •
  <a href="https://github.com/gugulothubhavith/Self-Hosted-Generative-AI-Chatbot/issues">💡 Request a Feature</a> •
  <a href="https://github.com/gugulothubhavith/Self-Hosted-Generative-AI-Chatbot/discussions">💬 Join Discussions</a>
</p>

---

## 📞 Contact

- **LinkedIn:** [https://www.linkedin.com/in/gugulothubhavith](https://www.linkedin.com/in/gugulothubhavith)
- **GitHub:** [https://github.com/gugulothubhavith](https://github.com/gugulothubhavith)

<br/>
<div align="center">
  <b>Designed & Developed by Gugulothu Bhavith</b> <br>
  <i>Empowering Autonomy Through Sovereign AI</i>
</div>
