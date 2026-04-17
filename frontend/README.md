# CuraTrack — Unified Health Dashboard

CuraTrack is a premium, full-stack health management platform that unifies your medical world. From real-time wearable data to encrypted medical records and telehealth integrations, CuraTrack provides "Empathetic Precision" in healthcare management.

![CuraTrack Dashboard Preview](https://lh3.googleusercontent.com/aida-public/AB6AXuBNo05845FCjeVsd1fGzRLj0AsFJlhOh5wW_SAgTP69I0uYluyJM-ZDrWU3ypy47XruRlXlPi9ji4aNJ01DvLqShSkYLjROqn7izv9H7Ot-rcAXsdLMwUz1iBlzYBpebQW1KDN7-OD6v6eKqdCB419qopAfo48nurPypDlWr8zpWkEeIJYYUvXxgPyugJL2tqrMITPCbUqK_GvY-ApAa98sKJiNSLuyrlOTV9aJi8aBnzLSjAorDb3fZfX6L-nffJJ5u2eSxB2sh1ZG)

## 🌟 Key Features

- **🚀 Interactive 3D Landing Page**: High-performance Spline integration for a modern, engaging first impression.
- **⌚ Wearable Synchronization**: Direct integration with Google Fit to track steps and heart rate in real-time.
- **🛡️ Secure Health Records**: Encrusted storage and management of medical history and lab results.
- **🩺 Specialist Network**: Connect with world-class doctors who use data-driven insights for better diagnosis.
- **🤖 AI Health Insights**: Empathetic AI that interprets your vitals into actionable wellness nudges.
- **🔐 Privacy First**: Bank-grade AES-256 encryption and HIPAA-ready architecture.

## 🛠️ Tech Stack

- **Framework**: [Next.js 15+](https://nextjs.org/) (App Router)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **3D Graphics**: [Spline](https://spline.design/) via `@splinetool/react-spline`
- **Authentication**: Google OAuth 2.0
- **Data Source**: Google Fit API
- **Fonts**: Manrope & Inter (Google Fonts)
- **Icons**: Material Symbols Outlined

---

## 🚀 Getting Started

### 1. Prerequisites

- Node.js >= 18
- A Google Cloud project with the **Fitness API** enabled
- An **OAuth 2.0 Client ID** (Web application type)

### 2. Environment Setup

Create a `.env` file in the project root:

```env
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
REDIRECT_URI=http://localhost:3000/api/oauth2callback
```

### 3. Google Cloud Configuration

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Enable the **Fitness API**.
3. Create an **OAuth 2.0 Client ID** (Web application).
4. Add the **Authorized redirect URI**: `http://localhost:3000/api/oauth2callback`.
5. Add your email as a **Test User** in the OAuth consent screen.

### 4. Installation & Run

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

The application will be available at `http://localhost:3000`.

---

## 📂 Project Structure

```
curatrack/
├── app/
│   ├── page.tsx          # Main Landing Page (Client Component)
│   ├── layout.tsx        # Global Layout & Fonts
│   ├── globals.css       # Tailwind v4 Styles & Design System
│   └── api/              # Google Fit Backend API Routes
│       ├── auth/         # OAuth Flow Initiation
│       ├── fit-data/     # Health Data Aggregation
│       └── ...           # Session & Auth Handling
├── components/           # Reusable UI Components
├── lib/                  # Shared Utilities (Google OAuth, etc.)
├── public/               # Static Assets
└── README.md
```

## 🔒 Security & Compliance

CuraTrack is designed with security as a core pillar:
- **AES-256 Bit Encryption**: For all sensitive health data at rest.
- **SOC2 Type II & HIPAA**: Architecture aligned with international health data standards.
- **Multi-Factor Authentication**: Biometric and 2FA support for user accounts.

---

© 2024 CuraTrack. Designed with Empathetic Precision.
