# 🧬 CuraTrack V3 — Unified AI Healthcare & Telemedicine Ecosystem

[![Next.js](https://img.shields.io/badge/Next.js-15.0-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Expo](https://img.shields.io/badge/Expo-SDK_54-000000?style=for-the-badge&logo=expo)](https://expo.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL_|_RLS-3ECF8E?style=for-the-badge&logo=supabase)](https://supabase.com/)
[![WebRTC](https://img.shields.io/badge/WebRTC-P2P_Video-333333?style=for-the-badge&logo=webrtc)](https://webrtc.org/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)

> **Empathetic Precision in Modern Digital Healthcare** — CuraTrack V3 is a production-grade, privacy-first healthcare platform unifying real-time wearable telemetry, AI-assisted OCR medical ingestion, instant & scheduled P2P WebRTC telemedicine, FDA drug interaction analysis, and encrypted emergency QR patient access across Web and Mobile.

---

## 📸 Platform Architecture & Data Flow

```
                               ┌───────────────────────────┐
                               │   CuraTrack V3 Platform   │
                               └─────────────┬─────────────┘
                                             │
          ┌──────────────────────────────────┼──────────────────────────────────┐
          ▼                                  ▼                                  ▼
┌──────────────────┐                ┌──────────────────┐                ┌──────────────────┐
│  Next.js 15 Web  │                │ Expo Mobile App  │                │ Python FastAPI   │
│ (Patient & Doctor│                │  (React Native   │                │   (Backend AI    │
│     Portals)     │                │   + Android)     │                │    Engine)       │
└────────┬─────────┘                └────────┬─────────┘                └────────┬─────────┘
         │                                   │                                   │
         └───────────────────────────────────┼───────────────────────────────────┘
                                             ▼
                             ┌──────────────────────────────┐
                             │  Supabase PostgreSQL + RLS   │
                             │  Realtime Signaling & Auth   │
                             └───────────────┬──────────────┘
                                             │
      ┌─────────────────────────┬────────────┴────────────┬─────────────────────────┐
      ▼                         ▼                         ▼                         ▼
┌───────────┐             ┌───────────┐             ┌───────────┐             ┌───────────┐
│  WebRTC   │             │ Gemini &  │             │ Tesseract │             │ openFDA   │
│ P2P Call  │             │ Llama AI  │             │ OCR Engine│             │ API & Fit │
└───────────┘             └───────────┘             └───────────┘             └───────────┘
```

---

## ✨ Key Modules & Core Capabilities

### 🎥 1. Peer-to-Peer Telemedicine & Doctor Clinical Suite
* **Zero-Latency WebRTC Video**: Dynamic room routes (`/call/[roomId]`) with peer-to-peer audio/video streaming using Supabase Realtime broadcast channels for signaling—eliminating third-party video SaaS dependencies.
* **Dedicated Doctor Portal**: Specialized clinical portal for doctors (e.g., **Dr. David Ross**) featuring real-time incoming appointment notifications, audio call ringers, schedule management, and instant consultation launching.
* **Interactive Consultation Controls**: In-call camera/microphone toggles, dynamic session duration timers, active participant sync, and graceful exit cleanup.

### 📄 2. Smart OCR & AI Medical Ingestion Engine
* **Multimodal OCR Processing**: Ingests uploaded prescriptions, lab reports, and clinical documents using **Tesseract OCR** and **Google Gemini API** (`gemini-flash-latest`) / **Ollama (Llama 3.1:8b)**.
* **Structured Medical Records**: Automatically extracts diagnosis summaries, prescribed medications, dosages, lab vitals, and physician notes into patient health timelines.

### 💊 3. FDA Drug Interaction & Safety Checker
* **Live FDA API Integration**: Cross-references patient prescriptions against official **openFDA** drug safety databases.
* **Risk Warnings**: Detects critical drug-to-drug interactions, contraindications, severe side-effects, and recommended usage precautions.

### 🎫 4. Encrypted Patient Passport & Emergency QR System
* **256-Bit Scoped Access Tokens**: Generates transient, auto-expiring JWT tokens and QR codes for emergency first responders and external clinicians.
* **Role-Based Row-Level Security (RLS)**: Enforces strict data access rules in Supabase, ensuring emergency access logs are recorded while patient confidentiality is preserved.

### 🩺 5. AI Risk Assessment & SDOH Analytics
* **Health Risk Scoring**: Evaluates cardiovascular, metabolic, and lifestyle risk factors based on continuous vital telemetry (heart rate, step counts, sleep cycles).
* **Social Determinants of Health (SDOH)**: Analyzes socio-environmental indicators (housing stability, food access, healthcare transportation) to deliver holistic clinical recommendations.

### 🇮🇳 6. Scheme Matching & Financial Assistance
* **Government Scheme Ingestion**: AI-matched eligibility checker for government initiatives such as **Ayushman Bharat (ABHA)**.
* **Insurance Verification**: Automated claim eligibility and benefit calculation engine based on diagnosis codes and policy coverage.

### 📱 7. Cross-Platform Native Mobile Experience
* **Expo SDK 54 / React Native**: Complete mobile app suite located in `mobile/` and prebuilt standalone Android Studio project (`curaTrack-mobile/android`).
* **Camera OCR & Wearable Telemetry**: Direct mobile document scanning and real-time synchronization with smartwatch vitals via Google Fit API.

---

## 🛠️ Tech Stack & Ecosystem

| Tier | Component | Technology |
| :--- | :--- | :--- |
| **Web Frontend** | Core Framework | Next.js 15+ (App Router), React 19, TypeScript |
| | Styling & UI | Tailwind CSS v4, Lucide Icons, Framer Motion, Recharts |
| **Mobile App** | Core Framework | Expo SDK 54, React Native 0.81, Expo Router |
| | Native Build | Android Studio Gradle Project (`/android`) |
| **Backend API** | Server Engine | Python 3.10+, FastAPI, Uvicorn, Pydantic, HTTPX |
| **AI & OCR** | LLM Engine | Google Gemini API (`gemini-flash-latest`), Ollama Llama 3.1 |
| | OCR Processing | Tesseract OCR v5 |
| **Database & Auth**| Persistence | Supabase PostgreSQL with Row Level Security (RLS) |
| | Realtime & Auth | Supabase Auth, Supabase Realtime Channels |
| **Media & APIs** | Video Stream | Peer-to-Peer WebRTC, Google STUN (`stun.l.google.com`) |
| | Third-Party APIs | openFDA REST API, Google Fit OAuth API, NewsAPI |

---

## 📁 Repository Structure

```
cura-track-V3/
├── frontend/                   # Next.js 15 Web Application & Doctor Portal
│   ├── app/                    # App Router pages
│   │   ├── (dashboard)/        # Patient portal (records, alerts, benefits, profile)
│   │   ├── doctor/             # Doctor clinical dashboard & incoming calls
│   │   ├── call/[roomId]/      # WebRTC P2P Video Call Room
│   │   ├── drug-checker/       # FDA Drug Interaction tool
│   │   ├── passport/           # Emergency QR Patient Passport
│   │   └── onboarding/         # Role-based onboarding (Patient/Doctor)
│   ├── components/             # Reusable UI components & chart views
│   ├── lib/                    # Supabase client, offline storage, WebRTC utilities
│   └── supabase/               # Complete V3 PostgreSQL Schema & RLS scripts
├── backend/                    # Python FastAPI Microservice
│   ├── routes/                 # Endpoint modules (OCR, FDA, Passport, Vitals, SDOH, AI)
│   ├── services/               # Gemini AI & Tesseract OCR parsing services
│   ├── tesseract_bin/          # Bundled Windows Tesseract OCR binaries
│   ├── main.py                 # FastAPI application entry point & CORS configuration
│   └── requirements.txt        # Python dependency manifest
├── mobile/                     # Expo React Native Mobile Application
│   ├── app/                    # Mobile tab navigation & screen routes
│   └── components/             # Mobile UI components & vital telemetry charts
├── WEBRTC_GUIDE.md             # In-depth WebRTC signaling protocol guide
└── README.md                   # Primary platform documentation
```

---

## ⚙️ Quick Start & Local Setup Guide

### 📋 Prerequisites
- **Node.js**: v18.0.0 or higher
- **Python**: v3.10 or higher
- **Tesseract OCR**: Installed system-wide or using bundled binaries in `backend/tesseract_bin/`
- **Supabase Account**: For database, authentication, and realtime signaling

---

### 1. Database Setup (Supabase)
1. Open your [Supabase Dashboard](https://database.new).
2. Navigate to the **SQL Editor**.
3. Run the complete schema file found in `frontend/supabase/complete_v3_schema.sql`.
4. *(Optional)* Run `frontend/supabase/sdoh_schema.sql` and `frontend/supabase/telemedicine_schema.sql` for specialized features.

---

### 2. Backend Engine (FastAPI)

```bash
# Navigate to backend directory
cd backend

# Create and activate Python virtual environment
python -m venv .venv

# On Windows:
.venv\Scripts\activate
# On macOS/Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure Environment Variables
cp .env.example .env
```

Edit `backend/.env`:
```env
SUPABASE_URL=https://your-supabase-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
QR_SECRET_KEY=your_super_secret_jwt_key
GEMINI_API_KEY=your_gemini_api_key
GNEWS_API_KEY=your_gnews_api_key
```

Launch the FastAPI server:
```bash
python -m uvicorn main:app --reload --port 8000
```
*Backend interactive docs will be available at `http://localhost:8000/docs`.*

---

### 3. Web Frontend (Next.js)

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Configure Environment Variables
```

Create/Edit `frontend/.env.local`:
```env
NEXT_PUBLIC_FASTAPI_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=https://your-supabase-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
GEMINI_API_KEY=your_gemini_api_key
```

Run the development server:
```bash
npm run dev
```
*Open `http://localhost:3000` in your web browser.*

---

### 4. Mobile Application (Expo React Native)

```bash
# Navigate to mobile directory
cd mobile

# Install dependencies
npm install

# Start Expo dev server
npx expo start
```
*Scan the generated QR code using the **Expo Go** app on iOS/Android, or press `a` to launch in an Android Emulator.*

---

## 📡 API Endpoints Summary

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/ocr` | Process medical document images via Tesseract & Gemini OCR |
| `GET` | `/api/drug-checker` | Query FDA database for drug interactions and warnings |
| `POST` | `/api/qr/generate` | Generate expiring 256-bit Patient Passport QR token |
| `GET` | `/api/passport/{token}` | Verify & retrieve emergency patient health summary |
| `GET` | `/api/health-risks` | Calculate patient risk metrics and health insights |
| `POST` | `/api/sdoh` | Compute Social Determinants of Health risk index |
| `GET` | `/api/insurance/match` | Evaluate patient eligibility for insurance & ABHA schemes |
| `GET` | `/api/vitals/alerts` | Stream real-time heart rate and blood pressure thresholds |

---

## 🔒 Security & Privacy Compliance

* **HIPAA Standards Inspired**: Strict separation of Patient Identifiable Information (PII) and protected health telemetry.
* **Supabase Row-Level Security (RLS)**: Users can only read and modify records for which they hold authenticated ownership or delegated clinician rights.
* **P2P Encrypted Telemedicine**: Video/audio streams flow directly peer-to-peer over WebRTC without media passing through application servers.
* **Transient Tokens**: Emergency Passport QR tokens expire automatically (configurable 15m to 24h) and trigger real-time audit logs upon access.

---

## 🛡️ Automated Pre-Push Testing & Quality Assurance

To ensure production features, security tokens, and API routes never break:

```bash
# Run all automated tests in one command
python tests/run_all_tests.py

# Or use standard Pytest
pytest tests/ -v
```

### Test Coverage Highlights:
- **Core Backend APIs**: Health checks, seasonal outbreak radar, SDOH scoring, and government schemes.
- **Security & Patient Passport**: JWT encryption, scoped permissions, 5-minute auto-expiry, and strict one-time access verification.
- **Vitals Alert Thresholds**: EMERGENCY hypoxemia triggers, hypertensive crisis rules, and OpenFDA drug interaction analysis.
- **Offline Mesh / BLE**: Doctor presence broadcasting, patient discovery, and pairing handshake protocol.
- **Frontend & Mobile Route Audits**: Ensures all critical web and mobile routes and deployment configs (`render.yaml`) remain intact.

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more details.

**CuraTrack V3 — Empathetic Precision in Modern Digital Healthcare.**

