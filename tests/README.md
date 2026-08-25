# CuraTrack Pre-Push Test Suite

This directory contains automated unit, integration, and security tests designed to run **before pushing code to GitHub**, ensuring that production builds, API routes, security mechanisms, and user features never break.

---

## 🚀 Running Tests

### Option 1: One-Click Python Runner (Recommended)
```bash
python tests/run_all_tests.py
```

### Option 2: Standard Pytest Command
```bash
pytest tests/ -v
```

---

## 📂 Test Structure

| Test File | Scope / Purpose |
| :--- | :--- |
| **`test_backend_core.py`** | Tests root health checks, seasonal outbreak calendar, SDOH scoring calculations, and government scheme eligibility rules. |
| **`test_passport_security.py`** | Tests encrypted Patient Passport QR generation, valid/invalid scope verification, JWT expiry, and strict one-time access policies. |
| **`test_drug_and_vitals.py`** | Tests real-time vitals emergency threshold scoring (Hypoxemia, Hypertensive Crisis, Tachycardia) and OpenFDA drug interaction checker. |

| **`test_frontend_mobile_build.py`** | Validates structural integrity of critical routes for both Next.js Web Frontend and Mobile Web App, plus deployment configuration files (`render.yaml`). |

---

## 🛡️ Pre-Push Checklist

Before pushing any commit to `master` or `main`:
1. Run `python tests/run_all_tests.py`
2. Ensure both web frontend (`cd frontend && npm run build`) and mobile app (`cd mobile && npm run build`) compile with 0 errors.
3. Push to GitHub with confidence.
