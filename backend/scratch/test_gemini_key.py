import os
import requests
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

api_key = os.getenv("GEMINI_API_KEY", "").strip()
model = os.getenv("GEMINI_MODEL", "gemini-flash-latest").strip()

print(f"Loaded GEMINI_API_KEY: {api_key[:8]}...{api_key[-4:] if len(api_key)>12 else ''}")
print(f"Loaded GEMINI_MODEL: {model}")

url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"

payload = {
    "contents": [
        {
            "parts": [
                {"text": "Hello Gemini! Extract patient medical JSON for Patient: Ramesh Kumar, Doctor: Dr. Sunita Rao, Medication: Paracetamol 650mg Twice daily. Respond ONLY with valid JSON."}
            ]
        }
    ],
    "generationConfig": {
        "temperature": 0.1,
        "responseMimeType": "application/json",
    }
}

try:
    res = requests.post(url, json=payload, timeout=15)
    print(f"HTTP Status Code: {res.status_code}")
    if res.status_code == 200:
        print("[SUCCESS] GEMINI API KEY IS WORKING PERFECTLY!")
        print("Response from Gemini API:")
        print(res.json()["candidates"][0]["content"]["parts"][0]["text"])
    else:
        print(f"✗ Gemini API Error ({res.status_code}): {res.text}")
except Exception as e:
    print(f"Exception calling Gemini API: {e}")
