# CuraTrack – WebRTC Telemedicine Implementation

## What Was Built

A full **peer-to-peer WebRTC video call** system has been added to the CuraTrack application.

### Key Components
- **Route**: `/call/[roomId]` — The dynamic video call room.
- **Signaling**: Supabase Realtime Broadcast (Zero additional infrastructure).
- **STUN**: Google's public STUN servers for NAT traversal.

### How It Works

1. **Patient** books a call on the Telemedicine page.
2. **Doctor** receives a real-time notification in their dashboard.
3. Both enter the **Room ID** based route.
4. **Signaling Exchange**:
   - Participants join the same Supabase channel.
   - They exchange "Offer" and "Answer" SDP (Session Description Protocol) packets via broadcast.
   - ICE Candidates are shared to find the best network path.
5. **Direct Connection**: A peer-to-peer media stream is established directly between browsers.

### Architecture Summary

| Component | Choice | Why |
|-----------|--------|-----|
| **Signaling** | Supabase Realtime | Reuse existing backend for ultra-low latency signaling. |
| **STUN** | Google (stun.l.google.com) | Reliable and free for standard network configurations. |
| **UI** | Glassmorphic Dark Mode | Professional, distraction-free environment for health consults. |

---

## How to Run & Test

### 1. Start Support Services
Ensure both servers are active:

```powershell
# Backend (FastAPI)
cd backend
.venv\Scripts\activate
uvicorn main:app --reload

# Frontend (Next.js)
cd frontend
npm run dev
```

### 2. Manual Testing (Two Tabs)
The easiest way to verify the implementation:
1. Open `http://localhost:3000/call/test-room` in **Tab A**.
2. Open `http://localhost:3000/call/test-room` in **Tab B**.
3. Click **"Start Meeting"** in both.
4. Grant camera/microphone permissions when prompted.

### 3. LAN Testing (Two Devices)
1. Get your Local IP (run `ipconfig` or `ifconfig`).
2. Access `http://172.20.10.5:3000/call/meeting-id` from both devices.
3. *Note: Most browsers require HTTPS for camera access. Use localhost or set up a secure proxy for cross-device testing.*

---

## Features included
- ✅ **Real-time Signaling**: Instant peer discovery.
- ✅ **Media Controls**: Toggles for Camera and Microphone.
- ✅ **Call Timer**: Track duration of the consultation.
- ✅ **Graceful Exit**: Automatic cleanup of media tracks and signaling channels.
- ✅ **Sync End**: If one party hangs up, the other is automatically notified.

---

## Technical Note on Production Deployment
For deployment in production environments where users are on different restrictive corporate networks, you should add a **TURN server** (like `OpenRelay` or `Twilio TURN`) to the `ICE_SERVERS` configuration in `app/call/[roomId]/page.tsx` to handle cases where peer-to-peer connection is blocked by symmetric NATs.
