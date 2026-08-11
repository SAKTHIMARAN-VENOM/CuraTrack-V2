import { supabase } from '@/lib/supabaseClient';

const BASE_URL = process.env.NEXT_PUBLIC_FASTAPI_URL || 'https://curatrack-v3.onrender.com';

async function fetchAPI<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const isNextRoute = endpoint.startsWith('/api/fit-data');
  const url = isNextRoute ? endpoint : `${BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const defaultHeaders: Record<string, string> = {};
  
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      defaultHeaders['Authorization'] = `Bearer ${session.access_token}`;
    }
  } catch (e) {
    console.warn("Supabase session fetch warning:", e);
  }

  if (!(options.body instanceof FormData)) {
    defaultHeaders['Content-Type'] = 'application/json';
  }

  const res = await fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error(`[API Error] ${endpoint} (${res.status}):`, errorText);
    throw new Error(`API ${res.status}: ${errorText || res.statusText}`);
  }

  return await res.json();
}

// 🟢 1. System & Health
export async function getHealthCheck() {
  return await fetchAPI<{ message: string; version: string }>('/');
}

// 📄 2. OCR & Document Ingestion
export interface MedicationItem {
  name: string;
  dosage: string;
  frequency: string;
  time?: string;
  reason?: string;
  confidence?: number;
}

export interface LabResultItem {
  test: string;
  value: string;
  unit: string;
  status: string;
  confidence?: number;
}

export interface ConfirmIngestionPayload {
  patient_id?: string;
  doc_name?: string;
  category?: string;
  extracted_text?: string;
  medications?: MedicationItem[];
  lab_results?: LabResultItem[];
  doctor_notes?: { summary: string; confidence?: number };
  [key: string]: any;
}

export async function ingestDocument(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  return await fetchAPI<{
    success?: boolean;
    extracted_text?: string;
    medications?: MedicationItem[];
    lab_results?: LabResultItem[];
    status?: string;
    doctor_notes?: { summary: string };
  }>('/api/ingest-document', {
    method: 'POST',
    body: formData,
  });
}

export async function confirmIngestion(payload: ConfirmIngestionPayload) {
  return await fetchAPI<{ status: string; id: string }>('/api/confirm-ingestion', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// 🔐 3. Patient Passport & Security
export interface PassportGenerateRequest {
  userId: string;
  userName?: string;
  scope: string[];
}

export interface PassportGenerateResponse {
  qrImage: string;
  token: string;
  passportId: string;
  url: string;
  expiresInSeconds: number;
  expiresAt: number;
  scope: string[];
}

export async function generatePassportQR(payload: PassportGenerateRequest): Promise<PassportGenerateResponse> {
  const res = await fetchAPI<PassportGenerateResponse>('/api/passport/generate', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (res && res.url && typeof window !== 'undefined') {
    res.url = res.url.replace(/https:\/\/cura-track-v2\.vercel\.app/g, window.location.origin);
  }

  return res;
}

export async function generatePassport(patientId: string) {
  return generatePassportQR({
    userId: patientId,
    userName: "Patient",
    scope: ["vitals", "allergies", "medications", "diagnoses", "insurance"],
  });
}

// ⌚ 4. Wearables, Vitals & AI Health Insights
export async function getFitData() {
  return await fetchAPI<{ steps: number; heart_rate: number; spo2: number; sleep_hours: number }>('/api/fit-data');
}

export async function getFitAuthUrl() {
  return await fetchAPI<{ auth_url: string }>('/api/fit/auth-url');
}

export async function getHealthInsights() {
  return await fetchAPI<{ insights: string[]; ai_nudge: string }>('/api/health-insights');
}

export interface VitalsCheckRequest {
  patient_id: string;
  heart_rate?: number;
  spo2?: number;
  systolic_bp?: number;
  diastolic_bp?: number;
  temperature?: number;
}

export async function checkVitalsAlerts(payload: VitalsCheckRequest) {
  return await fetchAPI<{
    patient_id: string;
    alerts: Array<{ type: string; severity: string; message: string; value?: number }>;
    alert_count: number;
    has_critical: boolean;
  }>('/api/alerts/vitals-check', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// 💊 5. Drug Interactions & Clinical Analysis
export interface DrugInteractionPair {
  drug_a: string;
  drug_b: string;
  severity: "high" | "moderate" | "low";
  description: string;
  interaction_found: boolean;
}

export async function checkDrugInteractions(medications: string[]) {
  return await fetchAPI<{
    pairs: DrugInteractionPair[];
    safe: Array<{ drug_a: string; drug_b: string }>;
  }>('/api/check-drug-interactions', {
    method: 'POST',
    body: JSON.stringify({ medications }),
  });
}

// 🛡️ 6. Insurance & Government Schemes
export async function checkInsuranceEligibility(payload: any) {
  return await fetchAPI<{ eligible: boolean; policy_coverage: string }>('/api/insurance/eligibility', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function checkGovernmentSchemes(payload: any) {
  return await fetchAPI<{ eligible_schemes: string[]; status: string }>('/api/government-schemes/eligibility', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchRecommendedSchemes(patientId: string = "demo-patient-001") {
  return await fetchAPI<{
    availableSchemes: Array<{
      id: string;
      name: string;
      type: string;
      reason: string;
      amount: string;
      match_percentage: number;
    }>;
  }>(`/api/patient/${patientId}/insurance-schemes`, { method: 'POST' });
}

export async function submitInsuranceClaim(patientId: string, schemeName: string, amount: number) {
  return await fetchAPI<{ status: string; message: string; claimId: string; amount: number }>(`/api/patient/${patientId}/claims`, {
    method: 'POST',
    body: JSON.stringify({ schemeName, recommendationReason: "User initiated via CuraTrack App", amount }),
  });
}

// 📊 7. Seasonal Outbreak Radar & Health News
export async function getHealthRisks() {
  return await fetchAPI<{ risks: any[] }>('/api/health-risks');
}

export async function getHealthNews() {
  return await fetchAPI<{ news: any[] }>('/api/health-news');
}

// 🏠 9. Social Determinants of Health (SDOH)
export interface SDOHRequest {
  patient_id: string;
  income_band: number;      // 0-3
  food_security: number;    // 0-3
  hospital_distance: number; // 0-3
  employment: number;       // 0-2
  health_literacy: number;  // 0-3
}

export interface SDOHResponse {
  score: number;
  risk_level: "LOW" | "MODERATE" | "HIGH";
  risk_color: "green" | "amber" | "red";
  breakdown: Record<string, number>;
  recommendations: string[];
}

export async function calculateSDOH(payload: SDOHRequest | any): Promise<SDOHResponse> {
  return await fetchAPI<SDOHResponse>('/api/sdoh/calculate', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
