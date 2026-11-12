import { Effect } from "effect";
import { Atom } from "effect/reactivity";
import { maxRecyclingPageSize } from "peal-contract";
import type { RecyclingRule, RecyclingRulePage } from "peal-contract";

import { PealApi } from "#api/client.ts";

// The queries and mutations of a workspace's recycling rules. A change
// passes `reactivityKeys: rulesChanged(workspaceId)`, which lists them
// again; it changes no post at once, as the next post of a rule is made
// by the server's run.

/** What refreshes a workspace's rules once a change lands. */
export const rulesChanged = (workspaceId: string) => [
  `recycling:${workspaceId}`,
];

/**
 * Every rule of the workspace, oldest first, read page after page: ended
 * rules stay, so a workspace may have many more than the 100 it keeps
 * going.
 */
export const everyRule = <E, R>(
  read: (cursor: string | undefined) => Effect.Effect<RecyclingRulePage, E, R>
): Effect.Effect<{ readonly items: readonly RecyclingRule[] }, E, R> =>
  Effect.gen(function* everyRulePage() {
    const items: RecyclingRule[] = [];
    let cursor: string | undefined;

    do {
      const page: RecyclingRulePage = yield* read(cursor);

      items.push(...page.items);
      cursor = page.nextCursor ?? undefined;
    } while (cursor !== undefined);

    return { items };
  });

/** The workspace's rules, every page of them, read again once one changes. */
export const workspaceRules = Atom.family((workspaceId: string) =>
  Atom.withReactivity([...rulesChanged(workspaceId), "posts"])(
    PealApi.runtime.atom(
      PealApi.use((client) =>
        everyRule((cursor) =>
          client.recycling.list({
            params: { workspaceId },
            query:
              cursor === undefined
                ? { limit: maxRecyclingPageSize }
                : { cursor, limit: maxRecyclingPageSize },
          })
        )
      )
    )
  )
);

export const startRule = PealApi.mutation("recycling", "create");

export const updateRule = PealApi.mutation("recycling", "update");

export const resumeRule = PealApi.mutation("recycling", "resume");

export const stopRule = PealApi.mutation("recycling", "delete");
