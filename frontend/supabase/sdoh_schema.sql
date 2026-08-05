-- SDOH Scores Table
CREATE TABLE IF NOT EXISTS sdoh_scores (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id uuid REFERENCES auth.users(id),
    score integer NOT NULL,
    risk_level text NOT NULL,
    responses jsonb,
    recommendations jsonb,
    created_at timestamptz DEFAULT now()
);

ALTER TABLE sdoh_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own SDOH scores"
    ON sdoh_scores FOR SELECT
    USING (auth.uid() = patient_id);

CREATE POLICY "Users can insert own SDOH scores"
    ON sdoh_scores FOR INSERT
    WITH CHECK (auth.uid() = patient_id);

-- Vitals Alerts Table
CREATE TABLE IF NOT EXISTS vitals_alerts (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id uuid REFERENCES auth.users(id),
    alert_type text NOT NULL,
    severity text NOT NULL,
    message text NOT NULL,
    value numeric,
    created_at timestamptz DEFAULT now()
);

ALTER TABLE vitals_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own vitals alerts"
    ON vitals_alerts FOR SELECT
    USING (auth.uid() = patient_id);
