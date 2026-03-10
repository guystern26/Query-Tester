# -*- coding: utf-8 -*-
"""
generators — individual field value generator implementations.

Each module exposes a single generate(rule, index) function.
The GENERATOR_REGISTRY maps generation_type strings to those functions.
"""
from __future__ import annotations

from typing import Any, Callable, Dict

from core.models import GeneratorRule
from generators.numbered import generate as gen_numbered
from generators.pick_list import generate as gen_pick_list
from generators.random_number import generate as gen_random_number
from generators.unique_id import generate as gen_unique_id
from generators.email import generate as gen_email
from generators.ip_address import generate as gen_ip_address
from generators.general_field import generate as gen_general_field


GeneratorFn = Callable[[GeneratorRule, int], Any]

GENERATOR_REGISTRY: Dict[str, GeneratorFn] = {
    "numbered": gen_numbered,
    "pick_list": gen_pick_list,
    "random_number": gen_random_number,
    "unique_id": gen_unique_id,
    "email": gen_email,
    "ip_address": gen_ip_address,
    "general_field": gen_general_field,
}
