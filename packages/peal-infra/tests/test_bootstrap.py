"""How a new server is first reached (playbooks/bootstrap.yml), as its
image allows: as root, or as the account the image comes with, which uses
sudo; and what becomes of that account once the admin user works (the ssh
role, which site.yml and uptime.yml run as the admin user)."""

from __future__ import annotations

import re
from typing import Any

import pytest
import yaml

from conftest import INFRA, ansible_render, role_file, settings

GROUPS = ["production", "sandbox", "uptime"]

(BOOTSTRAP,) = yaml.safe_load((INFRA / "playbooks" / "bootstrap.yml").read_text())
SSH_TASKS: list[dict[str, Any]] = yaml.safe_load((INFRA / "roles" / "ssh" / "tasks" / "main.yml").read_text())
SSH_NAMES = [found["name"] for found in SSH_TASKS]


def _ssh_task(name: str) -> dict[str, Any]:
    return SSH_TASKS[SSH_NAMES.index(name)]


def _leaving(bootstrap_user: str) -> list[str]:
    """The accounts the ssh role removes, as Ansible renders them."""
    return ansible_render(role_file("ssh", "vars")["ssh_image_users"], bootstrap_user=bootstrap_user, admin_user="ops")


@pytest.mark.parametrize("group", GROUPS)
def test_images_log_in_as_root_unless_the_inventory_says(group: str) -> None:
    assert settings(group)["bootstrap_user"] == "root"


def test_the_bootstrap_logs_in_as_the_image_s_account() -> None:
    """Above the inventory's ansible_user, the admin user, which does not
    exist yet."""
    assert BOOTSTRAP["vars"]["ansible_user"] == "{{ bootstrap_user }}"


def test_root_needs_no_sudo() -> None:
    assert ansible_render(BOOTSTRAP["become"], ansible_user="root") is False


@pytest.mark.parametrize("user", ["ubuntu", "debian", "admin"])
def test_an_image_s_own_account_uses_sudo(user: str) -> None:
    assert ansible_render(BOOTSTRAP["become"], ansible_user=user) is True


def test_root_stays() -> None:
    """Its logins over SSH are turned off, not the account."""
    assert _leaving("root") == []


def test_the_admin_user_stays() -> None:
    assert _leaving("ops") == []


@pytest.mark.parametrize("user", ["ubuntu", "debian"])
def test_the_image_s_own_account_leaves(user: str) -> None:
    assert _leaving(user) == [user]


def test_it_leaves_once_the_admin_user_works() -> None:
    """The ssh role runs as the admin user, with sudo: by then both work.
    The account goes after the admin user's keys and sudo rule are
    confirmed, and before sshd's settings."""
    removal = SSH_NAMES.index("Remove the account the image came with")

    assert removal > SSH_NAMES.index("Authorize the admin keys")
    assert removal > SSH_NAMES.index("Let the admin user use sudo without a password")
    assert removal < SSH_NAMES.index("Allow key-only logins for the admin user")


def test_the_account_goes_with_its_files_and_its_sudo_rule() -> None:
    removal = _ssh_task("Remove the account the image came with")
    rule = _ssh_task("Remove the sudo rule of the account the image came with")

    assert removal["loop"] == "{{ ssh_image_users }}"
    assert removal["ansible.builtin.user"] == {"name": "{{ item }}", "state": "absent", "remove": True, "force": True}
    assert rule["loop"] == "{{ ssh_image_users }}"
    assert rule["ansible.builtin.lineinfile"]["path"] == "/etc/sudoers.d/90-cloud-init-users"
    assert rule["ansible.builtin.lineinfile"]["state"] == "absent"
    assert rule["ansible.builtin.lineinfile"]["validate"] == "/usr/sbin/visudo -cf %s"


# What cloud-init writes for the account it creates on first boot.
SUDOERS = """# Created by cloud-init on first boot

# User rules for ubuntu
ubuntu ALL=(ALL) NOPASSWD:ALL
ubuntu-backup ALL=(ALL) NOPASSWD:ALL
"""


def test_the_sudo_rule_removed_is_that_account_s_alone() -> None:
    rule = _ssh_task("Remove the sudo rule of the account the image came with")
    pattern = re.compile(ansible_render(rule["ansible.builtin.lineinfile"]["regexp"], item="ubuntu"))

    assert [line for line in SUDOERS.splitlines() if pattern.search(line)] == ["ubuntu ALL=(ALL) NOPASSWD:ALL"]


def test_an_account_s_name_is_read_as_written() -> None:
    rule = _ssh_task("Remove the sudo rule of the account the image came with")
    pattern = re.compile(ansible_render(rule["ansible.builtin.lineinfile"]["regexp"], item="cloud.user"))

    assert pattern.search("cloud.user ALL=(ALL) NOPASSWD:ALL")
    assert not pattern.search("cloudXuser ALL=(ALL) NOPASSWD:ALL")
