import { Context, DateTime, Effect, Layer, Option } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { Actor } from "#shared/domain/access.ts";
import { authorize } from "#shared/domain/authorize.ts";
import type { MissingPermission } from "#shared/domain/missing-permission.ts";
import { inPerson } from "#workspace/domain/person-required.ts";
import type { PersonRequired } from "#workspace/domain/person-required.ts";
import { TwoStepRequired } from "#workspace/domain/two-step-required.ts";

import type { DirectoryUnavailable } from "./directory-unavailable.ts";
import { MemberDirectory } from "./member-directory.ts";
import { SecurityPolicies } from "./security-policies.ts";
import { WorkspacePeople } from "./workspace-people.ts";

/** What a workspace requires of its members, as its settings show it. */
export interface WorkspaceSecurityView {
  /**
   * How many members' accounts do not have two-step verification on: for
   * a reader who may manage members alone.
   */
  readonly membersWithoutTwoStep: Option.Option<number>;
  readonly twoStepRequired: boolean;
}

/**
 * A workspace's security policy: whether its owners require two-step
 * verification of every member. Anyone the workspace lets in reads it;
 * only an owner, in their own session and with it on for their own
 * account, changes it, so nobody locks themselves out and the rule is never
 * weaker for whoever set it. It takes effect at once, as ResolveMember reads
 * it on every request.
 */
export class WorkspaceSecurity extends Context.Service<
  WorkspaceSecurity,
  {
    readonly read: (
      actor: Actor
    ) => Effect.Effect<
      WorkspaceSecurityView,
      DatabaseError | DirectoryUnavailable
    >;
    readonly require: (
      actor: Actor,
      required: boolean
    ) => Effect.Effect<
      WorkspaceSecurityView,
      | DatabaseError
      | DirectoryUnavailable
      | MissingPermission
      | PersonRequired
      | TwoStepRequired
    >;
  }
>()("peal-server/workspace/application/WorkspaceSecurity") {
  static readonly layer = Layer.effect(
    WorkspaceSecurity,
    Effect.gen(function* WorkspaceSecurityLive() {
      const policies = yield* SecurityPolicies;
      const directory = yield* MemberDirectory;
      const people = yield* WorkspacePeople;

      const viewOf = (actor: Actor, twoStepRequired: boolean) =>
        Effect.gen(function* securityOf() {
          if (!actor.permissions.includes("member:update")) {
            return { membersWithoutTwoStep: Option.none(), twoStepRequired };
          }

          const members = yield* people.members(actor.workspaceId);

          return {
            membersWithoutTwoStep: Option.some(
              members.filter(({ twoStepEnabled }) => !twoStepEnabled).length
            ),
            twoStepRequired,
          };
        });

      const read = Effect.fn("WorkspaceSecurity.read")(function* read(
        actor: Actor
      ) {
        const { twoStepRequired } = yield* policies.get(actor.workspaceId);

        return yield* viewOf(actor, twoStepRequired);
      });

      const require = Effect.fn("WorkspaceSecurity.require")(function* require(
        actor: Actor,
        required: boolean
      ) {
        const userId = yield* Effect.fromResult(inPerson(actor));

        yield* Effect.fromResult(authorize(actor, "organization:secure"));

        if (required) {
          const account = yield* directory.account(userId);

          if (!Option.exists(account, ({ twoStepEnabled }) => twoStepEnabled)) {
            return yield* new TwoStepRequired({
              workspaceId: actor.workspaceId,
            });
          }
        }

        yield* policies.set(
          actor.workspaceId,
          { twoStepRequired: required },
          yield* DateTime.now
        );

        return yield* viewOf(actor, required);
      });

      return WorkspaceSecurity.of({ read, require });
    })
  );
}
