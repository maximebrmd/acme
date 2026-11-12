import { Console, Effect, Option, Schema } from "effect";
import { Argument, Command, Flag } from "effect/cli";
import {
  maxTagNameLength,
  maxTagsPerWorkspace,
  TagColourSchema,
  TagDetailsSchema,
  TagSchema,
} from "peal-contract";
import type { TagDetails } from "peal-contract";

import { explain } from "#explain.ts";
import { jsonFlag, printJson, printNothing } from "#json.ts";
import { columns } from "#print.ts";
import { Refused } from "#refused.ts";
import { findTag, tagsOf } from "#tags.ts";
import { inWorkspace, workspaceFlag } from "#workspace.ts";

const colours = TagColourSchema.literals;

const tagArgument = Argument.String("tag").pipe(
  Argument.withDescription(
    "The tag, by its id or its name, as peal tags list shows them. A name is read whatever its case."
  )
);

// A name or a colour that breaks the contract's own limits is refused
// before it is sent, rather than read as a broken request.
const checkTag = (details: TagDetails) =>
  Schema.decodeUnknownEffect(TagDetailsSchema)(details).pipe(
    Effect.mapError(
      () =>
        new Refused({
          reason: `A tag's name has 1 to ${String(maxTagNameLength)} characters, on one line.`,
        })
    )
  );

const list = Command.make(
  "list",
  { json: jsonFlag, workspace: workspaceFlag },
  Effect.fn("tags.list")(function* list({ json, workspace: choice }) {
    const session = yield* inWorkspace(choice);
    const { workspace } = session;
    const tags = yield* tagsOf(session);

    if (json) {
      yield* printJson(Schema.Array(TagSchema), tags);

      return;
    }

    if (tags.length === 0) {
      yield* Console.log(`${workspace.name} has no tags.`);

      return;
    }

    yield* Console.log(`Tags of ${workspace.name}:`);

    for (const line of columns(
      tags.map((tag) => [`  ${tag.id}`, tag.name, tag.colour])
    )) {
      yield* Console.log(line);
    }
  })
).pipe(
  Command.withDescription(
    "List the workspace's tags, oldest first: each with its id, its name and its colour."
  )
);

const create = Command.make(
  "create",
  {
    colour: Flag.Literals("colour", colours).pipe(
      Flag.withDescription(`The tag's colour: ${colours.join(", ")}.`),
      Flag.withDefault("gray")
    ),
    json: jsonFlag,
    name: Argument.String("name").pipe(
      Argument.withDescription(
        `The tag's name: ${String(maxTagNameLength)} characters at most, on one line, which no other tag of the workspace has, whatever its case.`
      )
    ),
    workspace: workspaceFlag,
  },
  Effect.fn("tags.create")(function* create({
    colour,
    json,
    name,
    workspace: choice,
  }) {
    const payload = yield* checkTag({ colour, name: name.trim() });
    const { client, url, workspace } = yield* inWorkspace(choice);

    const made = yield* client.tags
      .create({ params: { workspaceId: workspace.id }, payload })
      .pipe(Effect.mapError(explain(url)));

    if (json) {
      yield* printJson(TagSchema, made);

      return;
    }

    yield* Console.log(
      `Created tag ${made.name} (${made.colour}) in ${workspace.name}: ${made.id}.`
    );
  })
).pipe(
  Command.withDescription(
    `Add a tag to the workspace, to file posts under. A workspace keeps ${String(maxTagsPerWorkspace)} tags at most.`
  )
);

const update = Command.make(
  "update",
  {
    colour: Flag.Literals("colour", colours).pipe(
      Flag.withDescription(
        `Another colour: ${colours.join(", ")}. The tag keeps its colour without it.`
      ),
      Flag.optional
    ),
    json: jsonFlag,
    name: Flag.String("name").pipe(
      Flag.withMetavar("<name>"),
      Flag.withDescription(
        "Another name, which no other tag of the workspace has. The tag keeps its name without it."
      ),
      Flag.optional
    ),
    tag: tagArgument,
    workspace: workspaceFlag,
  },
  Effect.fn("tags.update")(function* update({
    colour,
    json,
    name,
    tag: given,
    workspace: choice,
  }) {
    yield* Option.isNone(colour) && Option.isNone(name)
      ? Effect.fail(
          new Refused({
            reason:
              "Give --name, --colour or both: nothing else of a tag changes.",
          })
        )
      : Effect.void;

    const session = yield* inWorkspace(choice);
    const { client, url, workspace } = session;
    const tag = yield* findTag(session, given);

    // What the flags leave out stays as the tag has it.
    const payload = yield* checkTag({
      colour: Option.getOrElse(colour, () => tag.colour),
      name: Option.match(name, {
        onNone: () => tag.name,
        onSome: (written) => written.trim(),
      }),
    });

    const changed = yield* client.tags
      .update({ params: { tagId: tag.id, workspaceId: workspace.id }, payload })
      .pipe(Effect.mapError(explain(url)));

    if (json) {
      yield* printJson(TagSchema, changed);

      return;
    }

    yield* Console.log(
      `Tag ${changed.id} of ${workspace.name} is now ${changed.name} (${changed.colour}). Its posts keep it.`
    );
  })
).pipe(
  Command.withDescription(
    "Give a tag another name, another colour or both. Its posts keep it."
  )
);

const remove = Command.make(
  "delete",
  { json: jsonFlag, tag: tagArgument, workspace: workspaceFlag },
  Effect.fn("tags.delete")(function* remove({
    json,
    tag: given,
    workspace: choice,
  }) {
    const session = yield* inWorkspace(choice);
    const { client, url, workspace } = session;
    const tag = yield* findTag(session, given);

    yield* client.tags
      .delete({ params: { tagId: tag.id, workspaceId: workspace.id } })
      .pipe(Effect.mapError(explain(url)));

    yield* json
      ? printNothing
      : Console.log(
          `Deleted tag ${tag.name} of ${workspace.name}: it is off every post that had it, and the posts stay.`
        );
  })
).pipe(
  Command.withDescription(
    "Delete a tag for good, and take it off every post that had it. The posts stay."
  )
);

export const tags = Command.make("tags").pipe(
  Command.withDescription(
    "A workspace's tags: the labels it files its posts under. They say nothing to the platforms. peal posts tag files a post under some, and peal posts list --tag lists a tag's posts."
  ),
  Command.withSubcommands([list, create, update, remove])
);
