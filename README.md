# CuraTrack V2 — Unified Health Ecosystem

CuraTrack V2 is an advanced, privacy-first healthcare management platform designed to unify patient records, streamline insurance eligibility, and provide AI-driven health insights. This repository combines a modern Next.js frontend with a robust FastAPI backend.

---

## 🧩 Project Structure

- **`/frontend`**: Next.js (App Router) application focusing on user experience, dashboard visualization, and secure patient access.
- **`/backend`**: FastAPI-powered microservices handle complex logic such as FHIR insurance eligibility, government scheme recommendations, and secure QR generation.

---

## 🚀 Key Features

### Frontend (Patient & Doctor Portal)
- 🔐 **Supabase Authentication**: Secure login/signup with MFA support and Google OAuth integration.
- 📊 **Dynamic Dashboard**: Real-time health data visualization (Heart Rate, Steps, Activity) using Recharts.
- 📹 **Telemedicine Hub**: Instant video call booking with specialists (Peer-to-peer room system).
- 🧬 **Vital Story**: Deep dive analysis of patient vitals and health history.
- 📱 **Mobile Responsive**: Native-feel UI designed for both desktop and mobile devices.

### Backend (Intelligent Logic)
- 🛡️ **Insurance Eligibility**: FHIR-style compliance engine for validating insurance coverage and claim processing.
- 🤖 **Scheme Radar**: AI-driven recommendation engine for government health schemes based on patient demographics.
- 📰 **Health News Feed**: Keyword-based health news integration using the GNews API.
- ⚠️ **Health Risks Engine**: Context-aware seasonal risk analysis and precautions.
- 🔳 **Secure Health ID**: Dynamic, expiring (5-min) QR code system for transient clinician access.

---

## 🛠️ Technology Stack

| Component | Technologies |
|---|---|
| **Frontend** | Next.js 16, React 19, Tailwind CSS 4, Supabase JS, Recharts, Lucide Icons |
| **Backend** | Python, FastAPI, Pydantic, PyJWT, qrcode (PIL), python-dotenv |
| **Database/Auth**| Supabase (PostgreSQL) |
| **External APIs** | GNews API, Google Fit API (via OAuth) |

---

## ⚙️ Local Setup

### Prerequisites
- Node.js (v18+)
- Python (v3.10+)
- Supabase Project

### 1. Repository Setup
```bash
git clone https://github.com/SAKTHIMARAN-VENOM/CuraTrack-V2.git
cd CuraTrack-V2
```

### 2. Backend Installation
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env       # Configure your GNEWS_API_KEY and QR_SECRET_KEY
uvicorn main:app --reload
```

### 3. Frontend Installation
```bash
cd frontend
npm install
cp .env.example .env       # Configure Supabase and FastAPI credentials
npm run dev
```

---

## 🔒 Security Procedures

- **Environment Isolation**: `.env` files are strictly ignored and should never be committed. Use `.env.example` as a template.
- **Expiring Tokens**: QR Health IDs use JWTs with a 5-minute time-to-live (TTL).
- **Encrypted Data**: All patient-clinician interactions are secured via session-specific encryption.

---

## 🤝 Contributing

This project is a high-performance prototype. Maintain strict code standards and ensure no sensitive paths are exposed in the frontend.

**"Empathetic Precision in Modern Care"**
