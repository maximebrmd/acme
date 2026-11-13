"""The docs server, which runs the docs' assistant: when the build arguments
name a model, release.yml builds its image, Compose runs its profile, the
tunnel sends the docs' host name to it, and the server requires its
Anthropic key, by name."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import pytest
import yaml

from conftest import ansible_render, render_inventory, role_file, settings, task

ENVIRONMENTS = ["production", "sandbox"]


def _resolved(environment: str) -> dict[str, Any]:
    """The group's settings, with peal_docs_server as Ansible reads it."""
    found = settings(environment)
    return {**found, "peal_docs_server": ansible_render(found["peal_docs_server"], **found)}


def _docs_rule(rendered: Path, environment: str) -> dict[str, Any]:
    rules = yaml.safe_load((rendered / f"peal-{environment}" / "cloudflared.yml").read_text())["ingress"]
    docs = settings(environment)["peal_hostnames"]["docs"]
    return next(rule for rule in rules if rule.get("hostname") == docs)


@pytest.mark.parametrize("environment", ENVIRONMENTS)
def test_peals_docs_have_their_assistant(environment: str) -> None:
    found = _resolved(environment)

    assert found["peal_docs_server"] is True
    assert found["peal_static_build_args"]["DOCS_ASSISTANT_MODEL"] == "claude-haiku-5-5"


@pytest.mark.parametrize("environment", ENVIRONMENTS)
def test_the_docs_open_the_environments_app(environment: str) -> None:
    found = settings(environment)

    assert found["peal_static_build_args"]["DOCS_APP_URL"] == f"https://{found['peal_hostnames']['app']}"


def test_without_a_model_the_docs_stay_static() -> None:
    found = settings("production")
    args = {name: value for name, value in found["peal_static_build_args"].items() if name != "DOCS_ASSISTANT_MODEL"}

    assert ansible_render(found["peal_docs_server"], peal_static_build_args=args) is False


@pytest.mark.parametrize("environment", ENVIRONMENTS)
def test_the_tunnel_sends_the_docs_to_the_docs_server(rendered: Path, environment: str) -> None:
    rule = _docs_rule(rendered, environment)

    assert rule["service"] == f"http://127.0.0.1:{settings(environment)['peal_ports']['docs_server']}", rule


def test_without_the_docs_server_the_tunnel_sends_the_docs_to_the_static_image(tmp_path: Path) -> None:
    rendered = render_inventory(tmp_path, peal_docs_server=False)
    rule = _docs_rule(rendered, "production")

    assert rule["service"] == f"http://127.0.0.1:{settings('production')['peal_ports']['docs']}", rule
    assert "--profile docs" not in (rendered / "peal-production" / "peal-compose").read_text()


@pytest.mark.parametrize("environment", ENVIRONMENTS)
def test_compose_runs_the_docs_profile(rendered: Path, environment: str) -> None:
    compose = (rendered / f"peal-{environment}" / "peal-compose").read_text()

    assert "--profile static" in compose
    assert "--profile docs" in compose


@pytest.mark.parametrize("environment", ENVIRONMENTS)
def test_compose_publishes_the_docs_server_where_the_tunnel_reaches_it(rendered: Path, environment: str) -> None:
    lines = (rendered / f"peal-{environment}" / "host.env").read_text().splitlines()

    assert f"PEAL_DOCS_SERVER_PORT='{settings(environment)['peal_ports']['docs_server']}'" in lines


@pytest.mark.parametrize("environment", ENVIRONMENTS)
def test_the_docs_server_requires_its_anthropic_key(environment: str) -> None:
    expression = role_file("peal_runtime", "vars")["peal_runtime_required_credentials"]

    assert "DOCS_ANTHROPIC_API_KEY" in ansible_render(expression, **_resolved(environment))


def test_without_the_docs_server_its_key_is_not_required() -> None:
    expression = role_file("peal_runtime", "vars")["peal_runtime_required_credentials"]
    found = {**settings("production"), "peal_docs_server": False}

    assert "DOCS_ANTHROPIC_API_KEY" not in ansible_render(expression, **found)


@pytest.mark.parametrize("environment", ENVIRONMENTS)
def test_each_image_gets_the_build_arguments_its_dockerfile_reads(environment: str) -> None:
    """The static image builds the docs as files: a model would make it
    build a server nginx cannot serve. The docs image takes the docs'
    settings alone."""
    args = settings(environment)["peal_static_build_args"]
    static = task("peal_release", "Build the static image")["vars"]["peal_release_static_args"]
    docs = task("peal_release", "Build the docs server's image")["vars"]["peal_release_docs_args"]

    static_args = ansible_render(static, peal_static_build_args=args)
    docs_args = ansible_render(docs, peal_static_build_args=args)

    assert "DOCS_ASSISTANT_MODEL" not in static_args
    assert "DOCS_SITE_URL" in static_args
    assert "DOCS_ASSISTANT_MODEL" in docs_args
    assert all(name.startswith("DOCS_") for name in docs_args), docs_args
