from fastapi import APIRouter
from datetime import datetime

router = APIRouter()

@router.get("/health-risks")
def get_health_risks():
    """
    Returns seasonal health risks based on the current month using local risk engine.
    """
    month = datetime.now().month

    if month in [6, 7, 8, 9]:
        return {"risks": [
            {"disease": "Dengue", "risk": "HIGH", "icon": "mosquito"},
            {"disease": "Malaria", "risk": "MODERATE", "icon": "bug_report"},
            {"disease": "Typhoid", "risk": "MODERATE", "icon": "water_drop"}
        ]}
    elif month in [3, 4, 5]:
        return {"risks": [
            {"disease": "Heatstroke", "risk": "HIGH", "icon": "sunny"},
            {"disease": "Dehydration", "risk": "HIGH", "icon": "water_loss"},
            {"disease": "Food Poisoning", "risk": "MODERATE", "icon": "restaurant"}
        ]}
    elif month in [11, 12, 1, 2]:
        return {"risks": [
            {"disease": "Flu / Influenza", "risk": "HIGH", "icon": "ac_unit"},
            {"disease": "Asthma Exacerbation", "risk": "HIGH", "icon": "air_freshener"},
            {"disease": "COVID-19 variants", "risk": "MODERATE", "icon": "coronavirus"}
        ]}
    else:
        return {"risks": [
            {"disease": "Seasonal Allergies", "risk": "MODERATE", "icon": "filter_vintage"},
            {"disease": "Viral Fever", "risk": "MODERATE", "icon": "thermostat"}
        ]}
