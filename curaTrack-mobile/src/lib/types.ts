/** Heart rate data point from Google Fit */
export interface HeartRatePoint {
  time: string;
  bpm: number;
}

/** Dashboard vitals data from /api/fit-data */
export interface VitalsData {
  heartRateData: HeartRatePoint[];
  steps: number;
  sleep?: {
    formatted: string;
    minutes: number;
  };
}

/** AI Health Insight from /api/health-insights */
export interface HealthInsight {
  category: string;
  status: string;
  statusColor: 'green' | 'amber' | 'red';
  icon: string;
  insight: string;
  tip: string;
}

/** Health news article from /api/health-news */
export interface NewsArticle {
  title: string;
  description: string;
  image: string;
  url: string;
  publishedAt: string;
}

/** Active medication */
export interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  time: string;
  reason: string;
  status: 'TAKEN' | 'MISSED' | 'UPCOMING';
  confidence: number;
}

/** Lab result item */
export interface LabResult {
  test: string;
  value: string;
  unit: string;
  status: string;
  confidence: number;
}

/** Doctor notes */
export interface DoctorNotes {
  summary: string;
  confidence: number;
}

/** Ingestion response from /api/ingest-document */
export interface IngestionResponse {
  status: string;
  llm_available: boolean;
  raw_text: string;
  data: {
    medications: Medication[];
    lab_results: LabResult[];
    doctor_notes: DoctorNotes;
  };
  source: string;
  filename: string;
  created_at: string;
}

/** Government scheme */
export interface GovernmentScheme {
  id: string;
  name: string;
  type: string;
  reason: string;
  amount: string;
  match_percentage: number;
}

/** Passport generate response */
export interface PassportResponse {
  qrImage: string;
  token: string;
  expiresInSeconds: number;
  expiresAt: number;
  scope: string[];
}

/** User profile from Supabase session */
export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
}
