"""
AI Health Insights endpoint — returns LLM-powered vitals analysis.
"""
from fastapi import APIRouter

from services.insights_service import generate_health_insights

router = APIRouter()


@router.get("/health-insights")
def get_health_insights():
    """
    Analyze current patient vitals using Llama 3.1 and return
    structured health insights with actionable tips.
    """
    insights = generate_health_insights()
    return {"insights": insights}
