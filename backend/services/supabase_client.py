"""
Centralized Supabase client for backend services and routes.
"""
import os
import logging
from typing import Optional

logger = logging.getLogger("curatrack.supabase")

DEFAULT_SUPABASE_URL = "https://pwpbcomeklrxfieaklvq.supabase.co"
DEFAULT_SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB3cGJjb21la2xyeGZpZWFrbHZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYxMTcwNDksImV4cCI6MjEwMTY5MzA0OX0.pVxpAV3Qq-4P9-z1_T4j17wYGim3EKu0_00OokyQFKg"

_supabase_client = None

def get_supabase_client():
    """Returns initialized Supabase client singleton."""
    global _supabase_client
    if _supabase_client is not None:
        return _supabase_client
    
    try:
        from supabase import create_client
        url = os.getenv("SUPABASE_URL") or DEFAULT_SUPABASE_URL
        key = (
            os.getenv("SUPABASE_SERVICE_ROLE_KEY") 
            or os.getenv("SUPABASE_KEY") 
            or os.getenv("SUPABASE_ANON_KEY") 
            or DEFAULT_SUPABASE_KEY
        )
        if url and key:
            _supabase_client = create_client(url, key)
            logger.info("Supabase client initialized successfully.")
            return _supabase_client
    except Exception as e:
        logger.error(f"Failed to initialize Supabase client: {e}")
        
    return None
