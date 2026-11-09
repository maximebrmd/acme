"""What acme_runtime writes for Compose (host.env) and what it requires of
the credentials, as Ansible renders them for each server."""

from __future__ import annotations

import re
from pathlib import Path
from typing import Any

import pytest

from conftest import INFRA, ansible_render, role_file, settings, task

ENVIRONMENTS = ["production", "sandbox"]

# A line Compose reads as one setting: a name, then a single-quoted value
# with no quote or line break in it.
LINE = re.compile(r"[A-Za-z_][A-Za-z0-9_]*='[^'\r\n]*'")


def _host_env(rendered: Path, environment: str) -> dict[str, str]:
    lines = (rendered / f"acme-{environment}" / "host.env").read_text().splitlines()
    settings_lines = [line for line in lines if line and not line.startswith("#")]
    assert all(LINE.fullmatch(line) for line in settings_lines), settings_lines
    return {name: value.strip("'") for name, value in (line.split("=", 1) for line in settings_lines)}


@pytest.mark.parametrize("environment", ENVIRONMENTS)
def test_host_env_holds_one_setting_a_line(rendered: Path, environment: str) -> None:
    host_env = _host_env(rendered, environment)

    assert host_env["PUBLIC_URL"] == f"https://{settings(environment)['acme_hostnames']['app']}"


def test_production_sends_its_heartbeat(rendered: Path) -> None:
    host_env = _host_env(rendered, "production")

    assert host_env["ACME_GRAFANA_HEARTBEAT"] == "./config/production/grafana/alerting/heartbeat.yaml"
    assert host_env["ACME_HEARTBEAT_URL"] == settings("production")["acme_heartbeat_url"]
    assert (INFRA.parent / "acme-docker" / host_env["ACME_GRAFANA_HEARTBEAT"]).is_file()


def test_the_sandbox_sends_none(rendered: Path) -> None:
    host_env = _host_env(rendered, "sandbox")

    assert "ACME_GRAFANA_HEARTBEAT" not in host_env
    assert "ACME_HEARTBEAT_URL" not in host_env


def _misread(host_settings: dict[str, Any]) -> list[str]:
    """The settings acme_runtime refuses to write, by name."""
    found = task("acme_runtime", "Refuse host settings Compose would misread")
    return ansible_render(found["vars"]["acme_runtime_misread"], acme_runtime_host_settings=host_settings)


@pytest.mark.parametrize(
    "value",
    ["it's", "two\nlines", "carriage\rreturn", ["a", "list"], {"a": "map"}, None],
)
def test_host_settings_refuse_what_compose_would_misread(value: Any) -> None:
    assert _misread({"PUBLIC_URL": "https://app.example.com", "ACME_AI_PROVIDER": value}) == ["ACME_AI_PROVIDER"]


@pytest.mark.parametrize("name", ["1ST", "WITH SPACE", "WITH-DASH", "A=B", ""])
def test_host_settings_refuse_names_compose_would_misread(name: str) -> None:
    assert _misread({name: "value"}) == [name]


@pytest.mark.parametrize("value", ["Acme <noreply@example.com>", "https://a.example.com/x?y=1&z=$HOME", 3000, True, ""])
def test_host_settings_take_strings_and_numbers(value: Any) -> None:
    assert _misread({"ACME_SETTING": value}) == []


def test_host_env_writes_booleans_as_the_server_reads_them() -> None:
    """The server's Config.Boolean takes true and false, not True and
    False."""
    template = (INFRA / "roles" / "acme_runtime" / "templates" / "host.env.j2").read_text()
    host_env = ansible_render(template, acme_runtime_host_settings={"ON": True, "OFF": False})

    assert "ON='true'\n" in host_env
    assert "OFF='false'\n" in host_env


def _required(environment: str) -> list[str]:
    expression = role_file("acme_runtime", "vars")["acme_runtime_required_credentials"]
    return ansible_render(expression, **settings(environment))


def test_production_requires_the_heartbeat_token() -> None:
    assert "ACME_HEARTBEAT_TOKEN" in _required("production")


def test_the_sandbox_does_not() -> None:
    assert "ACME_HEARTBEAT_TOKEN" not in _required("sandbox")
