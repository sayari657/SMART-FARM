"""
Redis caching layer — decorator + manual get/set/invalidate.
Falls back to no-op when Redis is unavailable (dev/SQLite mode).
"""
import functools
import hashlib
import json
import logging
from typing import Any, Callable, Optional

logger = logging.getLogger(__name__)

_redis = None


def _get_redis():
    global _redis
    if _redis is not None:
        return _redis
    try:
        import redis as _r
        from app.core.config import settings
        _redis = _r.from_url(settings.REDIS_URL, decode_responses=True, socket_connect_timeout=2)
        _redis.ping()
        logger.info("Redis cache connected: %s", settings.REDIS_URL)
    except Exception as e:
        logger.warning("Redis unavailable — caching disabled: %s", e)
        _redis = None
    return _redis


def cache_get(key: str) -> Optional[Any]:
    r = _get_redis()
    if not r:
        return None
    try:
        raw = r.get(key)
        return json.loads(raw) if raw else None
    except Exception:
        return None


def cache_set(key: str, value: Any, ttl: int = 300):
    r = _get_redis()
    if not r:
        return
    try:
        r.setex(key, ttl, json.dumps(value, default=str))
    except Exception:
        pass


def cache_delete(pattern: str):
    """Delete all keys matching pattern (e.g. 'dashboard:*')."""
    r = _get_redis()
    if not r:
        return
    try:
        keys = r.keys(pattern)
        if keys:
            r.delete(*keys)
    except Exception:
        pass


def cached(prefix: str, ttl: int = 300):
    """
    Decorator for FastAPI endpoint functions.
    Cache key = prefix + SHA256(args + kwargs).
    Skips caching for non-GET-like functions.

    Usage:
        @router.get("/stats")
        @cached("superadmin:stats", ttl=60)
        def my_endpoint(...):
    """
    def decorator(func: Callable):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            # Build a deterministic cache key from serialisable kwargs
            safe_kw = {k: v for k, v in kwargs.items()
                       if isinstance(v, (str, int, float, bool, type(None)))}
            raw = json.dumps(safe_kw, sort_keys=True, default=str)
            digest = hashlib.sha256(raw.encode()).hexdigest()[:16]
            key = f"{prefix}:{digest}"

            cached_val = cache_get(key)
            if cached_val is not None:
                return cached_val

            result = func(*args, **kwargs)
            cache_set(key, result, ttl)
            return result
        return wrapper
    return decorator
