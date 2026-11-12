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
import subprocess
import threading
from collections.abc import Iterator
from pathlib import Path
from typing import Any

import pytest
import yaml

from conftest import INFRA, render

SCRIPT = INFRA / "roles" / "peal_backup" / "templates" / "peal-backup.j2"
RULES = INFRA.parent.parent / "peal-docker" / "config" / "production" / "grafana" / "alerting" / "rules.yaml"

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
        collector = self

        class Handler(http.server.BaseHTTPRequestHandler):
            def do_POST(self) -> None:
                body = self.rfile.read(int(self.headers["Content-Length"]))
                collector.posts.append((self.path, json.loads(body)))
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
    script.write_text(render(SCRIPT.read_text(), peal_compose_bin=str(compose), peal_ports={"otlp_http": port}))
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


def test_a_failure_the_collector_misses_still_fails_the_run(tmp_path: Path, collector: Collector) -> None:
    port = collector.port
    collector.close()

    ran = _run(tmp_path, port, fails="stanza-create")

    assert ran.returncode == 28
    assert ran.stderr.splitlines()[-1].startswith("peal-backup: ")


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
