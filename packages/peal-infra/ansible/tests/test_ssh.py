"""sshd's drop-in: who it lets in."""

from __future__ import annotations

from conftest import INFRA, ansible_render, role_file

TEMPLATE = (INFRA / "roles" / "ssh" / "templates" / "sshd.conf.j2").read_text()


def test_only_the_admin_user_logs_in_by_default() -> None:
    sshd = ansible_render(TEMPLATE, admin_user="ops", **role_file("ssh", "defaults"))

    assert "AllowUsers ops\n" in sshd


def test_a_vm_keeps_its_manager_s_account_beside_the_admin_user() -> None:
    settings = {**role_file("ssh", "defaults"), "ssh_allow_users_extra": ["peal-sandbox"]}

    sshd = ansible_render(TEMPLATE, admin_user="ops", **settings)

    assert "AllowUsers ops peal-sandbox\n" in sshd
