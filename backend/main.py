import os
from dotenv import load_dotenv

# Load environment variables before importing routes
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import insurance, government, health_news, health_risks, qr
from routes import passport, ingest, activity, insights

app = FastAPI(title="CuraTrack API", version="2.0.0")

# Enable CORS for Next.js frontend and Vercel deployments
allowed_origins = os.getenv("ALLOWED_ORIGINS", "").split(",") + [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in allowed_origins if origin.strip()],
    allow_origin_regex=r"https://.*\.vercel\.app|http://(localhost|127\.0\.0\.1)(:[0-9]+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(insurance.router, prefix="/api", tags=["Insurance"])
app.include_router(government.router, prefix="/api", tags=["Government Schemes"])
app.include_router(health_news.router, prefix="/api", tags=["Health News"])
app.include_router(health_risks.router, prefix="/api", tags=["Health Risks"])
app.include_router(qr.router, prefix="/api", tags=["QR Health ID"])
app.include_router(passport.router, prefix="/api", tags=["Patient Passport"])
app.include_router(ingest.router, prefix="/api", tags=["Document Ingestion"])
app.include_router(activity.router, prefix="/api", tags=["Activity & Fit"])
app.include_router(insights.router, prefix="/api", tags=["AI Health Insights"])

@app.get("/")
def read_root():
    return {"message": "CuraTrack Backend API Running", "version": "2.0.0"}
