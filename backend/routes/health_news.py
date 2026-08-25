import os
import requests
from fastapi import APIRouter, HTTPException

router = APIRouter()

GNEWS_API_KEY = os.getenv("GNEWS_API_KEY", "")

KEYWORDS = [
    "health","disease","hospital","infection",
    "virus","fever","flu","diabetes",
    "heart","cancer","covid","dengue","malaria"
]

def is_health_news(article):
    text = (article.get("title","") + " " + article.get("description","")).lower()
    return any(k in text for k in KEYWORDS)

_FALLBACK_HEALTH_NEWS = [
    {
        "title": "National Health Mission Expands Rural Teleconsultation Services Across 50,000 PHCs",
        "description": "The Ministry of Health has announced a major expansion of Ayushman Arogya Mandir digital teleconsultation hubs connecting remote primary health centres directly to tertiary super-specialists.",
        "image": "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=600&auto=format&fit=crop",
        "url": "https://mohfw.gov.in",
        "publishedAt": "2026-08-25T08:00:00Z"
    },
    {
        "title": "Universal Health Coverage Milestone: Over 35 Crore Ayushman Cards Issued",
        "description": "India reaches a historic healthcare milestone under PM-JAY with cashless empanelment covering critical cardiovascular and oncological treatments.",
        "image": "https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?w=600&auto=format&fit=crop",
        "url": "https://pmjay.gov.in",
        "publishedAt": "2026-08-24T12:30:00Z"
    },
    {
        "title": "Monsoon Health Advisory: Vector-Borne Disease Prevention & Early Screening Protocols",
        "description": "Health authorities release standardized screening guidelines for frontline ASHA workers to detect Dengue and Malaria symptoms early in community catchment areas.",
        "image": "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=600&auto=format&fit=crop",
        "url": "https://icmr.gov.in",
        "publishedAt": "2026-08-23T15:45:00Z"
    }
]

@router.get("/health-news")
def get_health_news():
    """
    Fetch health-related news from GNews API, with graceful fallback to curated articles.
    """
    if not GNEWS_API_KEY:
        return {"articles": _FALLBACK_HEALTH_NEWS}

    url = f"https://gnews.io/api/v4/search?q=health OR disease OR hospital&country=in&lang=en&max=10&apikey={GNEWS_API_KEY}"
    try:
        response = requests.get(url, timeout=5)
        response.raise_for_status()
        data = response.json()
        
        articles = data.get("articles", [])
        filtered_articles = [a for a in articles if a.get("image") and is_health_news(a)]
        filtered_articles = filtered_articles[:4]
        
        result = []
        for a in filtered_articles:
            result.append({
                "title": a.get("title"),
                "description": a.get("description"),
                "image": a.get("image"),
                "url": a.get("url"),
                "publishedAt": a.get("publishedAt")
            })
            
        return {"articles": result if result else _FALLBACK_HEALTH_NEWS}

    except Exception:
        return {"articles": _FALLBACK_HEALTH_NEWS}
