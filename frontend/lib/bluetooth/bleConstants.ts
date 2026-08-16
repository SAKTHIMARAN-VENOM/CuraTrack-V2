/**
 * CuraTrack V3 — Real BLE Identifiers & Constants
 * Centralized, stable 128-bit UUIDs for Bluetooth Low Energy GATT communication.
 */

export const CURATRACK_BLE_SERVICE_UUID = 'c8a70001-38a4-49e5-b1a7-680459a93001';
export const CONNECTION_REQUEST_CHARACTERISTIC_UUID = 'c8a70002-38a4-49e5-b1a7-680459a93001';
export const AUTHORIZATION_CHARACTERISTIC_UUID = 'c8a70003-38a4-49e5-b1a7-680459a93001';
export const TEST_DATA_CHARACTERISTIC_UUID = 'c8a70004-38a4-49e5-b1a7-680459a93001';
export const ACK_CHARACTERISTIC_UUID = 'c8a70005-38a4-49e5-b1a7-680459a93001';

export interface BLEDiscoveredDevice {
  deviceId: string;
  name: string;
  rssi: number;
  serviceUuid: string;
  specialization?: string;
  hospitalName?: string;
}

export interface BLEConnectionRequestPayload {
  requestId: string;
  patientId: string;
  patientName: string;
  protocolVersion: string;
}

export interface BLEAuthorizationResponsePayload {
  requestId: string;
  status: 'ACCEPTED' | 'REJECTED';
}

export interface BLETestMessagePayload {
  type: 'CURATRACK_BLE_TEST';
  message: string;
  timestamp: string;
  testId: string;
}

export interface BLEAckPayload {
  type: 'CURATRACK_BLE_ACK';
  message: string;
  testId: string;
  timestamp: string;
}
