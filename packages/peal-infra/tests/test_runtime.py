"""What peal_runtime writes for Compose (host.env) and what it requires of
the credentials, as Ansible renders them for each server."""

from __future__ import annotations

import re
import subprocess
from pathlib import Path
from typing import Any

import pytest

from conftest import INFRA, ansible_render, render, role_file, settings, task

ENVIRONMENTS = ["production", "sandbox"]

# A line Compose reads as one setting: a name, then a single-quoted value
# with no quote or line break in it.
LINE = re.compile(r"[A-Za-z_][A-Za-z0-9_]*='[^'\r\n]*'")


def _host_env(rendered: Path, environment: str) -> dict[str, str]:
    lines = (rendered / f"peal-{environment}" / "host.env").read_text().splitlines()
    settings_lines = [line for line in lines if line and not line.startswith("#")]
    assert all(LINE.fullmatch(line) for line in settings_lines), settings_lines
    return {name: value.strip("'") for name, value in (line.split("=", 1) for line in settings_lines)}


@pytest.mark.parametrize("environment", ENVIRONMENTS)
def test_host_env_holds_one_setting_a_line(rendered: Path, environment: str) -> None:
    host_env = _host_env(rendered, environment)

    assert host_env["PUBLIC_URL"] == f"https://{settings(environment)['peal_hostnames']['app']}"


@pytest.mark.parametrize("environment", ENVIRONMENTS)
def test_peals_servers_keep_what_french_law_has_a_host_keep(rendered: Path, environment: str) -> None:
    """The software keeps nothing by default; Peal, a host established in
    France, must (loi n° 2004-575, art. 6, V, A)."""
    assert _host_env(rendered, environment)["PEAL_LEGAL_RETENTION"] == "true"


@pytest.mark.parametrize("environment", ENVIRONMENTS)
def test_the_server_reads_the_privacy_declaration_the_role_writes(rendered: Path, environment: str) -> None:
    host_env = _host_env(rendered, environment)

    assert host_env["PEAL_PRIVACY_DECLARATION"] == f"{settings(environment)['peal_root']}/privacy-declaration.json"
    written = task("peal_runtime", "Write the privacy declaration")
    assert written["ansible.builtin.copy"]["dest"] == "{{ peal_root }}/privacy-declaration.json"


@pytest.mark.parametrize("environment", ENVIRONMENTS)
def test_no_provider_is_declared_before_the_owner_confirms_it(environment: str) -> None:
    """Each user's export repeats the declaration: a provider guessed here
    would be told to users as a fact."""
    assert settings(environment)["peal_privacy_declaration"] == {}


def test_production_sends_its_heartbeat(rendered: Path) -> None:
    host_env = _host_env(rendered, "production")

    assert host_env["PEAL_GRAFANA_HEARTBEAT"] == "./config/production/grafana/alerting/heartbeat.yaml"
    assert host_env["PEAL_HEARTBEAT_URL"] == settings("production")["peal_heartbeat_url"]
    assert (INFRA.parent / "peal-docker" / host_env["PEAL_GRAFANA_HEARTBEAT"]).is_file()


def test_the_sandbox_sends_none(rendered: Path) -> None:
    host_env = _host_env(rendered, "sandbox")

    assert "PEAL_GRAFANA_HEARTBEAT" not in host_env
    assert "PEAL_HEARTBEAT_URL" not in host_env


def _misread(host_settings: dict[str, Any]) -> list[str]:
    """The settings peal_runtime refuses to write, by name."""
    found = task("peal_runtime", "Refuse host settings Compose would misread")
    return ansible_render(found["vars"]["peal_runtime_misread"], peal_runtime_host_settings=host_settings)


@pytest.mark.parametrize(
    "value",
    ["it's", "two\nlines", "carriage\rreturn", ["a", "list"], {"a": "map"}, None],
)
def test_host_settings_refuse_what_compose_would_misread(value: Any) -> None:
    assert _misread({"PUBLIC_URL": "https://app.example.com", "PEAL_AI_PROVIDER": value}) == ["PEAL_AI_PROVIDER"]


@pytest.mark.parametrize("name", ["1ST", "WITH SPACE", "WITH-DASH", "A=B", "", "TRAILING\n", "TWO\nLINES"])
def test_host_settings_refuse_names_compose_would_misread(name: str) -> None:
    assert _misread({name: "value"}) == [name]


@pytest.mark.parametrize("value", ["Peal <noreply@example.com>", "https://a.example.com/x?y=1&z=$HOME", 3000, True, ""])
def test_host_settings_take_strings_and_numbers(value: Any) -> None:
    assert _misread({"PEAL_SETTING": value}) == []


def test_host_env_writes_booleans_as_the_server_reads_them() -> None:
    """The server's Config.Boolean takes true and false, not True and
    False."""
    template = (INFRA / "roles" / "peal_runtime" / "templates" / "host.env.j2").read_text()
    host_env = ansible_render(template, peal_runtime_host_settings={"ON": True, "OFF": False})

    assert "ON='true'\n" in host_env
    assert "OFF='false'\n" in host_env


def _required(environment: str) -> list[str]:
    expression = role_file("peal_runtime", "vars")["peal_runtime_required_credentials"]
    return ansible_render(expression, **settings(environment))


def test_production_requires_the_heartbeat_token() -> None:
    assert "PEAL_HEARTBEAT_TOKEN" in _required("production")


def test_the_sandbox_does_not() -> None:
    assert "PEAL_HEARTBEAT_TOKEN" not in _required("sandbox")


def _unset(tmp_path: Path, credentials: str) -> list[str]:
    """Runs the role's check of a credentials.env written by hand, as root
    would on the server, and returns the names it reports unset."""
    (tmp_path / "credentials.env").write_text(credentials)
    found = task("peal_runtime", "Find the credentials not set on the server")
    script = render(
        found["ansible.builtin.shell"],
        peal_root=str(tmp_path),
        peal_runtime_required_credentials=["PEAL_S3_ACCESS_KEY_ID", "TELEGRAM_BOT_TOKEN"],
        peal_mail_credentials=["RESEND_API_KEY", "SMTP_URL"],
    )
    return subprocess.run(["sh", "-c", script], check=True, capture_output=True, text=True).stdout.splitlines()


def test_credentials_written_by_hand_are_set_with_a_value(tmp_path: Path) -> None:
    assert _unset(tmp_path, "PEAL_S3_ACCESS_KEY_ID='synthetic'\nTELEGRAM_BOT_TOKEN=synthetic\nSMTP_URL=\"smtp://mail\"\n") == []


@pytest.mark.parametrize("empty", ["", "''", '""'])
def test_an_empty_credential_written_by_hand_is_unset(tmp_path: Path, empty: str) -> None:
    """As in the vault, where an empty value counts as unset."""
    credentials = f"PEAL_S3_ACCESS_KEY_ID={empty}\nTELEGRAM_BOT_TOKEN='synthetic'\nRESEND_API_KEY={empty}\n"

    assert _unset(tmp_path, credentials) == ["PEAL_S3_ACCESS_KEY_ID", "RESEND_API_KEY or SMTP_URL"]
