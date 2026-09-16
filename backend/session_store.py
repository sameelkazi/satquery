"""
Conversational Session Memory Store (added 2026-09-09)

Why this exists: verified directly against backend/main.py's QueryRequest schema and the
frontend's state management that SatQuery had NO conversational memory at all -- every
query was treated as fully independent, so a natural follow-up like "what about the
building on the left?" had no way to resolve what "the building on the left" referred to.
The PS does not mandate this, but it is a real, honestly-buildable capability the team
asked for.

Design (deliberately conservative, given real hardware/sandbox constraints this project has
already run into elsewhere):
  - Each session's history is TEXT ONLY (query + the real answer text + which task ran) --
    images from prior turns are never re-attached to a new request. This keeps latency and
    VRAM cost bounded regardless of how long a conversation runs, and avoids ambiguity about
    which prior image a follow-up question is "about" once the user has switched AOI (the
    frontend starts a new session_id whenever the user switches AOI -- see App.jsx).
  - History is capped at MAX_HISTORY_TURNS most recent turns per session; older turns are
    dropped, never summarized (no invented summary of what was actually said).
  - Persisted to one JSON file per session under data/sessions/, so a server restart does
    not lose an in-progress conversation -- mirrors the existing retraining_queue.json
    persistence pattern already in main.py, just split one-file-per-session so concurrent
    sessions can't corrupt each other's history via a shared write.
  - A session is scoped to one AOI/scene by convention (the frontend enforces this); this
    store itself does not enforce that, it just stores whatever session_id it is given.
  - No automatic eviction/TTL in this pass (out of scope for a hackathon demo where sessions
    are short-lived) -- a stale session file is harmless, just an unused JSON file on disk.
    A future pass could add a cleanup job keyed off file mtime if this ever runs long-lived.
"""

import os
import json
import re
import logging
import threading
from typing import Dict, List, Any

logger = logging.getLogger(__name__)

SESSIONS_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "sessions")
MAX_HISTORY_TURNS = 5
MAX_ANSWER_CHARS_STORED = 600  # keeps recap prompts bounded even if one real answer was long


def _sanitize_session_id(session_id: str) -> str:
    """
    Same defensive pattern as main.py's _sanitize_upload_filename -- a session_id is
    entirely client-supplied, so it must never be usable to escape SESSIONS_DIR via path
    traversal or an unexpected filesystem-special character.
    """
    safe = re.sub(r"[^A-Za-z0-9_-]", "_", (session_id or "").strip())
    return safe[:80] or "default"


class SessionStore:
    def __init__(self):
        os.makedirs(SESSIONS_DIR, exist_ok=True)
        self._lock = threading.Lock()

    def _path_for(self, session_id: str) -> str:
        return os.path.join(SESSIONS_DIR, f"{_sanitize_session_id(session_id)}.json")

    def get_history(self, session_id: str) -> List[Dict[str, Any]]:
        """Returns the stored turns for this session, oldest first. Never raises -- a
        missing or corrupt session file is treated as an empty conversation, not an error."""
        if not session_id:
            return []
        path = self._path_for(session_id)
        if not os.path.exists(path):
            return []
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
            return data.get("turns", [])
        except Exception as e:
            logger.warning(f"Could not read session history for {session_id!r} ({e}); treating as empty.")
            return []

    def append_turn(self, session_id: str, query: str, answer: str, task: str = "VQA") -> None:
        """
        Appends one real, already-computed turn to this session's history and persists it.
        Truncates a very long answer before storing (MAX_ANSWER_CHARS_STORED) and caps the
        file at MAX_HISTORY_TURNS most recent turns -- older turns are dropped, never
        summarized. A write failure is logged, not raised -- conversational memory is a
        real-but-non-critical feature; a disk error here must not break the actual query
        response the user is waiting on.
        """
        if not session_id:
            return
        stored_turn = {
            "query": (query or "").strip(),
            "answer": (answer or "").strip()[:MAX_ANSWER_CHARS_STORED],
            "task": task or "VQA",
        }
        if not stored_turn["query"] or not stored_turn["answer"]:
            return
        path = self._path_for(session_id)
        with self._lock:
            turns = self.get_history(session_id)
            turns.append(stored_turn)
            turns = turns[-MAX_HISTORY_TURNS:]
            try:
                with open(path, "w", encoding="utf-8") as f:
                    json.dump({"session_id": session_id, "turns": turns}, f, indent=2)
            except Exception as e:
                logger.error(f"Failed to persist session history for {session_id!r}: {e}")

    def clear(self, session_id: str) -> bool:
        """Deletes a session's history file (used by the frontend's "New Conversation"
        action). Returns True if a file was actually removed, False if there was nothing to
        clear -- never raises for a missing file."""
        if not session_id:
            return False
        path = self._path_for(session_id)
        with self._lock:
            if os.path.exists(path):
                try:
                    os.remove(path)
                    return True
                except OSError as e:
                    logger.warning(f"Could not clear session {session_id!r}: {e}")
        return False


# Global singleton
session_store = SessionStore()
