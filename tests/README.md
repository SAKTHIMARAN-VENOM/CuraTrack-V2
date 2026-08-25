# CuraTrack Automated Verification & Test Suite

This directory contains automated unit, integration, contract, and security tests designed to run **before pushing code to GitHub**, ensuring that production builds, API routes, security mechanisms, and user features across backend, web, and mobile remain reliable and regression-free.

---

## 🚀 Running Tests

### Option 1: Master Automated Test Runner (Recommended)
Executes the full test matrix across Backend (Pytest + Coverage), Web (Vitest), and Mobile (Vitest):
```bash
python tests/run_all_tests.py
```

### Option 2: Individual Test Suites
```bash
# Backend Python Test Suite
python -m pytest tests/ -v

# Web Frontend Unit & Component Tests
cd frontend && npm test

# Mobile App Unit & Component Tests
cd mobile && npm test
```

---

## 📂 Test Matrix & Coverage

### 🐍 Backend Test Suites (`tests/`)
| Test File | Scope / Purpose |
| :--- | :--- |
| **`test_backend_core.py`** | Root health checks, seasonal disease outbreak calendar, SDOH scoring, hospital directory search & instant empanelment verifier. |
| **`test_insurance_and_fit_auth.py`** | Google Fit OAuth URL generation & callback handling, FHIR insurance eligibility scoring (consultation, lab, surgery), and claims submission. |
| **`test_services_unit.py`** | Unit testing for JWT token creation/decoding/tampering, Redis cache & fallback storage, audit logging, and state scheme evaluation logic. |
| **`test_passport_security.py`** | Encrypted Patient Passport QR generation, valid/invalid scope verification, JWT expiry, and strict one-time access policies. |
| **`test_drug_and_vitals.py`** | Real-time vitals emergency threshold scoring (Hypoxemia, Hypertensive Crisis, Tachycardia) and OpenFDA drug interaction checker. |
| **`test_facility_and_rbac.py`** | Facility stats, EDL medicine inventory, diagnostic lab orders, medicine orders, doctors roster, bed management, and RBAC onboarding. |
| **`test_fhw.py`** | Frontline Health Worker (ASHA) beneficiary registry, high-risk filtering, automated follow-up alerts, and assisted teleconsultation. |
| **`test_ocr_and_ingest.py`** | Health news feed, signed QR health ID generation, document ingestion validation, and OCR error handling. |
| **`test_triage_and_referrals.py`** | Symptom taxonomy, emergency red-flag triage, emergency self-triage flow, and closed-loop referral lifecycles. |
| **`test_mobile_backend_contract.py`** | Contract validation ensuring Mobile API client compatibility with FastAPI endpoints. |
| **`test_frontend_mobile_build.py`** | Route and workspace structure validation, clean heading standards, and `render.yaml` configuration. |
| **`test_full_integration_e2e.py`** | End-to-end patient journey: Emergency Self-Triage → Referral Generation → Government Scheme matching. |

### 🌐 Web Frontend Test Suites (`frontend/__tests__/`)
| Test File | Scope / Purpose |
| :--- | :--- |
| **`navigation_and_auth.test.tsx`** | Role-based navigation switches (Patient, Doctor, Frontline Worker, Facility Manager) and TopNavBar header. |
| **`benefits_and_hospitals.test.tsx`** | Empanelled hospital directory, search/filter controls, and instant PMJAY/MJPJAY hospital verifier tab. |
| **`triage_and_referrals.test.tsx`** | Emergency Self-Triage symptom questionnaire and priority scoring. |
| **`doctor_and_fhw_portals.test.tsx`** | Clinical drug safety checker with preset regimens & contraindication alerts, plus ASHA Frontline Worker catchment dashboard. |

### 📱 Mobile Web App Test Suites (`mobile/__tests__/`)
| Test File | Scope / Purpose |
| :--- | :--- |
| **`api.test.ts`** | Mobile API client request serialization, authorization headers, and error handling. |
| **`appContext.test.tsx`** | Core state management: appointments scheduling/cancellation, vitals sync, and notifications. |
| **`navigation_and_emergency.test.tsx`** | Emergency 108 ambulance dispatch, active prescriptions tracker, and appointment booking CTA. |
| **`pages.test.tsx`** | Telemetry panels, vital sign sync indicators, and auth screens (Login, Register). |
| **`schemes_and_verification.test.tsx`** | Government schemes matching and instant hospital verifier on mobile. |
| **`profile_records_and_notifications.test.tsx`** | User profile with ABHA identity, medical records archive filters, and notifications list. |

---

## 🛡️ Pre-Push Protection
The repository is protected with automated pre-push enforcement hooks (`scripts/install_hooks.py`). Every `git push` runs `python tests/run_all_tests.py` to ensure zero regressions reach production.
