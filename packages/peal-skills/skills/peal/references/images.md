# Images the server makes, and the library's files

Some workspaces bring their own image provider, and some Peal servers have
an image model: the assistant then makes an image from a description,
straight into the workspace's media. Read [SKILL.md](../SKILL.md) first:
its rules about media and posts apply here unchanged.

```sh
peal media generate --prompt "A paper catalogue open on a wooden table, morning light" --aspect landscape --json
```

- Make an image only when the user asked for one. Each call makes a new
  image. `GET /api/workspaces/{workspaceId}/assistant` says who makes it
  (`images.source`): `workspace`, the provider the workspace set, which
  costs none of the day's assistant requests on any plan; `server`, the
  operator's model, which spends 5 of them, given back when no image came
  of it (a timeout or an unusable answer counts), and makes none on the
  free plan or during a trial.
- The prompt, 1 to 1,000 characters, goes as it is to that provider: put
  nothing in it the user would not send there.
- `--aspect` is `square` (the default), `landscape` or `portrait`.
- The answer is the media, as `peal media show` prints it, with
  `aiGenerated` true and no description. Attach it by its `id` once its
  `status._tag` is `ready`, with `--alt` saying what it shows.
- Peal sets no platform's AI label for an agent. Before posting a file
  whose `aiGenerated` is true, set the label in the channel's options where
  the platform has one: YouTube `containsSyntheticMedia`, TikTok
  `aiGenerated`, X `madeWithAi`.
- With neither provider it is refused in words: ask the user for a picture
  to upload or import instead. `image_provider_refused` means the
  workspace's own provider refused its settings: an owner or an admin
  fixes them (`peal assistant image-provider`); Peal's model is never used
  instead. Never ask the user for a provider's key: they set it themselves.
  Past two images a workspace makes at once, it answers
  `MediaImportBusy`: try again in a moment.

Over HTTP, `POST /api/workspaces/{workspaceId}/assistant/images` takes
`{"prompt": "…", "aspect": "square"}` and answers 201 with the media. The
MCP tool is `generate_image`. The writing assistant has no command and no
tool: write the post's text yourself.

## Describe or delete a file

```sh
peal media describe <media-id> --text "The spring catalogue's cover" --json
peal media delete <media-id> --yes --json
```

- A description is what the file shows, for people who cannot see it;
  posts that already attached the file keep theirs. `--clear` removes it.
- Delete a file only when the user asked for that file: it is gone for
  good, drafts that show it lose it, and one a scheduled post shows is
  refused. Without a terminal or with `--json`, `--yes` says the user
  agreed. The MCP tools are `get_media`, `get_media_usage`,
  `describe_media` and `delete_media`.
