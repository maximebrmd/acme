import { Effect, Option } from "effect";
import { Flag } from "effect/cli";
import { maxTagsPerPost } from "peal-contract";
import type { Tag } from "peal-contract";

import { explain } from "#explain.ts";
import { Refused } from "#refused.ts";
import type { inWorkspace } from "#workspace.ts";

type InWorkspace = Effect.Success<ReturnType<typeof inWorkspace>>;

/** `--tag <id-or-name>`, repeated: the tags a post is filed under. */
export const tagsFlag = (description: string) =>
  Flag.String("tag").pipe(
    Flag.withMetavar("<id-or-name>"),
    Flag.withDescription(description),
    Flag.atLeast(0)
  );

/** The workspace's tags, oldest first. */
export const tagsOf = ({ client, url, workspace }: InWorkspace) =>
  client.tags
    .list({ params: { workspaceId: workspace.id } })
    .pipe(Effect.mapError(explain(url)));

/**
 * The tag a command names: by its id, or by its exact name, whatever its
 * case. A workspace has no two tags of one name.
 */
export const tagNamed = (
  tags: readonly Tag[],
  given: string
): Effect.Effect<Tag, Refused> => {
  const wanted = given.trim();
  const name = wanted.toLowerCase();

  return Option.match(
    Option.fromUndefinedOr(
      tags.find(({ id }) => id === wanted) ??
        tags.find((tag) => tag.name.toLowerCase() === name)
    ),
    {
      onNone: () =>
        Effect.fail(
          new Refused({
            code: "tag_unknown",
            reason: `The workspace has no tag ${wanted}, by id or by name: peal tags list shows them.`,
          })
        ),
      onSome: (tag) => Effect.succeed(tag),
    }
  );
};

/** The tag a command names, looked up among the workspace's. */
export const findTag = (session: InWorkspace, given: string) =>
  tagsOf(session).pipe(Effect.flatMap((tags) => tagNamed(tags, given)));

/**
 * The tags `--tag` named, each once, in the order given. None given asks
 * the server nothing.
 */
export const tagsNamed = (session: InWorkspace, given: readonly string[]) =>
  Effect.gen(function* naming() {
    if (given.length === 0) {
      return [];
    }

    const tags = yield* tagsOf(session);
    const found: Tag[] = [];

    for (const wanted of given) {
      const tag = yield* tagNamed(tags, wanted);

      if (!found.some(({ id }) => id === tag.id)) {
        found.push(tag);
      }
    }

    if (found.length > maxTagsPerPost) {
      return yield* new Refused({
        reason: `A post takes ${String(maxTagsPerPost)} tags at most.`,
      });
    }

    return found;
  });

/** The ids of the tags `--tag` named. */
export const tagIdsOf = (session: InWorkspace, given: readonly string[]) =>
  tagsNamed(session, given).pipe(
    Effect.map((tags) => tags.map(({ id }) => id))
  );
