from fastapi import APIRouter
from datetime import datetime, timedelta

router = APIRouter()

@router.get("/fit-data")
def get_fit_data():
    """
    Returns unified activity and vitals data for the Dashboard and Alerts page.
    In a real app, this would fetch from Google Fit API or a database.
    """
    # Mock data consistent with "Daily Step Goal Not Met" UI
    return {
        "steps": 4200,
        "goal": 8000,
        "percentage": 52.5,
        "lastUpdated": "2 hours ago",
        "heartRateData": [
            {"time": "08:00", "bpm": 72},
            {"time": "08:15", "bpm": 75},
            {"time": "08:30", "bpm": 70},
            {"time": "08:45", "bpm": 68},
            {"time": "09:00", "bpm": 82},
            {"time": "09:15", "bpm": 85},
            {"time": "09:30", "bpm": 80},
            {"time": "09:45", "bpm": 78},
            {"time": "10:00", "bpm": 74}
        ],
        "sleep": {
            "hours": 7,
            "minutes": 20,
            "formatted": "7h 20m",
            "quality": "Good"
        },
        "calories": 1450,
        "distance": "3.2 km"
    }
