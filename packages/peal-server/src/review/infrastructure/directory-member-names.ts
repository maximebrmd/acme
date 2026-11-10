import { Effect, Layer, Option } from "effect";

import { MemberNames } from "#review/application/ports/member-names.ts";
import type { UserId } from "#shared/domain/ids.ts";
import { MemberDirectory } from "#workspace/application/member-directory.ts";

/**
 * Members' names from the workspace context's directory. One it cannot
 * read has no name: a review still shows without it.
 */
export const DirectoryMemberNames = Layer.effect(
  MemberNames,
  Effect.gen(function* DirectoryMemberNames() {
    const directory = yield* MemberDirectory;

    return MemberNames.of({
      of: (userIds) =>
        Effect.forEach(
          userIds,
          (userId) =>
            directory.account(userId).pipe(
              Effect.map(
                Option.map(({ name }): readonly [UserId, string] => [
                  userId,
                  name,
                ])
              ),
              Effect.catchTag("DirectoryUnavailable", () => Effect.succeedNone)
            ),
          { concurrency: 4 }
        ).pipe(
          Effect.map(
            (found) => new Map(found.flatMap((entry) => Option.toArray(entry)))
          )
        ),
    });
  })
);
