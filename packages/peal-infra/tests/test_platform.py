"""The platform release.yml builds images for (roles/peal_release): the
server's architecture, from its facts, unless the inventory names one."""

from __future__ import annotations

import pytest

from conftest import ansible_render, role_file, task


def _platform(architecture: str, **override: str) -> str:
    expression = task("peal_release", "Name the release")["ansible.builtin.set_fact"]["peal_release_platform"]
    return ansible_render(
        expression,
        ansible_facts={"architecture": architecture},
        **role_file("peal_release", "defaults"),
        **override,
    ).strip()


@pytest.mark.parametrize(("architecture", "platform"), [("x86_64", "linux/amd64"), ("aarch64", "linux/arm64")])
def test_images_are_built_for_the_server_architecture(architecture: str, platform: str) -> None:
    assert _platform(architecture) == platform


def test_the_inventory_may_name_another_platform() -> None:
    assert _platform("x86_64", peal_image_platform="linux/arm64") == "linux/arm64"


def test_each_platform_has_its_own_archive() -> None:
    """The archive is reused when it exists: one built for another
    platform must not be."""
    expression = task("peal_release", "Name the archive")["ansible.builtin.set_fact"]["peal_release_archive"]
    names = {
        "peal_release_local_dir": "/tmp/release",
        "peal_environment": "production",
        "peal_release_missing": ["server"],
        "peal_release_built": {"server": "peal-server:0123456789ab"},
    }

    assert ansible_render(expression, peal_release_platform="linux/amd64", **names) != ansible_render(
        expression, peal_release_platform="linux/arm64", **names
    )
