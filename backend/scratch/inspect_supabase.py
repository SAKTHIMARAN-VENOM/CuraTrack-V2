"""
Inspect and clear Supabase tables for fresh start.
"""
import os
from supabase import create_client

url = os.getenv("SUPABASE_URL", "")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "") or os.getenv("SUPABASE_ANON_KEY", "")

client = create_client(url, key)

tables = [
    "profiles",
    "patient_profile",
    "doctor_profile",
    "admin_profile",
    "verification_status",
    "medications",
    "prescriptions",
    "doctor_notes",
    "lab_results",
    "diagnoses",
    "allergies",
    "vitals",
    "insurance",
    "google_tokens"
]

print("=== SUPABASE TABLES STATUS ===")
for t in tables:
    try:
        res = client.table(t).select("count", count="exact").limit(1).execute()
        print(f"Table '{t}': EXISTS (row count: {res.count})")
    except Exception as e:
        print(f"Table '{t}': ERROR ({e})")
