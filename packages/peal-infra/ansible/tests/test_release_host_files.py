"""release.yml stops before it builds, uploads or stops anything when the
release's commit lacks a file of the release folder that the server's
host.env names for the stack to mount, as when a commit older than the last
site.yml is released: Docker would mount an empty folder in its place, and
Grafana would not start."""

from __future__ import annotations

import subprocess
from pathlib import Path

import pytest
import yaml

from conftest import INFRA, play_tasks, recap_of

READ = "Read the release folder's files host.env names"
FIND = "Find the files host.env names that the release lacks"
STOP = "Stop before the stack would mount a file the release lacks"
REPORT = "Report the files host.env names that could not be checked"
SLACK = "./config/production/grafana/alerting/telegram-slack.yaml"
HEARTBEAT = "./config/production/grafana/alerting/heartbeat.yaml"

COMPOSE = """services:
  grafana:
    volumes:
      - ${PEAL_GRAFANA_CONTACT_POINTS:-./config/production/grafana/alerting/none.yaml}:/etc/grafana/provisioning/alerting/contact-points.yaml:ro
      - ${PEAL_GRAFANA_HEARTBEAT:-./config/production/grafana/alerting/none.yaml}:/etc/grafana/provisioning/alerting/heartbeat.yaml:ro
"""


def _git(folder: Path, *args: str) -> str:
    return subprocess.run(
        ["git", "-c", "user.name=Synthetic", "-c", "user.email=synthetic@example.test", *args],
        cwd=folder,
        check=True,
        capture_output=True,
        text=True,
    ).stdout.strip()


def _commit(local: Path, files: list[str]) -> str:
    """A checkout whose commit holds the Compose file and these files of
    packages/peal-docker."""
    checkout = local / "checkout"
    docker = checkout / "packages" / "peal-docker"
    docker.mkdir(parents=True)
    _git(checkout, "init", "--quiet")
    (docker / "compose.production.yaml").write_text(COMPOSE)
    for name in ["./config/production/grafana/alerting/none.yaml", *files]:
        path = docker / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text("apiVersion: 1\n")
    _git(checkout, "add", ".")
    _git(checkout, "commit", "--quiet", "--message", "Synthetic release")
    return _git(checkout, "rev-parse", "HEAD")


def _release(
    tmp_path: Path,
    host_env: str,
    files: list[str],
    *,
    check: bool = False,
    commit: str | None = None,
) -> tuple[bool, str]:
    root = tmp_path / "peal"
    root.mkdir()
    (root / "host.env").write_text(f"PUBLIC_URL='https://app.example.test'\nPEAL_PRIVACY_DECLARATION='/srv/peal/privacy-declaration.json'\n{host_env}")
    local = tmp_path / "release"
    made = _commit(local, files)
    ran = play_tasks(
        tmp_path,
        "peal_release",
        [READ, FIND, STOP, REPORT],
        check=check,
        peal_root=str(root),
        peal_release_local_dir=str(local),
        peal_release_checkout={"after": commit or made},
    )
    return ran.returncode == 0 and recap_of(ran)["failed"] == 0, ran.stdout


@pytest.mark.parametrize("check", [False, True])
def test_files_the_commit_holds_release(tmp_path: Path, check: bool) -> None:
    released, output = _release(
        tmp_path,
        f"PEAL_GRAFANA_CONTACT_POINTS='{SLACK}'\nPEAL_GRAFANA_HEARTBEAT='{HEARTBEAT}'\n",
        [SLACK, HEARTBEAT],
        check=check,
    )

    assert released, output


@pytest.mark.parametrize("check", [False, True])
def test_a_file_the_commit_lacks_stops_the_release(tmp_path: Path, check: bool) -> None:
    released, output = _release(
        tmp_path,
        f"PEAL_GRAFANA_CONTACT_POINTS='{SLACK}'\nPEAL_GRAFANA_HEARTBEAT='{HEARTBEAT}'\n",
        [HEARTBEAT],
        check=check,
    )

    assert not released
    assert f"The release's commit lacks {SLACK} that the server's host.env names" in output
    assert "release a commit at least as recent as the last site.yml, or run site.yml from this commit first" in output
    assert HEARTBEAT not in output.split("lacks", 1)[1].split("that the server", 1)[0]


def test_a_folder_in_its_place_stops_it_too(tmp_path: Path) -> None:
    released, output = _release(
        tmp_path,
        "PEAL_GRAFANA_CONTACT_POINTS='./config/production/grafana/alerting'\n",
        [],
    )

    assert not released
    assert "lacks ./config/production/grafana/alerting that" in output


@pytest.mark.parametrize("host_env", ["", "PEAL_GRAFANA_CONTACT_POINTS=''\n", 'PEAL_GRAFANA_HEARTBEAT=""\n'])
def test_an_empty_or_unset_setting_releases(tmp_path: Path, host_env: str) -> None:
    released, output = _release(tmp_path, host_env, [])

    assert released, output


def test_a_setting_the_compose_file_does_not_mount_is_not_checked(tmp_path: Path) -> None:
    released, output = _release(tmp_path, "PEAL_SOMETHING_ELSE='./not/in/the/release.yaml'\n", [])

    assert released, output


def test_a_commit_check_mode_has_not_fetched_is_reported(tmp_path: Path) -> None:
    released, output = _release(
        tmp_path,
        f"PEAL_GRAFANA_CONTACT_POINTS='{SLACK}'\n",
        [],
        check=True,
        commit="0" * 40,
    )

    assert released, output
    assert "Check mode has not fetched" in output


def test_the_check_comes_before_the_release_builds_uploads_or_stops_anything() -> None:
    """Right after the checkout it reads, before the build, the upload and
    every stop."""
    names = [found["name"] for found in yaml.safe_load((INFRA / "roles" / "peal_release" / "tasks" / "main.yml").read_text())]
    checkout = names.index("Check the release out")

    assert names[checkout + 1 : checkout + 5] == [READ, FIND, STOP, REPORT]
    assert names.index("Build and upload the images") > checkout + 4
