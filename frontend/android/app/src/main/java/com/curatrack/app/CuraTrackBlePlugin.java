package com.curatrack.app;

import android.Manifest;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothGatt;
import android.bluetooth.BluetoothGattCallback;
import android.bluetooth.BluetoothGattCharacteristic;
import android.bluetooth.BluetoothGattServer;
import android.bluetooth.BluetoothGattServerCallback;
import android.bluetooth.BluetoothGattService;
import android.bluetooth.BluetoothManager;
import android.bluetooth.BluetoothProfile;
import android.bluetooth.le.AdvertiseCallback;
import android.bluetooth.le.AdvertiseData;
import android.bluetooth.le.AdvertiseSettings;
import android.bluetooth.le.BluetoothLeAdvertiser;
import android.bluetooth.le.BluetoothLeScanner;
import android.bluetooth.le.ScanCallback;
import android.bluetooth.le.ScanFilter;
import android.bluetooth.le.ScanResult;
import android.bluetooth.le.ScanSettings;
import android.content.Context;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.ParcelUuid;
import android.util.Log;

import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@CapacitorPlugin(
    name = "CuraTrackBle",
    permissions = {
        @Permission(strings = { Manifest.permission.BLUETOOTH_SCAN, Manifest.permission.BLUETOOTH_CONNECT, Manifest.permission.BLUETOOTH_ADVERTISE, Manifest.permission.ACCESS_FINE_LOCATION }, alias = "bluetooth")
    }
)
public class CuraTrackBlePlugin extends Plugin {
    private static final String TAG = "CuraTrackBlePlugin";

    // CuraTrack 128-bit UUIDs
    public static final UUID SERVICE_UUID = UUID.fromString("c8a70001-38a4-49e5-b1a7-680459a93001");
    public static final UUID REQ_CHAR_UUID = UUID.fromString("c8a70002-38a4-49e5-b1a7-680459a93001");
    public static final UUID AUTH_CHAR_UUID = UUID.fromString("c8a70003-38a4-49e5-b1a7-680459a93001");
    public static final UUID TEST_CHAR_UUID = UUID.fromString("c8a70004-38a4-49e5-b1a7-680459a93001");
    public static final UUID ACK_CHAR_UUID = UUID.fromString("c8a70005-38a4-49e5-b1a7-680459a93001");

    private BluetoothAdapter bluetoothAdapter;
    private BluetoothLeScanner bluetoothLeScanner;
    private BluetoothLeAdvertiser bluetoothLeAdvertiser;
    private BluetoothGattServer gattServer;
    private final Map<String, BluetoothGatt> activeGatts = new HashMap<>();

    private boolean isScanning = false;
    private boolean isAdvertising = false;

    @Override
    public void load() {
        BluetoothManager manager = (BluetoothManager) getContext().getSystemService(Context.BLUETOOTH_SERVICE);
        if (manager != null) {
            bluetoothAdapter = manager.getAdapter();
        }
    }

    @PluginMethod
    public void isBluetoothEnabled(PluginCall call) {
        JSObject ret = new JSObject();
        boolean enabled = bluetoothAdapter != null && bluetoothAdapter.isEnabled();
        ret.put("enabled", enabled);
        call.resolve(ret);
    }

    @PluginMethod
    public void checkPermissionsStatus(PluginCall call) {
        JSObject ret = new JSObject();
        boolean granted = hasRequiredPermissions();
        ret.put("granted", granted);
        call.resolve(ret);
    }

    @PluginMethod
    public void requestBlePermissions(PluginCall call) {
        if (!hasRequiredPermissions()) {
            requestPermissionForAlias("bluetooth", call, "permissionsCallback");
        } else {
            JSObject ret = new JSObject();
            ret.put("granted", true);
            call.resolve(ret);
        }
    }

    @PluginMethod
    public void permissionsCallback(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("granted", hasRequiredPermissions());
        call.resolve(ret);
    }

    private boolean hasRequiredPermissions() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            return ContextCompat.checkSelfPermission(getContext(), Manifest.permission.BLUETOOTH_SCAN) == PackageManager.PERMISSION_GRANTED &&
                   ContextCompat.checkSelfPermission(getContext(), Manifest.permission.BLUETOOTH_CONNECT) == PackageManager.PERMISSION_GRANTED &&
                   ContextCompat.checkSelfPermission(getContext(), Manifest.permission.BLUETOOTH_ADVERTISE) == PackageManager.PERMISSION_GRANTED;
        } else {
            return ContextCompat.checkSelfPermission(getContext(), Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED;
        }
    }

    // ─── DOCTOR ROLE: BLE PERIPHERAL & GATT SERVER ──────────────────────────────

    @PluginMethod
    public void startAdvertising(PluginCall call) {
        if (bluetoothAdapter == null || !bluetoothAdapter.isEnabled()) {
            call.reject("Bluetooth is disabled or unsupported");
            return;
        }

        bluetoothLeAdvertiser = bluetoothAdapter.getBluetoothLeAdvertiser();
        if (bluetoothLeAdvertiser == null) {
            call.reject("BLE Peripheral advertising is unsupported on this device");
            return;
        }

        String doctorId = call.getString("doctorId", "DOC-BLE");
        String doctorName = call.getString("doctorName", "Dr. David Ross");

        // Setup GATT Server
        BluetoothManager btManager = (BluetoothManager) getContext().getSystemService(Context.BLUETOOTH_SERVICE);
        gattServer = btManager.openGattServer(getContext(), gattServerCallback);

        if (gattServer != null) {
            BluetoothGattService service = new BluetoothGattService(SERVICE_UUID, BluetoothGattService.SERVICE_TYPE_PRIMARY);

            BluetoothGattCharacteristic reqChar = new BluetoothGattCharacteristic(
                REQ_CHAR_UUID,
                BluetoothGattCharacteristic.PROPERTY_WRITE | BluetoothGattCharacteristic.PROPERTY_READ,
                BluetoothGattCharacteristic.PERMISSION_WRITE | BluetoothGattCharacteristic.PERMISSION_READ
            );

            BluetoothGattCharacteristic authChar = new BluetoothGattCharacteristic(
                AUTH_CHAR_UUID,
                BluetoothGattCharacteristic.PROPERTY_WRITE | BluetoothGattCharacteristic.PROPERTY_READ | BluetoothGattCharacteristic.PROPERTY_NOTIFY,
                BluetoothGattCharacteristic.PERMISSION_WRITE | BluetoothGattCharacteristic.PERMISSION_READ
            );

            BluetoothGattCharacteristic testChar = new BluetoothGattCharacteristic(
                TEST_CHAR_UUID,
                BluetoothGattCharacteristic.PROPERTY_WRITE | BluetoothGattCharacteristic.PROPERTY_READ,
                BluetoothGattCharacteristic.PERMISSION_WRITE | BluetoothGattCharacteristic.PERMISSION_READ
            );

            BluetoothGattCharacteristic ackChar = new BluetoothGattCharacteristic(
                ACK_CHAR_UUID,
                BluetoothGattCharacteristic.PROPERTY_WRITE | BluetoothGattCharacteristic.PROPERTY_READ | BluetoothGattCharacteristic.PROPERTY_NOTIFY,
                BluetoothGattCharacteristic.PERMISSION_WRITE | BluetoothGattCharacteristic.PERMISSION_READ
            );

            service.addCharacteristic(reqChar);
            service.addCharacteristic(authChar);
            service.addCharacteristic(testChar);
            service.addCharacteristic(ackChar);

            gattServer.addService(service);
        }

        AdvertiseSettings settings = new AdvertiseSettings.Builder()
            .setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_LOW_LATENCY)
            .setConnectable(true)
            .setTimeout(0)
            .setTxPowerLevel(AdvertiseSettings.ADVERTISE_TX_POWER_HIGH)
            .build();

        AdvertiseData data = new AdvertiseData.Builder()
            .setIncludeDeviceName(true)
            .addServiceUuid(new ParcelUuid(SERVICE_UUID))
            .build();

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && ContextCompat.checkSelfPermission(getContext(), Manifest.permission.BLUETOOTH_CONNECT) == PackageManager.PERMISSION_GRANTED) {
            bluetoothAdapter.setName("CuraTrack: " + doctorName);
        }

        bluetoothLeAdvertiser.startAdvertising(settings, data, advertiseCallback);
        isAdvertising = true;

        JSObject ret = new JSObject();
        ret.put("status", "ADVERTISING_STARTED");
        call.resolve(ret);
    }

    @PluginMethod
    public void stopAdvertising(PluginCall call) {
        if (bluetoothLeAdvertiser != null && isAdvertising) {
            bluetoothLeAdvertiser.stopAdvertising(advertiseCallback);
            isAdvertising = false;
        }
        if (gattServer != null) {
            gattServer.close();
            gattServer = null;
        }
        JSObject ret = new JSObject();
        ret.put("status", "ADVERTISING_STOPPED");
        call.resolve(ret);
    }

    private final AdvertiseCallback advertiseCallback = new AdvertiseCallback() {
        @Override
        public void onStartSuccess(AdvertiseSettings settingsInEffect) {
            Log.d(TAG, "BLE Advertising started successfully");
        }

        @Override
        public void onStartFailure(int errorCode) {
            Log.e(TAG, "BLE Advertising failed error code: " + errorCode);
        }
    };

    private final BluetoothGattServerCallback gattServerCallback = new BluetoothGattServerCallback() {
        @Override
        public void onCharacteristicWriteRequest(BluetoothDevice device, int requestId, BluetoothGattCharacteristic characteristic, boolean preparedWrite, boolean responseNeeded, int offset, byte[] value) {
            if (responseNeeded && gattServer != null) {
                gattServer.sendResponse(device, requestId, BluetoothGatt.GATT_SUCCESS, offset, value);
            }

            String valStr = new String(value, StandardCharsets.UTF_8);
            JSObject data = new JSObject();
            data.put("deviceId", device.getAddress());
            data.put("name", device.getName() != null ? device.getName() : "Patient Device");
            data.put("payload", valStr);

            if (REQ_CHAR_UUID.equals(characteristic.getUuid())) {
                notifyListeners("incomingConnectionRequest", data);
            } else if (TEST_CHAR_UUID.equals(characteristic.getUuid())) {
                notifyListeners("incomingTestMessage", data);
            }
        }
    };

    // ─── PATIENT ROLE: BLE CENTRAL & SCANNER ─────────────────────────────────────

    @PluginMethod
    public void startScan(PluginCall call) {
        if (bluetoothAdapter == null || !bluetoothAdapter.isEnabled()) {
            call.reject("Bluetooth disabled");
            return;
        }

        bluetoothLeScanner = bluetoothAdapter.getBluetoothLeScanner();
        if (bluetoothLeScanner == null) {
            call.reject("BLE scanner unavailable");
            return;
        }

        List<ScanFilter> filters = new ArrayList<>();
        filters.add(new ScanFilter.Builder().setServiceUuid(new ParcelUuid(SERVICE_UUID)).build());

        ScanSettings settings = new ScanSettings.Builder()
            .setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY)
            .build();

        bluetoothLeScanner.startScan(filters, settings, scanCallback);
        isScanning = true;

        JSObject ret = new JSObject();
        ret.put("status", "SCANNING_STARTED");
        call.resolve(ret);
    }

    @PluginMethod
    public void stopScan(PluginCall call) {
        if (bluetoothLeScanner != null && isScanning) {
            bluetoothLeScanner.stopScan(scanCallback);
            isScanning = false;
        }
        JSObject ret = new JSObject();
        ret.put("status", "SCANNING_STOPPED");
        call.resolve(ret);
    }

    private final ScanCallback scanCallback = new ScanCallback() {
        @Override
        public void onScanResult(int callbackType, ScanResult result) {
            BluetoothDevice device = result.getDevice();
            if (device != null) {
                JSObject dev = new JSObject();
                dev.put("deviceId", device.getAddress());
                String rawName = device.getName();
                dev.put("name", rawName != null ? rawName.replace("CuraTrack: ", "") : "Dr. David Ross");
                dev.put("rssi", result.getRssi());
                dev.put("serviceUuid", SERVICE_UUID.toString());
                notifyListeners("deviceDiscovered", dev);
            }
        }
    };

    @PluginMethod
    public void connect(PluginCall call) {
        String deviceId = call.getString("deviceId");
        if (deviceId == null || bluetoothAdapter == null) {
            call.reject("Invalid deviceId");
            return;
        }

        BluetoothDevice device = bluetoothAdapter.getRemoteDevice(deviceId);
        BluetoothGatt gatt = device.connectGatt(getContext(), false, new BluetoothGattCallback() {
            @Override
            public void onConnectionStateChange(BluetoothGatt gatt, int status, int newState) {
                JSObject obj = new JSObject();
                obj.put("deviceId", gatt.getDevice().getAddress());
                if (newState == BluetoothProfile.STATE_CONNECTED) {
                    obj.put("status", "CONNECTED");
                    gatt.discoverServices();
                    notifyListeners("gattConnectionStateChange", obj);
                } else if (newState == BluetoothProfile.STATE_DISCONNECTED) {
                    obj.put("status", "DISCONNECTED");
                    gatt.close();
                    activeGatts.remove(gatt.getDevice().getAddress());
                    notifyListeners("gattConnectionStateChange", obj);
                }
            }

            @Override
            public void onServicesDiscovered(BluetoothGatt gatt, int status) {
                if (status == BluetoothGatt.GATT_SUCCESS) {
                    JSObject obj = new JSObject();
                    obj.put("deviceId", gatt.getDevice().getAddress());
                    obj.put("status", "SERVICES_DISCOVERED");
                    notifyListeners("gattServicesDiscovered", obj);
                }
            }

            @Override
            public void onCharacteristicChanged(BluetoothGatt gatt, BluetoothGattCharacteristic characteristic) {
                String val = new String(characteristic.getValue(), StandardCharsets.UTF_8);
                JSObject obj = new JSObject();
                obj.put("deviceId", gatt.getDevice().getAddress());
                obj.put("payload", val);

                if (AUTH_CHAR_UUID.equals(characteristic.getUuid())) {
                    notifyListeners("incomingAuthorizationResponse", obj);
                } else if (ACK_CHAR_UUID.equals(characteristic.getUuid())) {
                    notifyListeners("incomingAck", obj);
                }
            }
        }, BluetoothDevice.TRANSPORT_LE);

        activeGatts.put(deviceId, gatt);
        JSObject ret = new JSObject();
        ret.put("status", "CONNECTING");
        call.resolve(ret);
    }

    @PluginMethod
    public void sendConnectionRequest(PluginCall call) {
        String deviceId = call.getString("deviceId");
        String payload = call.getString("payload");
        writeToChar(deviceId, REQ_CHAR_UUID, payload, call);
    }

    @PluginMethod
    public void sendTestMessage(PluginCall call) {
        String deviceId = call.getString("deviceId");
        String payload = call.getString("payload");
        writeToChar(deviceId, TEST_CHAR_UUID, payload, call);
    }

    @PluginMethod
    public void sendAuthorizationResponse(PluginCall call) {
        String payload = call.getString("payload");
        JSObject data = new JSObject();
        data.put("payload", payload);
        notifyListeners("incomingAuthorizationResponse", data);
        call.resolve();
    }

    @PluginMethod
    public void sendAck(PluginCall call) {
        String payload = call.getString("payload");
        JSObject data = new JSObject();
        data.put("payload", payload);
        notifyListeners("incomingAck", data);
        call.resolve();
    }

    private void writeToChar(String deviceId, UUID charUuid, String payload, PluginCall call) {
        BluetoothGatt gatt = activeGatts.get(deviceId);
        if (gatt == null) {
            call.reject("GATT client not connected for device " + deviceId);
            return;
        }

        BluetoothGattService service = gatt.getService(SERVICE_UUID);
        if (service == null) {
            call.reject("CuraTrack service not found on device");
            return;
        }

        BluetoothGattCharacteristic charac = service.getCharacteristic(charUuid);
        if (charac == null) {
            call.reject("Characteristic not found: " + charUuid);
            return;
        }

        charac.setValue(payload.getBytes(StandardCharsets.UTF_8));
        boolean success = gatt.writeCharacteristic(charac);

        JSObject ret = new JSObject();
        ret.put("success", success);
        call.resolve(ret);
    }
}
