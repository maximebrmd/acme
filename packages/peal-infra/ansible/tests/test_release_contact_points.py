"""release.yml stops before it changes anything when the contact points
host.env names would not start Grafana: the Telegram and Slack ones,
without Slack's webhook in credentials.env, as when a webhook written by
hand is taken out and only release.yml runs after."""

from __future__ import annotations

from pathlib import Path

import pytest
import yaml

from conftest import INFRA, play_tasks, recap_of

FIND = "Find whether Grafana's contact points lack their Slack webhook"
STOP = "Stop before Grafana would refuse its contact points"
SLACK = "./config/production/grafana/alerting/telegram-slack.yaml"
TELEGRAM = "./config/production/grafana/alerting/telegram.yaml"


def _release(tmp_path: Path, contact_points: str, credentials: str) -> tuple[bool, str]:
    root = tmp_path / "peal"
    root.mkdir()
    (root / "host.env").write_text(f"PUBLIC_URL='https://app.example.test'\nPEAL_GRAFANA_CONTACT_POINTS='{contact_points}'\n")
    (root / "credentials.env").write_text(credentials)
    ran = play_tasks(tmp_path, "peal_release", [FIND, STOP], peal_root=str(root))
    return ran.returncode == 0 and recap_of(ran)["failed"] == 0, ran.stdout


def test_slack_s_contact_points_without_their_webhook_stop_the_release(tmp_path: Path) -> None:
    released, output = _release(tmp_path, SLACK, "TELEGRAM_BOT_TOKEN='synthetic'\n")

    assert not released
    assert "run site.yml" in output
    assert "SLACK_ALERTS_WEBHOOK_URL" in output


@pytest.mark.parametrize("empty", ["", "''", '""'])
def test_an_empty_webhook_stops_it_too(tmp_path: Path, empty: str) -> None:
    released, _ = _release(tmp_path, SLACK, f"SLACK_ALERTS_WEBHOOK_URL={empty}\n")

    assert not released


def test_slack_s_contact_points_with_their_webhook_release(tmp_path: Path) -> None:
    released, output = _release(tmp_path, SLACK, "SLACK_ALERTS_WEBHOOK_URL='https://hooks.slack.invalid/synthetic'\n")

    assert released, output
    assert "hooks.slack.invalid" not in output


def test_telegram_s_contact_points_need_no_webhook(tmp_path: Path) -> None:
    released, output = _release(tmp_path, TELEGRAM, "TELEGRAM_BOT_TOKEN='synthetic'\n")

    assert released, output


def test_the_check_comes_before_the_release_changes_anything() -> None:
    """Right after the check that site.yml ran, before the build, the
    upload and every stop."""
    names = [found["name"] for found in yaml.safe_load((INFRA / "roles" / "peal_release" / "tasks" / "main.yml").read_text())]

    assert names[2:4] == [FIND, STOP]
    assert names.index("Create the local release folder") == 4
