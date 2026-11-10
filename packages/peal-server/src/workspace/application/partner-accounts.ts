import { Context, DateTime, Effect, Layer, Option, Schema } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import { newId } from "#shared/application/ids.ts";
import type { Ids } from "#shared/application/ids.ts";
import type { Actor } from "#shared/domain/access.ts";
import { authorize } from "#shared/domain/authorize.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import type { MissingPermission } from "#shared/domain/missing-permission.ts";
import type { InvalidPartnerLogo } from "#workspace/domain/invalid-partner-logo.ts";
import type { InvalidReturnOrigin } from "#workspace/domain/invalid-return-origin.ts";
import { PartnerIdSchema } from "#workspace/domain/partner-id.ts";
import {
  changePartner,
  openPartner,
  parseLogoUrl,
  PartnerNameSchema,
} from "#workspace/domain/partner.ts";
import type { Partner } from "#workspace/domain/partner.ts";
import { inPerson } from "#workspace/domain/person-required.ts";
import type { PersonRequired } from "#workspace/domain/person-required.ts";
import {
  maxReturnOrigins,
  parseReturnOrigin,
} from "#workspace/domain/return-origin.ts";

import { AccountStore } from "./account-store.ts";
import { CustomerWorkspaces } from "./customer-workspaces.ts";
import { InvalidPartnerName } from "./invalid-partner-name.ts";
import { PartnerAccountsClosed } from "./partner-accounts-closed.ts";
import { PartnerNotFound } from "./partner-not-found.ts";
import { PartnerOwnsWorkspaces } from "./partner-owns-workspaces.ts";
import { PartnerSettings } from "./partner-settings.ts";
import { PartnerStore } from "./partner-store.ts";
import { TooManyReturnOrigins } from "./too-many-return-origins.ts";
import { WorkspaceNotEligible } from "./workspace-not-eligible.ts";

const decodeName = Schema.decodeUnknownOption(PartnerNameSchema);

const nameOf = (input: string) =>
  Option.match(decodeName(input), {
    onNone: () => Effect.fail(new InvalidPartnerName()),
    onSome: Effect.succeed,
  });

// The logo a change leaves: the one it had when nothing is said, none when
// null is, or the address given.
const logoOf = (partner: Partner, logoUrl: string | null | undefined) => {
  if (logoUrl === undefined) {
    return Effect.succeed(partner.logoUrl);
  }

  return logoUrl === null
    ? Effect.succeed(Option.none<string>())
    : Effect.fromResult(parseLogoUrl(logoUrl)).pipe(Effect.map(Option.some));
};

/** What a workspace's people read of its partner account. */
export interface PartnerStanding {
  /** Whether the workspace's people may open an account themselves. */
  readonly canOpen: boolean;
  readonly partner: Option.Option<Partner>;
}

/** What its people ask to change of a partner account. */
export interface PartnerChangeRequest {
  /** Null removes the logo. */
  readonly logoUrl?: string | null;
  readonly name?: string;
  readonly returnOrigins?: readonly string[];
}

export type PartnerChangeFailure =
  | DatabaseError
  | InvalidPartnerLogo
  | InvalidPartnerName
  | InvalidReturnOrigin
  | MissingPermission
  | PartnerNotFound
  | PersonRequired
  | TooManyReturnOrigins;

/**
 * A workspace's partner account: opening it, what its customers see of it
 * (name, logo) and where the hosted pages may send them back (return
 * origins), and closing it.
 *
 * | Use case            | Needs                                   |
 * | ------------------- | --------------------------------------- |
 * | standing            | partner:read                            |
 * | open, change, close | partner:manage, the member in person    |
 * | grant               | nothing: the staff console checks staff |
 *
 * Who may have one is the server's choice (`PartnerSettings`): its staff
 * grant it, or, on a server that says so, a workspace's owners and admins
 * open it themselves. A workspace a partner owns never has one. An account
 * closes only once it owns no workspace.
 */
export class PartnerAccounts extends Context.Service<
  PartnerAccounts,
  {
    readonly standing: (
      actor: Actor
    ) => Effect.Effect<PartnerStanding, DatabaseError | MissingPermission>;
    /** Opens the workspace's account, or answers the one it has. */
    readonly open: (
      actor: Actor,
      name: string
    ) => Effect.Effect<
      Partner,
      | DatabaseError
      | InvalidPartnerName
      | MissingPermission
      | PartnerAccountsClosed
      | PersonRequired
    >;
    /**
     * Opens an account for a workspace, as staff grant it, named after the
     * workspace; or answers the one it has.
     */
    readonly grant: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<Partner, DatabaseError | WorkspaceNotEligible>;
    readonly change: (
      actor: Actor,
      change: PartnerChangeRequest
    ) => Effect.Effect<Partner, PartnerChangeFailure>;
    readonly close: (
      actor: Actor
    ) => Effect.Effect<
      void,
      | DatabaseError
      | MissingPermission
      | PartnerNotFound
      | PartnerOwnsWorkspaces
      | PersonRequired
    >;
  }
>()("peal-server/workspace/application/PartnerAccounts") {
  static readonly layer = Layer.effect(
    PartnerAccounts,
    Effect.gen(function* PartnerAccountsLive() {
      const partners = yield* PartnerStore;
      const workspaces = yield* CustomerWorkspaces;
      const accounts = yield* AccountStore;
      const settings = yield* PartnerSettings;
      const ports = yield* Effect.context<Ids>();

      const found = (workspaceId: WorkspaceId) =>
        partners.ofWorkspace(workspaceId).pipe(
          Effect.flatMap(
            Option.match({
              onNone: () => Effect.fail(new PartnerNotFound()),
              onSome: Effect.succeed,
            })
          )
        );

      // Opens the workspace's account under this name, or answers the one
      // another request opened meanwhile.
      const opened = Effect.fn("PartnerAccounts.opened")(function* opened(
        workspaceId: WorkspaceId,
        name: string
      ) {
        const partner = openPartner(
          yield* newId(PartnerIdSchema),
          workspaceId,
          name,
          yield* DateTime.now
        );

        if (yield* partners.open(partner)) {
          return Option.some(partner);
        }

        return yield* partners.ofWorkspace(workspaceId);
      }, Effect.provideContext(ports));

      const standing = Effect.fn("PartnerAccounts.standing")(function* standing(
        actor: Actor
      ) {
        yield* Effect.fromResult(authorize(actor, "partner:read"));

        const partner = yield* partners.ofWorkspace(actor.workspaceId);

        const state: PartnerStanding = {
          canOpen: settings.selfService && Option.isNone(partner),
          partner,
        };

        return state;
      });

      const open = Effect.fn("PartnerAccounts.open")(function* open(
        actor: Actor,
        name: string
      ) {
        yield* Effect.fromResult(authorize(actor, "partner:manage"));
        yield* Effect.fromResult(inPerson(actor));

        const existing = yield* partners.ofWorkspace(actor.workspaceId);

        if (Option.isSome(existing)) {
          return existing.value;
        }

        if (!settings.selfService) {
          return yield* new PartnerAccountsClosed();
        }

        const partner = yield* opened(actor.workspaceId, yield* nameOf(name));

        // A member acts in a workspace with members, which no partner
        // owns: the account opens, or was opened meanwhile.
        return yield* Option.match(partner, {
          onNone: () => Effect.die("A workspace with members has an owner"),
          onSome: Effect.succeed,
        });
      });

      const grant = Effect.fn("PartnerAccounts.grant")(function* grant(
        workspaceId: WorkspaceId
      ) {
        const existing = yield* partners.ofWorkspace(workspaceId);

        if (Option.isSome(existing)) {
          return existing.value;
        }

        const workspace = yield* accounts.workspace(workspaceId);

        if (
          Option.isNone(workspace) ||
          Option.isSome(yield* workspaces.ownerOf(workspaceId))
        ) {
          return yield* new WorkspaceNotEligible({ workspaceId });
        }

        // The workspace's name, cut to what a partner's name holds.
        const name = Option.getOrElse(
          decodeName(workspace.value.name.slice(0, 80)),
          () => "Partner"
        );

        const partner = yield* opened(workspaceId, name);

        return yield* Option.match(partner, {
          onNone: () => Effect.fail(new WorkspaceNotEligible({ workspaceId })),
          onSome: Effect.succeed,
        });
      });

      const change = Effect.fn("PartnerAccounts.change")(function* change(
        actor: Actor,
        request: PartnerChangeRequest
      ) {
        yield* Effect.fromResult(authorize(actor, "partner:manage"));
        yield* Effect.fromResult(inPerson(actor));

        const partner = yield* found(actor.workspaceId);

        if (
          request.returnOrigins !== undefined &&
          request.returnOrigins.length > maxReturnOrigins
        ) {
          return yield* new TooManyReturnOrigins({ limit: maxReturnOrigins });
        }

        const name =
          request.name === undefined
            ? partner.name
            : yield* nameOf(request.name);

        const logoUrl = yield* logoOf(partner, request.logoUrl);

        const returnOrigins =
          request.returnOrigins === undefined
            ? partner.returnOrigins
            : yield* Effect.all(
                request.returnOrigins.map((origin) =>
                  Effect.fromResult(parseReturnOrigin(origin))
                )
              );

        const changed = changePartner(
          partner,
          { logoUrl, name, returnOrigins },
          yield* DateTime.now
        );

        yield* partners.save(changed);

        return changed;
      });

      const close = Effect.fn("PartnerAccounts.close")(function* close(
        actor: Actor
      ) {
        yield* Effect.fromResult(authorize(actor, "partner:manage"));
        yield* Effect.fromResult(inPerson(actor));

        const partner = yield* found(actor.workspaceId);
        const owned = yield* workspaces.idsOf(partner.id);

        if (owned.length > 0) {
          yield* new PartnerOwnsWorkspaces({
            owned: owned.length,
            workspaceId: actor.workspaceId,
          });
        }

        // The store refuses too, should a workspace be created meanwhile:
        // its rows refer to the account.
        yield* partners.closeOf(actor.workspaceId);
      });

      return PartnerAccounts.of({ change, close, grant, open, standing });
    })
  );
}
