# -*- coding: utf-8 -*-
"""
logger.py
File-based logger for the Splunk Query Tester backend.
"""
from __future__ import annotations

import logging
import os
from typing import Optional


ENV_LOG_PATH = "QUERY_TESTER_LOG"


def _get_splunk_home() -> str:
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


def _get_log_path() -> str:
    """
    Resolve the log file path, allowing override via environment variable.
    Falls back to $SPLUNK_HOME/var/log/splunk/query_tester.log.
    """
    env_path: Optional[str] = os.environ.get(ENV_LOG_PATH)
    if env_path:
        return env_path
    return os.path.join(_get_splunk_home(), "var", "log", "splunk", "query_tester.log")


def get_logger(name: str) -> logging.Logger:
    """
    Return a module-specific logger configured to write to the query tester log file.

    The logger:
    - Writes to /opt/splunk/var/log/splunk/query_tester.log by default
    - Can be overridden via the QUERY_TESTER_LOG environment variable
    - Uses a consistent text format suitable for Splunk indexing
    - Deduplicates file handlers so it is safe to call multiple times
    """
    logger = logging.getLogger(name)
    logger.setLevel(logging.INFO)
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

