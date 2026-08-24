from fastapi import APIRouter
from datetime import datetime

router = APIRouter()

FIT_STATE = {
    "steps": 0,
    "heart_points": 0,
    "goal": 8000,
    "percentage": 0,
    "lastUpdated": "No wearable device synced",
    "heartRateData": [],
    "sleep": {
        "hours": 0,
        "minutes": 0,
        "formatted": "0h 0m",
        "quality": "N/A"
    },
    "calories": 0,
    "distance": "0 km"
}

@router.get("/fit-data")
def get_fit_data():
    """
    Returns unified activity and vitals data for the Dashboard and Alerts page.
    Returns zero/empty metrics unless populated by connected user integrations.
    """
    today_date = datetime.now().strftime("%Y-%m-%d")
    data = FIT_STATE.copy()
    data["date"] = today_date
    return data



