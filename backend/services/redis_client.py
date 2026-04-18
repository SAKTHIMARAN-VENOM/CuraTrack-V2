"""
Redis client wrapper for token blacklisting.
Falls back to in-memory dict when Redis is unavailable (dev mode).
"""
import os
import logging

logger = logging.getLogger("curatrack.redis")

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

_fallback_store: dict[str, str] = {}
_use_fallback = False

try:
    import redis as _redis_lib
    _redis = _redis_lib.from_url(REDIS_URL, decode_responses=True, socket_connect_timeout=2)
    _redis.ping()
    logger.info("Connected to Redis at %s", REDIS_URL)
except Exception as e:
    logger.warning("Redis unavailable (%s), using in-memory fallback. NOT for production.", e)
    _redis = None
    _use_fallback = True


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
