"""The swap file the system role makes, run as written in a container of
its own, at the path swap_file names."""

from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path

import pytest
import yaml

from conftest import INFRA, render, settings, task

# The swap script uses fallocate and mkswap, which BusyBox has.
BUSYBOX = "busybox:1.38.0-musl@sha256:80e38f9a1b39188b8bdb28879178edb322a4402b081a9aedda1924609decd6f6"


def _docker_runs() -> bool:
    return (
        shutil.which("docker") is not None
        and subprocess.run(["docker", "info"], capture_output=True, check=False).returncode == 0
    )


def _swap(size_mb: int, before: str = "", swap_file: str = "/swapfile") -> subprocess.CompletedProcess[str]:
    """Runs the role's swap script in a container of its own, after
    `before`, then shows what is left at /swap* and at the file itself."""
    script = render(
        task("system", "Create the swap file")["ansible.builtin.shell"], swap_size_mb=size_mb, swap_file=swap_file
    )
    after = (
        f"ls /swap* 2>/dev/null; stat -c '%a %s' {swap_file} 2>/dev/null;"
        f" grep -q SWAPSPACE2 {swap_file} 2>/dev/null && echo signed"
    )
    return subprocess.run(
        ["docker", "run", "--rm", "--network", "none", BUSYBOX, "sh", "-c",
         f"{before}\n( {script} ); echo \"rc=$?\"; {after}"],
        capture_output=True,
        text=True,
        check=False,
    )


@pytest.mark.skipif(not _docker_runs(), reason="Docker is not running")
class TestSwap:
    def test_it_makes_a_swap_area_only_root_reads(self) -> None:
        shown = _swap(1).stdout

        assert "rc=0" in shown
        assert "/swapfile.new" not in shown
        assert "600 1048576" in shown
        # mkswap's signature.
        assert "signed" in shown

    def test_a_run_cut_short_leaves_no_swap_file(self) -> None:
        """fallocate refuses a size of 0, as it would a full disk: /swapfile
        must not exist after, or `creates` would skip it for good."""
        shown = _swap(0).stdout

        assert "rc=0" not in shown
        assert "/swapfile\n" not in shown

    def test_it_replaces_what_a_run_cut_short_left(self) -> None:
        shown = _swap(1, before="echo partial > /swapfile.new").stdout

        assert "rc=0" in shown
        assert "/swapfile.new" not in shown
        assert "600 1048576" in shown

    def test_it_makes_the_file_swap_file_names(self) -> None:
        """An image's own file, such as /swap.img, is the one made and none
        beside it."""
        shown = _swap(1, swap_file="/swap.img").stdout

        assert "rc=0" in shown
        assert "/swap.img\n" in shown
        assert "/swap.img.new" not in shown
        assert "/swapfile" not in shown
        assert "600 1048576" in shown
        assert "signed" in shown


SWAP_TASKS = ["Create the swap file", "Read the active swap", "Turn the swap on", "Mount the swap at boot"]


@pytest.mark.parametrize("group", ["sandbox", "uptime"])
def test_a_server_gets_swapfile_unless_its_group_names_another(group: str) -> None:
    assert settings(group)["swap_file"] == "/swapfile"


def test_no_swap_task_names_a_file_of_its_own() -> None:
    for name in SWAP_TASKS:
        assert "/swapfile" not in yaml.safe_dump(task("system", name)), name


def test_the_swap_file_is_made_once_and_mounted_where_swap_file_says() -> None:
    assert task("system", "Create the swap file")["args"]["creates"] == "{{ swap_file }}"
    assert task("system", "Mount the swap at boot")["ansible.posix.mount"]["src"] == "{{ swap_file }}"


def test_the_swap_is_turned_on_unless_swap_file_is_active() -> None:
    turn_on = task("system", "Turn the swap on")

    assert turn_on["ansible.builtin.command"] == "swapon {{ swap_file }}"
    assert turn_on["when"] == "swap_file not in system_swap_active.stdout_lines"


def test_the_installer_s_swap_line_is_left_as_it_is(tmp_path: Path) -> None:
    """The fstab line an installer wrote for its own file is the one the
    role declares: the mount task finds it by its file and changes
    nothing."""
    line = "/swap.img\tnone\tswap\tsw\t0\t0\n"
    fstab = tmp_path / "fstab"
    fstab.write_text("UUID=0000 / ext4 defaults 0 1\n" + line)
    mount = dict(task("system", "Mount the swap at boot")["ansible.posix.mount"], fstab=str(fstab))
    play = {
        "name": "Mount the swap",
        "hosts": "localhost",
        "gather_facts": False,
        "connection": "local",
        "vars": {"ansible_python_interpreter": "{{ ansible_playbook_python }}", "swap_file": "/swap.img"},
        "tasks": [{"name": "Mount the swap at boot", "ansible.posix.mount": mount}],
    }
    playbook = tmp_path / "mount.yml"
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
    assert "changed=0" in ran.stdout
    assert fstab.read_text().endswith(line)


def test_the_clock_is_kept_by_chrony() -> None:
    """Ubuntu's supported time daemon, in main, which the security updates
    cover; installing it replaces whichever an image ran."""
    packages = task("system", "Install base packages")

    assert "chrony" in packages["ansible.builtin.apt"]["name"]
    assert packages["register"] == "system_base_packages"


def test_chrony_runs_from_boot_once_installed() -> None:
    """In check mode on a new server the package is not installed yet, and
    its unit waits for it."""
    clock = task("system", "Keep the clock in step")

    assert clock["ansible.builtin.systemd_service"] == {"name": "chrony.service", "enabled": True, "state": "started"}
    assert clock["when"] == "not (ansible_check_mode and system_base_packages is changed)"


def test_production_reuses_the_installer_s_swap_file() -> None:
    production = settings("production")

    assert production["swap_file"] == "/swap.img"
    assert production["swap_size_mb"] == 8192
