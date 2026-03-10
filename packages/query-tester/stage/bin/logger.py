# -*- coding: utf-8 -*-
"""
logger.py
File-based logger for the Splunk Query Tester backend.
"""
from __future__ import annotations

import logging
import os
from typing import Optional


# Import config values — use try/except to avoid circular import during
# early bootstrap (config.py itself may import logger indirectly).
try:
    from config import LOG_FILE as _CFG_LOG_FILE
    from config import LOG_LEVEL as _CFG_LOG_LEVEL
except ImportError:
    _CFG_LOG_FILE = ""
    _CFG_LOG_LEVEL = "INFO"

ENV_LOG_PATH = "QUERY_TESTER_LOG"

_LOG_LEVEL_MAP = {
    "DEBUG": logging.DEBUG,
    "INFO": logging.INFO,
    "WARNING": logging.WARNING,
    "ERROR": logging.ERROR,
}


def _get_splunk_home():
    # type: () -> str
    """Resolve SPLUNK_HOME from environment or common install paths."""
    home = os.environ.get("SPLUNK_HOME", "")
    if home:
        return home
    # Windows default
    win_path = r"C:\Program Files\Splunk"
    if os.path.isdir(win_path):
        return win_path
    # Linux/Mac default
    return "/opt/splunk"


def _get_log_path():
    # type: () -> str
    """
    Resolve the log file path. Priority:
    1. QUERY_TESTER_LOG environment variable
    2. LOG_FILE from config.py
    3. $SPLUNK_HOME/var/log/splunk/query_tester.log
    """
    env_path = os.environ.get(ENV_LOG_PATH)  # type: Optional[str]
    if env_path:
        return env_path
    if _CFG_LOG_FILE:
        return _CFG_LOG_FILE
    return os.path.join(_get_splunk_home(), "var", "log", "splunk", "query_tester.log")


def get_logger(name):
    # type: (str) -> logging.Logger
    """
    Return a module-specific logger configured to write to the query tester log file.
    Safe to call multiple times — deduplicates file handlers.
    """
    logger = logging.getLogger(name)
    level = _LOG_LEVEL_MAP.get(_CFG_LOG_LEVEL.upper(), logging.INFO)
    logger.setLevel(level)
    logger.propagate = False

    log_path = _get_log_path()

    handler_already_attached = False
    for handler in logger.handlers:
        if isinstance(handler, logging.FileHandler):
            existing_path = getattr(handler, "_query_tester_log_path", None)
            if existing_path == log_path:
                handler_already_attached = True
                break

    if not handler_already_attached:
        file_handler = logging.FileHandler(log_path)
        formatter = logging.Formatter(
            "%(asctime)s %(levelname)-8s [%(name)s] %(message)s"
        )
        file_handler.setFormatter(formatter)
        setattr(file_handler, "_query_tester_log_path", log_path)
        logger.addHandler(file_handler)

    return logger
