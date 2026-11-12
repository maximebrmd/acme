# Images the server makes

Some Peal servers have an image model: the assistant then makes an image
from a description, straight into the workspace's media. Read
[SKILL.md](../SKILL.md) first: its rules about media and posts apply here
unchanged.

```sh
peal media generate --prompt "A paper catalogue open on a wooden table, morning light" --aspect landscape --json
```

- Make an image only when the user asked for one. Each call makes a new
  image and spends 5 of the workspace's daily assistant requests, given
  back only when the provider could not be reached; on the free plan none
  is made.
- The prompt, 1 to 1,000 characters, goes as it is to the image provider
  the server's operator chose: put nothing in it the user would not send
  there.
- `--aspect` is `square` (the default), `landscape` or `portrait`.
- The answer is the media, as `peal media show` prints it, with
  `aiGenerated` true and no description. Attach it by its `id` once its
  `status._tag` is `ready`, with `--alt` saying what it shows.
- Peal sets no platform's AI label for an agent. Before posting a file
  whose `aiGenerated` is true, set the label in the channel's options where
  the platform has one: YouTube `containsSyntheticMedia`, TikTok
  `aiGenerated`, X `madeWithAi`.
- A server without an image model refuses it in words: ask the user for a
  picture to upload or import instead. Past two images a workspace makes
  at once, it answers `MediaImportBusy`: try again in a moment.

Over HTTP, `POST /api/workspaces/{workspaceId}/assistant/images` takes
`{"prompt": "…", "aspect": "square"}` and answers 201 with the media; `GET
/api/workspaces/{workspaceId}/assistant` tells under `images` whether the
server makes images, their cost and the requests left today. The MCP tool
is `generate_image`. The writing assistant has no command and no tool:
write the post's text yourself.
