"""Units a server's image runs that nothing here needs (system_masked_units),
which the system role stops and masks: which ones it finds, what it does to
them, and which each server names."""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path
from typing import Any

import pytest
import yaml

from conftest import INFRA, ansible_render, role_file, settings, task

FIND = "Find the units to mask that the server has"
MASK = "Mask the units the server does not need"
SUFFIXES = (".service", ".socket", ".timer", ".path")
UNIT_FOLDERS = ["/usr/lib/systemd/system", "/etc/systemd/system"]

TASK_NAMES = [found["name"] for found in yaml.safe_load((INFRA / "roles" / "system" / "tasks" / "main.yml").read_text())]

# What the find task registers on a server: units as their packages
# installed them, one masked already (its link to /dev/null in /etc beside
# its own file), and a socket.
FOUND = {
    "files": [
        {"path": "/usr/lib/systemd/system/named.service"},
        {"path": "/usr/lib/systemd/system/fwupd.service"},
        {"path": "/usr/lib/systemd/system/multipathd.socket"},
        {"path": "/etc/systemd/system/multipathd.socket"},
    ]
}


def _found(masked_units: list[str], found: dict[str, Any] = FOUND) -> list[str]:
    """The units the masking task loops over, as Ansible renders them."""
    return ansible_render(task("system", MASK)["loop"], system_units_found=found, system_masked_units=masked_units)


def test_a_server_masks_nothing_unless_its_group_says() -> None:
    assert role_file("system", "defaults")["system_masked_units"] == []


@pytest.mark.parametrize("group", ["sandbox", "uptime"])
def test_the_sandbox_and_the_uptime_server_keep_their_units(group: str) -> None:
    assert "system_masked_units" not in settings(group)


def test_production_masks_the_name_server_on_its_public_address() -> None:
    assert "named.service" in settings("production")["system_masked_units"]


def test_every_unit_production_names_has_its_suffix() -> None:
    units = settings("production")["system_masked_units"]

    assert units
    assert all(unit.endswith(SUFFIXES) for unit in units), units
    assert len(set(units)) == len(units)


def test_it_looks_for_the_units_named_where_systemd_reads_them() -> None:
    finding = task("system", FIND)["ansible.builtin.find"]

    assert finding["paths"] == "{{ system_unit_folders }}"
    assert role_file("system", "defaults")["system_unit_folders"] == UNIT_FOLDERS
    assert finding["patterns"] == "{{ system_masked_units }}"
    # A mask is a link: the unit's own file may be one too.
    assert finding["file_type"] == "any"
    assert task("system", FIND)["register"] == "system_units_found"


def test_the_search_changes_nothing_and_runs_in_check_mode() -> None:
    """find reads, and Ansible runs it in check mode as it is."""
    finding = task("system", FIND)

    assert "check_mode" not in finding
    assert "changed_when" not in finding


@pytest.mark.parametrize(("units", "runs"), [([], False), (["named.service"], True)])
def test_the_search_is_skipped_for_no_unit(units: list[str], runs: bool) -> None:
    condition = task("system", FIND)["when"]

    assert ansible_render("{{ " + condition + " }}", system_masked_units=units) is runs


def test_it_masks_the_units_the_server_has_not_those_it_lacks() -> None:
    """A unit the server does not have is skipped: masking it would leave
    a link to /dev/null for a unit nothing installs."""
    named = ["named.service", "apport-forward.socket", "fwupd.service", "multipathd.socket"]

    assert _found(named) == ["named.service", "fwupd.service", "multipathd.socket"]


def test_it_masks_nothing_the_setting_does_not_name() -> None:
    assert _found(["named.service"]) == ["named.service"]


def test_it_loops_over_nothing_when_the_listing_was_skipped() -> None:
    assert _found([], {"skipped": True, "changed": False}) == []


def test_each_unit_is_masked_and_stopped() -> None:
    """Masked, a unit cannot start, by hand, at boot or when something asks
    for it; a second run finds it masked and stopped, and changes nothing."""
    assert task("system", MASK)["ansible.builtin.systemd_service"] == {
        "name": "{{ item }}",
        "masked": True,
        "state": "stopped",
    }


def test_the_units_go_after_the_packages_and_before_the_swap() -> None:
    finding = TASK_NAMES.index(FIND)

    assert TASK_NAMES.index("Install base packages") < finding
    assert finding + 1 == TASK_NAMES.index(MASK)
    assert TASK_NAMES.index(MASK) < TASK_NAMES.index("Create the swap file")


def test_a_run_finds_the_units_the_server_has_masked_or_not(tmp_path: Path) -> None:
    """Ansible's own find, on folders laid out as systemd's: a package's
    unit, a unit masked already, a link a package made, and units of other
    names."""
    packages, administrator = tmp_path / "lib", tmp_path / "etc"
    packages.mkdir()
    administrator.mkdir()
    (packages / "named.service").write_text("[Unit]\n")
    (packages / "multipathd.socket").write_text("[Unit]\n")
    (administrator / "multipathd.socket").symlink_to("/dev/null")
    (packages / "udisks2.service").write_text("[Unit]\n")
    (packages / "fwupd-refresh.timer").symlink_to(packages / "udisks2.service")
    (packages / "named.service.d").mkdir()
    out = tmp_path / "loop.json"
    mask = task("system", MASK)
    play = {
        "name": "Find the units",
        "hosts": "localhost",
        "gather_facts": False,
        "connection": "local",
        "vars": {
            "ansible_python_interpreter": "{{ ansible_playbook_python }}",
            "system_unit_folders": [str(packages), str(administrator)],
            "system_masked_units": ["named.service", "ModemManager.service", "multipathd.socket", "fwupd-refresh.timer"],
        },
        "tasks": [
            task("system", FIND),
            {
                "name": "Keep what the masking task would loop over",
                "vars": {"loop_items": mask["loop"]},
                "ansible.builtin.copy": {"content": "{{ loop_items | to_json }}", "dest": str(out), "mode": "0600"},
            },
        ],
    }
    playbook = tmp_path / "find.yml"
    playbook.write_text(yaml.safe_dump([play], sort_keys=False))

    ran = subprocess.run(
        [str(Path(sys.executable).parent / "ansible-playbook"), "--inventory", "localhost,", str(playbook)],
        cwd=INFRA,
        capture_output=True,
        text=True,
        check=False,
        stdin=subprocess.DEVNULL,
    )

    assert ran.returncode == 0, ran.stdout + ran.stderr
    assert json.loads(out.read_text()) == ["named.service", "multipathd.socket", "fwupd-refresh.timer"]
