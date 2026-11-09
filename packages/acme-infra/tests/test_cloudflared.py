"""The tunnel's routes (roles/cloudflared/templates/config.yml.j2), as
cloudflared matches requests against them: every admin surface needs a
Cloudflare Access token, however its path is written, and what outside
services call on the sandbox stays open."""

from __future__ import annotations

import re
import shutil
import subprocess
from pathlib import Path
from typing import Any
from urllib.parse import unquote

import pytest
import yaml

from conftest import INFRA

ENVIRONMENTS = ["acme-production", "acme-sandbox"]


def _settings(environment: str) -> dict[str, Any]:
    group = environment.removeprefix("acme-")
    folder = INFRA / "inventory" / "group_vars"
    return {
        **yaml.safe_load((folder / "all" / "main.yml").read_text()),
        **yaml.safe_load((folder / group / "main.yml").read_text()),
    }


def _go_clean(path: str) -> str:
    """Go's path.Clean, for the rooted paths requests carry."""
    segments: list[str] = []
    for segment in path.split("/"):
        if segment in {"", "."}:
            continue
        if segment == "..":
            if segments:
                segments.pop()
            continue
        segments.append(segment)
    return "/" + "/".join(segments)


def _canonical(path: str) -> str:
    """The path cloudflared matches rules against: net/url decodes it, then,
    when a rule requires Access, canonicalPathForMatching (ingress.go) turns
    backslashes into slashes and resolves dot segments and repeated slashes,
    keeping a trailing slash."""
    decoded = unquote(path).replace("\\", "/")
    cleaned = _go_clean(decoded)
    if decoded.endswith(("/", "/.", "/..")) and cleaned != "/":
        cleaned += "/"
    return cleaned


def _rules(rendered: Path, environment: str) -> list[dict[str, Any]]:
    return yaml.safe_load((rendered / environment / "cloudflared.yml").read_text())["ingress"]


def _match(rules: list[dict[str, Any]], host: str, path: str) -> int:
    """The index of the rule cloudflared serves a request with
    (Ingress.FindMatchingRule): the first whose host name and path match."""
    if any(rule.get("originRequest", {}).get("access", {}).get("required") for rule in rules):
        path = _canonical(path)
    else:
        path = unquote(path)
    for index, rule in enumerate(rules):
        if rule.get("hostname", host) == host and (
            "path" not in rule or re.search(rule["path"], path)
        ):
            return index
    return len(rules) - 1


def _audience(rule: dict[str, Any]) -> list[str]:
    access = rule.get("originRequest", {}).get("access", {})
    return access.get("audTag", []) if access.get("required") else []


def _guarded(rule: dict[str, Any], audience: str) -> bool:
    """Whether a request served by this rule needs an Access token for this
    application, or is refused."""
    return audience in _audience(rule) or rule["service"].startswith("http_status:")


# Ways of writing a path that servers read as the same path, or as one
# under it once they resolve dot segments and backslashes themselves.
def _spellings(path: str) -> list[str]:
    return [
        path,
        path.replace("/", "//"),
        path.replace("/", "/./"),
        "/x/.." + path,
        "/x/%2e%2e" + path,
        path.replace("/", "%2F").replace("%2F", "/", 1),
        "/" + path[1:].replace("/", "\\"),
        path.replace("a", "%61"),
        path.replace("admin", "ADMIN"),
        "/.well-known/oauth-authorization-server/../.." + path,
        "/api/channels/oauth/../../.." + path,
    ]


ADMIN_PATHS = [
    "/api/auth/admin/list-users",
    "/api/auth/admin",
    "/api/admin/users",
    "/api/admin",
    "/admin",
    "/fr/admin/x",
]


@pytest.mark.parametrize("path", [s for p in ADMIN_PATHS for s in _spellings(p)])
def test_production_admin_needs_access(rendered: Path, path: str) -> None:
    settings = _settings("acme-production")
    rules = _rules(rendered, "acme-production")
    rule = rules[_match(rules, settings["acme_hostnames"]["app"], path)]

    assert _guarded(rule, settings["cloudflare_access_aud"]["admin"]), rule


@pytest.mark.parametrize("environment", ENVIRONMENTS)
@pytest.mark.parametrize("surface", ["grafana", "ssh"])
@pytest.mark.parametrize("path", ["/", "/api/health", "/x/../"])
def test_team_hosts_need_access(rendered: Path, environment: str, surface: str, path: str) -> None:
    settings = _settings(environment)
    rules = _rules(rendered, environment)
    rule = rules[_match(rules, settings["acme_hostnames"][surface], path)]

    assert _guarded(rule, settings["cloudflare_access_aud"][surface]), rule


SANDBOX_OPEN = [
    "/api/channels/oauth/bluesky/client-metadata.json",
    "/api/auth/stripe/webhook",
    "/api/data-deletion/facebook",
    "/api/data-deletion/threads",
]


@pytest.mark.parametrize("path", SANDBOX_OPEN)
def test_sandbox_lets_outside_services_call(rendered: Path, path: str) -> None:
    settings = _settings("acme-sandbox")
    rules = _rules(rendered, "acme-sandbox")
    rule = rules[_match(rules, settings["acme_hostnames"]["app"], path)]

    assert rule["service"] == f"http://127.0.0.1:{settings['acme_ports']['server']}", rule
    assert _audience(rule) == [], rule


SANDBOX_GUARDED = [
    *[s for p in ADMIN_PATHS for s in _spellings(p)],
    "/",
    "/sign-in",
    "/api/me",
    "/api/auth/sign-in/email",
    "/api/auth/stripe/webhook/../../admin/list-users",
    "/api/data-deletion/../auth/admin/list-users",
    "/.well-known/oauth-authorization-server",
]


@pytest.mark.parametrize("path", SANDBOX_GUARDED)
@pytest.mark.parametrize("surface", ["app", "site", "docs"])
def test_sandbox_needs_access_elsewhere(rendered: Path, surface: str, path: str) -> None:
    settings = _settings("acme-sandbox")
    rules = _rules(rendered, "acme-sandbox")
    rule = rules[_match(rules, settings["acme_hostnames"][surface], path)]

    assert _guarded(rule, settings["cloudflare_access_aud"]["sandbox"]), rule


def test_cloudflared_canonicalises_paths() -> None:
    """The rules above hold because cloudflared resolves a path before it
    matches it, since 2026.10.0 (VULN-141859); older releases match the path
    as sent, and /api/x/../auth/admin would skip the admin rule."""
    version = _settings("acme-production")["cloudflared_version"]

    assert tuple(int(part) for part in str(version).split(".")) >= (2026, 10, 0)


CLOUDFLARED = shutil.which("cloudflared")


@pytest.mark.skipif(CLOUDFLARED is None, reason="cloudflared is not installed")
@pytest.mark.parametrize("environment", ENVIRONMENTS)
def test_matching_agrees_with_cloudflared(rendered: Path, environment: str) -> None:
    """The matching above against cloudflared's own, where it is installed."""
    settings = _settings(environment)
    rules = _rules(rendered, environment)
    config = rendered / environment / "cloudflared.yml"
    requests = [
        (host, path)
        for host in settings["acme_hostnames"].values()
        for path in [*SANDBOX_GUARDED, *SANDBOX_OPEN]
    ]

    for host, path in requests:
        answer = subprocess.run(
            [CLOUDFLARED, "tunnel", "--config", str(config), "ingress", "rule", f"https://{host}{path}"],
            check=True,
            capture_output=True,
            text=True,
        ).stdout
        matched = re.search(r"Matched rule #(\d+)", answer)

        assert matched is not None, answer
        assert int(matched.group(1)) == _match(rules, host, path), (host, path)
