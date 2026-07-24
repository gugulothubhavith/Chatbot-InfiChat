# 🏗️ InfiChat System Architecture

This document contains the deep technical architecture, module references, and component blueprints for InfiChat and its advanced AI engines.

---

## 🐳 Docker Orchestration (Production Infrastructure)

InfiChat uses Docker Compose to orchestrate its 7-container production microservices architecture. All persistent state is maintained in isolated volumes to guarantee zero data leakage.

```mermaid
graph TD
    subgraph "Docker Network (infichat-net)"
        frontend["Frontend UI<br/>(React / Vite)"]
        admin["Admin UI<br/>(React / Three.js)"]
        backend["FastAPI Backend"]
        
        db[("PostgreSQL 15<br/>Volume: postgres_data")]
        redis[("Redis 7<br/>Volume: redis_data")]
        chroma[("ChromaDB<br/>Volume: chromadb_data")]
        searxng["SearXNG<br/>Local Mount: ./searxng-data"]
        
        frontend --> backend
        admin --> backend
        backend --> db
        backend --> redis
        backend --> chroma
        backend --> searxng
    end
```

## High-Level Architecture Diagram

```mermaid
graph TD
    User["👤 User (Browser / Electron Desktop)"]

    subgraph "🖥️ Frontend Layer"
        UI["Main UI<br/>(React 18 + TypeScript + Tailwind)<br/>Port 5173"]
        AdminUI["Admin Command Center<br/>(React 18 + Three.js + Recharts)<br/>Port 5174"]
        Desktop["Electron Desktop Shell<br/>(v41 + Secure Preload)"]
    end

    subgraph "🔒 API Gateway (FastAPI)"
        API["FastAPI Backend<br/>(Uvicorn ASGI • Port 8080)"]
        RL["SlowAPI Rate Limiter"]
        JWT["JWT Auth + RBAC Middleware"]
        CSRF["CSRF Protection"]
        Sanitizer["Input Sanitizer (XSS)"]
        AuditLog["Audit Logger"]
        Firewall["AI Firewall"]
        UsageTracker["Usage Tracker"]
        Tenant["Tenant Middleware"]
    end

    subgraph "🧠 AI Orchestration Layer"
        Router{"Smart LLM Router<br/>(llm_router.py)"}
        LLM["☁️ Cloud LLM Providers<br/>(Groq / Gemini / OpenRouter)"]
        Ollama["🏠 Ollama<br/>(Local Models)"]
        NVIDIA["🟢 NVIDIA NIM<br/>(Multi-Agent Code Pipeline)"]
        TTS["🎙️ TTS Engine<br/>(Edge-TTS + Indic Voice)"]
        STT["🗣️ STT Engine<br/>(Faster Whisper, Offline)"]
        RAG["📚 RAG Pipeline<br/>(Sentence Transformers)"]
        Sandbox["💻 Code Sandbox<br/>(Local Subprocess)"]
        ImgGen["🖼️ Image Generation<br/>(Pollinations / SDXL)"]
        Research["🔬 Deep Research<br/>(DuckDuckGo + Arxiv + NLP)"]
        Thinking["🤔 Deep Thinking<br/>(Extended Chain-of-Thought)"]
        AIFirewall["🛡️ AI Safety Firewall"]
        Memory["🧩 Memory Service"]
        Privacy["🔏 Privacy Service (PII)"]
    end

    subgraph "💾 Persistent Storage Layer"
        PG[("🐘 PostgreSQL 16<br/>(Users, Chats, Plans, Orgs)")]
        VDB[("🔵 ChromaDB / FAISS<br/>(Vector Embeddings)")]
        Cache[("⚡ Redis 7<br/>(Sessions, Cache, Pub/Sub)")]
        Files["📁 File Storage<br/>(Uploads, Audio, Voices)"]
    end

    subgraph "🔑 Auth Providers"
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
    Sanitizer --> AuditLog --> Firewall --> UsageTracker --> Tenant --> Router
    Router --> LLM
    Router --> Ollama
    Router --> NVIDIA
    Router --> TTS
    Router --> STT
    Router --> RAG
    Router --> Sandbox
    Router --> ImgGen
    Router --> Research
    Router --> Thinking
    Router --> AIFirewall
    Router --> Memory
    Router --> Privacy
    API --> PG
    API --> VDB
    API --> Cache
    API --> Files
    API --> Google
    API --> OTP
```

## Request Lifecycle — Chat Message Flow

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        CHAT REQUEST LIFECYCLE                            │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. User types message in React UI                                       │
│     │                                                                    │
│  2. React sends POST /api/chat/stream with JWT token                     │
│     │                                                                    │
│  3. FastAPI middleware pipeline:                                         │
│     │  Rate Limit → JWT Verify → CSRF Check → Input Sanitize             │
│     │  → Audit Log → AI Firewall → Usage Track → Tenant Isolate          │
│     │                                                                    │
│  4. Smart Router determines task type:                                   │
│     │                                                                    │
│     ├── 🔬 Deep Research?                                                │
│     │   └→ Orchestrates 12-agent pipeline → stream results               │
│     │                                                                    │
│     ├── 🤔 Deep Thinking?                                                │
│     │   └→ Extended chain-of-thought → stream thinking steps             │
│     │                                                                    │
│     ├── 📚 RAG enabled?                                                  │
│     │   └→ ChromaDB/FAISS similarity search → inject context             │
│     │                                                                    │
│     ├── 💻 Code task?                                                    │
│     │   └→ Multi-Agent Orchestrator → Local Sandbox → stream output      │
│     │                                                                    │
│     └── 💬 Standard chat?                                                │
│         └→ Smart Router → stream SSE tokens from Groq/Gemini/OpenRouter  │
│                                                                          │
│  5. React renders tokens in real-time (useChatStream.ts)                 │
│                                                                          │
│  6. PostgreSQL persists conversation + Redis caches session state        │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

## 🤖 InfiBuild Studio (5-Agent Code Generation Pipeline)

InfiBuild Studio is a production-grade multi-agent coding orchestrator. Instead of a single model trying to write all code, it breaks down the software development lifecycle into distinct agents:

```mermaid
graph TD
    User["👤 User Request"]
    
    subgraph "🧠 InfiBuild Studio Orchestration"
        Architect["🏛️ Architect Agent<br/>(Designs Architecture & Data Flows)"]
        SpecWriter["📝 Spec Writer Agent<br/>(Translates to API Requirements & Models)"]
        Decomposer["🧩 Task Decomposer Agent<br/>(Breaks into Parallel Tasks)"]
        Coder["💻 Coder Agent<br/>(Generates Production-Ready Code)"]
        Reviewer["🔍 Reviewer Agent<br/>(Audits & Secures Code)"]
    end
    
    subgraph "💻 Local Execution Sandbox"
        Proc["Local Subprocess<br/>(Python tempfile)"]
        Resources["Security Policies:<br/>- AST Safety Validation<br/>- Execution Timeout (30s)"]
        Exec["Runtime Execution"]
    end
    
    Stream["📺 Real-time WebSocket Stream<br/>(stdout/stderr to User UI)"]
    
    User --> Architect
    Architect --> SpecWriter
    SpecWriter --> Decomposer
    Decomposer --> Coder
    Coder --> Reviewer
    Reviewer -- "Fails Audit / Refactors" --> Coder
    Reviewer -- "Approved" --> Proc
    Proc --- Resources
    Proc --> Exec
    Exec -- "Runtime Error" --> Reviewer
    Exec -- "Success" --> Stream
```

## 🔬 Deep Research Engine (12-Agent Pipeline)

The Deep Research Engine is a massive 12-stage pipeline that simulates an entire research team working in parallel to fetch, analyze, and synthesize information.

```mermaid
graph TD
    Query["🔍 User Query"]
    
    subgraph "🧠 12-Agent Deep Research Pipeline"
        Intent["1. Intent Analysis Agent"]
        Planner["2. Research Planner Agent"]
        AdvQuery["3. Adversarial Query Agent"]
        
        subgraph "🌐 Parallel Search Dispatch"
            Scraper["4. Parallel Scraper Agent<br/>(Live Web Data)"]
            Academic["5. Academic Fetch Agent<br/>(Arxiv Papers)"]
        end
        
        DeepContent["6. Deep Content Agent<br/>(Content Extraction)"]
        KnowledgeGraph["7. Knowledge Graph Agent"]
        Temporal["8. Temporal Analysis Agent"]
        CrossVal["9. Cross-Validation Agent"]
        Critic["10. Critic Agent"]
        Synthesis["11. Synthesis Agent"]
        Archiver["12. Knowledge Archiver Agent"]
    end
    
    Query --> Intent --> Planner --> AdvQuery
    AdvQuery --> Scraper & Academic
    Scraper & Academic --> DeepContent
    DeepContent --> KnowledgeGraph & Temporal
    KnowledgeGraph & Temporal --> CrossVal
    CrossVal --> Critic
    Critic -- "Fails Critique" --> Planner
    Critic -- "Passes Critique" --> Synthesis
    Synthesis --> Archiver
    Archiver --> Stream["📡 Streaming Response<br/>(With Citations & Grounding)"]
```

## 🧠 Deep Thinking (Chain-of-Thought Reasoning)

For complex logic puzzles, math, and analytical queries, the system engages a multi-stage reasoning pipeline:

```mermaid
graph TD
    Query["🔍 Complex Query"]
    
    subgraph "🧠 Deep Thinking Pipeline"
        Analyzer["🧩 Problem Analyzer<br/>(Breaks into Sub-Problems)"]
        Reasoning["⚙️ Fast Intermediate Reasoning<br/>(llama-3.3-70b-versatile)"]
        Verification["✅ Verification Stage"]
        Synthesis["🎯 Final Synthesis<br/>(Primary Large Model)"]
    end
    
    Query --> Analyzer
    Analyzer --> Reasoning
    Reasoning --> Verification
    Verification -- "Failed (Retry)" --> Reasoning
    Verification -- "Passed" --> Synthesis
    Synthesis --> Stream["📡 Real-time UI Updates"]
```

## ⚡ Fast Agentic Web Search

A highly optimized web search agent designed to return grounded answers with real-time UI streaming (Server-Sent Events) in seconds.

```mermaid
graph TD
    Query["🔍 User Query"]
    
    subgraph "🌐 Parallel Search Orchestration"
        GenQuery["🧠 Generate Sub-Queries<br/>(LLM)"]
        SearXNG["🔍 Massively Parallel SearXNG<br/>(Google, Bing, DDG)"]
        Dedup["🗑️ Deduplicate URLs"]
        Parse["📄 Parallel Content Extraction<br/>(Trafilatura/BeautifulSoup)"]
    end
    
    Query --> GenQuery
    GenQuery --> SearXNG
    SearXNG --> Dedup
    Dedup --> Parse
    Parse --> Report["📝 Generate Citation Report"]
```

## 📚 RAG & Vector Knowledge Base

```mermaid
graph LR
    subgraph "📥 Document Ingestion Pipeline"
        Doc["📄 Upload Document<br/>(PDF, DOCX, TXT, HTML)"]
        Parser["✂️ Parsers<br/>(PyPDF, BeautifulSoup)"]
        Chunker["🧩 Intelligent Chunker<br/>(512 tokens / 64 overlap)"]
        Embedder["🧠 Neural Embedder<br/>(all-MiniLM-L6-v2)"]
        VDB[("🔵 Vector DB<br/>(ChromaDB/FAISS)")]
    end
    
    subgraph "💬 Query Execution"
        Query["User Question"]
        SimSearch["🔍 Cosine Similarity Search"]
        LLM["🤖 LLM Context Injection"]
        Response["💬 Grounded Response"]
    end
    
    Doc --> Parser --> Chunker --> Embedder --> VDB
    Query --> SimSearch
    VDB -. "Top-k semantic chunks" .-> SimSearch
    SimSearch --> LLM
    LLM --> Response
```

## 🎛️ Enterprise Admin Command Center

```mermaid
graph TD
    Admin["🎛️ Super Admin / Operator"]
    
    subgraph "🏢 Admin Frontend (React + Three.js)"
        Dash["📊 Telemetry & Analytics"]
        Infra["🏗️ 3D Infrastructure Map"]
        Sec["🔒 Security & AI Firewall"]
        Ops["⚙️ Auto-Healing & Chaos Monkey"]
        Biz["💼 Subscriptions & Tenancy"]
    end
    
    subgraph "🛡️ API Governance Layer"
        Audit["Audit Logger (Tamper-Proof)"]
        Rules["RBAC & Access Control"]
        Meter["Usage Metering & Limits"]
    end
    
    DB[("🐘 PostgreSQL / Redis State")]
    
    Admin --> Dash
    Admin --> Infra
    Admin --> Sec
    Admin --> Ops
    Admin --> Biz
    
    Dash --> Audit
    Sec --> Rules
    Biz --> Meter
    
    Audit --> DB
    Rules --> DB
    Meter --> DB
```

### Admin Command Center Module Reference

| Module | Source File | Size | Key Technologies |
|:---|:---|:---:|:---|
| Analytics | `Analytics.tsx` | 7.3 KB | Recharts |
| Auto Healing | `AutoHealing.tsx` | 10.1 KB | State machines |
| Chaos Monkey | `ChaosMonkey.tsx` | 14.4 KB | Failure injection |
| Cluster Federation | `ClusterFederation.tsx` | 8.6 KB | Multi-node mgmt |
| Database Control | `DatabaseControl.tsx` | 18.1 KB | PostgreSQL/Redis/ChromaDB |
| DEFCON Controls | `DefconControls.tsx` | 12.4 KB | Security posture |
| Developer Keys | `DeveloperKeys.tsx` | 9.3 KB | Key lifecycle |
| Global Broadcast | `GlobalBroadcast.tsx` | 18.5 KB | Notifications |
| Hardware/GPU | `HardwareGPU.tsx` | 6.9 KB | Resource monitoring |
| Knowledge Graph | `KnowledgeGraph.tsx` | 9.9 KB | React Force Graph 3D |
| Model Hub | `ModelHub.tsx` | 13.3 KB | LLM registry |
| Network Security | `NetworkSecurity.tsx` | 20.4 KB | Firewall rules |
| Platform Branding | `PlatformBranding.tsx` | 9.5 KB | White-label |
| Platform Outage | `PlatformOutage.tsx` | 19.4 KB | Incident management |
| Predictive Scaling | `PredictiveScaling.tsx` | 7.7 KB | AI scaling |
| Prompt Firewall | `PromptFirewall.tsx` | 9.1 KB | Injection prevention |
| RBAC Studio | `RBACStudio.tsx` | 8.9 KB | Role management |
| Release Management | `ReleaseManagement.tsx` | 42.4 KB | Deploy/rollback |
| Subscription Plans | `SubscriptionPlans.tsx` | 23.3 KB | Plan CRUD |
| Telemetry | `Telemetry.tsx` | 8.7 KB | Observability |
| Tenant Manager | `TenantManager.tsx` | 7.6 KB | Multi-tenancy |
| Topology Map | `TopologyMap.tsx` | 7.7 KB | Three.js |
| Usage Monitoring | `UsageMonitoring.tsx` | 9.8 KB | Quotas/tracking |
| User Plan Manager | `UserPlanManager.tsx` | 17.6 KB | User assignments |
| Workflow Orchestrator | `WorkflowOrchestrator.tsx` | 13.0 KB | React Flow |

## 🎙️ Voice System Technical Reference

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
Browser Audio element — starts playing on first chunk (<1s latency)
```

**Indian Number Normalization Examples:**

| Input | Spoken Output |
|:---|:---|
| `₹1,50,000` | "One lakh fifty thousand rupees" |
| `2.5 Cr` | "Two point five crore" |
| `10L` | "Ten lakh" |
| `Dr. Sharma` | "Doctor Sharma" |
| `AI` | "A I" |
| `OTP` | "O T P" |

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
