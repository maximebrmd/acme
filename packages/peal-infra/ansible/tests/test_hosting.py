"""Where each server is hosted (hosting_provider and hosting_location in
each group's settings): production's provider and city, placeholders for
the others until the owner chooses, which the preflight refuses, and an
uptime server that shares neither a provider nor a city with the servers
it watches, so one outage never takes both."""

from __future__ import annotations

import re
from typing import Any

import pytest
from ansible.template import trust_as_template

from conftest import ansible_render, role_file, settings, task

GROUPS = ["production", "sandbox", "uptime"]
WATCHED = ["production", "sandbox"]
NAMES = ["hosting_provider", "hosting_location"]


def _preflight_names(group: str) -> list[str]:
    """The settings the preflight searches for placeholders on a server of
    the group: the role's own list, unless the group names another."""
    return settings(group).get("peal_preflight_names", role_file("peal_preflight", "defaults")["peal_preflight_names"])


def _placeholder() -> re.Pattern[str]:
    found = task("peal_preflight", "Refuse an inventory that still holds placeholders")
    return re.compile(found["vars"]["peal_preflight_pattern"])


@pytest.mark.parametrize("group", GROUPS)
@pytest.mark.parametrize("name", NAMES)
def test_each_server_says_where_it_is_hosted(group: str, name: str) -> None:
    value = settings(group)[name]

    assert isinstance(value, str)
    assert value.strip()


@pytest.mark.parametrize("group", GROUPS)
@pytest.mark.parametrize("name", NAMES)
def test_the_preflight_reads_where_each_server_is_hosted(group: str, name: str) -> None:
    """Until a group names a provider and a city, its settings hold
    placeholders, and no playbook runs on its server."""
    assert name in _preflight_names(group)


@pytest.mark.parametrize("value", ["REPLACE-WITH-THE-PROVIDER-OF-PRODUCTION", "REPLACE-WITH-THE-CITY-OF-THE-UPTIME-SERVER"])
def test_the_preflight_refuses_a_hosting_placeholder(value: str) -> None:
    assert _placeholder().search(value)


@pytest.mark.parametrize("value", ["a-provider", "paris", "stockholm"])
def test_the_preflight_takes_a_provider_and_a_city(value: str) -> None:
    assert not _placeholder().search(value)


def test_production_is_hosted_at_its_provider_in_paris() -> None:
    production = settings("production")

    assert (production["hosting_provider"], production["hosting_location"]) == ("scaleway", "paris")


@pytest.mark.parametrize("name", NAMES)
def test_the_preflight_takes_where_production_is_hosted(name: str) -> None:
    assert not _placeholder().search(settings("production")[name])


@pytest.mark.parametrize("group", ["sandbox", "uptime"])
@pytest.mark.parametrize("name", NAMES)
def test_the_others_wait_for_the_owner_s_choice(group: str, name: str) -> None:
    assert _placeholder().search(settings(group)[name])


@pytest.mark.parametrize("watched", WATCHED)
@pytest.mark.parametrize("name", NAMES)
def test_the_uptime_server_is_hosted_apart_from_the_servers_it_watches(watched: str, name: str) -> None:
    """In the inventory as committed: another company, so another network,
    console and account, and another city, so another power supply."""
    assert _normal(settings("uptime")[name]) != _normal(settings(watched)[name])


def _normal(value: str) -> str:
    return value.strip().lower()


def _shared(uptime: dict[str, str], servers: dict[str, dict[str, str]]) -> list[str]:
    """What the uptime role finds its server to share with those it
    watches, as Ansible renders it."""
    found = task("uptime", "Refuse an uptime server hosted with a server it watches")
    names: dict[str, Any] = {
        # The task's own names, which Ansible renders when one reads another.
        **{name: trust_as_template(value) for name, value in found["vars"].items()},
        **uptime,
        "groups": {"servers": list(servers)},
        "hostvars": servers,
    }
    return ansible_render(found["vars"]["uptime_shared_hosting"], **names)


PRODUCTION = {"hosting_provider": "first-provider", "hosting_location": "paris"}
SANDBOX = {"hosting_provider": "first-provider", "hosting_location": "amsterdam"}
SERVERS = {"peal-production": PRODUCTION, "peal-sandbox": SANDBOX}


def test_the_uptime_role_takes_another_provider_in_another_city() -> None:
    assert _shared({"hosting_provider": "second-provider", "hosting_location": "stockholm"}, SERVERS) == []


@pytest.mark.parametrize("provider", ["first-provider", "First-Provider", " first-provider "])
def test_the_uptime_role_refuses_a_provider_it_shares(provider: str) -> None:
    shared = _shared({"hosting_provider": provider, "hosting_location": "stockholm"}, SERVERS)

    assert shared == ["hosting_provider of peal-production", "hosting_provider of peal-sandbox"]


@pytest.mark.parametrize("city", ["amsterdam", "Amsterdam"])
def test_the_uptime_role_refuses_a_city_it_shares(city: str) -> None:
    """Even at another provider: two companies' data centres in one city
    share its power and its upstream networks."""
    shared = _shared({"hosting_provider": "second-provider", "hosting_location": city}, SERVERS)

    assert shared == ["hosting_location of peal-sandbox"]


def test_the_uptime_role_s_check_is_an_assertion() -> None:
    found = task("uptime", "Refuse an uptime server hosted with a server it watches")

    assert found["ansible.builtin.assert"]["that"] == "uptime_shared_hosting | length == 0"


def test_the_uptime_role_refuses_servers_whose_hosting_is_not_chosen() -> None:
    """A placeholder differs from any provider, which would pass for
    another one."""
    servers = {
        "peal-production": {"hosting_provider": "REPLACE-WITH-THE-PROVIDER-OF-PRODUCTION", "hosting_location": "paris"},
    }
    shared = _shared({"hosting_provider": "second-provider", "hosting_location": "stockholm"}, servers)

    assert shared == ["hosting_provider of peal-production"]


def test_the_uptime_role_reads_a_provider_s_name_as_written() -> None:
    """Not as a pattern: a dot in a name matches a dot alone."""
    servers = {"peal-production": {"hosting_provider": "firstXprovider", "hosting_location": "paris"}}

    assert _shared({"hosting_provider": "first.provider", "hosting_location": "stockholm"}, servers) == []
