/**
 * CuraTrack V3 — Replaceable Transport Abstraction & BLE Hardware Bridge
 * Isolates native Android BLE calls from web browser mesh simulation.
 */

import { Capacitor, registerPlugin } from '@capacitor/core';
import {
  CURATRACK_BLE_SERVICE_UUID,
  BLEDiscoveredDevice,
  BLEConnectionRequestPayload,
  BLEAuthorizationResponsePayload,
  BLETestMessagePayload,
  BLEAckPayload
} from './bleConstants';

export interface ICuraTrackBlePlugin {
  isBluetoothEnabled(): Promise<{ enabled: boolean }>;
  checkPermissionsStatus(): Promise<{ granted: boolean }>;
  requestBlePermissions(): Promise<{ granted: boolean }>;
  startAdvertising(options: { doctorId: string; doctorName: string }): Promise<{ status: string }>;
  stopAdvertising(): Promise<{ status: string }>;
  startScan(): Promise<{ status: string }>;
  stopScan(): Promise<{ status: string }>;
  connect(options: { deviceId: string }): Promise<{ status: string }>;
  sendConnectionRequest(options: { deviceId: string; payload: string }): Promise<{ success: boolean }>;
  sendAuthorizationResponse(options: { payload: string }): Promise<void>;
  sendTestMessage(options: { deviceId: string; payload: string }): Promise<{ success: boolean }>;
  sendAck(options: { payload: string }): Promise<void>;
  addListener(eventName: string, listenerFunc: (data: any) => void): Promise<any>;
}

const CuraTrackBleNative = registerPlugin<ICuraTrackBlePlugin>('CuraTrackBle');

export class BLETransportManager {
  private static instance: BLETransportManager;
  private isNative: boolean = false;

  // Callbacks
  private onDeviceDiscoveredCb?: (device: BLEDiscoveredDevice) => void;
  private onIncomingConnectionRequestCb?: (payload: BLEConnectionRequestPayload & { deviceId: string }) => void;
  private onIncomingAuthorizationResponseCb?: (payload: BLEAuthorizationResponsePayload) => void;
  private onIncomingTestMessageCb?: (payload: BLETestMessagePayload & { deviceId: string }) => void;
  private onIncomingAckCb?: (payload: BLEAckPayload) => void;

  private constructor() {
    this.isNative = Capacitor.isNativePlatform();

    if (this.isNative) {
      CuraTrackBleNative.addListener('deviceDiscovered', (data: any) => {
        if (this.onDeviceDiscoveredCb) {
          this.onDeviceDiscoveredCb({
            deviceId: data.deviceId,
            name: data.name || 'Dr. David Ross',
            rssi: data.rssi || -55,
            serviceUuid: data.serviceUuid || CURATRACK_BLE_SERVICE_UUID,
          });
        }
      });

      CuraTrackBleNative.addListener('incomingConnectionRequest', (data: any) => {
        if (this.onIncomingConnectionRequestCb && data.payload) {
          try {
            const parsed = JSON.parse(data.payload);
            this.onIncomingConnectionRequestCb({ ...parsed, deviceId: data.deviceId });
          } catch (e) {}
        }
      });

      CuraTrackBleNative.addListener('incomingAuthorizationResponse', (data: any) => {
        if (this.onIncomingAuthorizationResponseCb && data.payload) {
          try {
            const parsed = JSON.parse(data.payload);
            this.onIncomingAuthorizationResponseCb(parsed);
          } catch (e) {}
        }
      });

      CuraTrackBleNative.addListener('incomingTestMessage', (data: any) => {
        if (this.onIncomingTestMessageCb && data.payload) {
          try {
            const parsed = JSON.parse(data.payload);
            this.onIncomingTestMessageCb({ ...parsed, deviceId: data.deviceId });
          } catch (e) {}
        }
      });

      CuraTrackBleNative.addListener('incomingAck', (data: any) => {
        if (this.onIncomingAckCb && data.payload) {
          try {
            const parsed = JSON.parse(data.payload);
            this.onIncomingAckCb(parsed);
          } catch (e) {}
        }
      });
    }
  }

  public static getInstance(): BLETransportManager {
    if (!BLETransportManager.instance) {
      BLETransportManager.instance = new BLETransportManager();
    }
    return BLETransportManager.instance;
  }

  public isNativeBLE(): boolean {
    return this.isNative;
  }

  public async isBluetoothEnabled(): Promise<boolean> {
    if (!this.isNative) return true;
    try {
      const res = await CuraTrackBleNative.isBluetoothEnabled();
      return res.enabled;
    } catch (e) {
      return false;
    }
  }

  public async requestPermissions(): Promise<boolean> {
    if (!this.isNative) return true;
    try {
      const check = await CuraTrackBleNative.checkPermissionsStatus();
      if (check.granted) return true;
      const res = await CuraTrackBleNative.requestBlePermissions();
      return res.granted;
    } catch (e) {
      return false;
    }
  }

  public async startAdvertising(doctorMeta: { doctorId: string; doctorName: string }): Promise<boolean> {
    if (!this.isNative) return true;
    try {
      await CuraTrackBleNative.startAdvertising(doctorMeta);
      return true;
    } catch (e) {
      console.error('[BLETransport] Error starting BLE advertising:', e);
      return false;
    }
  }

  public async stopAdvertising(): Promise<boolean> {
    if (!this.isNative) return true;
    try {
      await CuraTrackBleNative.stopAdvertising();
      return true;
    } catch (e) {
      return false;
    }
  }

  public async startScan(onDiscovered: (device: BLEDiscoveredDevice) => void): Promise<boolean> {
    this.onDeviceDiscoveredCb = onDiscovered;
    if (!this.isNative) return true;
    try {
      await CuraTrackBleNative.startScan();
      return true;
    } catch (e) {
      console.error('[BLETransport] Error starting BLE scan:', e);
      return false;
    }
  }

  public async stopScan(): Promise<boolean> {
    if (!this.isNative) return true;
    try {
      await CuraTrackBleNative.stopScan();
      return true;
    } catch (e) {
      return false;
    }
  }

  public async connect(deviceId: string): Promise<boolean> {
    if (!this.isNative) return true;
    try {
      await CuraTrackBleNative.connect({ deviceId });
      return true;
    } catch (e) {
      return false;
    }
  }

  public async sendConnectionRequest(deviceId: string, payload: BLEConnectionRequestPayload): Promise<boolean> {
    if (!this.isNative) return true;
    try {
      await CuraTrackBleNative.sendConnectionRequest({
        deviceId,
        payload: JSON.stringify(payload)
      });
      return true;
    } catch (e) {
      return false;
    }
  }

  public async sendAuthorizationResponse(payload: BLEAuthorizationResponsePayload): Promise<void> {
    if (!this.isNative) return;
    try {
      await CuraTrackBleNative.sendAuthorizationResponse({
        payload: JSON.stringify(payload)
      });
    } catch (e) {}
  }

  public async sendTestMessage(deviceId: string, payload: BLETestMessagePayload): Promise<boolean> {
    if (!this.isNative) return true;
    try {
      await CuraTrackBleNative.sendTestMessage({
        deviceId,
        payload: JSON.stringify(payload)
      });
      return true;
    } catch (e) {
      return false;
    }
  }

  public async sendAck(payload: BLEAckPayload): Promise<void> {
    if (!this.isNative) return;
    try {
      await CuraTrackBleNative.sendAck({
        payload: JSON.stringify(payload)
      });
    } catch (e) {}
  }

  public setOnIncomingConnectionRequest(cb: (payload: BLEConnectionRequestPayload & { deviceId: string }) => void) {
    this.onIncomingConnectionRequestCb = cb;
  }

  public setOnIncomingAuthorizationResponse(cb: (payload: BLEAuthorizationResponsePayload) => void) {
    this.onIncomingAuthorizationResponseCb = cb;
  }

  public setOnIncomingTestMessage(cb: (payload: BLETestMessagePayload & { deviceId: string }) => void) {
    this.onIncomingTestMessageCb = cb;
  }

  public setOnIncomingAck(cb: (payload: BLEAckPayload) => void) {
    this.onIncomingAckCb = cb;
  }
}
