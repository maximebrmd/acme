"""scripts/vault-keychain-client.py with a stand-in for macOS's `security`:
which keychain item it asks for, and what Ansible gets back."""

from __future__ import annotations

import importlib.util
import subprocess
import sys
from typing import Any

import pytest
from conftest import INFRA

_spec = importlib.util.spec_from_file_location("vault_keychain_client", INFRA / "scripts" / "vault-keychain-client.py")
assert _spec is not None and _spec.loader is not None
client = importlib.util.module_from_spec(_spec)
sys.modules["vault_keychain_client"] = client
_spec.loader.exec_module(client)


class Keychain:
    """Answers `security find-generic-password` from a dict, and keeps the
    commands it was given."""

    def __init__(self, items: dict[str, bytes]) -> None:
        self.items = items
        self.commands: list[list[str]] = []

    def __call__(self, command: list[str], **_options: Any) -> subprocess.CompletedProcess[bytes]:
        self.commands.append(command)
        service = command[command.index("-s") + 1]
        if service not in self.items:
            return subprocess.CompletedProcess(command, 44, b"", b"not found")
        return subprocess.CompletedProcess(command, 0, self.items[service] + b"\n", b"")


def test_it_prints_the_password_of_the_vault_ansible_names(capsysbinary: pytest.CaptureFixture[bytes]) -> None:
    keychain = Keychain({"peal-ansible-vault-sandbox": b"synthetic-sandbox-password"})

    assert client.main(["--vault-id", "sandbox"], run=keychain) == 0

    assert capsysbinary.readouterr().out == b"synthetic-sandbox-password\n"
    assert keychain.commands == [
        ["security", "find-generic-password", "-a", "peal", "-s", "peal-ansible-vault-sandbox", "-w"]
    ]


def test_an_unknown_vault_is_exit_code_2_with_no_password(capsysbinary: pytest.CaptureFixture[bytes]) -> None:
    keychain = Keychain({"peal-ansible-vault-sandbox": b"synthetic-sandbox-password"})

    assert client.main(["--vault-id", "production"], run=keychain) == 2

    printed = capsysbinary.readouterr()
    assert printed.out == b""
    assert b"peal-ansible-vault-production" in printed.err
    assert b"synthetic-sandbox-password" not in printed.err


def test_ansible_can_run_it() -> None:
    script = INFRA / "scripts" / "vault-keychain-client.py"

    assert script.stat().st_mode & 0o111
    assert script.read_text().startswith("#!/usr/bin/env python3\n")
