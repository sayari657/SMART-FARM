"""
Redis caching layer — decorator + manual get/set/invalidate.
Falls back to in-memory TTL cache when Redis is unavailable (dev/SQLite mode).
"""
import functools
import hashlib
import json
import logging
import time
from typing import Any, Callable, Optional

logger = logging.getLogger(__name__)

_redis = None
_REDIS_DEAD = object()  # sentinel — Redis unavailable, don't retry

# In-memory fallback cache: {key: (value, expires_at)}
_mem_cache: dict = {}


def _get_redis():
    global _redis
    if _redis is _REDIS_DEAD:
        return None
    if _redis is not None:
        return _redis
    try:
        import redis as _r
        from app.core.config import settings
        _redis = _r.from_url(settings.REDIS_URL, decode_responses=True,
                             socket_connect_timeout=0.5, socket_timeout=0.5)
        _redis.ping()
        logger.info("Redis cache connected: %s", settings.REDIS_URL)
    except Exception as e:
        logger.warning("Redis unavailable — falling back to in-memory cache: %s", e)
        _redis = _REDIS_DEAD
    return None if _redis is _REDIS_DEAD else _redis


def _mem_get(key: str) -> Optional[Any]:
    entry = _mem_cache.get(key)
    if entry is None:
        return None
    value, expires_at = entry
    if time.time() > expires_at:
        del _mem_cache[key]
        return None
    return value


def _mem_set(key: str, value: Any, ttl: int):
    # Evict old entries if cache grows too large
    if len(_mem_cache) > 500:
        now = time.time()
        expired = [k for k, (_, exp) in _mem_cache.items() if now > exp]
        for k in expired:
            _mem_cache.pop(k, None)
    _mem_cache[key] = (value, time.time() + ttl)


def cache_get(key: str) -> Optional[Any]:
    r = _get_redis()
    if r:
        try:
            raw = r.get(key)
            return json.loads(raw) if raw else None
        except Exception:
            pass
    return _mem_get(key)


def cache_set(key: str, value: Any, ttl: int = 300):
    r = _get_redis()
    if r:
        try:
            r.setex(key, ttl, json.dumps(value, default=str))
            return
        except Exception:
            pass
    _mem_set(key, value, ttl)


def cache_delete(pattern: str):
    """Delete all keys matching pattern (e.g. 'dashboard:*')."""
    r = _get_redis()
    if r:
        try:
            keys = r.keys(pattern)
            if keys:
                r.delete(*keys)
        except Exception:
            pass
    # Clear matching keys from in-memory cache
    if pattern.endswith("*"):
        prefix = pattern[:-1]
        to_del = [k for k in _mem_cache if k.startswith(prefix)]
    else:
        to_del = [k for k in _mem_cache if k == pattern]
    for k in to_del:
        _mem_cache.pop(k, None)


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
