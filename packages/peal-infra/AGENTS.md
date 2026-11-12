# Infrastructure

Peal's own infrastructure: one Nx project per tool, in a folder of its own
here, each with its own guide. Read the guide of the project a change
touches:

- [`pulumi/AGENTS.md`](pulumi/AGENTS.md): what Peal keeps at Cloudflare,
  as code.
- [`ansible/AGENTS.md`](ansible/AGENTS.md): the servers, configured and
  released with Ansible.

A new tool gets a folder and an Nx project of its own (`peal-infra-<tool>`),
not a subfolder of another tool's project.

Secrets stay on the server that generated them (the root `AGENTS.md`), with
one exception: in a planned move from one of Peal's servers to its
replacement, `/srv/peal/secrets.env` goes from the old server to the new
one, as the restore runbook's "A planned move" says
([`ansible/runbooks/restore-database.md`](ansible/runbooks/restore-database.md#a-planned-move)):
a pipe between two SSH sessions, written on the new server as root with
mode 600, never shown or passed through GitHub, a file on another machine
or a chat, and deleted from the old server once the copy is checked.
Nothing else is ever carried.
