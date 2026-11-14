"""Private hosts: Peal's own servers never set PEAL_OUTBOUND_ALLOWED_HOSTS,
which would let members reach hosts inside Peal's network."""

from __future__ import annotations

from typing import Any

import pytest

from conftest import ansible_render, settings, task


def _refused(**names: Any) -> list[str]:
    found = task("peal_preflight", "Refuse private hosts members could reach")
    names = {"peal_settings": {}, **found["vars"], **names}
    return ansible_render(found["vars"]["peal_preflight_private_hosts"], **names)


def test_the_preflight_takes_settings_without_private_hosts() -> None:
    assert _refused(peal_settings={"PEAL_ADS": "read"}) == []


@pytest.mark.parametrize("hosts", ["", "blog.lan"])
def test_the_preflight_refuses_private_hosts(hosts: str) -> None:
    assert _refused(peal_settings={"PEAL_OUTBOUND_ALLOWED_HOSTS": hosts}) == [
        "peal_settings.PEAL_OUTBOUND_ALLOWED_HOSTS"
    ]


@pytest.mark.parametrize("group", ["production", "sandbox"])
def test_the_inventory_sets_none(group: str) -> None:
    assert "PEAL_OUTBOUND_ALLOWED_HOSTS" not in (settings(group).get("peal_settings") or {})
