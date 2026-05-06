from __future__ import annotations

MAX_ROWS_FOR_AI = 20           # unique rows sent to LLM
MAX_SCAN_FOR_SAMPLE = 10000    # scan this many rows to find unique ones
MAX_COLS_FOR_AI = 10           # columns sent to LLM
MAX_CELL_LEN = 80              # truncate cell values for LLM prompt
LLM_TIMEOUT_SECS = 30          # HTTP timeout for LLM call
MAX_RESPONSE_TOKENS = 600      # cap LLM response length
MIN_INTERVAL_SECS = 600        # 10 min — skip LLM if scheduled search ran recently
MAX_UNIQUE_FOR_DICT = 100      # max unique values sent to LLM for dict extraction
MAX_SAMPLE_FOR_REGEX = 15      # sample values sent to LLM for regex generation
MIN_REGEX_MATCH_RATE = 0.5     # fall back to dict if regex matches < 50%
DICT_DIRECT_THRESHOLD = 8      # <= this many unique values: skip regex, use dict
