# 📱 CuraTrack V3 — Bluetooth Offline Medical Transfer Implementation Guide

> **Version:** 1.0  
> **Scope:** Patient-to-Doctor Offline Medical Data Exchange & Sync Engine  
> **Note:** Version 1 supports offline medical-data transfer. It does **NOT** provide Bluetooth video calling.

---

## 🎯 Feature Overview

In remote or low-connectivity regions where internet access is unavailable, CuraTrack V3 enables **Bluetooth Offline Medical Care**. 

Patients can discover nearby CuraTrack Doctor devices over Bluetooth, select their shared medical data scope (vitals, medications, allergies, history), authorize data transfer, and transmit encrypted records directly to the Doctor's device. 

Doctors can inspect patient summaries offline, issue structured treatment instructions and prescriptions back to the patient over Bluetooth, and store records locally. When internet connectivity returns, both devices automatically synchronize pending transfers with the CuraTrack FastAPI backend and Supabase database.

---

## 🏗️ Conceptual Architecture

```text
Patient Phone                                 Doctor Phone
      │                                            │
      │  1. BLE Discovery & Pairing Handshake     │
      ├───────────────────────────────────────────►│
      │  2. Accept / Reject Authorization Prompt  │
      │◄───────────────────────────────────────────┤
      │  3. Chunked Encrypted Medical Data Payload │
      ├───────────────────────────────────────────►│
      │  4. Local Offline Record Persistence      │
      │  5. Doctor Offline Treatment Instructions  │
      │◄───────────────────────────────────────────┤
      ▼                                            ▼
Local Storage Queue                         Local Storage Queue
(status: PENDING_SYNC)                      (status: PENDING_SYNC)
      │                                            │
      └─────────────────────┬──────────────────────┘
                            ▼
               Internet Connectivity Restored
                            │
                            ▼
             FastAPI `/api/offline/transfers/sync`
                            │
                            ▼
                 Supabase PostgreSQL DB
```

---

## 📁 Key File Modules

| Module Path | Role & Purpose |
| :--- | :--- |
| [`frontend/lib/bluetooth/bluetoothTypes.ts`](file:///c:/projects/CuraTrack-V2/frontend/lib/bluetooth/bluetoothTypes.ts) | Data transfer protocol schemas, data scope definitions, and local record interfaces. |
| [`frontend/lib/bluetooth/bluetoothProtocol.ts`](file:///c:/projects/CuraTrack-V2/frontend/lib/bluetooth/bluetoothProtocol.ts) | Package serialization, SHA-256 checksum integrity verification, and chunking. |
| [`frontend/lib/bluetooth/bluetoothManager.ts`](file:///c:/projects/CuraTrack-V2/frontend/lib/bluetooth/bluetoothManager.ts) | BLE scanning/advertising, connection pairing handshake, and transfer progress callback. |
| [`frontend/lib/bluetooth/offlineStorage.ts`](file:///c:/projects/CuraTrack-V2/frontend/lib/bluetooth/offlineStorage.ts) | Local storage queue, doctor response persistence, and cloud synchronization logic. |
| [`frontend/app/(dashboard)/bluetooth/page.tsx`](file:///c:/projects/CuraTrack-V2/frontend/app/(dashboard)/bluetooth/page.tsx) | Main Bluetooth Transfer Hub page (Mode selector & Local records queue). |
| [`frontend/app/(dashboard)/bluetooth/patient/page.tsx`](file:///c:/projects/CuraTrack-V2/frontend/app/(dashboard)/bluetooth/patient/page.tsx) | Patient scanning, data scope checkboxes, pairing authorization, and progress bar. |
| [`frontend/app/(dashboard)/bluetooth/doctor/page.tsx`](file:///c:/projects/CuraTrack-V2/frontend/app/(dashboard)/bluetooth/doctor/page.tsx) | Doctor advertising listener, pair accept/reject modal, patient viewer & response writer. |
| [`backend/routes/offline_transfer.py`](file:///c:/projects/CuraTrack-V2/backend/routes/offline_transfer.py) | FastAPI endpoints (`POST /api/offline/transfers/sync`, `GET /api/offline/transfers/{id}`). |

---

## 🔒 Security & Data Privacy Protocols

1. **Application-Level Pairing Authentication**: Bluetooth discovery requires explicit Accept/Reject confirmation on the Doctor's device before any medical data transmission begins.
2. **Granular Patient Consent (Data Scoping)**: Patients explicitly toggle checkboxes (`basicProfile`, `vitals`, `medications`, `allergies`, `labResults`, `doctorNotes`, `recentPrescriptions`) before authorizing sharing.
3. **Payload Integrity Hashing**: Every transmitted package includes a SHA-256 hash checksum (`pkg.checksum`) to verify data integrity upon receipt.
4. **No Sensitive Data in BLE Advertisements**: Device advertising names contain zero medical data or credentials.
5. **Idempotency & Replay Protection**: Each transfer contains a unique `transferId` (e.g. `CT-BT-9A7F-L8M2`). The backend ignores duplicate sync requests for already processed transfer IDs.

---

## 🚀 How to Test & Run

### 1. Start Support Services
```powershell
# Backend (FastAPI)
cd backend
.venv\Scripts\activate
python -m uvicorn main:app --reload --port 8000

# Frontend (Next.js)
cd frontend
npm run dev
```

### 2. Testing Offline Care
1. Open `http://localhost:3000/bluetooth` in your browser.
2. Click **Patient Mode** (`/bluetooth/patient`) to scan for nearby Doctor devices, select your data scope checkboxes, and initiate a Bluetooth transfer.
3. Open a second browser tab or device to `http://localhost:3000/bluetooth/doctor`. Click **Become Available** to accept pair requests and write offline instructions.
4. Once internet returns, click **Sync Cloud** to post pending transfers to `/api/offline/transfers/sync`.
