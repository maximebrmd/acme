"""The swap file the system role makes, run as written in a container of
its own."""

from __future__ import annotations

import shutil
import subprocess

import pytest

from conftest import render, task

# The swap script uses fallocate and mkswap, which BusyBox has.
BUSYBOX = "busybox:1.38.0-musl@sha256:80e38f9a1b39188b8bdb28879178edb322a4402b081a9aedda1924609decd6f6"


def _docker_runs() -> bool:
    return (
        shutil.which("docker") is not None
        and subprocess.run(["docker", "info"], capture_output=True, check=False).returncode == 0
    )


def _swap(size_mb: int, before: str = "") -> subprocess.CompletedProcess[str]:
    """Runs the role's swap script in a container of its own, after
    `before`, then shows what is left at /swapfile*."""
    script = render(task("system", "Create the swap file")["ansible.builtin.shell"], swap_size_mb=size_mb)
    after = "ls /swapfile* 2>/dev/null; stat -c '%a %s' /swapfile 2>/dev/null; grep -q SWAPSPACE2 /swapfile 2>/dev/null && echo signed"
    return subprocess.run(
        ["docker", "run", "--rm", "--network", "none", BUSYBOX, "sh", "-c",
         f"{before}\n( {script} ); echo \"rc=$?\"; {after}"],
        capture_output=True,
        text=True,
        check=False,
    )


@pytest.mark.skipif(not _docker_runs(), reason="Docker is not running")
class TestSwap:
    def test_it_makes_a_swap_area_only_root_reads(self) -> None:
        shown = _swap(1).stdout

        assert "rc=0" in shown
        assert "/swapfile.new" not in shown
        assert "600 1048576" in shown
        # mkswap's signature.
        assert "signed" in shown

    def test_a_run_cut_short_leaves_no_swap_file(self) -> None:
        """fallocate refuses a size of 0, as it would a full disk: /swapfile
        must not exist after, or `creates` would skip it for good."""
        shown = _swap(0).stdout

        assert "rc=0" not in shown
        assert "/swapfile\n" not in shown

    def test_it_replaces_what_a_run_cut_short_left(self) -> None:
        shown = _swap(1, before="echo partial > /swapfile.new").stdout

        assert "rc=0" in shown
        assert "/swapfile.new" not in shown
        assert "600 1048576" in shown
