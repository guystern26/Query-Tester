# -*- coding: utf-8 -*-
"""Email generator — produces user@domain addresses with configurable local parts."""
from __future__ import annotations

import random
import string
from typing import Any, Dict, List

from core.helpers import normalize_weights
from core.models import GeneratorRule


def _generate_local_part(variant: Dict[str, Any], index: int) -> str:
    """Generate the local part of the email based on variant config."""
    comp_type = str(variant.get("componentType", "numeric") or "numeric")
    comp_length = variant.get("componentLength", 4)
    try:
        comp_length = int(comp_length)
    except (TypeError, ValueError):
        comp_length = 4
    if comp_length < 1:
        comp_length = 4

    local_part = str(variant.get("localPart", "user") or "user")

    if comp_type == "numeric":
        suffix = "".join(random.choices(string.digits, k=comp_length))
    elif comp_type == "string":
        suffix = "".join(random.choices(string.ascii_lowercase, k=comp_length))
    else:
        suffix = str(index + 1)

    return local_part + suffix


def generate(rule: GeneratorRule, index: int) -> str:
    variants = rule.config.get("variants") or []

    # Legacy format: {domain: "example.com"} — used by old config_parser normalization
    if not variants and "domain" in rule.config:
        domain = rule.config.get("domain", "example.com")
        return "user{0}@{1}".format(index + 1, domain)

    if not variants:
        return "user{0}@example.com".format(index + 1)

    if len(variants) == 1:
        v = variants[0]
        domain = str(v.get("domain", "example.com") or "example.com")
        local = _generate_local_part(v, index)
        return "{0}@{1}".format(local, domain)

    # Weighted selection among variants
    weights_input = []  # type: List[float]
    for v in variants:
        try:
            weights_input.append(float(v.get("weight", 1)))
        except (TypeError, ValueError):
            weights_input.append(1.0)

    weights = normalize_weights(weights_input)
    chosen = random.choices(variants, weights=weights, k=1)[0]
    domain = str(chosen.get("domain", "example.com") or "example.com")
    local = _generate_local_part(chosen, index)
    return "{0}@{1}".format(local, domain)
