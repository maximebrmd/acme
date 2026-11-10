import { Console, Effect, Match, Option, Schema } from "effect";
import { Argument, Command, Flag } from "effect/cli";
import {
  maxSignatureLength,
  maxSignatureNameLength,
  maxSignaturesPerWorkspace,
  PlatformSchema,
  SignatureDetailsSchema,
  SignatureSchema,
} from "peal-contract";
import type {
  Platform,
  Signature,
  SignatureDetails,
  SignatureScope,
} from "peal-contract";

import { explain } from "#explain.ts";
import { jsonFlag, printJson, printNothing } from "#json.ts";
import { columns, excerpt } from "#print.ts";
import { Refused } from "#refused.ts";
import { findSignature, signaturesOf } from "#saved-items.ts";
import { inWorkspace, workspaceFlag } from "#workspace.ts";

const signatureArgument = Argument.String("signature").pipe(
  Argument.withDescription(
    "The signature, by its id or its name, as peal signatures list shows them. A name is read whatever its case."
  )
);

// Where a signature is meant for, as people read it.
const scopeOf = (scope: SignatureScope): string =>
  Match.valueTags(scope, {
    channel: ({ channelId }) => `channel ${channelId}`,
    platform: ({ platform }) => `every ${platform} channel`,
    workspace: () => "every channel",
  });

const describe = (signature: Signature): string =>
  `${signature.name} (${scopeOf(signature.scope)}${signature.isDefault ? ", the default there" : ""})`;

// A name or a text that breaks the contract's own limits is refused before
// it is sent, rather than read as a broken request.
const checkSignature = (details: SignatureDetails) =>
  Schema.decodeUnknownEffect(SignatureDetailsSchema)(details).pipe(
    Effect.mapError(
      () =>
        new Refused({
          reason: `A signature's name has 1 to ${String(maxSignatureNameLength)} characters, on one line, and its text 1 to ${String(maxSignatureLength)}.`,
        })
    )
  );

// The scope --platform and --channel name, if either does.
const scopeGiven = (
  platform: Option.Option<Platform>,
  channel: Option.Option<string>
): Effect.Effect<Option.Option<SignatureScope>, Refused> => {
  if (Option.isSome(platform) && Option.isSome(channel)) {
    return Effect.fail(
      new Refused({ reason: "Give --platform or --channel, not both." })
    );
  }

  return Effect.succeed(
    platform.pipe(
      Option.map((name): SignatureScope => ({
        _tag: "platform",
        platform: name,
      })),
      Option.orElse(() =>
        channel.pipe(
          Option.map((channelId): SignatureScope => ({
            _tag: "channel",
            channelId,
          }))
        )
      )
    )
  );
};

const list = Command.make(
  "list",
  { json: jsonFlag, workspace: workspaceFlag },
  Effect.fn("signatures.list")(function* list({ json, workspace: choice }) {
    const session = yield* inWorkspace(choice);
    const { workspace } = session;
    const signatures = yield* signaturesOf(session);

    if (json) {
      yield* printJson(Schema.Array(SignatureSchema), signatures);

      return;
    }

    if (signatures.length === 0) {
      yield* Console.log(`${workspace.name} has no signatures.`);

      return;
    }

    yield* Console.log(`Signatures of ${workspace.name}:`);

    for (const line of columns(
      signatures.map((signature) => [
        `  ${signature.id}`,
        signature.name,
        scopeOf(signature.scope),
        signature.isDefault ? "default" : "",
        excerpt(signature.text),
      ])
    )) {
      yield* Console.log(line);
    }
  })
).pipe(
  Command.withDescription(
    "List the workspace's signatures, oldest first: each with its id, its name, the channels it is meant for, whether it is the default there, and how its text starts."
  )
);

const create = Command.make(
  "create",
  {
    channel: Flag.String("channel").pipe(
      Flag.withMetavar("<channel-id>"),
      Flag.withDescription(
        "Meant for this channel alone, as peal channels list shows its id. Without it and --platform, for every channel of the workspace."
      ),
      Flag.optional
    ),
    isDefault: Flag.Boolean("default").pipe(
      Flag.withDescription(
        "Make it the default of the channels it is meant for: posts that ask for the default signatures take it there, and the signature that was the default there is one no longer."
      ),
      Flag.withDefault(false)
    ),
    json: jsonFlag,
    name: Argument.String("name").pipe(
      Argument.withDescription(
        `The signature's name: ${String(maxSignatureNameLength)} characters at most, on one line, which no other signature of the workspace has, whatever its case.`
      )
    ),
    platform: Flag.Literals("platform", PlatformSchema.literals).pipe(
      Flag.withDescription(
        "Meant for the channels of this platform. Without it and --channel, for every channel of the workspace."
      ),
      Flag.optional
    ),
    text: Flag.String("text").pipe(
      Flag.withMetavar("<text>"),
      Flag.withDescription(
        `What it puts under a post's text, a blank line between them: ${String(maxSignatureLength)} characters at most.`
      )
    ),
    workspace: workspaceFlag,
  },
  Effect.fn("signatures.create")(function* create(input) {
    const scope = yield* scopeGiven(input.platform, input.channel);

    const payload = yield* checkSignature({
      isDefault: input.isDefault,
      name: input.name.trim(),
      scope: Option.getOrElse(scope, (): SignatureScope => ({
        _tag: "workspace",
      })),
      text: input.text.trim(),
    });

    const { client, url, workspace } = yield* inWorkspace(input.workspace);

    const made = yield* client.signatures
      .create({ params: { workspaceId: workspace.id }, payload })
      .pipe(Effect.mapError(explain(url)));

    if (input.json) {
      yield* printJson(SignatureSchema, made);

      return;
    }

    yield* Console.log(
      `Created signature ${describe(made)} in ${workspace.name}: ${made.id}.`
    );
  })
).pipe(
  Command.withDescription(
    `Add a signature to the workspace: a text to end posts with, for every channel, a platform's or one channel. peal post and peal drafts save put one under a post's text with --signature, or each channel's default with --default-signatures: it is then text of the post, counted against each platform's limit. A workspace keeps ${String(maxSignaturesPerWorkspace)} signatures at most.`
  )
);

const update = Command.make(
  "update",
  {
    channel: Flag.String("channel").pipe(
      Flag.withMetavar("<channel-id>"),
      Flag.withDescription(
        "Meant for this channel alone from now on, as peal channels list shows its id."
      ),
      Flag.optional
    ),
    isDefault: Flag.Boolean("default").pipe(
      Flag.withDescription(
        "Make it the default of the channels it is meant for: the signature that was the default there is one no longer."
      ),
      Flag.withDefault(false)
    ),
    json: jsonFlag,
    name: Flag.String("name").pipe(
      Flag.withMetavar("<name>"),
      Flag.withDescription(
        "Another name, which no other signature of the workspace has. The signature keeps its name without it."
      ),
      Flag.optional
    ),
    notDefault: Flag.Boolean("no-default").pipe(
      Flag.withDescription(
        "Make it no default any more: the channels it is meant for are left without one."
      ),
      Flag.withDefault(false)
    ),
    platform: Flag.Literals("platform", PlatformSchema.literals).pipe(
      Flag.withDescription(
        "Meant for the channels of this platform from now on."
      ),
      Flag.optional
    ),
    signature: signatureArgument,
    text: Flag.String("text").pipe(
      Flag.withMetavar("<text>"),
      Flag.withDescription(
        "Another text. The signature keeps its text without it, and posts that already hold the old one keep it as it was."
      ),
      Flag.optional
    ),
    wholeWorkspace: Flag.Boolean("whole-workspace").pipe(
      Flag.withDescription(
        "Meant for every channel of the workspace from now on, rather than a platform's or one channel."
      ),
      Flag.withDefault(false)
    ),
    workspace: workspaceFlag,
  },
  Effect.fn("signatures.update")(function* update(input) {
    if (input.isDefault && input.notDefault) {
      yield* new Refused({
        reason: "Give --default or --no-default, not both.",
      });
    }

    const narrowed = yield* scopeGiven(input.platform, input.channel);

    if (input.wholeWorkspace && Option.isSome(narrowed)) {
      yield* new Refused({
        reason: "Give --whole-workspace, --platform or --channel, not several.",
      });
    }

    const scope = input.wholeWorkspace
      ? Option.some<SignatureScope>({ _tag: "workspace" })
      : narrowed;

    if (
      Option.isNone(input.name) &&
      Option.isNone(input.text) &&
      Option.isNone(scope) &&
      !input.isDefault &&
      !input.notDefault
    ) {
      yield* new Refused({
        reason:
          "Give what changes: --name, --text, where it is meant for (--whole-workspace, --platform or --channel), --default or --no-default.",
      });
    }

    const session = yield* inWorkspace(input.workspace);
    const { client, url, workspace } = session;
    const signature = yield* findSignature(session, input.signature);

    // What the flags leave out stays as the signature has it.
    const payload = yield* checkSignature({
      isDefault:
        input.isDefault || input.notDefault
          ? input.isDefault
          : signature.isDefault,
      name: Option.match(input.name, {
        onNone: () => signature.name,
        onSome: (written) => written.trim(),
      }),
      scope: Option.getOrElse(scope, () => signature.scope),
      text: Option.match(input.text, {
        onNone: () => signature.text,
        onSome: (written) => written.trim(),
      }),
    });

    const changed = yield* client.signatures
      .update({
        params: { signatureId: signature.id, workspaceId: workspace.id },
        payload,
      })
      .pipe(Effect.mapError(explain(url)));

    if (input.json) {
      yield* printJson(SignatureSchema, changed);

      return;
    }

    yield* Console.log(
      `Signature ${changed.id} of ${workspace.name} is now ${describe(changed)}. Posts that already hold its text keep it as it was.`
    );
  })
).pipe(
  Command.withDescription(
    "Change a signature: its name, its text, the channels it is meant for, or whether it is the default there. What no flag names stays as it is, and posts that already hold its text keep it as it was."
  )
);

const remove = Command.make(
  "delete",
  { json: jsonFlag, signature: signatureArgument, workspace: workspaceFlag },
  Effect.fn("signatures.delete")(function* remove({
    json,
    signature: given,
    workspace: choice,
  }) {
    const session = yield* inWorkspace(choice);
    const { client, url, workspace } = session;
    const signature = yield* findSignature(session, given);

    yield* client.signatures
      .delete({
        params: { signatureId: signature.id, workspaceId: workspace.id },
      })
      .pipe(Effect.mapError(explain(url)));

    yield* json
      ? printNothing
      : Console.log(
          `Deleted signature ${signature.name} of ${workspace.name}: posts that already hold its text keep it.`
        );
  })
).pipe(
  Command.withDescription(
    "Delete a signature for good. Posts that already hold its text keep it."
  )
);

export const signatures = Command.make("signatures").pipe(
  Command.withDescription(
    "A workspace's signatures: the texts it ends its posts with, for every channel, a platform's or one channel. Once under a post's text, a signature is text of the post: it counts against each platform's limit, and is never added twice. peal post and peal drafts save take one with --signature, or each channel's default with --default-signatures."
  ),
  Command.withSubcommands([list, create, update, remove])
);
