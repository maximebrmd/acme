#!/usr/bin/env python3
"""Ansible's vault password client on the owner's Mac: prints the password of
the vault Ansible names, kept in the login keychain as
`peal-ansible-vault-<vault id>` (README.md, "Credentials"):

    uv run ansible-playbook playbooks/site.yml --limit sandbox \\
      --vault-id sandbox@scripts/vault-keychain-client.py

Ansible calls it with `--vault-id <id>`, as its name ends in `-client`.
macOS asks the owner before the keychain answers. It exits with 2 when the
keychain has no such item, which Ansible reads as an unknown vault id.
"""

from __future__ import annotations

import argparse
import subprocess
import sys
from collections.abc import Callable

ACCOUNT = "peal"

Run = Callable[..., subprocess.CompletedProcess[bytes]]


def service_of(vault_id: str) -> str:
    return f"peal-ansible-vault-{vault_id}"


def main(argv: list[str] | None = None, run: Run = subprocess.run) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--vault-id", required=True)
    options = parser.parse_args(argv)

    service = service_of(options.vault_id)
    found = run(
        ["security", "find-generic-password", "-a", ACCOUNT, "-s", service, "-w"],
        capture_output=True,
        stdin=subprocess.DEVNULL,
        check=False,
    )
    if found.returncode != 0 or not found.stdout.strip():
        print(f'No keychain item "{service}", or the keychain was not allowed to give it.', file=sys.stderr)
        return 2
    sys.stdout.buffer.write(found.stdout.strip() + b"\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
