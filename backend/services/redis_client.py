"""
Redis client wrapper for token blacklisting.
Falls back to in-memory dict when Redis is unavailable (dev mode).
"""
import os
import logging

logger = logging.getLogger("curatrack.redis")

REDIS_URL = os.getenv("REDIS_URL", "").strip()

_fallback_store: dict[str, str] = {}
_use_fallback = True
_redis = None

if REDIS_URL:
    try:
        import redis as _redis_lib
        _redis_candidate = _redis_lib.from_url(REDIS_URL, decode_responses=True, socket_connect_timeout=1)
        _redis_candidate.ping()
        _redis = _redis_candidate
        _use_fallback = False
        logger.info("Connected to Redis at %s", REDIS_URL.split("@")[-1] if "@" in REDIS_URL else REDIS_URL)
    except Exception as e:
        logger.info("Redis not reachable at %s (%s). Using in-memory fallback.", REDIS_URL, e)
        _use_fallback = True
else:
    logger.info("REDIS_URL not set. Using in-memory token blacklist.")


def setnx_with_ttl(key: str, value: str, ttl_seconds: int) -> bool:
    """
    Atomic set-if-not-exists with TTL.
    Returns True if key was set (first use), False if already existed (reuse).
    """
    if _use_fallback:
        if key in _fallback_store:
            return False
        _fallback_store[key] = value
        return True

    # Atomic SETNX + EXPIRE via SET NX EX
    result = _redis.set(key, value, nx=True, ex=ttl_seconds)  # type: ignore
    return result is not None


def exists(key: str) -> bool:
    if _use_fallback:
        return key in _fallback_store
    return bool(_redis.exists(key))  # type: ignore


def set_key_with_ttl(key: str, value: str, ttl_seconds: int) -> None:
    """
    Set key with TTL.
    """
    if _use_fallback:
        _fallback_store[key] = value
    else:
        _redis.set(key, value, ex=ttl_seconds)  # type: ignore


def get_key(key: str) -> str | None:
    """
    Get value by key.
    """
    if _use_fallback:
        return _fallback_store.get(key)
    return _redis.get(key)  # type: ignore

