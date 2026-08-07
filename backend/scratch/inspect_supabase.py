"""
Inspect and clear Supabase tables for fresh start.
"""
import os
from supabase import create_client

url = "https://jouwxykvjjtdgmsfzkgw.supabase.co"
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpvdXd4eWt2amp0ZGdtc2Z6a2d3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0MDY4MDEsImV4cCI6MjA5MTk4MjgwMX0.yzxj2oBpaa4tIMGUTpBAVlZrqqeNZuhDRnUVV7cTYeo"

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
