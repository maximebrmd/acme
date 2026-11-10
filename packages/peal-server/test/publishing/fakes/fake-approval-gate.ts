import { Context, Effect, Layer, Ref } from "effect";

import { ApprovalGate } from "#publishing/application/approval-gate.ts";
import { can } from "#shared/domain/access.ts";
import type { PostId } from "#shared/domain/ids.ts";

// A gate that holds every post until a test approves it as it is, and lets
// anyone who may write drafts ask.

interface Held {
  readonly postId: PostId;
  readonly subject: string;
}

/** What the fake gate saw, and a way to approve what it holds. */
export class GateLog extends Context.Service<
  GateLog,
  {
    /** Approves the post as it was last shown to the gate. */
    readonly approve: (postId: PostId) => Effect.Effect<void>;
    readonly held: Effect.Effect<readonly PostId[]>;
    readonly withdrawn: Effect.Effect<readonly PostId[]>;
  }
>()("test/publishing/GateLog") {}

export const FakeApprovalGate = Layer.effectContext(
  Effect.gen(function* FakeApprovalGate() {
    const held = yield* Ref.make<readonly Held[]>([]);
    const approvals = yield* Ref.make<readonly Held[]>([]);
    const withdrawn = yield* Ref.make<readonly PostId[]>([]);

    const stands = ({ postId, subject }: Held) =>
      Ref.get(approvals).pipe(
        Effect.map((given) =>
          given.some(
            (approval) =>
              approval.postId === postId && approval.subject === subject
          )
        )
      );

    return Context.make(
      ApprovalGate,
      ApprovalGate.of({
        admit: (_actor, { postId, subject }) =>
          Effect.gen(function* admit() {
            if (yield* stands({ postId, subject })) {
              return "admitted";
            }

            yield* Ref.update(held, (posts) => [
              ...posts.filter((post) => post.postId !== postId),
              { postId, subject },
            ]);

            return "held";
          }),
        approved: stands,
        forgotten: () => Effect.void,
        holds: () => Effect.succeed(true),
        maySubmit: (actor) => Effect.succeed(can(actor, "post:create")),
        withdrawn: (_workspaceId, postId) =>
          Ref.update(withdrawn, (posts) => [...posts, postId]),
      })
    ).pipe(
      Context.add(
        GateLog,
        GateLog.of({
          approve: (postId) =>
            Ref.get(held).pipe(
              Effect.flatMap((posts) =>
                Ref.update(approvals, (given) => [
                  ...given,
                  ...posts.filter((post) => post.postId === postId),
                ])
              )
            ),
          held: Ref.get(held).pipe(
            Effect.map((posts) => posts.map(({ postId }) => postId))
          ),
          withdrawn: Ref.get(withdrawn),
        })
      )
    );
  })
);
