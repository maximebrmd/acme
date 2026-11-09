"""The platform release.yml builds images for (roles/acme_release): the
server's architecture, from its facts, unless the inventory names one."""

from __future__ import annotations

import pytest

from conftest import ansible_render, role_file, task


def _platform(architecture: str, **override: str) -> str:
    expression = task("acme_release", "Name the release")["ansible.builtin.set_fact"]["acme_release_platform"]
    return ansible_render(
        expression,
        ansible_facts={"architecture": architecture},
        **role_file("acme_release", "defaults"),
        **override,
    ).strip()


@pytest.mark.parametrize(("architecture", "platform"), [("x86_64", "linux/amd64"), ("aarch64", "linux/arm64")])
def test_images_are_built_for_the_server_architecture(architecture: str, platform: str) -> None:
    assert _platform(architecture) == platform


def test_the_inventory_may_name_another_platform() -> None:
    assert _platform("x86_64", acme_image_platform="linux/arm64") == "linux/arm64"


def test_each_platform_has_its_own_archive() -> None:
    """The archive is reused when it exists: one built for another
    platform must not be."""
    expression = task("acme_release", "Name the archive")["ansible.builtin.set_fact"]["acme_release_archive"]
    names = {
        "acme_release_local_dir": "/tmp/release",
        "acme_environment": "production",
        "acme_release_missing": ["server"],
        "acme_release_built": {"server": "acme-server:0123456789ab"},
    }

    assert ansible_render(expression, acme_release_platform="linux/amd64", **names) != ansible_render(
        expression, acme_release_platform="linux/arm64", **names
    )
