import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  checkDrugInteractions,
  checkVitalsAlerts,
  fetchRecommendedSchemes,
  submitInsuranceClaim,
  generatePassport,
  generatePassportQR,
  confirmIngestion,
  getHealthRisks,
  getHealthNews,
  calculateSDOH,
} from '../lib/api';

// Mock Supabase
vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: 'mock-jwt-token' } },
      }),
    },
  },
  getAuthRedirectUrl: vi.fn((path) => `https://cura-track-v3.vercel.app${path}`),
}));

describe('Mobile API Client (lib/api.ts)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should call checkDrugInteractions with correct payload and headers', async () => {
    const mockResponse = {
      interactions_found: true,
      pairs: [
        {
          drug_a: 'Aspirin',
          drug_b: 'Warfarin',
          severity: 'high',
          description: 'Increased risk of severe bleeding',
          interaction_found: true,
        },
      ],
      safe: [],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    const result = await checkDrugInteractions(['Aspirin', 'Warfarin']);

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/check-drug-interactions'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          Authorization: 'Bearer mock-jwt-token',
        }),
        body: JSON.stringify({ medications: ['Aspirin', 'Warfarin'] }),
      })
    );
    expect(result).toEqual(mockResponse);
  });

  it('should call checkVitalsAlerts and return alert status', async () => {
    const mockResponse = {
      patient_id: 'p-123',
      alerts: [
        { type: 'heart_rate', severity: 'CRITICAL', message: 'Elevated HR', value: 125 },
      ],
      alert_count: 1,
      has_critical: true,
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    const result = await checkVitalsAlerts({
      patient_id: 'p-123',
      heart_rate: 125,
      spo2: 98,
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/alerts/vitals-check'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ patient_id: 'p-123', heart_rate: 125, spo2: 98 }),
      })
    );
    expect(result.has_critical).toBe(true);
    expect(result.alerts).toHaveLength(1);
  });

  it('should call fetchRecommendedSchemes for a specific patient ID', async () => {
    const mockResponse = {
      availableSchemes: [
        {
          id: 'ins_optima_secure',
          name: 'Optima Secure Comprehensive Cover',
          type: 'insurance',
          reason: 'Matches active lifestyle',
          amount: 'Up to ₹10,00,000',
          match_percentage: 94,
        },
      ],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    const result = await fetchRecommendedSchemes('user-456');

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/patient/user-456/insurance-schemes'),
      expect.objectContaining({ method: 'POST' })
    );
    expect(result.availableSchemes).toHaveLength(1);
    expect(result.availableSchemes[0].name).toBe('Optima Secure Comprehensive Cover');
  });

  it('should call submitInsuranceClaim with tracking ID generation', async () => {
    const mockResponse = {
      status: 'success',
      message: "Claim for 'Optima Secure' initiated successfully! Tracking ID: CLM-12345",
      claimId: 'CLM-12345',
      amount: 50000,
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    const result = await submitInsuranceClaim('user-456', 'Optima Secure', 50000);

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/patient/user-456/claims'),
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('Optima Secure'),
      })
    );
    expect(result.claimId).toBe('CLM-12345');
  });

  it('should handle generatePassport with string patient ID and structured metadata', async () => {
    const mockResponse = {
      qrImage: 'data:image/png;base64,mock',
      token: 'tok-789',
      passportId: 'PASS-789',
      url: 'https://cura-track-v3.vercel.app/passport/tok-789',
      expiresInSeconds: 300,
      expiresAt: 1234567890,
      scope: ['vitals', 'allergies', 'medications', 'diagnoses', 'insurance'],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    // Test with object payload
    const resultObj = await generatePassport({
      patient_id: 'p-789',
      name: 'Sara Jenkins',
      blood_type: 'A+',
      allergies: ['Penicillin'],
      conditions: ['Asthma'],
      emergency_contact: { name: 'Michael', phone: '555-1234' },
    });

    expect(resultObj.token).toBe('tok-789');
    expect(resultObj.qr_data).toBeDefined();
    expect(resultObj.qr_data.name).toBe('Sara Jenkins');

    // Test with string payload
    const resultStr = await generatePassport('p-789');
    expect(resultStr.token).toBe('tok-789');
  });

  it('should throw descriptive error when API returns non-OK status', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      text: async () => 'Database connection timeout',
    } as Response);

    await expect(getHealthRisks()).rejects.toThrow('API 500: Database connection timeout');
  });
});
