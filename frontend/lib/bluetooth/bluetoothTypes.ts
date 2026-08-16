/**
 * CuraTrack V3 — Bluetooth Offline Data Transfer Types
 * Strict typing for Bluetooth BLE Discovery, Connection State Machine, Scope Controls, and Data Transfers.
 */

export type DoctorAvailabilityState = 'OFFLINE' | 'AVAILABLE' | 'BUSY';

export interface BluetoothDevicePeer {
  id: string;
  name: string;
  role: 'doctor' | 'patient';
  specialization?: string;
  hospitalName?: string;
  availabilityState: DoctorAvailabilityState;
  isAvailable: boolean;
  rssi?: number;
  lastSeen: number;
}

export interface MedicalDataScope {
  basicProfile: boolean;
  vitals: boolean;
  medications: boolean;
  allergies: boolean;
  labResults: boolean;
  doctorNotes: boolean;
  recentPrescriptions: boolean;
}

export interface PatientBasicProfile {
  patientId: string;
  name: string;
  bloodGroup?: string;
  gender?: string;
  age?: number;
  emergencyContact?: string;
}

export interface VitalTelemetrySummary {
  heartRate?: number;
  spo2?: number;
  temperature?: number;
  systolicBp?: number;
  diastolicBp?: number;
  bloodGlucose?: number;
  recordedAt?: string;
}

export interface OfflineMedicalPackage {
  protocolVersion: '1.0';
  transferId: string;
  timestamp: string;
  scope: MedicalDataScope;
  patient: PatientBasicProfile;
  vitals?: VitalTelemetrySummary;
  medications?: Array<{
    name: string;
    dosage?: string;
    frequency?: string;
    reason?: string;
  }>;
  allergies?: Array<{
    allergen: string;
    severity?: string;
    reaction?: string;
  }>;
  labResults?: Array<{
    testName: string;
    date?: string;
    status?: string;
    value?: string;
  }>;
  doctorNotes?: Array<{
    doctor: string;
    date?: string;
    summary: string;
    observations?: string;
  }>;
  recentPrescriptions?: Array<{
    medication: string;
    dosage?: string;
    doctorName?: string;
    date?: string;
  }>;
  checksum?: string;
}

export interface DoctorOfflineResponse {
  transferId: string;
  doctorId: string;
  doctorName: string;
  timestamp: string;
  diagnosisSummary?: string;
  instructions: string;
  prescriptionsIssued?: Array<{
    medication: string;
    dosage: string;
    frequency: string;
    durationDays: number;
  }>;
  followUpRequired: boolean;
  followUpDays?: number;
  urgency: 'ROUTINE' | 'URGENT' | 'EMERGENCY';
}

export type TransferStatus = 'PENDING_SYNC' | 'SYNCING' | 'SYNCED' | 'FAILED';

export interface LocalOfflineTransferRecord {
  transferId: string;
  timestamp: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  sourceDevice: string;
  package: OfflineMedicalPackage;
  doctorResponse?: DoctorOfflineResponse;
  status: TransferStatus;
  syncedAt?: string;
  syncAttempts: number;
  lastErrorMessage?: string;
}

/**
 * Strict Connection State Machine
 * IDLE -> DISCOVERING -> DISCOVERED -> REQUEST_SENT -> AWAITING_DOCTOR_APPROVAL -> ACCEPTED -> AUTHORIZED -> CONFIRMING_SCOPE -> TRANSFERRING -> COMPLETED
 */
export type HandshakeStatus = 
  | 'IDLE' 
  | 'DISCOVERING' 
  | 'DISCOVERED' 
  | 'REQUEST_SENT' 
  | 'AWAITING_DOCTOR_APPROVAL' 
  | 'ACCEPTED' 
  | 'REJECTED' 
  | 'AUTHENTICATING' 
  | 'AUTHORIZED' 
  | 'CONFIRMING_SCOPE'
  | 'TRANSFERRING' 
  | 'COMPLETED' 
  | 'DISCONNECTED' 
  | 'ERROR';

export interface TransferProgressState {
  status: HandshakeStatus;
  progressPercentage: number;
  stepMessage: string;
  errorDetail?: string;
}
