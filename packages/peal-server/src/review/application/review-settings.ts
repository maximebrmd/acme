import { Context, DateTime, Effect, Layer, Option } from "effect";

import {
  defaultApprovalPolicy,
  isImpersonated,
} from "#review/domain/approval-policy.ts";
import type { ApprovalPolicy } from "#review/domain/approval-policy.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { Actor } from "#shared/domain/access.ts";
import { authorize } from "#shared/domain/authorize.ts";
import { MissingPermission } from "#shared/domain/missing-permission.ts";

import { ReviewSettingsStore } from "./ports/review-settings-store.ts";

/**
 * A workspace's approval policy: which of its posts wait for an approval
 * before they are scheduled. Reading it needs post:read. Choosing it needs
 * organization:update, in person: staff acting as a member change no
 * workspace's settings. It applies to posts scheduled from then on: a post
 * already scheduled stays so, and one that waits still waits.
 */
export class ReviewSettings extends Context.Service<
  ReviewSettings,
  {
    readonly policy: (
      actor: Actor
    ) => Effect.Effect<ApprovalPolicy, DatabaseError | MissingPermission>;
    readonly setPolicy: (
      actor: Actor,
      policy: ApprovalPolicy
    ) => Effect.Effect<ApprovalPolicy, DatabaseError | MissingPermission>;
  }
>()("peal-server/review/application/ReviewSettings") {
  static readonly layer = Layer.effect(
    ReviewSettings,
    Effect.gen(function* ReviewSettingsLive() {
      const store = yield* ReviewSettingsStore;

      const policy = Effect.fn("ReviewSettings.policy")(function* policy(
        actor: Actor
      ) {
        yield* Effect.fromResult(authorize(actor, "post:read"));

        return Option.getOrElse(
          yield* store.policy(actor.workspaceId),
          () => defaultApprovalPolicy
        );
      });

      const setPolicy = Effect.fn("ReviewSettings.setPolicy")(
        function* setPolicy(actor: Actor, chosen: ApprovalPolicy) {
          yield* Effect.fromResult(authorize(actor, "organization:update"));

          if (isImpersonated(actor)) {
            return yield* new MissingPermission({
              permission: "organization:update",
            });
          }

          yield* store.setPolicy({
            at: yield* DateTime.now,
            by:
              actor.subject._tag === "user"
                ? Option.some(actor.subject.userId)
                : Option.none(),
            policy: chosen,
            workspaceId: actor.workspaceId,
          });

          return chosen;
        }
      );

      return ReviewSettings.of({ policy, setPolicy });
    })
  );
}
