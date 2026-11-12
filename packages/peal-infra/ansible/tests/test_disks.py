"""The disks' health (the peal_disks role): peal-disk-health reads the md
arrays from /sys/block and asks smartctl about each whole disk, then posts
three gauges to the collector, which two of Grafana's rules read. The
script runs here, rendered as Ansible renders it, on a made-up /sys/block,
with stand-ins for lsblk and smartctl and a collector of the test's: it
never reads this machine's disks, and no disk is failed to test it."""

from __future__ import annotations

import http.server
import json
import os
import re
import subprocess
import threading
from collections.abc import Iterator
from pathlib import Path
from typing import Any

import pytest
import yaml

from conftest import INFRA, render, role_file, task

ROLE = INFRA / "roles" / "peal_disks"
SCRIPT = ROLE / "templates" / "peal-disk-health.j2"
RULES = INFRA.parent.parent / "peal-docker" / "config" / "production" / "grafana" / "alerting" / "rules.yaml"

GAUGES = ("peal_host_raid_arrays", "peal_host_raid_degraded", "peal_host_disks_failing")

# What lsblk lists on a server with two SATA disks mirrored by md: the
# disks, and devices that are not disks, which smartctl is never asked about.
LSBLK = "sda  disk\nsdb  disk\nloop0 loop\nsr0  rom\nmd0  raid1\nmd1  raid1\n"


class Collector:
    """A collector's OTLP HTTP receiver, on 127.0.0.1: it records each post
    and answers with the status the test sets."""

    def __init__(self) -> None:
        self.posts: list[tuple[str, str, Any]] = []
        self.status = 200
        collector = self

        class Handler(http.server.BaseHTTPRequestHandler):
            def do_POST(self) -> None:
                body = self.rfile.read(int(self.headers["Content-Length"]))
                collector.posts.append((self.path, self.headers["Content-Type"], json.loads(body)))
                self.send_response(collector.status)
                self.send_header("Content-Length", "2")
                self.end_headers()
                self.wfile.write(b"{}")

            def log_message(self, *_: object) -> None:
                pass

        self.server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        self.port = self.server.server_address[1]
        threading.Thread(target=self.server.serve_forever, daemon=True).start()

    def close(self) -> None:
        self.server.shutdown()
        self.server.server_close()


@pytest.fixture
def collector() -> Iterator[Collector]:
    running = Collector()
    yield running
    running.close()


def _server(
    folder: Path,
    *,
    arrays: dict[str, str | None],
    smart: dict[str, int],
    lsblk: str = LSBLK,
) -> dict[str, str]:
    """A made-up server: /sys/block with these md arrays (each one's
    `degraded` file, or none), and stand-ins for lsblk and smartctl, which
    exits with the status given for each disk. Returns the role's paths for
    it."""
    sys_block = folder / "sys" / "block"
    sys_block.mkdir(parents=True)
    for name in ("sda", "sdb", "loop0"):
        (sys_block / name).mkdir()
    for name, degraded in arrays.items():
        (sys_block / name / "md").mkdir(parents=True)
        if degraded is not None:
            (sys_block / name / "md" / "degraded").write_text(degraded)

    bin_ = folder / "bin"
    bin_.mkdir()
    (bin_ / "lsblk.out").write_text(lsblk)
    (bin_ / "smart").mkdir()
    for name, status in smart.items():
        (bin_ / "smart" / name).write_text(f"{status}\n")
    stand_ins = {
        "lsblk": """#!/bin/sh
[ "$*" = "--nodeps --noheadings --output NAME,TYPE" ] || { echo "lsblk: unexpected $*" >&2; exit 64; }
cat "$(dirname "$0")/lsblk.out"
""",
        # smartctl prints nothing with --quiet=silent: its exit status is
        # the answer, a bit mask (smartctl(8), "RETURN VALUES").
        "smartctl": """#!/bin/sh
here="$(dirname "$0")"
echo "$*" >> "$here/smartctl.calls"
[ "$1 $2" = "--health --quiet=silent" ] || exit 1
exit "$(cat "$here/smart/${3#/dev/}")"
""",
    }
    for name, body in stand_ins.items():
        (bin_ / name).write_text(body)
        (bin_ / name).chmod(0o755)
    return {
        "peal_disks_sys_block": str(sys_block),
        "peal_disks_lsblk": str(bin_ / "lsblk"),
        "peal_disks_smartctl": str(bin_ / "smartctl"),
    }


def _run(folder: Path, port: int, paths: dict[str, str]) -> subprocess.CompletedProcess[str]:
    """The script as Ansible renders it for this server, run with sh."""
    script = folder / "peal-disk-health"
    script.write_text(render(SCRIPT.read_text(), peal_ports={"otlp_http": port}, **paths))
    return subprocess.run(
        ["sh", str(script)],
        check=False,
        capture_output=True,
        text=True,
        stdin=subprocess.DEVNULL,
        env={"PATH": os.environ["PATH"]},
    )


def _gauges(collector: Collector) -> dict[str, int]:
    """The one post's gauges, by name, after checking its shape."""
    assert len(collector.posts) == 1
    path, content_type, body = collector.posts[0]
    assert path == "/v1/metrics"
    assert content_type == "application/json"
    [resource] = body["resourceMetrics"]
    assert resource["resource"]["attributes"] == [{"key": "service.name", "value": {"stringValue": "peal-disk-health"}}]
    [scope] = resource["scopeMetrics"]
    values: dict[str, int] = {}
    for metric in scope["metrics"]:
        # No unit: Prometheus would add it to the name (`_seconds`, or
        # `_ratio` for "1").
        assert "unit" not in metric
        [point] = metric["gauge"]["dataPoints"]
        # Nothing that names a disk: its serial is read on the server.
        assert "attributes" not in point
        assert int(point["timeUnixNano"]) > 0
        values[metric["name"]] = int(point["asInt"])
    return values


def test_a_server_without_arrays_reports_none(tmp_path: Path, collector: Collector) -> None:
    """A virtual machine, as the sandbox's: no md array, and a virtual disk
    smartctl cannot open (bit 1)."""
    paths = _server(tmp_path, arrays={}, smart={"vda": 2}, lsblk="vda disk\n")

    ran = _run(tmp_path, collector.port, paths)

    assert ran.returncode == 0, ran.stderr
    assert ran.stderr == ""
    assert _gauges(collector) == dict.fromkeys(GAUGES, 0)


def test_two_whole_arrays_on_healthy_disks(tmp_path: Path, collector: Collector) -> None:
    paths = _server(tmp_path, arrays={"md0": "0\n", "md1": "0\n"}, smart={"sda": 0, "sdb": 0})

    ran = _run(tmp_path, collector.port, paths)

    assert ran.returncode == 0, ran.stderr
    assert _gauges(collector) == {"peal_host_raid_arrays": 2, "peal_host_raid_degraded": 0, "peal_host_disks_failing": 0}


def test_a_degraded_array_is_counted(tmp_path: Path, collector: Collector) -> None:
    """md's `degraded` holds how many of the array's devices are missing."""
    paths = _server(tmp_path, arrays={"md0": "0\n", "md1": "1\n"}, smart={"sda": 0, "sdb": 0})

    ran = _run(tmp_path, collector.port, paths)

    assert ran.returncode == 0, ran.stderr
    assert _gauges(collector) == {"peal_host_raid_arrays": 2, "peal_host_raid_degraded": 1, "peal_host_disks_failing": 0}


def test_an_array_without_redundancy_is_never_degraded(tmp_path: Path, collector: Collector) -> None:
    """A striped or linear array has no `degraded` file: it has nothing to
    lose a device from and still run."""
    paths = _server(tmp_path, arrays={"md0": None}, smart={"sda": 0, "sdb": 0})

    _run(tmp_path, collector.port, paths)

    assert _gauges(collector)["peal_host_raid_arrays"] == 1
    assert _gauges(collector)["peal_host_raid_degraded"] == 0


@pytest.mark.parametrize(
    ("status", "failing"),
    [
        (0, 0),
        # Bit 3: SMART status says "disk failing".
        (8, 1),
        # Bit 4: a prefail attribute at or below its threshold.
        (16, 1),
        (24, 1),
        (8 | 64, 1),
        # Bit 1, the device could not be opened; bit 2, a SMART command
        # failed: no SMART to read, as on a virtual disk. Not failing.
        (2, 0),
        (4, 0),
        # Bit 5, an attribute was at its threshold in the past; bits 6 and
        # 7, errors in the logs. Read in the baseline, not alerted on.
        (32, 0),
        (64, 0),
        (128, 0),
    ],
)
def test_a_disk_is_failing_by_smartctl_s_status(tmp_path: Path, collector: Collector, status: int, failing: int) -> None:
    paths = _server(tmp_path, arrays={"md0": "0\n", "md1": "0\n"}, smart={"sda": 0, "sdb": status})

    ran = _run(tmp_path, collector.port, paths)

    assert ran.returncode == 0, ran.stderr
    assert _gauges(collector)["peal_host_disks_failing"] == failing


def test_each_failing_disk_is_counted(tmp_path: Path, collector: Collector) -> None:
    paths = _server(tmp_path, arrays={"md0": "0\n", "md1": "0\n"}, smart={"sda": 8, "sdb": 16})

    _run(tmp_path, collector.port, paths)

    assert _gauges(collector)["peal_host_disks_failing"] == 2


def test_smartctl_is_asked_about_whole_disks_only(tmp_path: Path, collector: Collector) -> None:
    paths = _server(tmp_path, arrays={"md0": "0\n", "md1": "0\n"}, smart={"sda": 0, "sdb": 0})

    _run(tmp_path, collector.port, paths)

    calls = (tmp_path / "bin" / "smartctl.calls").read_text().splitlines()
    assert calls == ["--health --quiet=silent /dev/sda", "--health --quiet=silent /dev/sdb"]


def test_a_refused_post_fails_the_run_with_one_line(tmp_path: Path, collector: Collector) -> None:
    """So that `systemctl status peal-disk-health` shows it."""
    paths = _server(tmp_path, arrays={"md0": "0\n", "md1": "0\n"}, smart={"sda": 0, "sdb": 0})
    collector.status = 500

    ran = _run(tmp_path, collector.port, paths)

    assert ran.returncode != 0
    assert ran.stderr.splitlines()[-1].startswith("peal-disk-health: ")


def test_a_collector_that_does_not_answer_fails_the_run(tmp_path: Path, collector: Collector) -> None:
    paths = _server(tmp_path, arrays={}, smart={"vda": 2}, lsblk="vda disk\n")
    port = collector.port
    collector.close()

    ran = _run(tmp_path, port, paths)

    assert ran.returncode != 0
    assert ran.stderr.splitlines()[-1].startswith("peal-disk-health: ")


def test_the_role_s_paths_are_the_server_s() -> None:
    assert role_file("peal_disks", "defaults") == {
        "peal_disks_sys_block": "/sys/block",
        "peal_disks_lsblk": "/usr/bin/lsblk",
        "peal_disks_smartctl": "/usr/sbin/smartctl",
    }


def test_smartmontools_is_installed_without_a_mail_transport() -> None:
    """The package recommends a mail client, which would pull a mail
    transport in."""
    apt = task("peal_disks", "Install smartmontools")["ansible.builtin.apt"]

    assert apt["name"] == "smartmontools"
    assert apt["install_recommends"] is False


def test_the_script_is_root_s() -> None:
    installed = task("peal_disks", "Install peal-disk-health")["ansible.builtin.template"]

    assert installed["dest"] == "/usr/local/sbin/peal-disk-health"
    assert (installed["owner"], installed["group"], installed["mode"]) == ("root", "root", "0750")


def _unit(name: str) -> dict[str, dict[str, str]]:
    """A unit file, by section and key, as the role writes it."""
    sections: dict[str, dict[str, str]] = {}
    current: dict[str, str] = {}
    for line in render((ROLE / "templates" / f"{name}.j2").read_text()).splitlines():
        if line.startswith("["):
            current = sections.setdefault(line.strip("[]"), {})
        elif "=" in line and not line.startswith("#"):
            key, value = line.split("=", 1)
            current[key] = value
    return sections


def test_the_service_runs_the_script_once_at_low_priority() -> None:
    service = _unit("peal-disk-health.service")["Service"]

    assert service["Type"] == "oneshot"
    assert service["ExecStart"] == "/usr/local/sbin/peal-disk-health"
    assert service["Nice"] == "10"


def test_the_timer_posts_every_15_minutes_from_boot() -> None:
    """Three posts in the rules' 45 minutes: one lost post alerts nobody
    and clears nothing."""
    timer = _unit("peal-disk-health.timer")

    assert timer["Timer"] == {"OnBootSec": "5min", "OnUnitActiveSec": "15min", "Persistent": "false"}
    assert timer["Install"] == {"WantedBy": "timers.target"}


def test_the_role_writes_the_service_and_the_timer() -> None:
    written = task("peal_disks", "Write the disk health service and timer")

    assert written["ansible.builtin.template"]["dest"] == "/etc/systemd/system/{{ item }}"
    assert written["loop"] == ["peal-disk-health.service", "peal-disk-health.timer"]
    assert written["notify"] == "Reload systemd for the disk health units"


def test_the_timer_starts_at_boot_with_check_mode_s_guard() -> None:
    """On a new server in check mode, the timer is not written yet, so there
    is nothing to start."""
    looked = task("peal_disks", "Look for the disk health timer")
    started = task("peal_disks", "Start the disk health timer at boot")

    assert looked["ansible.builtin.stat"]["path"] == "/etc/systemd/system/peal-disk-health.timer"
    assert started["ansible.builtin.systemd_service"] == {
        "name": "peal-disk-health.timer",
        "state": "started",
        "enabled": True,
    }
    assert started["when"] == f"not ansible_check_mode or {looked['register']}.stat.exists"


def _roles(playbook: str) -> list[str]:
    [play] = yaml.safe_load((INFRA / "playbooks" / playbook).read_text())
    return [role if isinstance(role, str) else role["role"] for role in play["roles"]]


def test_site_yml_reports_the_disks_after_the_backups() -> None:
    """It posts to the collector peal_runtime starts."""
    roles = _roles("site.yml")

    assert roles.index("peal_disks") == roles.index("peal_backup") + 1


def test_the_uptime_server_does_not_report_its_disks() -> None:
    """It has no collector to post to."""
    assert "peal_disks" not in _roles("uptime.yml")


def _rule(uid: str) -> dict[str, Any]:
    [group] = yaml.safe_load(RULES.read_text())["groups"]
    [found] = [rule for rule in group["rules"] if rule["uid"] == uid]
    return found


def test_the_script_posts_the_gauges_the_rules_read() -> None:
    """The rules read the names Prometheus gives the gauges, which are the
    names the script posts, as they have no unit."""
    posted = set(re.findall(r"\bgauge (peal_host_\w+)", SCRIPT.read_text()))
    assert posted == set(GAUGES)

    for uid, gauge in [("peal-raid-degraded", "peal_host_raid_degraded"), ("peal-disk-failing", "peal_host_disks_failing")]:
        [query] = [step["model"]["expr"] for step in _rule(uid)["data"] if step["refId"] == "A"]
        assert query == f"max(last_over_time({gauge}[45m]))"
