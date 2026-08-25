-- ====================================================================
-- CuraTrack Frontline Health Worker (ASHA) Catchment & Tasks Schema
-- ====================================================================

-- 1. BENEFICIARIES CATCHMENT REGISTRY
CREATE TABLE IF NOT EXISTS public.beneficiaries (
    id TEXT PRIMARY KEY,
    patient_id TEXT,
    name TEXT NOT NULL,
    age INTEGER,
    gender TEXT,
    category TEXT NOT NULL DEFAULT 'Maternal ANC', -- 'Maternal ANC', 'Child Immunization', 'NCD Chronic', 'TB / Communicable'
    risk_level TEXT NOT NULL DEFAULT 'MODERATE', -- 'HIGH', 'MODERATE', 'LOW'
    village_name TEXT NOT NULL,
    contact_phone TEXT,
    guardian_name TEXT,
    gravida_para TEXT,
    gestational_weeks INTEGER,
    risk_factors JSONB DEFAULT '[]'::jsonb,
    next_due_date TEXT,
    next_due_service TEXT,
    status TEXT NOT NULL DEFAULT 'DUE_SOON', -- 'OVERDUE', 'DUE_SOON', 'COMPLETED'
    assigned_asha TEXT DEFAULT 'Sunita Tai (ASHA #402)',
    notes TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_beneficiaries_category ON public.beneficiaries(category);
CREATE INDEX IF NOT EXISTS idx_beneficiaries_risk_level ON public.beneficiaries(risk_level);
CREATE INDEX IF NOT EXISTS idx_beneficiaries_village ON public.beneficiaries(village_name);
CREATE INDEX IF NOT EXISTS idx_beneficiaries_status ON public.beneficiaries(status);

ALTER TABLE public.beneficiaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow select on beneficiaries"
    ON public.beneficiaries FOR SELECT
    USING (true);

CREATE POLICY "Allow insert on beneficiaries"
    ON public.beneficiaries FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Allow update on beneficiaries"
    ON public.beneficiaries FOR UPDATE
    USING (true);

-- 2. ASHA FOLLOW-UP TASKS (Doctor-to-ASHA Closed-Loop Workflow)
CREATE TABLE IF NOT EXISTS public.fhw_followups (
    id TEXT PRIMARY KEY,
    beneficiary_id TEXT REFERENCES public.beneficiaries(id) ON DELETE SET NULL,
    patient_id TEXT,
    patient_name TEXT NOT NULL,
    assigned_fhw_id TEXT NOT NULL DEFAULT 'fhw-1',
    assigned_asha_name TEXT DEFAULT 'Sunita Tai (ASHA #402)',
    assigned_by_doctor_id TEXT,
    assigned_by_doctor_name TEXT,
    referral_id TEXT,
    task_type TEXT NOT NULL, -- 'Post-Op Check', 'Medication Adherence', 'IFA & Nutrition Check', 'ANC Danger Signs Check', 'BP & Glucose Check', 'TB DOTS Verification', 'Child Immunization Check'
    instructions TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'MEDIUM', -- 'HIGH', 'MEDIUM', 'ROUTINE'
    due_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'IN_PROGRESS', 'COMPLETED', 'MISSED', 'CANCELLED'
    outcome TEXT,
    notes TEXT,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fhw_followups_assigned_fhw ON public.fhw_followups(assigned_fhw_id);
CREATE INDEX IF NOT EXISTS idx_fhw_followups_status ON public.fhw_followups(status);
CREATE INDEX IF NOT EXISTS idx_fhw_followups_due_date ON public.fhw_followups(due_date);

ALTER TABLE public.fhw_followups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow select on fhw_followups"
    ON public.fhw_followups FOR SELECT
    USING (true);

CREATE POLICY "Allow insert on fhw_followups"
    ON public.fhw_followups FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Allow update on fhw_followups"
    ON public.fhw_followups FOR UPDATE
    USING (true);

-- Seed Initial Catchment Data
INSERT INTO public.beneficiaries (
    id, patient_id, name, age, gender, category, risk_level, village_name, contact_phone, guardian_name,
    gravida_para, gestational_weeks, next_due_date, next_due_service, risk_factors, status, assigned_asha
) VALUES
(
    'BEN-101', 'p-204', 'Kavita Bai', 23, 'Female', 'Maternal ANC', 'HIGH', 'Borvihir Pada',
    '+91 98221 44019', 'Suresh Bai (Husband)', 'G2 P1', 32, '2026-08-25',
    'ANC-3 Checkup & Iron-Folic Acid (IFA) Refill',
    '["Severe Anemia (Hb 7.8 g/dL)", "Previous Low Birth Weight delivery"]'::jsonb,
    'OVERDUE', 'Sunita Tai (ASHA #402)'
),
(
    'BEN-102', 'p-302', 'Master Aarav Gavit', 1, 'Male', 'Child Immunization', 'MODERATE', 'Dongargaon',
    '+91 94032 11982', 'Meena Gavit (Mother)', NULL, NULL, '2026-08-24',
    'MR-1 (Measles-Rubella) & Vitamin A (Dose 1)',
    '["Moderate Acute Malnutrition (MAM)"]'::jsonb,
    'DUE_SOON', 'Sunita Tai (ASHA #402)'
),
(
    'BEN-103', 'p-101', 'Tukaram Patil', 58, 'Male', 'NCD Chronic', 'HIGH', 'Borvihir Pada',
    '+91 97654 88310', 'Self', NULL, NULL, '2026-08-22',
    'Monthly BP & Blood Sugar Screening + Amlodipine 5mg Refill',
    '["Hypertension (Last BP: 168/102 mmHg)", "Irregular medication compliance"]'::jsonb,
    'OVERDUE', 'Sunita Tai (ASHA #402)'
),
(
    'BEN-104', 'p-405', 'Lalita Vasave', 34, 'Female', 'TB / Communicable', 'HIGH', 'Dhanora',
    '+91 91580 33412', 'Dinesh Vasave (Husband)', NULL, NULL, '2026-08-26',
    'DOTS Sputum Follow-up (Month 2) + Nutritional Basket Delivery',
    '["Weight Loss > 5kg in 2 months", "Close contact with active pulmonary TB"]'::jsonb,
    'DUE_SOON', 'Sunita Tai (ASHA #402)'
)
ON CONFLICT (id) DO NOTHING;

-- Seed Initial Tasks
INSERT INTO public.fhw_followups (
    id, beneficiary_id, patient_id, patient_name, assigned_fhw_id, assigned_asha_name,
    assigned_by_doctor_name, task_type, instructions, priority, due_date, status
) VALUES
(
    'TSK-101', 'BEN-101', 'p-204', 'Kavita Bai', 'fhw-1', 'Sunita Tai (ASHA #402)',
    'Dr. David Ross (Civil Hospital)', 'ANC Danger Signs Check',
    'Visit home and check pedal edema and BP cuff reading. Verify IFA tablet intake twice daily.',
    'HIGH', '2026-08-26', 'PENDING'
),
(
    'TSK-102', 'BEN-103', 'p-101', 'Tukaram Patil', 'fhw-1', 'Sunita Tai (ASHA #402)',
    'Dr. Ananya Sharma (PHC MO)', 'Medication Adherence',
    'Verify that patient is taking Amlodipine 5mg each morning. Measure resting BP.',
    'MEDIUM', '2026-08-27', 'PENDING'
)
ON CONFLICT (id) DO NOTHING;
