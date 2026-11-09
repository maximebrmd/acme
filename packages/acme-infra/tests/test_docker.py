"""Docker's packages (roles/docker): pinned exactly, installed and held at
those versions for the server's release of Ubuntu."""

from __future__ import annotations

import re

from conftest import ansible_render, role_file, task


def test_docker_packages_are_pinned_exactly() -> None:
    packages = role_file("docker", "defaults")["docker_packages"]

    assert set(packages) == {"docker-ce", "docker-ce-cli", "containerd.io", "docker-buildx-plugin", "docker-compose-plugin"}
    # Debian versions, without the release's suffix, which the role adds.
    assert all(re.fullmatch(r"(\d+:)?\d+\.\d+\.\d+-\d+", str(version)) for version in packages.values())
    assert packages["docker-ce"] == packages["docker-ce-cli"]


def test_docker_installs_and_holds_each_package_for_the_release() -> None:
    names = {
        "docker_packages": role_file("docker", "defaults")["docker_packages"],
        "docker_release_suffix": "~ubuntu.24.04~noble",
    }
    installed = ansible_render(task("docker", "Install Docker Engine and Compose")["ansible.builtin.apt"]["name"], **names)
    held = ansible_render(task("docker", "Hold Docker's packages at their versions")["ansible.builtin.copy"]["content"], **names)

    assert "docker-ce=5:29.9.3-1~ubuntu.24.04~noble" in installed
    for name, version in names["docker_packages"].items():
        assert f"{name}={version}~ubuntu.24.04~noble" in installed
        assert f"Package: {name}\nPin: version {version}~ubuntu.24.04~noble\nPin-Priority: 1001" in held
