# 🧬 CuraTrack V2 — Unified Healthcare Ecosystem (Web & Mobile Suite)

**CuraTrack V2** is a modular, high-performance healthcare management platform built with **Empathetic Precision**. It unifies real-time patient wearable analytics, OCR medical record ingestion, AI-driven clinical insights, and instant/scheduled peer-to-peer telemedicine into a seamless web and mobile suite.

---

## 🌟 Architecture Overview

```
                          ┌───────────────────────────┐
                          │   CuraTrack V2 Platform    │
                          └─────────────┬─────────────┘
                                        │
         ┌──────────────────────────────┼──────────────────────────────┐
         ▼                              ▼                              ▼
┌──────────────────┐          ┌──────────────────┐          ┌──────────────────┐
│  Next.js Web App │          │ Expo Mobile App  │          │ Python FastAPI   │
│   (frontend/)    │          │(curaTrack-mobile)│          │    (backend/)    │
└────────┬─────────┘          └────────┬─────────┘          └────────┬─────────┘
         │                             │                             │
         └─────────────────────────────┼─────────────────────────────┘
                                       ▼
                       ┌──────────────────────────────┐
                       │  Supabase (PostgreSQL & RLS) │
                       │    + Llama 3.1 AI + WebRTC   │
                       └──────────────────────────────┘
```

---

## 🚀 Key Modules & Capabilities

### 🎥 Telemedicine & Clinical Scheduling
- **Instant & Scheduled Consultations**: Patients can book consultations with fixed time slots or initiate instant calls.
- **Supabase Realtime Sync**: Doctor and patient portals update dynamically with pending appointments, status alerts (`ringing`, `active`, `ongoing`, `ended`), and badge counters.
- **Dedicated Doctor Portal**: Single-doctor clinical management suite assigned to **Dr. David Ross**, featuring appointment management, instant call joining, and schedule management.
- **Zero-Latency WebRTC P2P**: Peer-to-peer audio/video calling using room-based WebRTC signaling.

### 🧠 AI & OCR Intelligence (Llama 3.1 + Tesseract OCR)
- **OCR Prescription Ingestion**: Converts uploaded medical documents, lab reports, and prescriptions into structured digital medical histories using Tesseract OCR and Llama 3.1.
- **Context-Aware Health Insights**: Analyzes heart rate trends, daily steps, and sleep patterns to generate personalized recommendations.
- **Government Scheme Matching**: AI-matched eligibility exploration for Ayushman Bharat (ABHA) and health insurance schemes.

### 🔐 Patient Passport System
- **Transient QR Health ID**: Generates expiring QR codes and scoped access tokens for emergency clinicians to view vital medical history without exposing full records.
- **256-bit Scoped Access**: Role-based access control (RLS) enforcing strict patient and doctor permissions.

### 📱 Native Mobile App (`curaTrack-mobile`)
- **React Native + Expo**: Native mobile experience with full Android Studio project output (`curaTrack-mobile/android`).
- **Smartwatch & Google Fit Sync**: Direct sync for heart rate, step count, and sleep telemetry.
- **Camera OCR Scanner**: Native document capture and processing for immediate prescription ingestion.

---

## 🛠️ Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Web Frontend** | Next.js 15+, React 19, Tailwind CSS v4, TypeScript, Lucide Icons |
| **Mobile App** | Expo SDK 54, React Native 0.81, Expo Router, Android Studio Native (`/android`) |
| **Backend Service** | Python 3.10+, FastAPI, Uvicorn, Pydantic |
| **AI Engine & OCR** | Ollama (Llama 3.1:8b model), Tesseract OCR |
| **Database & Auth** | Supabase PostgreSQL, Supabase Auth, Row Level Security (RLS) |
| **Realtime & Video** | WebRTC (Peer-to-Peer), Supabase Realtime Channels |

---

## 📁 Repository Structure

```
curatrack/
├── frontend/                   # Next.js Web Frontend & Doctor Portal
│   ├── app/                    # Next.js App Router pages (Dashboard, Telemedicine, Records, Admin)
│   ├── components/             # React UI components (DoctorPortal, HeartRateChart, PassportQRModal)
│   └── supabase/               # Complete V3 Supabase SQL Schema & Flush Scripts
├── curaTrack-mobile/           # Expo React Native Mobile Application
│   ├── android/                # Prebuilt Android Studio native Gradle project
│   └── src/                    # Mobile screens, tabs, telemedicine, and hooks
├── backend/                    # Python FastAPI Backend
│   ├── routes/                 # API endpoints (OCR ingestion, fit data, health insights)
│   └── services/               # OCR parser & LLM integration services
└── README.md                   # Project documentation
```

---

## ⚙️ Quick Start & Setup

### 1. Database Setup (Supabase)
Run the master schema script located in `frontend/supabase/complete_v3_schema.sql` in your Supabase SQL Editor to set up all tables and RLS policies.

### 2. Backend Engine (FastAPI)
```bash
cd backend
python -m venv .venv
# On Windows: .venv\Scripts\activate
# On Unix: source .venv/bin/activate
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```

### 3. Web Frontend (Next.js)
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:3000` in your browser.

### 4. Mobile App (Expo & Android Studio)
```bash
cd curaTrack-mobile
npm install
npx expo start
```
To open in **Android Studio**:
Open `curaTrack-mobile/android` in Android Studio and click **Run ▶**.

---

## 📜 Security & Compliance
CuraTrack is built with privacy-first principles inspired by HIPAA standards:
- All video streams are peer-to-peer and encrypted.
- Data access is governed by strict Supabase Row-Level Security (RLS) policies.
- Patient Passport QR tokens expire automatically to prevent unauthorized access.

**CuraTrack V2 — Empathetic Precision in Modern Healthcare.**
