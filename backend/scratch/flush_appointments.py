import requests

SUPABASE_URL = "https://jouwxykvjjtdgmsfzkgw.supabase.co"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpvdXd4eWt2amp0ZGdtc2Z6a2d3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0MDY4MDEsImV4cCI6MjA5MTk4MjgwMX0.yzxj2oBpaa4tIMGUTpBAVlZrqqeNZuhDRnUVV7cTYeo"

headers = {
    "apikey": SUPABASE_ANON_KEY,
    "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

print("1. Fetching all existing appointments...")
res = requests.get(f"{SUPABASE_URL}/rest/v1/appointments?select=*", headers=headers)
print(f"Status: {res.status_code}")
appointments = res.json() if res.status_code == 200 else []
print(f"Found {len(appointments)} appointments in database.")

if len(appointments) > 0:
    print("2. Attempting to delete all appointments via REST API...")
    del_res = requests.delete(f"{SUPABASE_URL}/rest/v1/appointments?id=neq.00000000-0000-0000-0000-000000000000", headers=headers)
    print(f"Delete status: {del_res.status_code}, response: {del_res.text}")

    print("3. Attempting to update all appointments status to 'ended'...")
    upd_res = requests.patch(
        f"{SUPABASE_URL}/rest/v1/appointments?id=neq.00000000-0000-0000-0000-000000000000",
        json={"status": "ended"},
        headers=headers
    )
    print(f"Update status: {upd_res.status_code}, response: {upd_res.text}")

print("Done.")
