"""Session-scoped Streamlit RPC for food analysis, following Subject AI's bridge pattern.

No second network listener, credential fallback in the browser, image files or shared user-data cache.
"""

from __future__ import annotations

import asyncio
from collections import deque
from dataclasses import dataclass
from datetime import datetime
import hmac
import re
import threading
import time
from zoneinfo import ZoneInfo
from typing import Any

from .food_analysis import validate_food_result
from .maxplus import AnalysisError, analyze_food_photo, prepare_server_photo
from .settings import AnalysisSettings

ID = re.compile(r"[a-zA-Z0-9-]{1,80}")


class ScanBudget:
    """Process-wide owner-key request budget. Stores counters only, never session IDs or user data."""

    def __init__(self):
        self.lock = threading.Lock()
        self.day = ""
        self.count = 0
        self.active = 0

    def reserve(self, limit: int) -> None:
        with self.lock:
            day = datetime.now(ZoneInfo("Asia/Bangkok")).date().isoformat()
            if day != self.day:
                self.day, self.count = day, 0
            if self.count >= limit:
                raise AnalysisError("daily_limit_reached")
            if self.active >= 4:
                raise AnalysisError("service_busy")
            self.count += 1
            self.active += 1

    def release(self):
        with self.lock:
            self.active = max(0, self.active - 1)


@dataclass
class Job:
    frame: str
    cancelled: bool = False
    loop: Any = None
    task: Any = None

    def cancel(self):
        self.cancelled = True
        if self.loop is not None and self.task is not None and not self.loop.is_closed():
            try:
                self.loop.call_soon_threadsafe(self.task.cancel)
            except RuntimeError:
                pass


class BrowserSession:
    def __init__(self):
        self.lock = threading.RLock()
        self.frame: str | None = None
        self.jobs: dict[str, Job] = {}
        self.seen: set[str] = set()
        self.seen_order: deque[str] = deque()
        self.events: deque[dict] = deque()
        self.sequence = 0
        self.last_nonce: str | None = None
        self.attempts: deque[float] = deque()
        self.last_attempt = 0.0

    def _remember(self, request_id: str):
        self.seen.add(request_id)
        self.seen_order.append(request_id)
        while len(self.seen_order) > 512:
            self.seen.discard(self.seen_order.popleft())

    def _emit(self, request_id: str, frame: str, **payload):
        with self.lock:
            if frame != self.frame:
                return
            self.sequence += 1
            self.events.append({"id": request_id, "seq": self.sequence, **payload})
            # One final event per request. Bound storage if a browser stops acknowledging.
            while len(self.events) > 64:
                self.events.popleft()

    def _submit(self, message: dict, settings: AnalysisSettings, budget: ScanBudget):
        request_id = message.get("id")
        if not isinstance(request_id, str) or not ID.fullmatch(request_id):
            return
        with self.lock:
            if request_id in self.seen:
                return
            self._remember(request_id)
            frame = self.frame
            if not frame:
                return
            if len(self.jobs) >= 1:
                self._emit(request_id, frame, kind="error", code="service_busy")
                return
            now = time.monotonic()
            while self.attempts and now - self.attempts[0] > 3600:
                self.attempts.popleft()
            if (self.last_attempt and now - self.last_attempt < 5) or len(self.attempts) >= 10:
                self._emit(request_id, frame, kind="error", code="session_rate_limit")
                return
            self.last_attempt = now
            self.attempts.append(now)
            job = Job(frame)
            self.jobs[request_id] = job

        async def execute():
            job.loop, job.task = asyncio.get_running_loop(), asyncio.current_task()
            reserved = False
            try:
                if job.cancelled:
                    return
                if settings.error:
                    raise AnalysisError(settings.error)
                if message.get("action") != "analyze":
                    raise AnalysisError("request_invalid")
                body = message.get("payload")
                if not isinstance(body, dict) or set(body) - {"photo", "language", "consent", "configVersion", "accessCode"}:
                    raise AnalysisError("request_invalid")
                if body.get("consent") is not True or body.get("configVersion") != settings.public_config()["version"]:
                    raise AnalysisError("consent_required")
                if body.get("language") not in ("en", "th"):
                    raise AnalysisError("request_invalid")
                access = body.get("accessCode", "")
                if not isinstance(access, str) or len(access) > 256:
                    raise AnalysisError("access_denied")
                if settings.access_code and not hmac.compare_digest(access.encode(), settings.access_code.encode()):
                    raise AnalysisError("access_denied")
                if job.cancelled:
                    return
                budget.reserve(settings.daily_limit)
                reserved = True
                photo = prepare_server_photo(body.get("photo"))
                if job.cancelled:
                    return
                result = await analyze_food_photo(settings.api_key, settings.model, photo, body["language"], settings.base_url)
                validated = validate_food_result(result)
                validated["analysisProvider"] = "Maxplus"
                validated["analysisModel"] = settings.model
                if not job.cancelled:
                    self._emit(request_id, job.frame, kind="result", result=validated)
            except asyncio.CancelledError:
                pass
            except AnalysisError as error:
                if not job.cancelled:
                    self._emit(request_id, job.frame, kind="error", code=error.code, retryAfter=error.retry_after)
            except Exception:
                if not job.cancelled:
                    self._emit(request_id, job.frame, kind="error", code="service_error")
            finally:
                if reserved:
                    budget.release()
                # Drop the payload reference (photo/access code) as soon as processing ends.
                message.clear()
                with self.lock:
                    if self.jobs.get(request_id) is job:
                        self.jobs.pop(request_id, None)

        def run():
            asyncio.run(execute())

        threading.Thread(target=run, name="nutriai-food-analysis", daemon=True).start()

    def accept(self, message: Any, settings: AnalysisSettings, budget: ScanBudget):
        if not isinstance(message, dict) or message.get("nonce") == self.last_nonce:
            return
        nonce, frame = message.get("nonce"), message.get("frame")
        if not isinstance(nonce, str) or not ID.fullmatch(nonce) or not isinstance(frame, str) or not ID.fullmatch(frame):
            return
        self.last_nonce = nonce
        if frame != self.frame and (message.get("type") == "boot" or self.frame is None):
            with self.lock:
                for job in self.jobs.values():
                    job.cancel()
                self.jobs.clear()
                self.seen.clear()
                self.seen_order.clear()
                self.events.clear()
                self.frame = frame
            if message.get("type") == "boot":
                return
        if frame != self.frame:
            return
        acknowledged = message.get("ack", 0)
        with self.lock:
            if isinstance(acknowledged, int) and not isinstance(acknowledged, bool) and 0 <= acknowledged <= self.sequence:
                while self.events and self.events[0]["seq"] <= acknowledged:
                    self.events.popleft()
            cancels = message.get("cancel", [])
            if isinstance(cancels, list):
                for request_id in cancels[:16]:
                    if isinstance(request_id, str) and ID.fullmatch(request_id):
                        if request_id in self.jobs:
                            self.jobs[request_id].cancel()
                        if request_id not in self.seen:
                            self._remember(request_id)
        requests = message.get("requests", [])
        if isinstance(requests, list):
            for request in requests[:4]:
                if isinstance(request, dict):
                    # Own a copy: clearing a job cannot mutate Streamlit's widget state or another request.
                    self._submit({**request, "payload": dict(request["payload"]) if isinstance(request.get("payload"), dict) else None}, settings, budget)

    def snapshot(self):
        with self.lock:
            return {"frame": self.frame, "events": list(self.events), "accepted": list(self.seen)}
