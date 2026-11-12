"""scripts/become-keychain.py with a stand-in for macOS's `security`: which
keychain item it asks for, and what Ansible gets back as the become
password (`--become-password-file`)."""

from __future__ import annotations

import importlib.util
import os
import subprocess
import sys
from typing import Any

import pytest
from conftest import INFRA

SCRIPT = INFRA / "scripts" / "become-keychain.py"

_spec = importlib.util.spec_from_file_location("become_keychain", SCRIPT)
assert _spec is not None and _spec.loader is not None
client = importlib.util.module_from_spec(_spec)
sys.modules["become_keychain"] = client
_spec.loader.exec_module(client)

SERVICE = "peal-production-install-password"
PASSWORD = b"synthetic-install-password"


class Keychain:
    """Answers `security find-generic-password` from a dict, and keeps the
    commands it was given and the input each had."""

    def __init__(self, items: dict[str, bytes], *, refused: bool = False) -> None:
        self.items = items
        self.refused = refused
        self.commands: list[list[str]] = []
        self.stdins: list[object] = []

    def __call__(self, command: list[str], **options: Any) -> subprocess.CompletedProcess[bytes]:
        self.commands.append(command)
        self.stdins.append(options.get("stdin"))
        service = command[command.index("-s") + 1]
        if self.refused:
            # The owner pressed Deny.
            return subprocess.CompletedProcess(command, 128, b"", b"User interaction is not allowed.")
        if service not in self.items:
            return subprocess.CompletedProcess(command, 44, b"", b"The specified item could not be found in the keychain.")
        return subprocess.CompletedProcess(command, 0, self.items[service] + b"\n", b"")


@pytest.fixture
def service(monkeypatch: pytest.MonkeyPatch) -> str:
    monkeypatch.setenv("PEAL_BECOME_KEYCHAIN_SERVICE", SERVICE)
    return SERVICE


def test_it_asks_for_the_service_the_variable_names_and_no_account(service: str) -> None:
    """The item's account is the server's image account, which differs from
    one server to the next: the service alone names the item."""
    keychain = Keychain({service: PASSWORD})

    assert client.main([], run=keychain) == 0

    assert keychain.commands == [["security", "find-generic-password", "-s", service, "-w"]]
    assert "-a" not in keychain.commands[0]


def test_the_keychain_reads_no_input(service: str) -> None:
    keychain = Keychain({service: PASSWORD})

    client.main([], run=keychain)

    assert keychain.stdins == [subprocess.DEVNULL]


def test_it_prints_what_the_keychain_gave(service: str, capsysbinary: pytest.CaptureFixture[bytes]) -> None:
    assert client.main([], run=Keychain({service: PASSWORD})) == 0

    assert capsysbinary.readouterr() == (PASSWORD + b"\n", b"")


def test_it_keeps_a_password_s_own_spaces(service: str, capsysbinary: pytest.CaptureFixture[bytes]) -> None:
    """Only the newline `security` adds goes; sudo would refuse a password
    trimmed of the rest."""
    assert client.main([], run=Keychain({service: b" synthetic password "})) == 0

    assert capsysbinary.readouterr().out == b" synthetic password \n"


@pytest.mark.parametrize("value", [None, "", "  "])
def test_it_fails_without_the_variable(
    value: str | None, monkeypatch: pytest.MonkeyPatch, capsysbinary: pytest.CaptureFixture[bytes]
) -> None:
    if value is None:
        monkeypatch.delenv("PEAL_BECOME_KEYCHAIN_SERVICE", raising=False)
    else:
        monkeypatch.setenv("PEAL_BECOME_KEYCHAIN_SERVICE", value)
    keychain = Keychain({SERVICE: PASSWORD})

    assert client.main([], run=keychain) != 0

    printed = capsysbinary.readouterr()
    assert printed.out == b""
    assert b"PEAL_BECOME_KEYCHAIN_SERVICE" in printed.err
    assert len(printed.err.splitlines()) == 1
    assert keychain.commands == []


@pytest.mark.parametrize("refused", [False, True])
def test_it_fails_quoting_nothing_when_the_keychain_gives_nothing(
    refused: bool, monkeypatch: pytest.MonkeyPatch, capsysbinary: pytest.CaptureFixture[bytes]
) -> None:
    """A missing item, or one the owner did not allow: one line naming the
    service, and none of what the keychain holds or said."""
    monkeypatch.setenv("PEAL_BECOME_KEYCHAIN_SERVICE", "peal-sandbox-install-password")
    keychain = Keychain({SERVICE: PASSWORD}, refused=refused)

    assert client.main([], run=keychain) != 0

    printed = capsysbinary.readouterr()
    assert printed.out == b""
    assert b"peal-sandbox-install-password" in printed.err
    assert PASSWORD not in printed.err
    assert b"keychain." not in printed.err
    assert len(printed.err.splitlines()) == 1


def test_an_empty_item_is_no_password(service: str, capsysbinary: pytest.CaptureFixture[bytes]) -> None:
    assert client.main([], run=Keychain({service: b""})) != 0

    assert capsysbinary.readouterr().out == b""


def test_it_takes_no_argument(service: str) -> None:
    """Ansible runs the file with none."""
    with pytest.raises(SystemExit):
        client.main(["--vault-id", "production"], run=Keychain({service: PASSWORD}))


def test_ansible_runs_it() -> None:
    """Ansible reads a file it cannot execute as the password itself."""
    assert os.access(SCRIPT, os.X_OK)
    assert SCRIPT.read_text().startswith("#!/usr/bin/env python3\n")


def test_git_keeps_it_executable() -> None:
    staged = subprocess.run(
        ["git", "ls-files", "--stage", str(SCRIPT)],
        cwd=INFRA,
        capture_output=True,
        text=True,
        check=True,
        stdin=subprocess.DEVNULL,
    ).stdout

    assert staged.startswith("100755 ")
