"""Short links on a domain of their own (peal_short_link_hostname): the
preflight refuses a host name the server or the tunnel would misread, and a
base set by hand beside it, and the tunnel's route takes exactly the codes
the server issues."""

from __future__ import annotations

import re
from typing import Any

import pytest

from conftest import INFRA, ansible_render, task

SERVER = INFRA.parent.parent / "peal-server"
TEMPLATE = INFRA / "roles" / "cloudflared" / "templates" / "config.yml.j2"


def _refused(**names: Any) -> list[str]:
    found = task("peal_preflight", "Refuse a short-link host name the server or the tunnel would misread")
    names = {"peal_short_link_hostname": "", "peal_settings": {}, **found["vars"], **names}
    return ansible_render(found["vars"]["peal_preflight_short_links"], **names)


@pytest.mark.parametrize("host", ["", "peal.link", "sandbox.peal.link", "go.example-short.test"])
def test_the_preflight_takes_a_plain_host_name(host: str) -> None:
    assert _refused(peal_short_link_hostname=host) == []


@pytest.mark.parametrize(
    "host",
    [
        "Peal.link",
        "peal.link.",
        "https://peal.link",
        "peal.link/",
        "peal.link:443",
        "peal.link/api/l",
        "peal",
        "-peal.link",
        "peal..link",
        " peal.link",
    ],
)
def test_the_preflight_refuses_a_host_name_the_server_would_misread(host: str) -> None:
    # The server stops when the base is not written as its URL's href is:
    # in lower case, without a trailing dot, a port or a path.
    assert _refused(peal_short_link_hostname=host) == ["peal_short_link_hostname"]


@pytest.mark.parametrize("host", ["", "peal.link"])
def test_the_preflight_refuses_a_base_set_by_hand(host: str) -> None:
    # The base comes from the host name the tunnel routes, never from
    # peal_settings, so the two cannot disagree.
    assert _refused(
        peal_short_link_hostname=host,
        peal_settings={"PEAL_SHORT_LINK_BASE": "https://go.example.test/"},
    ) == ["peal_settings.PEAL_SHORT_LINK_BASE"]


def _server_constant(name: str) -> str:
    source = (SERVER / "src" / "shortlinks" / "domain" / "short-code.ts").read_text()
    found = re.search(rf"export const {name} =\s*\"?([^\";]+)\"?;", source)
    assert found is not None, name
    return found.group(1)


def test_the_tunnel_takes_the_codes_the_server_issues() -> None:
    """A code of another length or alphabet would answer 404 on every new
    link, with no other test failing."""
    route = re.search(r'path: "\^/api/l/\[([^\]]+)\]\{(\d+)\}\$"', TEMPLATE.read_text())
    assert route is not None
    characters, length = route.groups()

    assert int(length) == int(_server_constant("codeLength"))
    alphabet = _server_constant("codeAlphabet")
    assert re.fullmatch(f"[{characters}]+", alphabet)
    assert len(alphabet) == len(set(alphabet)) == 62


def test_the_preflight_runs_before_the_tunnel_is_configured() -> None:
    site = (INFRA / "playbooks" / "site.yml").read_text()

    assert site.index("- peal_preflight") < site.index("- cloudflared")

