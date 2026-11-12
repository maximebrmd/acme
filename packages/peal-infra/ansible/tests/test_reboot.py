"""The reboot a kernel update needs (the system role): unattended-upgrades
installs the update and leaves /var/run/reboot-required, and peal-reboot,
at unattended_reboot_time, reboots unless an md array is degraded. A
mirror on one disk is held up: rebooting it is the riskiest moment for a
server whose disks cannot be replaced (runbooks/failed-disk.md). The script
runs here, rendered as Ansible renders it, on a made-up /sys/block, with a
stand-in for the reboot."""

from __future__ import annotations

import os
import subprocess
from pathlib import Path

import pytest
import yaml

from conftest import INFRA, render, role_file, settings, task

ROLE = INFRA / "roles" / "system"
SCRIPT = ROLE / "templates" / "peal-reboot.j2"


def _server(folder: Path, *, arrays: dict[str, str | None], pending: bool) -> dict[str, str]:
    """A made-up server: /sys/block with these md arrays (each one's
    `degraded` file, or none), a reboot pending or not, and a stand-in that
    records the reboot. Returns the role's paths for it."""
    sys_block = folder / "sys" / "block"
    (sys_block / "sda").mkdir(parents=True)
    for name, degraded in arrays.items():
        (sys_block / name / "md").mkdir(parents=True)
        if degraded is not None:
            (sys_block / name / "md" / "degraded").write_text(degraded)
    required = folder / "run" / "reboot-required"
    required.parent.mkdir()
    if pending:
        required.write_text("*** System restart required ***\n")
    reboot = folder / "reboot"
    reboot.write_text(f'#!/bin/sh\necho "$*" >> "{folder}/rebooted"\n')
    reboot.chmod(0o755)
    return {
        "system_sys_block": str(sys_block),
        "system_reboot_required_file": str(required),
        "system_reboot_command": str(reboot),
    }


def _run(folder: Path, paths: dict[str, str]) -> subprocess.CompletedProcess[str]:
    script = folder / "peal-reboot"
    script.write_text(render(SCRIPT.read_text(), **paths))
    return subprocess.run(
        ["sh", str(script)],
        check=False,
        capture_output=True,
        text=True,
        stdin=subprocess.DEVNULL,
        env={"PATH": os.environ["PATH"]},
    )


def _rebooted(folder: Path) -> bool:
    return (folder / "rebooted").exists()


def test_nothing_happens_without_a_pending_reboot(tmp_path: Path) -> None:
    ran = _run(tmp_path, _server(tmp_path, arrays={"md0": "1\n"}, pending=False))

    assert ran.returncode == 0, ran.stderr
    assert (ran.stdout, ran.stderr) == ("", "")
    assert not _rebooted(tmp_path)


@pytest.mark.parametrize(
    "arrays",
    [
        # A virtual machine, as the sandbox's.
        {},
        {"md0": "0\n", "md1": "0\n"},
        # A striped or linear array has no `degraded` file.
        {"md0": None},
    ],
)
def test_a_pending_reboot_happens_while_every_array_is_whole(tmp_path: Path, arrays: dict[str, str | None]) -> None:
    ran = _run(tmp_path, _server(tmp_path, arrays=arrays, pending=True))

    assert ran.returncode == 0, ran.stderr
    assert _rebooted(tmp_path)
    assert ran.stdout.startswith("peal-reboot: ")


def test_a_degraded_array_holds_the_reboot_with_a_line_in_the_journal(tmp_path: Path) -> None:
    """The reboot stays pending: the file is left, and the next night's run
    reboots once the array is whole again."""
    paths = _server(tmp_path, arrays={"md0": "0\n", "md1": "1\n"}, pending=True)

    ran = _run(tmp_path, paths)

    assert ran.returncode == 0, ran.stderr
    assert not _rebooted(tmp_path)
    assert ran.stdout.splitlines() == [
        "peal-reboot: a reboot is pending, held while md1 is degraded (runbooks/failed-disk.md)"
    ]
    assert Path(paths["system_reboot_required_file"]).exists()

    (Path(paths["system_sys_block"]) / "md1" / "md" / "degraded").write_text("0\n")
    _run(tmp_path, paths)

    assert _rebooted(tmp_path)


def test_the_role_s_paths_are_the_server_s() -> None:
    defaults = role_file("system", "defaults")

    assert defaults["system_sys_block"] == "/sys/block"
    # Where unattended-upgrades and the packages that need a reboot say so.
    assert defaults["system_reboot_required_file"] == "/var/run/reboot-required"
    assert defaults["system_reboot_command"] == "/usr/bin/systemctl reboot"


def test_unattended_upgrades_no_longer_reboots_by_itself() -> None:
    """It would hand `shutdown -r <time>` to systemd hours ahead, with no
    hook to look at the arrays when the time comes."""
    config = render((ROLE / "templates" / "52unattended-upgrades-local.j2").read_text(), unattended_reboot_time="03:30")

    assert 'Unattended-Upgrade::Automatic-Reboot "false";' in config
    assert "Automatic-Reboot-Time" not in config


def _unit(name: str, **names: str) -> dict[str, dict[str, str]]:
    sections: dict[str, dict[str, str]] = {}
    current: dict[str, str] = {}
    for line in render((ROLE / "templates" / f"{name}.j2").read_text(), **names).splitlines():
        if line.startswith("["):
            current = sections.setdefault(line.strip("[]"), {})
        elif "=" in line and not line.startswith("#"):
            key, value = line.split("=", 1)
            current[key] = value
    return sections


def test_the_service_runs_the_script_once() -> None:
    service = _unit("peal-reboot.service")["Service"]

    assert service["Type"] == "oneshot"
    assert service["ExecStart"] == "/usr/local/sbin/peal-reboot"


@pytest.mark.parametrize("group", ["production", "uptime"])
def test_the_timer_runs_at_each_server_s_reboot_time(group: str) -> None:
    """Each night: a reboot held one night is tried again the next. A night
    missed while the server was down is not made up at boot."""
    time = settings(group)["unattended_reboot_time"]

    timer = _unit("peal-reboot.timer", unattended_reboot_time=time)

    assert timer["Timer"] == {"OnCalendar": f"*-*-* {time}:00 UTC", "Persistent": "false"}
    assert timer["Install"] == {"WantedBy": "timers.target"}


def test_the_script_is_root_s() -> None:
    installed = task("system", "Install peal-reboot")["ansible.builtin.template"]

    assert installed["dest"] == "/usr/local/sbin/peal-reboot"
    assert (installed["owner"], installed["group"], installed["mode"]) == ("root", "root", "0750")


def test_the_role_writes_the_service_and_the_timer() -> None:
    written = task("system", "Write the reboot service and timer")

    assert written["ansible.builtin.template"]["dest"] == "/etc/systemd/system/{{ item }}"
    assert written["loop"] == ["peal-reboot.service", "peal-reboot.timer"]
    assert written["notify"] == "Reload systemd for the reboot units"


def test_the_timer_starts_at_boot_with_check_mode_s_guard() -> None:
    looked = task("system", "Look for the reboot timer")
    started = task("system", "Start the reboot timer at boot")

    assert looked["ansible.builtin.stat"]["path"] == "/etc/systemd/system/peal-reboot.timer"
    assert started["ansible.builtin.systemd_service"] == {"name": "peal-reboot.timer", "state": "started", "enabled": True}
    assert started["when"] == f"not ansible_check_mode or {looked['register']}.stat.exists"


def test_the_handler_reloads_systemd() -> None:
    handlers = yaml.safe_load((ROLE / "handlers" / "main.yml").read_text())
    [handler] = [found for found in handlers if found["name"] == "Reload systemd for the reboot units"]

    assert handler["ansible.builtin.systemd_service"] == {"daemon_reload": True}
