#!/usr/bin/env python3
"""Ansible's become password file on the owner's Mac: prints the sudo
password of a server's image account, kept in the login keychain under the
service PEAL_BECOME_KEYCHAIN_SERVICE names (README.md, "The image's
account"):

    PEAL_BECOME_KEYCHAIN_SERVICE=peal-production-install-password \\
      uv run ansible-playbook playbooks/bootstrap.yml --limit production \\
      -e ssh_via_tunnel=false --become-password-file scripts/become-keychain.py

Ansible runs the file, as it is executable, with no argument, and reads the
password from what it prints. The item is found by its service alone: its
account is the image's, which differs from one server to the next. macOS
asks the owner before the keychain answers. Nothing it writes to stderr,
which Ansible repeats, quotes the keychain's answer.
"""

from __future__ import annotations

import argparse
import os
import subprocess
import sys
from collections.abc import Callable

VARIABLE = "PEAL_BECOME_KEYCHAIN_SERVICE"

Run = Callable[..., subprocess.CompletedProcess[bytes]]


def main(argv: list[str] | None = None, run: Run = subprocess.run) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.parse_args(argv)

    service = os.environ.get(VARIABLE, "").strip()
    if not service:
        print(f"Set {VARIABLE} to the keychain service that holds the password.", file=sys.stderr)
        return 1

    found = run(
        ["security", "find-generic-password", "-s", service, "-w"],
        capture_output=True,
        stdin=subprocess.DEVNULL,
        check=False,
    )
    # `security` ends the password with a newline; anything else in it is
    # the password's own.
    password = found.stdout.removesuffix(b"\n")
    if found.returncode != 0 or not password:
        print(f'No keychain item "{service}", or the keychain was not allowed to give it.', file=sys.stderr)
        return 1
    sys.stdout.buffer.write(password + b"\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
