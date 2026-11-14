import { Effect } from "effect";
import { Atom } from "effect/reactivity";
import { maxFollowUpPageSize } from "peal-contract";
import type { FollowUpRule, FollowUpRulePage } from "peal-contract";

import { PealApi } from "#api/client.ts";

// The queries and mutations of a workspace's follow-up rules. A change
// passes `reactivityKeys: followUpsChanged(workspaceId)`, which lists them
// again; what a rule sends goes later, by the server's run.

/** What refreshes a workspace's rules once a change lands. */
export const followUpsChanged = (workspaceId: string) => [
  `follow-ups:${workspaceId}`,
];

/** Every rule of the workspace, oldest first, read page after page. */
export const everyFollowUpRule = <E, R>(
  read: (cursor: string | undefined) => Effect.Effect<FollowUpRulePage, E, R>
): Effect.Effect<{ readonly items: readonly FollowUpRule[] }, E, R> =>
  Effect.gen(function* everyPage() {
    const items: FollowUpRule[] = [];
    let cursor: string | undefined;

    do {
      const page: FollowUpRulePage = yield* read(cursor);

      items.push(...page.items);
      cursor = page.nextCursor ?? undefined;
    } while (cursor !== undefined);

    return { items };
  });

/** The workspace's rules, every page of them, read again once one changes. */
export const workspaceFollowUps = Atom.family((workspaceId: string) =>
  Atom.withReactivity([...followUpsChanged(workspaceId), "posts"])(
    PealApi.runtime.atom(
      PealApi.use((client) =>
        everyFollowUpRule((cursor) =>
          client.followUps.list({
            params: { workspaceId },
            query:
              cursor === undefined
                ? { limit: maxFollowUpPageSize }
                : { cursor, limit: maxFollowUpPageSize },
          })
        )
      )
    )
  )
);

export const startFollowUp = PealApi.mutation("followUps", "create");

export const updateFollowUp = PealApi.mutation("followUps", "update");

export const approveFollowUp = PealApi.mutation("followUps", "approve");

export const stopFollowUp = PealApi.mutation("followUps", "delete");
