import { Console, Effect, Option, Redacted } from "effect";
import { Command, Flag } from "effect/cli";
import {
  anthropicApiAddress,
  ImageProviderSchema,
  ImageProviderSettingSchema,
  maxImageProviderModelLength,
  ownTextRequestsPerDay,
  TextProviderKindSchema,
  TextProviderSchema,
  TextProviderSettingSchema,
} from "peal-contract";
import type { ImageProvider, TextProvider } from "peal-contract";

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
        "Keep the key already saved, which works only while --base-url stays exactly the address it was given for (to change the model alone): nothing is read for it."
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

// What each API is called when the user reads it.
const kindNames = {
  anthropic: "Anthropic's Messages API",
  "openai-compatible": "an OpenAI-compatible endpoint (chat completions)",
} as const;

// The text provider as the user reads it: never its key, which the server
// does not send.
const textLines = (provider: TextProvider) => [
  `  API:     ${kindNames[provider.kind]}`,
  `  Address: ${provider.baseUrl}`,
  `  Model:   ${provider.model}`,
  `  Key:     ${provider.keyUnreadable ? "saved, but it can no longer be read: give it again with set" : "saved (never shown)"}`,
  `  Saved:   ${instant(provider.updatedAt)}`,
];

const showText = Command.make(
  "show",
  { json: jsonFlag, workspace: workspaceFlag },
  Effect.fn("assistant.textProvider.show")(function* showText(input) {
    const { client, url, workspace } = yield* inWorkspace(input.workspace);

    const setting = yield* client.assistant
      .textProvider({ params: { workspaceId: workspace.id } })
      .pipe(Effect.mapError(explain(url)));

    if (input.json) {
      yield* printJson(TextProviderSettingSchema, setting);

      return;
    }

    if (setting.provider === null) {
      yield* Console.log(
        `${workspace.name} has no text provider of its own: the writing assistant uses the server's language model, if it has one.`
      );

      return;
    }

    yield* Console.log(`The text provider of ${workspace.name}:`);

    for (const line of textLines(setting.provider)) {
      yield* Console.log(line);
    }
  })
).pipe(
  Command.withDescription(
    "Show the workspace's own text provider: the API it speaks, its address and its model, never its key. Needs assistant:configure."
  )
);

const setText = Command.make(
  "set",
  {
    baseUrl: Flag.String("base-url").pipe(
      Flag.withMetavar("<url>"),
      Flag.withDescription(
        `The API's base address: for anthropic, ${anthropicApiAddress} (the default), which /v1/messages follows; for openai-compatible, the address /chat/completions follows, such as https://text.example.com/v1. HTTPS on the default port, on a public host.`
      ),
      Flag.optional
    ),
    json: jsonFlag,
    keepKey: Flag.Boolean("keep-key").pipe(
      Flag.withDescription(
        "Keep the key already saved, which works only while the address stays exactly the one it was given for (to change the model alone): nothing is read for it."
      ),
      Flag.withDefault(false)
    ),
    kind: Flag.Literals("kind", TextProviderKindSchema.literals).pipe(
      Flag.withDescription(
        "The API the provider speaks: anthropic (Anthropic's Messages API) or openai-compatible (any endpoint that serves chat completions)."
      )
    ),
    model: Flag.String("model").pipe(
      Flag.withMetavar("<model>"),
      Flag.withDescription(
        `Your provider's model, as its documentation names it, one line of 1 to ${String(maxImageProviderModelLength)} characters. It must answer in structured output (a JSON schema).`
      )
    ),
    workspace: workspaceFlag,
  },
  Effect.fn("assistant.textProvider.set")(function* setText(input) {
    const { client, url, workspace } = yield* inWorkspace(input.workspace);

    const baseUrl = Option.getOrElse(input.baseUrl, () =>
      input.kind === "anthropic" ? anthropicApiAddress : ""
    );

    // Never an argument: typed without echo, or piped in.
    const apiKey = input.keepKey
      ? Option.none<Redacted.Redacted>()
      : Option.some(yield* readSecret("The provider's key:"));

    const saved = yield* client.assistant
      .setTextProvider({
        params: { workspaceId: workspace.id },
        payload: {
          baseUrl,
          kind: input.kind,
          model: input.model,
          ...Option.match(apiKey, {
            onNone: () => ({}),
            onSome: (key) => ({ apiKey: Redacted.value(key) }),
          }),
        },
      })
      .pipe(Effect.mapError(explain(url)));

    if (input.json) {
      yield* printJson(TextProviderSchema, saved);

      return;
    }

    yield* Console.log(
      `Saved the text provider of ${workspace.name}. The drafts its members ask the assistant about now go to ${saved.baseUrl}, with the key, kept encrypted and never shown again; they cost none of the workspace's assistant requests, within ${String(ownTextRequestsPerDay)} a day. Check it works with peal assistant text-provider test.`
    );
  })
).pipe(
  Command.withDescription(
    "Set the workspace's own text provider, for the writing assistant: Anthropic's Messages API or an OpenAI-compatible endpoint. The key is never an argument: the command asks for it at a terminal, without echo, or reads it from standard input (peal assistant text-provider set --kind anthropic --model … < key.txt). Needs assistant:configure."
  )
);

const testText = Command.make(
  "test",
  { json: jsonFlag, workspace: workspaceFlag },
  Effect.fn("assistant.textProvider.test")(function* testText(input) {
    const { client, url, workspace } = yield* inWorkspace(input.workspace);

    yield* client.assistant
      .testTextProvider({ params: { workspaceId: workspace.id } })
      .pipe(Effect.mapError(explain(url)));

    yield* input.json
      ? printNothing
      : Console.log(
          `The text provider of ${workspace.name} answered with a suggestion the assistant can use. The test counted as one of its requests today.`
        );
  })
).pipe(
  Command.withDescription(
    "Send the workspace's own text provider one short request, as a member's would go, and say whether it answered with a suggestion the assistant can use. It counts as one of that provider's requests today, and none of Peal's. Needs assistant:configure."
  )
);

const clearText = Command.make(
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
  Effect.fn("assistant.textProvider.clear")(function* clearText(input) {
    yield* neverAsksInJson({
      json: input.json,
      why: "it deletes the workspace's text provider key, which must then be given again",
      yes: input.yes,
    });

    const { client, url, workspace } = yield* inWorkspace(input.workspace);

    if (!input.json) {
      yield* Console.log(
        `This removes the text provider of ${workspace.name} and deletes its key. The writing assistant then uses the server's language model, if it has one, and its requests count against the workspace's daily allowance.`
      );
    }

    yield* confirmed({ question: "Remove it?", yes: input.yes });

    yield* client.assistant
      .removeTextProvider({ params: { workspaceId: workspace.id } })
      .pipe(Effect.mapError(explain(url)));

    yield* input.json
      ? printNothing
      : Console.log(`Removed the text provider of ${workspace.name}.`);
  })
).pipe(
  Command.withDescription(
    "Remove the workspace's own text provider and its key. Asks first; --yes otherwise. Needs assistant:configure."
  )
);

const textProvider = Command.make("text-provider").pipe(
  Command.withDescription(
    "The text provider the workspace brings: the drafts its members ask the writing assistant about then go there, with its key, and cost none of Peal's assistant requests."
  ),
  Command.withSubcommands([showText, setText, testText, clearText])
);

export const assistant = Command.make("assistant").pipe(
  Command.withDescription(
    "The workspace's writing assistant settings: its own image provider and its own text provider."
  ),
  Command.withSubcommands([imageProvider, textProvider])
);
