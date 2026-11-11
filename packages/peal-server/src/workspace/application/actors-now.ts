import {
  Context,
  DateTime,
  Effect,
  Layer,
  Match,
  Option,
  Schema,
} from "effect";

import { DatabaseError } from "#shared/application/database-error.ts";
import type { Actor } from "#shared/domain/access.ts";
import type { UserId, WorkspaceId } from "#shared/domain/ids.ts";
import { ApiKeyPrincipal } from "#workspace/domain/api-key-principal.ts";
import type { AccessDenied } from "#workspace/domain/membership.ts";
import { PartnerKeyIdSchema } from "#workspace/domain/partner-id.ts";
import { PartnerKeyPrincipal } from "#workspace/domain/partner-key-principal.ts";
import type { Principal } from "#workspace/domain/principal.ts";
import { UserPrincipal } from "#workspace/domain/user-principal.ts";

import { ApiKeyIssuer } from "./api-key-issuer.ts";
import { ConnectedAppStore } from "./connected-app-store.ts";
import type { DirectoryUnavailable } from "./directory-unavailable.ts";
import { PartnerOwnership } from "./partner-ownership.ts";
import { PartnerStore } from "./partner-store.ts";
import { ResolveMember } from "./resolve-member.ts";

const decodePartnerKeyId = Schema.decodeUnknownOption(PartnerKeyIdSchema);

/**
 * Who someone who acted before is now, in a workspace: acting, with the
 * permissions they hold now; gone (a member removed or banned, a key
 * revoked or expired, an application whose grant was withdrawn); or
 * locked out for now by something they can put right, which a job that
 * acts for them waits on rather than giving up.
 */
export type ActorStanding =
  | { readonly _tag: "acting"; readonly actor: Actor }
  | { readonly _tag: "gone" }
  | { readonly _tag: "lockedOut" };

const gone: ActorStanding = { _tag: "gone" };

const notValid = (
  expiresAt: Option.Option<DateTime.Utc>,
  now: DateTime.Utc
): boolean => Option.exists(expiresAt, (at) => !DateTime.isLessThan(now, at));

/**
 * What a refusal of the workspace means for someone a job acts for. Every
 * reason the workspace refuses someone for is named here: a new one does
 * not compile until it is said whether it is gone, or only waits (a
 * requirement the member can meet, as turning two-step verification on).
 */
const standingAfter = (refusal: AccessDenied): ActorStanding =>
  Match.valueTags(refusal, {
    BannedUser: () => gone,
    NotAMember: () => gone,
    WorkspaceMismatch: () => gone,
  });

/**
 * What a failure to resolve them means: the directory not answering is
 * the server's to answer for, any other the workspace refusing them,
 * judged in one place (`standingAfter`).
 */
const answered = (failure: AccessDenied | DirectoryUnavailable) =>
  failure._tag === "DirectoryUnavailable"
    ? Effect.fail(new DatabaseError({ cause: failure.cause }))
    : Effect.succeed(standingAfter(failure));

/**
 * The actor someone who acted earlier is now, from the ids a job kept of
 * them, for the contexts that act for them later (a recycling rule's
 * occurrences): resolved as a request of theirs would be now
 * (`ResolveMember`), so a role lowered, a membership ended, a ban, a
 * grant narrowed or withdrawn, a key revoked or expired, or a partner
 * that no longer owns the workspace, applies at once. Reads only; no
 * permission check: the caller acts for what it kept.
 */
export class ActorsNow extends Context.Service<
  ActorsNow,
  {
    /** A member in their own session, never impersonated. */
    readonly ofMember: (
      userId: UserId,
      workspaceId: WorkspaceId
    ) => Effect.Effect<ActorStanding, DatabaseError>;
    /**
     * A member through an OAuth client, with what the client's grants
     * leave it in the workspace now.
     */
    readonly ofApplication: (
      userId: UserId,
      clientId: string,
      workspaceId: WorkspaceId
    ) => Effect.Effect<ActorStanding, DatabaseError>;
    /**
     * A key: the workspace's own, or one of the partner that owns the
     * workspace, as long as it is neither revoked nor expired.
     */
    readonly ofKey: (
      apiKeyId: string,
      workspaceId: WorkspaceId
    ) => Effect.Effect<ActorStanding, DatabaseError>;
  }
>()("peal-server/workspace/application/ActorsNow") {
  static readonly layer = Layer.effect(
    ActorsNow,
    Effect.gen(function* ActorsNowLive() {
      const members = yield* ResolveMember;
      const apps = yield* ConnectedAppStore;
      const keys = yield* ApiKeyIssuer;
      const partners = yield* PartnerStore;
      const ownership = yield* PartnerOwnership;

      const standingOf = (principal: Principal, workspaceId: WorkspaceId) =>
        members.resolve(principal, workspaceId).pipe(
          Effect.map((actor): ActorStanding => ({ _tag: "acting", actor })),
          Effect.catch(answered)
        );

      const ofMember = Effect.fn("ActorsNow.ofMember")(function* ofMember(
        userId: UserId,
        workspaceId: WorkspaceId
      ) {
        return yield* standingOf(
          new UserPrincipal({ impersonatedBy: Option.none(), userId }),
          workspaceId
        );
      });

      const ofApplication = Effect.fn("ActorsNow.ofApplication")(
        function* ofApplication(
          userId: UserId,
          clientId: string,
          workspaceId: WorkspaceId
        ) {
          const now = yield* DateTime.now;
          const grant = yield* apps.grantIn(userId, clientId, workspaceId, now);

          if (Option.isNone(grant)) {
            return gone;
          }

          return yield* standingOf(
            new UserPrincipal({
              impersonatedBy: Option.none(),
              oauth: Option.some({
                clientId,
                scopes: grant.value.scopes,
                workspaceId: grant.value.bound
                  ? Option.some(workspaceId)
                  : Option.none(),
              }),
              userId,
            }),
            workspaceId
          );
        }
      );

      // A key of the partner that owns the workspace, still valid.
      const partnerKey = Effect.fn("ActorsNow.partnerKey")(function* partnerKey(
        apiKeyId: string,
        workspaceId: WorkspaceId,
        now: DateTime.Utc
      ) {
        const keyId = decodePartnerKeyId(apiKeyId);
        const owner = yield* ownership.ownerOf(workspaceId);

        if (Option.isNone(keyId) || Option.isNone(owner)) {
          return Option.none<PartnerKeyPrincipal>();
        }

        const key = (yield* partners.keys(owner.value.partnerId)).find(
          ({ id }) => id === keyId.value
        );

        return key === undefined || notValid(key.expiresAt, now)
          ? Option.none<PartnerKeyPrincipal>()
          : Option.some(
              new PartnerKeyPrincipal({
                partnerId: key.partnerId,
                partnerKeyId: key.id,
                permissions: key.permissions,
                scopes: key.scopes,
              })
            );
      });

      const ofKey = Effect.fn("ActorsNow.ofKey")(function* ofKey(
        apiKeyId: string,
        workspaceId: WorkspaceId
      ) {
        const now = yield* DateTime.now;

        // The workspace's keys, revoked ones left out; one past its
        // expiry is listed still.
        const own = (yield* keys
          .list(workspaceId)
          .pipe(
            Effect.mapError(({ cause }) => new DatabaseError({ cause }))
          )).find(({ id }) => id === apiKeyId);

        if (own !== undefined) {
          return notValid(own.expiresAt, now)
            ? gone
            : yield* standingOf(
                new ApiKeyPrincipal({
                  apiKeyId: own.id,
                  permissions: own.permissions,
                  workspaceId,
                }),
                workspaceId
              );
        }

        const partner = yield* partnerKey(apiKeyId, workspaceId, now);

        return Option.isNone(partner)
          ? gone
          : yield* standingOf(partner.value, workspaceId);
      });

      return ActorsNow.of({ ofApplication, ofKey, ofMember });
    })
  );
}
