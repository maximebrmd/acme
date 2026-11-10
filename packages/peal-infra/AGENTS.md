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
