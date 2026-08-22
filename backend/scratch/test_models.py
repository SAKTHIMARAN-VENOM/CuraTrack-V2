"""Test which Gemini models are available (not rate-limited) for this API key."""
import os, requests
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

k = os.getenv("GEMINI_API_KEY", "").strip()
models = [
    "gemini-flash-latest",
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemini-1.5-flash",
]

for m in models:
    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{m}:generateContent?key={k}"
        r = requests.post(url, json={"contents": [{"parts": [{"text": "say OK"}]}]}, timeout=10)
        status = "OK" if r.status_code == 200 else f"HTTP {r.status_code}"
        print(f"  {m}: {status}")
    except Exception as e:
        print(f"  {m}: ERROR {e}")
