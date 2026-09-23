"""
Shared .env-reading helper (2026-08-24).

Extracted from the `_read_env_var` pattern that was independently duplicated inside
GeoChatService (and would otherwise have been duplicated a 4th time for GEMINI_API_KEY here).
Checks the real process environment first, then falls back to a local ".env" file — never
prints or logs the value itself.
"""

import os


def read_env_var(key: str) -> str:
    """
    Returns the value of `key` from os.environ, or from a ".env" file in the current working
    directory if it isn't set in the environment. Returns "" if not found anywhere. Never
    logs or prints the value — callers should only check presence/length/prefix if they need
    to report on configuration state.
    """
    val = os.environ.get(key, "")
    if not val and os.path.exists(".env"):
        try:
            with open(".env", "r") as f:
                for line in f:
                    if line.startswith(f"{key}="):
                        val = line.strip().split("=", 1)[1].strip()
        except Exception:
            pass
    return val
