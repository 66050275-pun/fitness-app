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
from .maxplus import AnalysisError, prepare_server_photo
from .food_scan_pipeline import TOTAL_BATCHES, analyze_food_in_batches, complete_food_in_batches
from .settings import AnalysisSettings

ID = re.compile(r"[a-zA-Z0-9-]{1,80}")


class ScanBudget:
    """Process-wide owner-key request budget. Stores counters only, never session IDs or user data."""

    def __init__(self):
        self.lock = threading.Lock()
        self.day = ""
        self.count = 0
        self.active = 0

    def reserve(self, limit: int, count_scan: bool = True) -> None:
        with self.lock:
            day = datetime.now(ZoneInfo("Asia/Bangkok")).date().isoformat()
            if day != self.day:
                self.day, self.count = day, 0
            if count_scan and self.count >= limit:
                raise AnalysisError("daily_limit_reached")
            if self.active >= 4:
                raise AnalysisError("service_busy")
            if count_scan:
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


@dataclass
class PendingChoice:
    frame: str
    config_version: str
    created_at: float
    candidates: list[dict]


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
        self.choices: dict[str, PendingChoice] = {}

    def _prune_choices(self):
        now = time.monotonic()
        for token in list(self.choices):
            if now - self.choices[token].created_at > 1200:
                del self.choices[token]

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
            # Progress and one terminal event per request; bound unacknowledged storage.
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
            self._prune_choices()
            now = time.monotonic()
            while self.attempts and now - self.attempts[0] > 3600:
                self.attempts.popleft()
            is_confirmation = message.get("action") == "confirm_food"
            if not is_confirmation and ((self.last_attempt and now - self.last_attempt < 5) or len(self.attempts) >= 10):
                self._emit(request_id, frame, kind="error", code="session_rate_limit")
                return
            if not is_confirmation:
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
                action = message.get("action")
                if action not in ("analyze", "confirm_food"):
                    raise AnalysisError("request_invalid")
                body = message.get("payload")
                allowed = {"language", "consent", "configVersion", "accessCode"} | (
                    {"photo", "dishHint"} if action == "analyze" else {"selectionToken", "candidateId"})
                if not isinstance(body, dict) or set(body) - allowed:
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
                hint = body.get("dishHint", "")
                if not isinstance(hint, str) or len(hint) > 160:
                    raise AnalysisError("request_invalid")
                selected = None
                if action == "confirm_food":
                    token, candidate_id = body.get("selectionToken"), body.get("candidateId")
                    if not isinstance(token, str) or not ID.fullmatch(token) or not isinstance(candidate_id, str):
                        raise AnalysisError("selection_expired")
                    with self.lock:
                        self._prune_choices()
                        choice = self.choices.get(token)
                        if choice is None or choice.frame != job.frame or choice.config_version != body["configVersion"]:
                            raise AnalysisError("selection_expired")
                        match = re.fullmatch(r"option-([1-3])", candidate_id)
                        if not match or int(match[1]) > len(choice.candidates):
                            raise AnalysisError("request_invalid")
                        selected = choice.candidates[int(match[1]) - 1]["meal"]
                budget.reserve(settings.daily_limit, count_scan=action == "analyze")
                reserved = True
                photo = prepare_server_photo(body.get("photo")) if action == "analyze" else None
                if job.cancelled:
                    return
                last_progress = {"completedBatches": 0, "totalBatches": TOTAL_BATCHES}

                def on_progress(progress: dict):
                    last_progress.update(progress)
                    if not job.cancelled:
                        self._emit(request_id, job.frame, kind="progress", progress=progress)

                if action == "confirm_food":
                    with self.lock:
                        if self.choices.pop(body["selectionToken"], None) is not choice or job.cancelled:
                            raise AnalysisError("selection_expired")
                    result = await complete_food_in_batches(settings.api_key, settings.model, selected, body["language"],
                                                           settings.base_url, on_progress)
                else:
                    result = await analyze_food_in_batches(settings.api_key, settings.model, photo, body["language"],
                                                          settings.base_url, on_progress, hint.strip())
                if result.get("kind") == "food_choices":
                    with self.lock:
                        if job.cancelled or job.frame != self.frame:
                            return
                        self._prune_choices()
                        if len(self.choices) >= 5:
                            oldest = min(self.choices, key=lambda token: self.choices[token].created_at)
                            del self.choices[oldest]
                        self.choices[request_id] = PendingChoice(job.frame, body["configVersion"],
                                                                 time.monotonic(), result["candidates"])
                    public = [{"id": f"option-{index + 1}", "name": item["meal"]["foodName"],
                               "description": item["meal"]["servingDescription"], "confidence": item["meal"]["overallConfidence"],
                               "reason": item["reason"]} for index, item in enumerate(result["candidates"])]
                    self._emit(request_id, job.frame, kind="result", result={"kind": "food_choices",
                               "selectionToken": request_id, "question": result["question"], "candidates": public})
                    return
                validated = validate_food_result(result)
                validated["analysisProvider"] = "Maxplus"
                validated["analysisModel"] = settings.model
                if not job.cancelled:
                    on_progress({**last_progress, "percent": 100, "stage": "complete"})
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
                self.choices.clear()
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
                        self.choices.pop(request_id, None)
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
            self._prune_choices()
            return {"frame": self.frame, "events": list(self.events), "accepted": list(self.seen)}
