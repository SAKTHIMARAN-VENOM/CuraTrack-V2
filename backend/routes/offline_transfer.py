"""
CuraTrack V3 — Offline Bluetooth Data Transfer, Presence & Handshake Endpoints
Provides real-time presence mesh signaling, pairing request authorization handshakes,
and cloud synchronization for Bluetooth transfers.
Works seamlessly across tabs, browser profiles, Incognito windows, and network devices.
"""

import time
import logging
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

logger = logging.getLogger("curatrack.offline")
router = APIRouter()

# In-memory stores (backed by Supabase / Redis in production)
_synced_transfers: Dict[str, Dict[str, Any]] = {}
_active_doctors: Dict[str, Dict[str, Any]] = {}
_pairing_requests: Dict[str, Dict[str, Any]] = {}

PRESENCE_TTL_SECONDS = 8


# ─── Request / Response Schemas ─────────────────────────────────────────

class DoctorPresencePayload(BaseModel):
    doctorId: str = Field(..., min_length=1)
    doctorName: str
    specialization: Optional[str] = "Cardiology & Internal Medicine"
    hospitalName: Optional[str] = "CuraTrack Clinical Center"
    availabilityState: str = "AVAILABLE"  # AVAILABLE | OFFLINE | BUSY


class ConnectionRequestPayload(BaseModel):
    patientId: str = Field(..., min_length=1)
    patientName: str
    targetDoctorId: str = Field(..., min_length=1)


class ConnectionRespondPayload(BaseModel):
    requestId: str = Field(..., min_length=1)
    status: str  # ACCEPTED | REJECTED


class MedicalDataScopeSchema(BaseModel):
    basicProfile: bool = True
    vitals: bool = True
    medications: bool = True
    allergies: bool = True
    labResults: bool = False
    doctorNotes: bool = False
    recentPrescriptions: bool = False


class PatientProfileSchema(BaseModel):
    patientId: str
    name: str
    bloodGroup: Optional[str] = None
    gender: Optional[str] = None
    age: Optional[int] = None
    emergencyContact: Optional[str] = None


class OfflinePackageSchema(BaseModel):
    protocolVersion: str = "1.0"
    transferId: str
    timestamp: str
    scope: MedicalDataScopeSchema
    patient: PatientProfileSchema
    vitals: Optional[Dict[str, Any]] = None
    medications: Optional[List[Dict[str, Any]]] = None
    allergies: Optional[List[Dict[str, Any]]] = None
    labResults: Optional[List[Dict[str, Any]]] = None
    doctorNotes: Optional[List[Dict[str, Any]]] = None
    recentPrescriptions: Optional[List[Dict[str, Any]]] = None
    checksum: Optional[str] = None


class DoctorResponseSchema(BaseModel):
    transferId: str
    doctorId: str
    doctorName: str
    timestamp: str
    diagnosisSummary: Optional[str] = None
    instructions: str
    prescriptionsIssued: Optional[List[Dict[str, Any]]] = None
    followUpRequired: bool = False
    followUpDays: Optional[int] = None
    urgency: str = "ROUTINE"


class OfflineSyncRequest(BaseModel):
    transferId: str = Field(..., min_length=1)
    timestamp: str
    patientId: str
    doctorId: str
    package: OfflinePackageSchema
    doctorResponse: Optional[DoctorResponseSchema] = None


# ─── Doctor Presence Endpoints ──────────────────────────────────────────

@router.post("/offline/presence/advertise")
def advertise_doctor_presence(payload: DoctorPresencePayload):
    """
    Doctor enables or refreshes presence heartbeat.
    """
    now = time.time()
    _active_doctors[payload.doctorId] = {
        "id": payload.doctorId,
        "name": payload.doctorName,
        "role": "doctor",
        "specialization": payload.specialization,
        "hospitalName": payload.hospitalName,
        "availabilityState": payload.availabilityState,
        "isAvailable": payload.availabilityState == "AVAILABLE",
        "lastSeenEpoch": now,
        "lastSeen": int(now * 1000),
    }
    logger.info(f"[OfflinePresence] Doctor {payload.doctorName} ({payload.doctorId}) registered presence")
    return {"status": "success", "doctorId": payload.doctorId}


@router.post("/offline/presence/cease")
def cease_doctor_presence(doctorId: str):
    """
    Doctor disables presence broadcasting.
    """
    if doctorId in _active_doctors:
        del _active_doctors[doctorId]
    logger.info(f"[OfflinePresence] Doctor {doctorId} ceased advertising")
    return {"status": "success", "doctorId": doctorId}


@router.get("/offline/presence/doctors")
def get_active_broadcasting_doctors():
    """
    Returns list of active broadcasting doctors whose heartbeat is fresh (< 8 seconds).
    """
    now = time.time()
    active_list = []
    expired_ids = []

    for doc_id, doc_meta in _active_doctors.items():
        if now - doc_meta.get("lastSeenEpoch", 0) < PRESENCE_TTL_SECONDS:
            if doc_meta.get("availabilityState") == "AVAILABLE":
                active_list.append(doc_meta)
        else:
            expired_ids.append(doc_id)

    # Clean up expired
    for eid in expired_ids:
        del _active_doctors[eid]

    return {"doctors": active_list, "count": len(active_list)}


# ─── Pairing Handshake Endpoints ────────────────────────────────────────

@router.post("/offline/requests/create")
def create_connection_request(payload: ConnectionRequestPayload):
    """
    Patient sends connection pairing request to Doctor.
    """
    request_id = "REQ-" + str(int(time.time() * 1000))[-6:]
    now = time.time()

    record = {
        "requestId": request_id,
        "patientId": payload.patientId,
        "patientName": payload.patientName,
        "targetDoctorId": payload.targetDoctorId,
        "status": "AWAITING_DOCTOR_APPROVAL",
        "createdEpoch": now,
    }
    _pairing_requests[request_id] = record
    logger.info(f"[OfflineHandshake] Patient {payload.patientName} requested connection {request_id} with Doctor {payload.targetDoctorId}")
    return {"status": "success", "requestId": request_id}


@router.get("/offline/requests/pending")
def get_pending_requests_for_doctor(doctorId: str):
    """
    Doctor polls for incoming pairing requests targeting their doctorId.
    """
    now = time.time()
    pending = [
        req for req in _pairing_requests.values()
        if req["targetDoctorId"] == doctorId and req["status"] == "AWAITING_DOCTOR_APPROVAL" and (now - req["createdEpoch"]) < 60
    ]
    return {"requests": pending}


@router.post("/offline/requests/respond")
def respond_connection_request(payload: ConnectionRespondPayload):
    """
    Doctor accepts or rejects a pending pairing request.
    """
    req = _pairing_requests.get(payload.requestId)
    if not req:
        raise HTTPException(status_code=404, detail="Request ID not found or expired")

    req["status"] = payload.status  # ACCEPTED | REJECTED
    logger.info(f"[OfflineHandshake] Doctor responded {payload.status} to request {payload.requestId}")
    return {"status": "success", "requestId": payload.requestId, "newStatus": payload.status}


@router.get("/offline/requests/{request_id}")
def check_request_status(request_id: str):
    """
    Patient polls for doctor's response to their pairing request.
    """
    req = _pairing_requests.get(request_id)
    if not req:
        raise HTTPException(status_code=404, detail="Request ID not found")
    return req


# ─── Transfer Synchronization Endpoints ─────────────────────────────────

@router.post("/offline/transfers/sync")
def sync_offline_transfer(payload: OfflineSyncRequest):
    """
    Ingest & synchronize an offline Bluetooth medical transfer package.
    Updates doctorResponse if provided.
    """
    transfer_id = payload.transferId
    synced_time = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    if transfer_id in _synced_transfers:
        logger.info(f"[OfflineSync] Transfer {transfer_id} update received.")
        if payload.doctorResponse:
            _synced_transfers[transfer_id]["doctorResponse"] = payload.doctorResponse.model_dump()
            logger.info(f"[OfflineSync] Updated doctorResponse for transfer {transfer_id}")
        return {
            "status": "already_synced",
            "message": "Transfer record synchronized with cloud database.",
            "transferId": transfer_id,
            "syncedAt": _synced_transfers[transfer_id]["syncedAt"],
            "doctorResponse": _synced_transfers[transfer_id].get("doctorResponse"),
        }

    record = {
        "transferId": transfer_id,
        "patientId": payload.patientId,
        "doctorId": payload.doctorId,
        "patientName": payload.package.patient.name,
        "timestamp": payload.timestamp,
        "syncedAt": synced_time,
        "package": payload.package.model_dump(),
        "doctorResponse": payload.doctorResponse.model_dump() if payload.doctorResponse else None,
        "status": "SYNCED",
    }

    _synced_transfers[transfer_id] = record
    logger.info(f"[OfflineSync] Synchronized transfer {transfer_id} for patient {payload.patientId}")

    return {
        "status": "success",
        "message": f"Successfully synchronized transfer {transfer_id} to cloud database.",
        "transferId": transfer_id,
        "syncedAt": synced_time,
        "doctorResponse": record["doctorResponse"],
    }


@router.get("/offline/transfers/{transfer_id}")
def get_offline_transfer(transfer_id: str):
    record = _synced_transfers.get(transfer_id)
    if not record:
        raise HTTPException(status_code=404, detail=f"No offline transfer found with ID {transfer_id}")
    return record


@router.get("/offline/transfers")
def list_offline_transfers(patient_id: Optional[str] = None, doctor_id: Optional[str] = None):
    results = list(_synced_transfers.values())
    if patient_id:
        results = [r for r in results if r["patientId"] == patient_id]
    if doctor_id:
        results = [r for r in results if r["doctorId"] == doctor_id]
    return {
        "transfers": results,
        "count": len(results),
    }
