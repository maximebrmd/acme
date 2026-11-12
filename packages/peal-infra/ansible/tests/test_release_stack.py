"""What the release reports of its last `up`, the rest of the stack: a
change when Compose started, recreated or removed a container, but not for
collector-wget's start, which copies the collector's health-check wget and
exits, so Compose starts it at every `up`."""

from __future__ import annotations

import pytest

from conftest import ansible_render, task

# What `peal-compose up --wait` prints, on stderr, when nothing changed...
UNCHANGED = """\
 Container peal-loki-1 Running
 Container peal-collector-wget-1 Starting
 Container peal-collector-wget-1 Started
 Container peal-collector-wget-1 Waiting
 Container peal-collector-wget-1 Exited
 Container peal-otel-collector-1 Running
 Container peal-otel-collector-1 Healthy
"""

# ...and when a release changed busybox's digest, or a service.
RECREATED_WGET = UNCHANGED.replace("collector-wget-1 Starting", "collector-wget-1 Recreated")
RECREATED_WEB = UNCHANGED + " Container peal-web-1 Recreated\n Container peal-web-1 Started\n"
REMOVED = UNCHANGED + " Container peal-old-1 Removed\n"


@pytest.mark.parametrize(
    ("stderr", "changed"),
    [(UNCHANGED, False), (RECREATED_WGET, True), (RECREATED_WEB, True), (REMOVED, True)],
)
def test_the_stack_s_start_is_a_change_only_when_something_changed(stderr: str, changed: bool) -> None:
    started = task("peal_release", "Start the rest of the stack")
    register = started["register"]

    result = ansible_render(
        "{{ " + started["changed_when"] + " }}",
        **{register: {"stderr": stderr, "stderr_lines": stderr.splitlines()}},
    )

    assert result is changed
