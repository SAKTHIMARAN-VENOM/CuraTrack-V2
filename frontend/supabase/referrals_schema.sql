-- ====================================================================
-- CuraTrack Referrals Schema & Lifecycle Persistence
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.referrals (
    id TEXT PRIMARY KEY,
    referral_token TEXT UNIQUE NOT NULL,
    patient_id TEXT NOT NULL,
    patient_name TEXT NOT NULL,
    patient_age INTEGER,
    patient_gender TEXT,
    abha_id TEXT,
    referring_facility_type TEXT NOT NULL,
    referring_facility_name TEXT NOT NULL,
    referring_doctor_name TEXT NOT NULL,
    destination_facility_type TEXT NOT NULL,
    destination_facility_name TEXT NOT NULL,
    specialty TEXT NOT NULL,
    urgency TEXT NOT NULL DEFAULT 'ROUTINE', -- 'EMERGENCY', 'URGENT', 'ROUTINE'
    clinical_reason TEXT NOT NULL,
    provisional_diagnosis TEXT NOT NULL,
    vitals_summary TEXT,
    status TEXT NOT NULL DEFAULT 'CREATED', -- 'CREATED', 'ACCEPTED', 'IN_TRANSIT', 'ARRIVED', 'CONSULTED', 'COMPLETED', 'REJECTED', 'OVERDUE_ESCALATED'
    timeline JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,
    in_transit_at TIMESTAMPTZ,
    arrived_at TIMESTAMPTZ,
    consulted_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    escalated_at TIMESTAMPTZ,
    escalation_reason TEXT,
    rejected_at TIMESTAMPTZ,
    rejection_reason TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Indexes for fast query lookup
CREATE INDEX IF NOT EXISTS idx_referrals_patient_id ON public.referrals(patient_id);
CREATE INDEX IF NOT EXISTS idx_referrals_token ON public.referrals(referral_token);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON public.referrals(status);
CREATE INDEX IF NOT EXISTS idx_referrals_urgency ON public.referrals(urgency);
CREATE INDEX IF NOT EXISTS idx_referrals_dest_facility ON public.referrals(destination_facility_name);
CREATE INDEX IF NOT EXISTS idx_referrals_created_at ON public.referrals(created_at DESC);

-- Enable RLS
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Policies for Authenticated & Service Role Access
CREATE POLICY "Allow select on referrals"
    ON public.referrals FOR SELECT
    USING (true);

CREATE POLICY "Allow insert on referrals"
    ON public.referrals FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Allow update on referrals"
    ON public.referrals FOR UPDATE
    USING (true);

-- Seed Initial Referrals Data
INSERT INTO public.referrals (
    id, referral_token, patient_id, patient_name, patient_age, patient_gender, abha_id,
    referring_facility_type, referring_facility_name, referring_doctor_name,
    destination_facility_type, destination_facility_name, specialty, urgency,
    clinical_reason, provisional_diagnosis, vitals_summary, status, created_at, accepted_at, in_transit_at, timeline
) VALUES 
(
    'REF-8841', 'REF-8841', 'p-101', 'Rameshwar Patel', 54, 'Male', '91-4402-8812-9901',
    'Primary Health Centre (PHC)', 'PHC Nandurbar Rural', 'Dr. Ananya Sharma (MO)',
    'District Hospital', 'Nandurbar District Civil Hospital', 'Cardiology', 'URGENT',
    'Persistent retrosternal discomfort on exertion with borderline ST depression on 12-lead ECG.',
    'Suspected Unstable Angina / Ischemic Heart Disease', 'BP: 148/92 mmHg, HR: 86 bpm, SpO2: 96%, Fasting Glucose: 164 mg/dL',
    'ACCEPTED', NOW() - INTERVAL '3 hours', NOW() - INTERVAL '1 hour', NULL,
    '[
        {"status": "CREATED", "timestamp": "2026-08-21T09:30:00Z", "actor": "Dr. Ananya Sharma (PHC Nandurbar)", "notes": "Referral created after primary ECG evaluation."},
        {"status": "ACCEPTED", "timestamp": "2026-08-21T11:15:00Z", "actor": "Dr. V. K. Deshmukh (Civil Hospital)", "notes": "Referral accepted. Cardiology OPD slot reserved."}
    ]'::jsonb
),
(
    'REF-7204', 'REF-7204', 'p-204', 'Sunita Devi', 27, 'Female', '91-1029-4471-3382',
    'Ayushman Arogya Mandir (Sub-Centre)', 'Sub-Centre Borvihir', 'Rekha ANM & ASHA Sunita',
    'Community Health Centre (CHC)', 'CHC Shahada Block', 'Obstetrics & Gynecology', 'EMERGENCY',
    'High-Risk Pregnancy (34 weeks) with severe gestational hypertension (160/105 mmHg) and pedal edema.',
    'Severe Preeclampsia / High Risk ANC', 'BP: 160/105 mmHg, Urine Albumin: 2+, FHR: 142 bpm',
    'IN_TRANSIT', NOW() - INTERVAL '45 minutes', NOW() - INTERVAL '30 minutes', NOW() - INTERVAL '15 minutes',
    '[
        {"status": "CREATED", "timestamp": "2026-08-23T06:45:00Z", "actor": "Rekha ANM", "notes": "Danger signs detected during ANC-3 visit."},
        {"status": "ACCEPTED", "timestamp": "2026-08-23T07:05:00Z", "actor": "CHC On-Duty Medical Officer", "notes": "Emergency bed allocated in Maternity Ward."},
        {"status": "IN_TRANSIT", "timestamp": "2026-08-23T07:30:00Z", "actor": "108 Ambulance Dispatch #MH-18-402", "notes": "Patient picked up with ASHA escort."}
    ]'::jsonb
),
(
    'REF-5190', 'REF-5190', 'p-309', 'Bhikaji Shinde', 62, 'Male', '91-7782-9012-4411',
    'Community Health Centre (CHC)', 'CHC Shahada Block', 'Dr. Pradeep Roy (MO)',
    'District Hospital', 'Dhule Government Medical College', 'Pulmonology & Infectious Diseases', 'URGENT',
    'Chronic productive cough > 4 weeks with hemoptysis and unresolving consolidative opacities on chest X-ray.',
    'Multi-Drug Resistant Tuberculosis (MDR-TB) Evaluation', 'BP: 110/72 mmHg, Temp: 38.4°C, SpO2: 93%',
    'CREATED', NOW() - INTERVAL '10 minutes', NULL, NULL,
    '[
        {"status": "CREATED", "timestamp": "2026-08-24T14:10:00Z", "actor": "Dr. Pradeep Roy (CHC Shahada)", "notes": "Referred for CBNAAT GeneXpert and Pulmonology review."}
    ]'::jsonb
)
ON CONFLICT (id) DO NOTHING;
