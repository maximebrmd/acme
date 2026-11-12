import { Console, Effect, Option, Redacted } from "effect";
import { Command, Flag } from "effect/cli";
import {
  ImageProviderSchema,
  ImageProviderSettingSchema,
  maxImageProviderModelLength,
} from "peal-contract";
import type { ImageProvider } from "peal-contract";

import { confirmed, neverAsksInJson, yesFlagName } from "#confirm.ts";
import { explain } from "#explain.ts";
import { jsonFlag, printJson, printNothing } from "#json.ts";
import { instant } from "#print.ts";
import { readSecret } from "#secret-input.ts";
import { inWorkspace, workspaceFlag } from "#workspace.ts";

// The provider as the user reads it: never its key, which the server does
// not send.
const lines = (provider: ImageProvider) => [
  `  Address: ${provider.baseUrl}`,
  `  Model:   ${provider.model}`,
  `  Key:     ${provider.keyUnreadable ? "saved, but it can no longer be read: give it again with set" : "saved (never shown)"}`,
  `  Saved:   ${instant(provider.updatedAt)}`,
];

const show = Command.make(
  "show",
  { json: jsonFlag, workspace: workspaceFlag },
  Effect.fn("assistant.imageProvider.show")(function* show(input) {
    const { client, url, workspace } = yield* inWorkspace(input.workspace);

    const setting = yield* client.assistant
      .imageProvider({ params: { workspaceId: workspace.id } })
      .pipe(Effect.mapError(explain(url)));

    if (input.json) {
      yield* printJson(ImageProviderSettingSchema, setting);

      return;
    }

    if (setting.provider === null) {
      yield* Console.log(
        `${workspace.name} has no image provider of its own: images are made by the server's image model, if it has one.`
      );

      return;
    }

    yield* Console.log(`The image provider of ${workspace.name}:`);

    for (const line of lines(setting.provider)) {
      yield* Console.log(line);
    }
  })
).pipe(
  Command.withDescription(
    "Show the workspace's own image provider: its address and its model, never its key. Needs assistant:configure."
  )
);

const set = Command.make(
  "set",
  {
    baseUrl: Flag.String("base-url").pipe(
      Flag.withMetavar("<url>"),
      Flag.withDescription(
        "The API's base address, which /images/generations follows, such as https://images.example.com/v1: HTTPS on the default port, on a public host."
      )
    ),
    json: jsonFlag,
    keepKey: Flag.Boolean("keep-key").pipe(
      Flag.withDescription(
        "Keep the key already saved, which works while --base-url stays on the same origin: nothing is read for it."
      ),
      Flag.withDefault(false)
    ),
    model: Flag.String("model").pipe(
      Flag.withMetavar("<model>"),
      Flag.withDescription(
        `Your provider's model, as its documentation names it, one line of 1 to ${String(maxImageProviderModelLength)} characters.`
      )
    ),
    workspace: workspaceFlag,
  },
  Effect.fn("assistant.imageProvider.set")(function* set(input) {
    const { client, url, workspace } = yield* inWorkspace(input.workspace);

    // Never an argument: typed without echo, or piped in.
    const apiKey = input.keepKey
      ? Option.none<Redacted.Redacted>()
      : Option.some(yield* readSecret("The provider's key:"));

    const saved = yield* client.assistant
      .setImageProvider({
        params: { workspaceId: workspace.id },
        payload: {
          baseUrl: input.baseUrl,
          model: input.model,
          ...Option.match(apiKey, {
            onNone: () => ({}),
            onSome: (key) => ({ apiKey: Redacted.value(key) }),
          }),
        },
      })
      .pipe(Effect.mapError(explain(url)));

    if (input.json) {
      yield* printJson(ImageProviderSchema, saved);

      return;
    }

    yield* Console.log(
      `Saved the image provider of ${workspace.name}. Its image prompts now go to ${saved.baseUrl}, with the key, kept encrypted and never shown again; the images cost none of the workspace's assistant requests, and still take room in its storage. The first image tells whether the settings work.`
    );
  })
).pipe(
  Command.withDescription(
    "Set the workspace's own image provider: an endpoint that speaks the OpenAI images API. The key is never an argument: the command asks for it at a terminal, without echo, or reads it from standard input (peal assistant image-provider set --base-url … --model … < key.txt). Needs assistant:configure."
  )
);

const clear = Command.make(
  "clear",
  {
    json: jsonFlag,
    workspace: workspaceFlag,
    yes: Flag.Boolean(yesFlagName).pipe(
      Flag.withDescription(
        "The person who decides agreed to remove the provider and delete its key: do not ask again."
      ),
      Flag.withDefault(false)
    ),
  },
  Effect.fn("assistant.imageProvider.clear")(function* clear(input) {
    yield* neverAsksInJson({
      json: input.json,
      why: "it deletes the workspace's image provider key, which must then be given again",
      yes: input.yes,
    });

    const { client, url, workspace } = yield* inWorkspace(input.workspace);

    if (!input.json) {
      yield* Console.log(
        `This removes the image provider of ${workspace.name} and deletes its key. Images are then made by the server's image model, if it has one, and cost the workspace's assistant requests.`
      );
    }

    yield* confirmed({ question: "Remove it?", yes: input.yes });

    yield* client.assistant
      .removeImageProvider({ params: { workspaceId: workspace.id } })
      .pipe(Effect.mapError(explain(url)));

    yield* input.json
      ? printNothing
      : Console.log(`Removed the image provider of ${workspace.name}.`);
  })
).pipe(
  Command.withDescription(
    "Remove the workspace's own image provider and its key. Asks first; --yes otherwise. Needs assistant:configure."
  )
);

const imageProvider = Command.make("image-provider").pipe(
  Command.withDescription(
    "The image provider the workspace brings: its images then go there, with its key, and cost none of Peal's assistant requests."
  ),
  Command.withSubcommands([show, set, clear])
);

export const assistant = Command.make("assistant").pipe(
  Command.withDescription(
    "The workspace's writing assistant settings: its own image provider."
  ),
  Command.withSubcommands([imageProvider])
);
