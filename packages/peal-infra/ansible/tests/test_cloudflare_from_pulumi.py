"""scripts/cloudflare_from_pulumi.py against synthetic stack outputs and a
vault of its own: what it writes, and what it never writes in clear."""

from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

import pytest
import yaml
from ansible.parsing.vault import VaultLib, VaultSecret
from conftest import INFRA

_spec = importlib.util.spec_from_file_location("cloudflare_from_pulumi", INFRA / "scripts" / "cloudflare_from_pulumi.py")
assert _spec is not None and _spec.loader is not None
script = importlib.util.module_from_spec(_spec)
sys.modules["cloudflare_from_pulumi"] = script
_spec.loader.exec_module(script)

PASSWORD = b"synthetic-vault-password"
ENDPOINT = "https://account-synthetic.eu.r2.example.test"

OUTPUTS = {
    "accessAud": {"app": "aud-app", "grafana": "aud-grafana", "ssh": "aud-ssh"},
    "r2Endpoint": ENDPOINT,
    "mediaBucket": "peal-sandbox-media",
    "backupBucket": "peal-sandbox-backups",
    "tunnelToken": "synthetic-tunnel-token",
    "mediaKey": {"accessKeyId": "media-id", "secretAccessKey": "media-secret-synthetic"},
    "backupKey": {"accessKeyId": "backup-id", "secretAccessKey": "backup-secret-synthetic"},
}


@pytest.fixture
def inventory(tmp_path: Path) -> Path:
    folder = tmp_path / "group_vars" / "sandbox"
    folder.mkdir(parents=True)
    secret = VaultSecret(PASSWORD)
    plain = {"cloudflared_tunnel_token": "old-token", "peal_credentials": {"RESEND_API_KEY": "kept-synthetic"}}
    (folder / "vault.yml").write_bytes(VaultLib([("default", secret)]).encrypt(yaml.safe_dump(plain).encode(), secret))
    (tmp_path / "password").write_bytes(PASSWORD + b"\n")
    return tmp_path


def run(inventory: Path, outputs: dict) -> int:
    args = ["--group", "sandbox", "--vault-password-file", str(inventory / "password"), "--inventory", str(inventory)]
    return script.main(args, outputs_of=lambda _group: outputs)


def vault_of(inventory: Path) -> dict:
    vault = VaultLib([("default", VaultSecret(PASSWORD))])
    return yaml.safe_load(vault.decrypt((inventory / "group_vars" / "sandbox" / "vault.yml").read_bytes()))


def test_the_inventory_takes_the_stack_s_public_values(inventory: Path) -> None:
    run(inventory, OUTPUTS)

    written = yaml.safe_load((inventory / "group_vars" / "sandbox" / "cloudflare.yml").read_text())
    assert written == {
        "cloudflare_access_aud": {"sandbox": "aud-app", "grafana": "aud-grafana", "ssh": "aud-ssh"},
        "peal_media_endpoint": ENDPOINT,
        "peal_media_bucket": "peal-sandbox-media",
        "peal_backup_endpoint": "account-synthetic.eu.r2.example.test",
        "peal_backup_bucket": "peal-sandbox-backups",
    }


def test_the_secrets_go_to_the_vault_alone_and_encrypted(inventory: Path, capsys: pytest.CaptureFixture[str]) -> None:
    run(inventory, OUTPUTS)

    vault = vault_of(inventory)
    assert vault["cloudflared_tunnel_token"] == "synthetic-tunnel-token"
    assert vault["peal_credentials"] == {
        "RESEND_API_KEY": "kept-synthetic",
        "PEAL_S3_ACCESS_KEY_ID": "media-id",
        "PEAL_S3_SECRET_ACCESS_KEY": "media-secret-synthetic",
        "PGBACKREST_REPO1_S3_KEY": "backup-id",
        "PGBACKREST_REPO1_S3_KEY_SECRET": "backup-secret-synthetic",
    }
    raw = (inventory / "group_vars" / "sandbox" / "vault.yml").read_text()
    assert raw.startswith("$ANSIBLE_VAULT")
    assert "synthetic-tunnel-token" not in raw
    printed = capsys.readouterr().out
    assert "peal_credentials.PEAL_S3_SECRET_ACCESS_KEY" in printed
    assert "media-secret-synthetic" not in printed
    assert "cloudflare.yml" not in str(raw)
    assert ((inventory / "group_vars" / "sandbox" / "vault.yml").stat().st_mode & 0o777) == 0o600


def test_a_second_run_changes_nothing_in_the_vault(inventory: Path, capsys: pytest.CaptureFixture[str]) -> None:
    run(inventory, OUTPUTS)
    before = (inventory / "group_vars" / "sandbox" / "vault.yml").read_bytes()
    capsys.readouterr()

    run(inventory, OUTPUTS)

    assert (inventory / "group_vars" / "sandbox" / "vault.yml").read_bytes() == before
    assert "nothing changed" in capsys.readouterr().out


def test_the_vault_waits_for_the_stack_s_keys(inventory: Path) -> None:
    without_keys = {key: value for key, value in OUTPUTS.items() if not key.endswith("Key")}

    run(inventory, without_keys)

    assert vault_of(inventory)["cloudflared_tunnel_token"] == "old-token"


def test_an_environment_no_stack_describes_is_refused(inventory: Path) -> None:
    with pytest.raises(SystemExit, match="production"):
        script.inventory_values("production", OUTPUTS)
