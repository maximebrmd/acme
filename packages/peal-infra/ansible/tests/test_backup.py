"""The database's backups (the peal_backup role): peal-backup runs pgBackRest
in the Postgres container, then posts when the backup finished, or failed,
to the collector, which Grafana's backup rules read. The script runs here,
rendered as Ansible renders it, with a stand-in for `peal-compose` that
plays pgBackRest and a collector of the test's: no database is backed up."""

from __future__ import annotations

import http.server
import json
import os
import re
import shutil
import subprocess
import threading
from collections.abc import Iterator
from pathlib import Path
from typing import Any

import pytest
import yaml

from conftest import INFRA, render, role_file

ROLE = INFRA / "roles" / "peal_backup"
SCRIPT = ROLE / "templates" / "peal-backup.j2"
DOCKER = INFRA.parent.parent / "peal-docker"
RULES = DOCKER / "config" / "production" / "grafana" / "alerting" / "rules.yaml"

# Fewer and shorter retries than the role's, so a collector that never
# answers costs the tests two seconds.
RETRIES = {"peal_backup_report_retries": 2, "peal_backup_report_retry_delay": 1}

# What pgBackRest says when the database is a new cluster, and the bucket
# still holds the old one's backups and archive.
MISMATCH = (
    "ERROR: [028]: backup and archive info files exist but do not match the database\n"
    "       HINT: is this the correct stanza?\n"
)


class Collector:
    """A collector's OTLP HTTP receiver, on 127.0.0.1: it records each post
    and answers with the status the test sets."""

    def __init__(self) -> None:
        self.posts: list[tuple[str, Any]] = []
        self.status = 200
        # Posts answered 503 first, as by a collector still starting.
        self.unavailable = 0
        collector = self

        class Handler(http.server.BaseHTTPRequestHandler):
            def do_POST(self) -> None:
                body = self.rfile.read(int(self.headers["Content-Length"]))
                if collector.unavailable > 0:
                    collector.unavailable -= 1
                    status = 503
                else:
                    collector.posts.append((self.path, json.loads(body)))
                    status = collector.status
                self.send_response(status)
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


def _run(folder: Path, port: int, backup_type: str = "diff", fails: str | None = None) -> subprocess.CompletedProcess[str]:
    """peal-backup as Ansible renders it, run with sh. The stand-in for
    `peal-compose` records each pgBackRest command, and the one named
    `fails` exits as pgBackRest does on a mismatched stanza."""
    compose = folder / "peal-compose"
    compose.write_text(f"""#!/bin/sh
[ "$1 $2 $3 $4 $5 $6" = "exec -T --user postgres postgres pgbackrest" ] || {{ echo "peal-compose: unexpected $*" >&2; exit 64; }}
shift 6
echo "$*" >> "{folder}/pgbackrest.calls"
if [ "$1" = "{fails or ""}" ]; then
  printf '%s' "{MISMATCH}" >&2
  exit 28
fi
""")
    compose.chmod(0o755)
    script = folder / "peal-backup"
    script.write_text(render(SCRIPT.read_text(), peal_compose_bin=str(compose), peal_ports={"otlp_http": port}, **RETRIES))
    return subprocess.run(
        ["sh", str(script), backup_type],
        check=False,
        capture_output=True,
        text=True,
        stdin=subprocess.DEVNULL,
        env={"PATH": os.environ["PATH"]},
    )


def _calls(folder: Path) -> list[str]:
    return (folder / "pgbackrest.calls").read_text().splitlines()


def _gauge(collector: Collector) -> tuple[str, str, int]:
    """The one post's gauge: its name, its type attribute and its value,
    after checking its shape."""
    assert len(collector.posts) == 1
    path, body = collector.posts[0]
    assert path == "/v1/metrics"
    [resource] = body["resourceMetrics"]
    assert resource["resource"]["attributes"] == [{"key": "service.name", "value": {"stringValue": "peal-backup"}}]
    [scope] = resource["scopeMetrics"]
    [metric] = scope["metrics"]
    # Prometheus adds the unit to the name: `_seconds`.
    assert metric["unit"] == "s"
    [point] = metric["gauge"]["dataPoints"]
    [attribute] = point["attributes"]
    assert attribute["key"] == "type"
    assert int(point["timeUnixNano"]) == int(point["asInt"]) * 1_000_000_000
    return metric["name"], attribute["value"]["stringValue"], int(point["asInt"])


def test_a_backup_reports_when_it_finished(tmp_path: Path, collector: Collector) -> None:
    ran = _run(tmp_path, collector.port, "full")

    assert ran.returncode == 0, ran.stderr
    assert _calls(tmp_path) == ["stanza-create", "backup --type=full"]
    name, backup_type, finished = _gauge(collector)
    assert (name, backup_type) == ("peal_backup_last_success_timestamp", "full")
    assert finished > 0


def test_a_backup_the_collector_misses_is_still_stored(tmp_path: Path, collector: Collector) -> None:
    collector.status = 500

    ran = _run(tmp_path, collector.port)

    assert ran.returncode == 0
    assert ran.stderr.splitlines()[-1].startswith("peal-backup: ")


@pytest.mark.parametrize(("fails", "calls"), [("stanza-create", ["stanza-create"]), ("backup", ["stanza-create", "backup --type=diff"])])
def test_a_failed_backup_reports_when_it_failed(tmp_path: Path, collector: Collector, fails: str, calls: list[str]) -> None:
    """As after a database is started over while the bucket holds the old
    one's backups: the rule on failures alerts at once, rather than the
    stale rule 30 hours after the last backup."""
    ran = _run(tmp_path, collector.port, fails=fails)

    assert ran.returncode == 28
    assert _calls(tmp_path) == calls
    # pgBackRest's own error reaches the journal, then the script's line.
    assert MISMATCH in ran.stderr
    assert ran.stderr.splitlines()[-1].startswith("peal-backup: ")
    name, backup_type, failed = _gauge(collector)
    assert (name, backup_type) == ("peal_backup_last_failure_timestamp", "diff")
    assert failed > 0


@pytest.mark.parametrize("fails", [None, "stanza-create"])
def test_a_collector_still_starting_is_asked_again(tmp_path: Path, collector: Collector, fails: str | None) -> None:
    """After a boot or during a release, the collector may answer later
    than pgBackRest: a report it missed would leave the failure unseen, or
    the failure alert firing over a stored backup."""
    collector.unavailable = 2

    _run(tmp_path, collector.port, fails=fails)

    name, _, _ = _gauge(collector)
    assert name == ("peal_backup_last_success_timestamp" if fails is None else "peal_backup_last_failure_timestamp")


def test_the_role_retries_a_report_for_a_minute() -> None:
    assert role_file("peal_backup", "defaults") == {"peal_backup_report_retries": 6, "peal_backup_report_retry_delay": 10}


def test_a_failure_the_collector_misses_still_fails_the_run(tmp_path: Path, collector: Collector) -> None:
    port = collector.port
    collector.close()

    ran = _run(tmp_path, port, fails="stanza-create")

    assert ran.returncode == 28
    assert ran.stderr.splitlines()[-1].startswith("peal-backup: ")


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


def test_one_backup_runs_at_a_time() -> None:
    """The full and the differential backups are two units, which systemd
    would run side by side: after a server was down over a Sunday and a
    weekday, or when one is started by hand while the timer's runs.
    pgBackRest would refuse the second (its lock, error 050), and the
    failure alert fire for nothing. The second waits for the first."""
    service = _unit("peal-backup@.service")["Service"]

    assert service["ExecStart"] == "/usr/bin/flock /run/peal-backup.lock /usr/local/sbin/peal-backup %i"


def _rule(uid: str) -> dict[str, Any]:
    [group] = yaml.safe_load(RULES.read_text())["groups"]
    [found] = [rule for rule in group["rules"] if rule["uid"] == uid]
    return found


def _query(uid: str) -> str:
    [query] = [step["model"]["expr"] for step in _rule(uid)["data"] if step["refId"] == "A"]
    return query


def test_the_script_posts_the_gauges_the_rules_read() -> None:
    """Prometheus names each gauge with its unit: `_seconds`."""
    posted = set(re.findall(r"\breport (peal_backup_\w+)", SCRIPT.read_text()))
    assert posted == {"peal_backup_last_success_timestamp", "peal_backup_last_failure_timestamp"}

    assert "peal_backup_last_success_timestamp_seconds" in _query("peal-backup-stale")
    failed = _query("peal-backup-failed")
    assert "peal_backup_last_failure_timestamp_seconds" in failed
    assert "peal_backup_last_success_timestamp_seconds" in failed


def test_a_failed_backup_alerts_until_one_succeeds() -> None:
    """A server that never failed has no failure to read: no data is OK
    there, and the stale rule covers a server that never backed up."""
    rule = _rule("peal-backup-failed")

    assert (rule["for"], rule["noDataState"], rule["execErrState"]) == ("0s", "OK", "Error")
    assert rule["labels"] == {"severity": "critical"}
    assert "restore-database.md" in rule["annotations"]["summary"]


def _docker_runs() -> bool:
    return (
        shutil.which("docker") is not None
        and subprocess.run(["docker", "info"], capture_output=True, check=False).returncode == 0
    )


def _prometheus_image() -> str:
    compose = yaml.safe_load((DOCKER / "compose.production.yaml").read_text())
    return compose["services"]["prometheus"]["image"]


# The failure rule as Prometheus evaluates it, on made-up series: one sample
# a minute, each a gauge's value, the time it reports, in seconds. Days are
# minutes here, the 8 days of the expression aside.
PROMTOOL_TESTS = [
    # A failure, and no success in 8 days: it fires.
    ("failure only", {"failure": {"diff": "100x20"}}, [(5, True)]),
    # A success, then a failure: quiet, then it fires.
    ("success then failure", {"success": {"diff": "100x20"}, "failure": {"diff": "_x9 700x10"}}, [(5, False), (15, True)]),
    # A failed diff, then a good full: it clears, whatever the type.
    ("failure then success", {"failure": {"diff": "100x20"}, "success": {"full": "_x9 700x10"}}, [(5, True), (15, False)]),
    # A full backup that succeeded after a diff that failed, both kept: the
    # newest of each counts, not the oldest.
    ("newest of each", {"success": {"full": "50x20", "diff": "_x9 900x10"}, "failure": {"diff": "_x4 600x15"}}, [(7, True), (15, False)]),
    # Never failed: no data, which the rule takes as OK.
    ("never failed", {"success": {"diff": "100x20"}}, [(15, False)]),
]


@pytest.mark.skipif(not _docker_runs(), reason="Docker is not running")
def test_the_failure_rule_fires_while_the_last_failure_is_newest(tmp_path: Path) -> None:
    expression = _query("peal-backup-failed")
    (tmp_path / "rules.yml").write_text(
        yaml.safe_dump({"groups": [{"name": "backup", "rules": [{"alert": "Failed", "expr": f"({expression}) > 0"}]}]})
    )
    names = {"success": "peal_backup_last_success_timestamp_seconds", "failure": "peal_backup_last_failure_timestamp_seconds"}
    tests = [
        {
            "name": name,
            "interval": "1m",
            "input_series": [
                {"series": f'{names[kind]}{{type="{backup_type}"}}', "values": values}
                for kind, by_type in series.items()
                for backup_type, values in by_type.items()
            ],
            "alert_rule_test": [
                {"eval_time": f"{minute}m", "alertname": "Failed", "exp_alerts": [{"exp_labels": {}}] if fires else []}
                for minute, fires in expected
            ],
        }
        for name, series, expected in PROMTOOL_TESTS
    ]
    (tmp_path / "tests.yml").write_text(yaml.safe_dump({"rule_files": ["rules.yml"], "evaluation_interval": "1m", "tests": tests}))

    ran = subprocess.run(
        ["docker", "run", "--rm", "--volume", f"{tmp_path}:/w:ro", "--workdir", "/w", "--entrypoint", "promtool",
         _prometheus_image(), "test", "rules", "tests.yml"],
        capture_output=True,
        text=True,
        check=False,
        stdin=subprocess.DEVNULL,
    )

    assert ran.returncode == 0, ran.stdout + ran.stderr
