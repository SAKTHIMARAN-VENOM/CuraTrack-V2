"""
Step 1: Diagnose Gemini API — key validity, available models, reachability.
"""
import os
import requests
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

api_key = os.getenv("GEMINI_API_KEY", "").strip()
model = os.getenv("GEMINI_MODEL", "").strip()

print(f"GEMINI_API_KEY length: {len(api_key)}")
print(f"GEMINI_API_KEY prefix: {api_key[:12]}..." if len(api_key) > 12 else f"GEMINI_API_KEY: '{api_key}'")
print(f"GEMINI_MODEL configured: '{model}'")
print()

# 1. List available models
print("=" * 60)
print("STEP 1: List available Gemini models for this API key")
print("=" * 60)
try:
    list_url = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"
    res = requests.get(list_url, timeout=15)
    print(f"HTTP {res.status_code}")
    if res.status_code == 200:
        models = res.json().get("models", [])
        flash_models = [m["name"] for m in models if "flash" in m.get("name", "").lower()]
        print(f"Total models available: {len(models)}")
        print(f"Flash models: {flash_models[:10]}")
        print()
        # Check if configured model exists
        all_names = [m["name"].replace("models/", "") for m in models]
        if model in all_names:
            print(f"✓ Configured model '{model}' EXISTS in available models")
        else:
            print(f"✗ Configured model '{model}' NOT FOUND in available models")
            # Find closest matches
            close = [n for n in all_names if "flash" in n.lower()]
            print(f"  Available flash models: {close[:5]}")
    else:
        print(f"✗ API Error: {res.text[:500]}")
except Exception as e:
    print(f"✗ Exception: {e}")

# 2. Try calling the configured model
print()
print("=" * 60)
print(f"STEP 2: Call configured model '{model}'")
print("=" * 60)
try:
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
    payload = {
        "contents": [{"parts": [{"text": "Reply with exactly: HELLO"}]}],
        "generationConfig": {"temperature": 0.0}
    }
    res = requests.post(url, json=payload, timeout=15)
    print(f"HTTP {res.status_code}")
    if res.status_code == 200:
        text = res.json()["candidates"][0]["content"]["parts"][0]["text"]
        print(f"✓ Model responded: {text.strip()[:100]}")
    else:
        print(f"✗ Error: {res.text[:500]}")
except Exception as e:
    print(f"✗ Exception: {e}")

# 3. Try gemini-2.0-flash
print()
print("=" * 60)
print("STEP 3: Call 'gemini-2.0-flash' as alternative")
print("=" * 60)
try:
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={api_key}"
    payload = {
        "contents": [{"parts": [{"text": "Reply with exactly: HELLO"}]}],
        "generationConfig": {"temperature": 0.0}
    }
    res = requests.post(url, json=payload, timeout=15)
    print(f"HTTP {res.status_code}")
    if res.status_code == 200:
        text = res.json()["candidates"][0]["content"]["parts"][0]["text"]
        print(f"✓ Model responded: {text.strip()[:100]}")
    else:
        print(f"✗ Error: {res.text[:500]}")
except Exception as e:
    print(f"✗ Exception: {e}")

# 4. Try gemini-1.5-flash
print()
print("=" * 60)
print("STEP 4: Call 'gemini-1.5-flash' as fallback")
print("=" * 60)
try:
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
    payload = {
        "contents": [{"parts": [{"text": "Reply with exactly: HELLO"}]}],
        "generationConfig": {"temperature": 0.0}
    }
    res = requests.post(url, json=payload, timeout=15)
    print(f"HTTP {res.status_code}")
    if res.status_code == 200:
        text = res.json()["candidates"][0]["content"]["parts"][0]["text"]
        print(f"✓ Model responded: {text.strip()[:100]}")
    else:
        print(f"✗ Error: {res.text[:500]}")
except Exception as e:
    print(f"✗ Exception: {e}")
