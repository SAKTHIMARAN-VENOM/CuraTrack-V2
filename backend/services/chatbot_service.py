"""
CuraTrack AI Support Chatbot — powered by Groq (fast LLM inference).
Helps users navigate CuraTrack features and answer questions about the platform.
"""
import os
import json
import logging
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("curatrack.chatbot")

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = os.getenv("GROQ_MODEL", "groq/compound-mini")
FALLBACK_MODELS = ["groq/compound-mini", "qwen/qwen3.8-27b", "openai/gpt-oss-120b", "openai/gpt-oss-20b", "groq/compound"]

SYSTEM_PROMPT = """You are CuraBot, the friendly AI support assistant for CuraTrack — a comprehensive digital health platform for India.

Your role is to help users navigate the platform and answer questions about its features. You are warm, concise, and helpful.

## CuraTrack Features You Know About:

### For Patients:
- **My Health Dashboard**: Central hub showing vitals (heart rate, SpO2, steps), health score, AI insights, and Google Fit integration. Users can view daily/weekly trends.
- **Emergency Self-Triage**: AI-powered symptom checker that assesses urgency (Green/Yellow/Red) and recommends next steps. NOT a diagnosis — always advises consulting a doctor for serious concerns.
- **Consult Doctor (Telemedicine)**: Video consultations with registered doctors. Users can schedule, join calls, and share medical records during the session.
- **My Medical Records**: Upload prescriptions, lab reports, and doctor's notes. Documents are scanned using AI OCR to extract medications, lab values, and clinical insights. Users review and confirm extracted data before saving.
- **Gov Schemes & Hospitals**: Search government health schemes (Ayushman Bharat, PMJAY, etc.), find nearby hospitals, and check eligibility for benefits.
- **Health Alerts**: Vitals-based alerts, medication reminders, and follow-up notifications.
- **Medical ID & Passport**: Digital health passport with QR code containing emergency medical info that can be scanned by healthcare providers.
- **Drug Safety Checker**: Check drug-drug interactions before taking multiple medications.

### For Doctors:
- **Clinical OPD Queue**: Manage patient queue, view patient records, and conduct consultations.
- **Triage Alerts**: View and prioritize incoming triage cases by severity.
- **Referral Pipeline**: Manage and track patient referrals between facilities.
- **Drug Safety**: Cross-check prescribed medications for interactions.

### For ASHA/Frontline Health Workers (FHW):
- **Catchment Center**: Manage assigned village/community patient list.
- **Community Triage**: Conduct field-level health assessments.
- **Village Referrals**: Refer patients to higher facilities with tracking.
- **Assisted Teleconsult**: Help patients connect with doctors via video.

### For Facility Managers:
- **Facility Operations**: Dashboard for hospital bed availability, staff management, and resource allocation.
- **Consultation Services**: Schedule and manage OPD and specialist clinics.

## How to Guide Users:

### Uploading Medical Records:
1. Go to "My Medical Records" from the sidebar
2. Click "Add Record" button
3. Upload a photo or PDF of the document
4. The AI will scan and extract text automatically
5. Select the record type (Prescription, Doctor's Notes, or Lab Report)
6. Review the pre-filled form and make corrections
7. Click "Save Record"

### Checking Health Dashboard:
- Navigate to "My Health Dashboard" from the sidebar
- Connect Google Fit for automatic vitals sync
- View AI-generated health insights

### Using Self-Triage:
1. Go to "Emergency Self-Triage"
2. Answer symptom questions honestly
3. Get a color-coded urgency assessment
4. Follow the recommended action plan
5. Remember: this is NOT a substitute for professional medical advice

### Getting Government Benefits:
1. Go to "Gov Schemes & Hospitals"
2. Browse available schemes or search by name
3. Check eligibility criteria
4. Find nearby hospitals that accept the scheme

## Rules:
- Be concise. Most answers should be 2-4 sentences.
- Always be helpful and empathetic.
- If asked medical questions, remind users to consult a healthcare professional. You are a platform navigation assistant, NOT a medical advisor.
- If you don't know something about the platform, say so honestly.
- Use simple language accessible to all education levels.
- You can use emojis sparingly to be friendly 😊
- When giving navigation instructions, mention the exact menu/button names.
- Never make up features that don't exist in CuraTrack.
"""


def get_groq_client():
    """Initialize and return a Groq client."""
    try:
        from groq import Groq
        api_key = os.getenv("GROQ_API_KEY", GROQ_API_KEY).strip()
        if not api_key:
            raise ValueError("GROQ_API_KEY is not set")
        return Groq(api_key=api_key)
    except ImportError:
        raise RuntimeError("groq package is not installed. Run: pip install groq")


def chat(messages: list[dict]) -> str:
    """
    Send conversation to Groq and return the assistant's reply.
    messages: list of {role: "user"|"assistant"|"system", content: "..."}
    """
    client = get_groq_client()
    primary_model = os.getenv("GROQ_MODEL", GROQ_MODEL).strip()
    models_to_try = [primary_model] + [m for m in FALLBACK_MODELS if m != primary_model]

    # Prepend system prompt
    full_messages = [{"role": "system", "content": SYSTEM_PROMPT}] + messages

    last_error = None
    for model in models_to_try:
        try:
            logger.info("Calling Groq API (model=%s, messages=%d)", model, len(full_messages))
            response = client.chat.completions.create(
                model=model,
                messages=full_messages,
                temperature=0.7,
                max_tokens=1024,
                top_p=0.9,
            )
            reply = response.choices[0].message.content.strip()
            logger.info("Groq reply: %d chars", len(reply))
            return reply
        except Exception as e:
            logger.warning("Groq model %s failed: %s", model, e)
            last_error = e

    raise RuntimeError(f"Chatbot error across all models: {str(last_error)}")


def chat_stream(messages: list[dict]):
    """
    Stream conversation response from Groq.
    Yields content chunks as they arrive.
    """
    client = get_groq_client()
    primary_model = os.getenv("GROQ_MODEL", GROQ_MODEL).strip()
    models_to_try = [primary_model] + [m for m in FALLBACK_MODELS if m != primary_model]

    full_messages = [{"role": "system", "content": SYSTEM_PROMPT}] + messages

    stream_success = False
    for model in models_to_try:
        try:
            logger.info("Streaming Groq API (model=%s, messages=%d)", model, len(full_messages))
            stream = client.chat.completions.create(
                model=model,
                messages=full_messages,
                temperature=0.7,
                max_tokens=1024,
                top_p=0.9,
                stream=True,
            )
            for chunk in stream:
                delta = chunk.choices[0].delta
                if delta and delta.content:
                    yield delta.content
            stream_success = True
            break
        except Exception as e:
            logger.warning("Groq streaming model %s failed: %s", model, e)

    if not stream_success:
        yield "\n\n[Error: Unable to reach Groq chatbot service.]"
