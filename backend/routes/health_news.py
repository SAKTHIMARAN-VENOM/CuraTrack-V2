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

@router.get("/health-news")
def get_health_news():
    """
    Fetch health-related news from GNews API, filter out ones without images,
    and return at most 5 results.
    """
    url = f"https://gnews.io/api/v4/search?q=health OR disease OR hospital&country=in&lang=en&max=10&apikey={GNEWS_API_KEY}"
    try:
        response = requests.get(url)
        response.raise_for_status()
        data = response.json()
        
        articles = data.get("articles", [])
        
        # Filter: Must have an image AND be relevant health news
        filtered_articles = [a for a in articles if a.get("image") and is_health_news(a)]
        
        # Limit to 5
        filtered_articles = filtered_articles[:5]
        
        # Format response
        result = []
        for a in filtered_articles:
            result.append({
                "title": a.get("title"),
                "description": a.get("description"),
                "image": a.get("image"),
                "url": a.get("url"),
                "publishedAt": a.get("publishedAt")
            })
            
        return {"articles": result}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch health news: {str(e)}")
