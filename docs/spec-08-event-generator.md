# 08 — Event Generator (`event_generator.py`)

> **Conventions:** Follow `spec-00-conventions.md`. Pure Python — no Splunk calls, no file I/O. Use `GENERATOR_REGISTRY` dict pattern (Open/Closed).

Expands a `ParsedInput` into a flat list of event dicts ready for indexing.

---

## What the Frontend Sends (Relevant to This File)

Each input in the payload has two things: a static `events` list (what the user typed) and an optional `generatorConfig` that overrides specific fields with synthetic values:

```json
{
  "rowIdentifier": "index=main sourcetype=firewall",
  "events": [
    { "src_ip": "10.0.0.1", "action": "allowed", "bytes": "1024" }
  ],
  "generatorConfig": {
    "enabled": true,
    "eventCount": 5,
    "rules": [
      {
        "id": "rule-1",
        "fieldName": "src_ip",
        "generationType": "ip_address",
        "config": { "subnet": "10.0.0" }
      },
      {
        "id": "rule-2",
        "fieldName": "action",
        "generationType": "pick_list",
        "config": {
          "variants": [
            { "value": "allowed", "weight": 80 },
            { "value": "blocked", "weight": 20 }
          ]
        }
      }
    ]
  }
}
```

The user entered one row (`10.0.0.1, allowed, 1024`). With `eventCount: 5`, the generator produces 5 events where `src_ip` and `action` are synthetic but `bytes` stays `"1024"` in every event (no rule covers it).

---

## Decision Logic

```python
def build_events(inp: ParsedInput) -> List[dict]:
    """Expand a ParsedInput into a list of event dicts to be indexed."""

    # generator disabled or absent → use the events list as-is
    if not inp.generator_config or not inp.generator_config.enabled:
        # filter out completely empty rows
        return [e for e in inp.events if any(v for v in e.values())]

    # generator enabled → produce N synthetic events
    return _generate(inp.events, inp.generator_config)
```

Edge cases:
- `inp.events` is `[]` and generator disabled → return `[]` (skip indexing for this input)
- `inp.events` is `[{}]` → frontend sent `no_events` mode → return `[]`
- Generator enabled with empty `inp.events` → use `{}` as the base template

---

## How Generation Works

Each generated event starts as a **copy of `inp.events[0]`** (the first event row the user typed). Generator rules then overwrite specific fields. Fields with no rule keep the original value.

```python
def _generate(base_events: List[dict], config: GeneratorConfig) -> List[dict]:
    """Produce config.event_count events, using base_events[0] as the template."""
    template = dict(base_events[0]) if base_events else {}
    result = []

    for i in range(config.event_count):
        event = dict(template)                               # copy template
        for rule in config.rules:
            event[rule.field_name] = _apply_rule(rule, i)   # overwrite rule fields
        result.append(event)

    return result
```

**Concrete example** — template: `{src_ip: "10.0.0.1", action: "allowed", bytes: "1024"}`, 3 events:

| Event | src_ip (ip_address rule) | action (pick_list rule) | bytes (no rule) |
|---|---|---|---|
| 0 | `10.0.0.47` | `allowed` | `1024` |
| 1 | `10.0.0.183` | `blocked` | `1024` |
| 2 | `10.0.0.22` | `allowed` | `1024` |

---

## Generator Registry (Open/Closed Pattern)

```python
GENERATOR_REGISTRY: Dict[str, Callable[[GeneratorRule, int], Any]] = {
    'numbered':      _gen_numbered,
    'pick_list':     _gen_pick_list,
    'random_number': _gen_random_number,
    'unique_id':     _gen_unique_id,
    'email':         _gen_email,
    'ip_address':    _gen_ip_address,
    'general_field': _gen_pick_list,    # alias — same function
}

def _apply_rule(rule: GeneratorRule, index: int) -> Any:
    """Dispatch to the correct generator function. Unknown types log and return empty string."""
    fn = GENERATOR_REGISTRY.get(rule.generation_type)
    if fn is None:
        logger.warning('Unknown generation_type "%s" — returning empty string', rule.generation_type)
        return ''
    return fn(rule, index)
```

---

## Generator Type Reference

### `numbered`
Config: `{ "prefix": "host" }` (prefix defaults to `rule.field_name`)

```python
def _gen_numbered(rule: GeneratorRule, index: int) -> str:
    prefix = rule.config.get('prefix', rule.field_name)
    return f'{prefix}_{index + 1}'
# index=0 → "host_1", index=1 → "host_2", etc.
```

### `pick_list` / `general_field`
Config: `{ "variants": [{"value": "allowed", "weight": 80}, {"value": "blocked", "weight": 20}] }`

```python
def _gen_pick_list(rule: GeneratorRule, index: int) -> str:
    variants = rule.config.get('variants', [])
    if not variants:
        return ''
    values  = [v['value'] for v in variants]
    weights = _normalize_weights([v.get('weight', 1) for v in variants])
    return random.choices(values, weights=weights, k=1)[0]
```

### `random_number`
Config: `{ "min": 1, "max": 100, "float": false }`

```python
def _gen_random_number(rule: GeneratorRule, index: int) -> Any:
    lo = rule.config.get('min', 0)
    hi = rule.config.get('max', 100)
    if rule.config.get('float', False):
        return round(random.uniform(lo, hi), 2)
    return random.randint(int(lo), int(hi))
```

### `unique_id`
Config: none

```python
def _gen_unique_id(rule: GeneratorRule, index: int) -> str:
    return uuid4().hex
```

### `email`
Config: `{ "domain": "example.com" }`

```python
def _gen_email(rule: GeneratorRule, index: int) -> str:
    domain = rule.config.get('domain', 'example.com')
    return f'user{index + 1}@{domain}'
# index=0 → "user1@example.com"
```

### `ip_address`
Config: `{ "subnet": "10.0.0" }`

```python
def _gen_ip_address(rule: GeneratorRule, index: int) -> str:
    subnet = rule.config.get('subnet', '10.0.0')
    return f'{subnet}.{random.randint(1, 254)}'
# → "10.0.0.47"
```

---

## Weight Normalization

```python
def _normalize_weights(weights: List[float]) -> List[float]:
    """Normalize a list of weights so they sum to 1.0 for random.choices."""
    total = sum(weights)
    if total == 0:
        # all zeros → equal probability
        return [1.0 / len(weights)] * len(weights)
    return [w / total for w in weights]
```

`random.choices` accepts weights that don't sum to any particular value, but normalizing makes the intent explicit and avoids float edge cases.
