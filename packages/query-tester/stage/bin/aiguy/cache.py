from __future__ import annotations

import hashlib
import json
import os
import time

_CACHE_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    ".aiguy_cache",
)
_CACHE_TTL = 86400  # 24 hours — stale entries ignored after this


def _cache_path(mode, field_name, prompt):
    # type: (str, str, str) -> str
    """Build a deterministic cache file path from mode + field + prompt."""
    key = "{0}|{1}|{2}".format(mode, field_name, prompt).encode("utf-8")
    h = hashlib.md5(key).hexdigest()[:12]
    return os.path.join(_CACHE_DIR, "{0}_{1}.json".format(mode, h))


def load_cache(mode, field_name, prompt):
    # type: (str, str, str) -> dict
    """Load cached value->answer mapping. Returns empty dict if missing/stale."""
    path = _cache_path(mode, field_name, prompt)
    try:
        if not os.path.exists(path):
            return {}
        age = time.time() - os.path.getmtime(path)
        if age > _CACHE_TTL:
            return {}
        with open(path, "r") as f:
            data = json.load(f)
        if isinstance(data, dict):
            return data
    except Exception:
        pass
    return {}


def save_cache(mode, field_name, prompt, mapping):
    # type: (str, str, str, dict) -> None
    """Save value->answer mapping to disk. Fire-and-forget."""
    try:
        if not os.path.isdir(_CACHE_DIR):
            os.makedirs(_CACHE_DIR)
        path = _cache_path(mode, field_name, prompt)
        with open(path, "w") as f:
            json.dump(mapping, f, ensure_ascii=False)
    except Exception:
        pass


def split_cached(unique_vals, cached):
    # type: (list, dict) -> tuple
    """Split values into cached (have answer) and uncached (need LLM).
    Returns (cached_mapping, uncached_list).
    """
    hit = {}   # type: dict
    miss = []  # type: list
    for val in unique_vals:
        if val in cached and cached[val]:
            hit[val] = cached[val]
        else:
            miss.append(val)
    return hit, miss
