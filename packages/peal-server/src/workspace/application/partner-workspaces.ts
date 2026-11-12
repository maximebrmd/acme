import { Context, DateTime, Effect, Layer, Option, Schema } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import { TransactionRunner } from "#shared/application/transaction-runner.ts";
import type { Actor } from "#shared/domain/access.ts";
import { authorize } from "#shared/domain/authorize.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { MissingPermission } from "#shared/domain/missing-permission.ts";
import {
  CustomerWorkspace,
  ExternalIdSchema,
  WorkspaceNameSchema,
} from "#workspace/domain/customer-workspace.ts";
import type { ExternalIdTaken } from "#workspace/domain/external-id-taken.ts";
import { creationKeyLifetime } from "#workspace/domain/idempotency.ts";
import { MissingPartnerScope } from "#workspace/domain/missing-partner-scope.ts";
import type { PartnerId } from "#workspace/domain/partner-id.ts";
import type { PartnerKeyPrincipal } from "#workspace/domain/partner-key-principal.ts";
import type { PartnerScope } from "#workspace/domain/partner-key.ts";
import type { Partner } from "#workspace/domain/partner.ts";

import { CreationKeyClaimed } from "./creation-key-claimed.ts";
import { CreationKeyReused } from "./creation-key-reused.ts";
import { CustomerWorkspaceNotFound } from "./customer-workspace-not-found.ts";
import {
  CustomerWorkspaces,
  WorkspacePositionSchema,
} from "./customer-workspaces.ts";
import type { CreationKeyUse, KeyedCreation } from "./customer-workspaces.ts";
import { InvalidWorkspaceCursor } from "./invalid-workspace-cursor.ts";
import { InvalidWorkspaceDetails } from "./invalid-workspace-details.ts";
import { PartnerNotFound } from "./partner-not-found.ts";
import { PartnerStore } from "./partner-store.ts";
import type { PartnerUsageDay } from "./partner-store.ts";
import { WorkspaceChannelCounts } from "./workspace-channel-counts.ts";

const decodeWorkspaceId = Schema.decodeUnknownOption(WorkspaceIdSchema);

// A cursor is a position, written so that clients keep it as it is: they
// are told nothing of what it holds, which may change.
const CursorSchema = Schema.StringFromBase64Url.pipe(
  Schema.decodeTo(Schema.fromJsonString(WorkspacePositionSchema))
);

const decodeCursor = Schema.decodeUnknownEffect(CursorSchema);

const encodeCursor = Schema.encodeEffect(CursorSchema);

const decodeName = Schema.decodeUnknownOption(WorkspaceNameSchema);

const decodeExternalId = Schema.decodeUnknownOption(ExternalIdSchema);

export const defaultWorkspacePageSize = 50;

export const maxWorkspacePageSize = 100;

/** A workspace a partner owns, with how many channels it has connected. */
export interface CountedWorkspace {
  readonly channels: number;
  readonly workspace: CustomerWorkspace;
}

/** A page of a partner's workspaces, newest first. */
export interface CountedWorkspacePage {
  /** The workspace to read the next page before; none on the last page. */
  readonly next: Option.Option<string>;
  readonly total: number;
  readonly workspaces: readonly CountedWorkspace[];
}

/** Which workspaces a partner asks for. */
export interface WorkspaceListRequest {
  readonly before: Option.Option<string>;
  readonly externalId: Option.Option<string>;
  readonly limit: Option.Option<number>;
  readonly name: Option.Option<string>;
}

/** What a partner gives a new workspace. */
export interface NewCustomerWorkspace {
  readonly externalId: Option.Option<string>;
  /**
   * The key the request names itself with, if it does: sent again with it
   * within `creationKeyLifetime`, it answers the workspace it made.
   */
  readonly idempotency: Option.Option<KeyedCreation>;
  readonly name: string;
}

/** The workspace a request made, or made when it was first sent. */
export interface CreatedWorkspace {
  readonly replayed: boolean;
  readonly workspace: CustomerWorkspace;
}

/** What a partner changes of a workspace: what is left out stays. */
export interface CustomerWorkspaceChange {
  /** Null removes the external id. */
  readonly externalId?: string | null;
  readonly name?: string;
}

/** What a partner account holds now, and held each of the last days. */
export interface PartnerUsage {
  readonly channels: number;
  readonly days: readonly PartnerUsageDay[];
  readonly workspaces: number;
}

// The external id a change leaves: the one it had when nothing is said,
// none when null is, or the one given, if it is one; none at all when what
// was given cannot be kept.
const externalIdOf = (
  workspace: CustomerWorkspace,
  externalId: string | null | undefined
): Option.Option<Option.Option<string>> => {
  if (externalId === undefined) {
    return Option.some(workspace.externalId);
  }

  return externalId === null
    ? Option.some(Option.none())
    : decodeExternalId(externalId).pipe(Option.map(Option.some));
};

const scoped = (key: PartnerKeyPrincipal, scope: PartnerScope) =>
  key.scopes.includes(scope)
    ? Effect.void
    : Effect.fail(new MissingPartnerScope({ scope }));

const limitOf = (limit: Option.Option<number>) =>
  Math.min(
    Math.max(
      Option.getOrElse(limit, () => defaultWorkspacePageSize),
      1
    ),
    maxWorkspacePageSize
  );

// How many days of counts an account's usage answers.
const usageDays = 35;

/**
 * The workspaces a partner owns, one for each of its customers: created,
 * found, listed and changed with a partner key, by the scopes it was given
 * (`workspaces:read`, `workspaces:write`), and listed and counted for the
 * home workspace's people (partner:read). Deleting one is
 * `OffboardWorkspace`.
 *
 * A workspace is created without members. Its external id, the partner's
 * own id for its customer, is unique among the partner's workspaces: a
 * second one answers `ExternalIdTaken` with the workspace that has it. A
 * creation sent with an idempotency key answers, sent again within
 * `creationKeyLifetime`, the workspace it made; the same key with another
 * request is refused. Every read names the partner, so a key never reaches
 * a workspace of anyone else: it reads as one that does not exist.
 */
export class PartnerWorkspaces extends Context.Service<
  PartnerWorkspaces,
  {
    readonly create: (
      key: PartnerKeyPrincipal,
      workspace: NewCustomerWorkspace
    ) => Effect.Effect<
      CreatedWorkspace,
      | CreationKeyReused
      | CustomerWorkspaceNotFound
      | DatabaseError
      | ExternalIdTaken
      | InvalidWorkspaceDetails
      | MissingPartnerScope
      | PartnerNotFound
    >;
    readonly get: (
      key: PartnerKeyPrincipal,
      workspaceId: string
    ) => Effect.Effect<
      CountedWorkspace,
      CustomerWorkspaceNotFound | DatabaseError | MissingPartnerScope
    >;
    readonly list: (
      key: PartnerKeyPrincipal,
      request: WorkspaceListRequest
    ) => Effect.Effect<
      CountedWorkspacePage,
      DatabaseError | InvalidWorkspaceCursor | MissingPartnerScope
    >;
    readonly change: (
      key: PartnerKeyPrincipal,
      workspaceId: string,
      change: CustomerWorkspaceChange
    ) => Effect.Effect<
      CountedWorkspace,
      | CustomerWorkspaceNotFound
      | DatabaseError
      | ExternalIdTaken
      | InvalidWorkspaceDetails
      | MissingPartnerScope
    >;
    /** The partner account a key belongs to, and what it holds. */
    readonly account: (
      key: PartnerKeyPrincipal
    ) => Effect.Effect<
      { readonly partner: Partner; readonly usage: PartnerUsage },
      DatabaseError | PartnerNotFound
    >;
    /** The workspaces the actor's partner account owns, for its people. */
    readonly listFor: (
      actor: Actor,
      request: WorkspaceListRequest
    ) => Effect.Effect<
      CountedWorkspacePage,
      | DatabaseError
      | InvalidWorkspaceCursor
      | MissingPermission
      | PartnerNotFound
    >;
    /** What the actor's partner account holds, for its people. */
    readonly usageFor: (
      actor: Actor
    ) => Effect.Effect<
      PartnerUsage,
      DatabaseError | MissingPermission | PartnerNotFound
    >;
    /**
     * A page of the partner's workspaces, as `list` answers it, for the
     * workspace context's use cases that have checked who asks
     * (`PartnerTenants`).
     */
    readonly pageOf: (
      partnerId: PartnerId,
      request: WorkspaceListRequest
    ) => Effect.Effect<
      CountedWorkspacePage,
      DatabaseError | InvalidWorkspaceCursor
    >;
    /** Counts what every partner holds today (UTC), and keeps it. */
    readonly meter: Effect.Effect<number, DatabaseError>;
    /** Forgets the idempotency keys past their time, and says how many. */
    readonly purgeKeys: Effect.Effect<number, DatabaseError>;
  }
>()("peal-server/workspace/application/PartnerWorkspaces") {
  static readonly layer = Layer.effect(
    PartnerWorkspaces,
    Effect.gen(function* PartnerWorkspacesLive() {
      const partners = yield* PartnerStore;
      const workspaces = yield* CustomerWorkspaces;
      const counts = yield* WorkspaceChannelCounts;
      const { transaction } = yield* TransactionRunner;

      const counted = Effect.fn("PartnerWorkspaces.counted")(function* counted(
        found: readonly CustomerWorkspace[]
      ) {
        const channels = yield* counts.of(found.map(({ id }) => id));

        return found.map((workspace): CountedWorkspace => ({
          channels: channels.get(workspace.id) ?? 0,
          workspace,
        }));
      });

      const one = (workspace: CustomerWorkspace) =>
        counted([workspace]).pipe(
          Effect.map(
            ([first]): CountedWorkspace => first ?? { channels: 0, workspace }
          )
        );

      const owned = Effect.fn("PartnerWorkspaces.owned")(function* owned(
        partnerId: PartnerId,
        workspaceId: string
      ) {
        const id = decodeWorkspaceId(workspaceId);

        const found = Option.isSome(id)
          ? yield* workspaces.ofPartner(partnerId, id.value)
          : Option.none<CustomerWorkspace>();

        if (Option.isNone(found)) {
          return yield* new CustomerWorkspaceNotFound();
        }

        return found.value;
      });

      const page = Effect.fn("PartnerWorkspaces.page")(function* page(
        partnerId: PartnerId,
        request: WorkspaceListRequest
      ) {
        const limit = limitOf(request.limit);

        const found = yield* workspaces.list(partnerId, {
          before: yield* Option.match(request.before, {
            onNone: () => Effect.succeed(Option.none()),
            onSome: (cursor) =>
              decodeCursor(cursor).pipe(
                Effect.mapError(() => new InvalidWorkspaceCursor()),
                Effect.asSome
              ),
          }),
          externalId: request.externalId,
          // One more than asked, to know whether another page follows.
          limit: limit + 1,
          name: request.name.pipe(
            Option.map((name) => name.trim()),
            Option.filter((name) => name !== "")
          ),
        });

        const shown = found.workspaces.slice(0, limit);

        const listed: CountedWorkspacePage = {
          next:
            found.workspaces.length > limit
              ? yield* Effect.transposeOption(
                  Option.fromUndefinedOr(shown.at(-1)).pipe(
                    Option.map(({ createdAt, id }) =>
                      encodeCursor({ createdAt, id }).pipe(Effect.orDie)
                    )
                  )
                )
              : Option.none(),
          total: found.total,
          workspaces: yield* counted(shown),
        };

        return listed;
      });

      const usageOf = Effect.fn("PartnerWorkspaces.usageOf")(function* usageOf(
        partner: Partner
      ) {
        const ids = yield* workspaces.idsOf(partner.id);
        // The home workspace's channels count with those of the
        // workspaces the partner owns: one plan holds them all.
        const channels = yield* counts.of([partner.workspaceId, ...ids]);
        const now = yield* DateTime.now;

        const usage: PartnerUsage = {
          channels: [...channels.values()].reduce((sum, held) => sum + held, 0),
          days: yield* partners.usage(
            partner.id,
            DateTime.subtract(now, { days: usageDays })
          ),
          workspaces: ids.length,
        };

        return usage;
      });

      const partnerOf = (actor: Actor) =>
        partners.ofWorkspace(actor.workspaceId).pipe(
          Effect.flatMap(
            Option.match({
              onNone: () => Effect.fail(new PartnerNotFound()),
              onSome: Effect.succeed,
            })
          )
        );

      // The workspace an earlier request made with the key, or the refusal
      // of a key first sent with another request.
      const replayOf = Effect.fn("PartnerWorkspaces.replayOf")(
        function* replayOf(partnerId: PartnerId, use: CreationKeyUse) {
          if (!use.sameRequest) {
            return yield* new CreationKeyReused();
          }

          const made = yield* workspaces.ofPartner(partnerId, use.workspaceId);

          // Offboarded since: nothing is made again under the same key.
          if (Option.isNone(made)) {
            return yield* new CustomerWorkspaceNotFound();
          }

          const replayed: CreatedWorkspace = {
            replayed: true,
            workspace: made.value,
          };

          return replayed;
        }
      );

      const create = Effect.fn("PartnerWorkspaces.create")(function* create(
        key: PartnerKeyPrincipal,
        request: NewCustomerWorkspace
      ) {
        yield* scoped(key, "workspaces:write");

        const name = decodeName(request.name);

        const externalId = request.externalId.pipe(
          Option.map((given) => decodeExternalId(given))
        );

        if (Option.isNone(name)) {
          return yield* new InvalidWorkspaceDetails({ field: "name" });
        }

        if (Option.exists(externalId, (decoded) => Option.isNone(decoded))) {
          return yield* new InvalidWorkspaceDetails({ field: "externalId" });
        }

        const now = yield* DateTime.now;
        const since = DateTime.subtractDuration(now, creationKeyLifetime);

        if (Option.isSome(request.idempotency)) {
          const used = yield* workspaces.keyUse(
            key.partnerId,
            request.idempotency.value,
            since
          );

          if (Option.isSome(used)) {
            return yield* replayOf(key.partnerId, used.value);
          }
        }

        return yield* transaction(
          Effect.gen(function* creating() {
            // Under the partner's hold, which closing the account takes
            // too: the workspace is made for an account that is there, or
            // not at all.
            yield* workspaces.hold(key.partnerId);

            if (Option.isNone(yield* partners.get(key.partnerId))) {
              return yield* new PartnerNotFound();
            }

            const workspace = yield* workspaces.create({
              createdAt: now,
              externalId: Option.flatten(externalId),
              name: name.value,
              partnerId: key.partnerId,
            });

            if (Option.isSome(request.idempotency)) {
              const claimed = yield* workspaces.claimKey(
                key.partnerId,
                request.idempotency.value,
                { at: now, workspaceId: workspace.id },
                since
              );

              if (Option.isSome(claimed)) {
                return yield* new CreationKeyClaimed(claimed.value);
              }
            }

            const created: CreatedWorkspace = { replayed: false, workspace };

            return created;
          })
        ).pipe(
          Effect.catchTag("CreationKeyClaimed", (claimed) =>
            replayOf(key.partnerId, claimed)
          )
        );
      });

      const get = Effect.fn("PartnerWorkspaces.get")(function* get(
        key: PartnerKeyPrincipal,
        workspaceId: string
      ) {
        yield* scoped(key, "workspaces:read");

        return yield* one(yield* owned(key.partnerId, workspaceId));
      });

      const list = Effect.fn("PartnerWorkspaces.list")(function* list(
        key: PartnerKeyPrincipal,
        request: WorkspaceListRequest
      ) {
        yield* scoped(key, "workspaces:read");

        return yield* page(key.partnerId, request);
      });

      const change = Effect.fn("PartnerWorkspaces.change")(function* change(
        key: PartnerKeyPrincipal,
        workspaceId: string,
        request: CustomerWorkspaceChange
      ) {
        yield* scoped(key, "workspaces:write");

        const workspace = yield* owned(key.partnerId, workspaceId);

        const name =
          request.name === undefined
            ? Option.some(workspace.name)
            : decodeName(request.name);

        const externalId = externalIdOf(workspace, request.externalId);

        if (Option.isNone(name)) {
          return yield* new InvalidWorkspaceDetails({ field: "name" });
        }

        if (Option.isNone(externalId)) {
          return yield* new InvalidWorkspaceDetails({ field: "externalId" });
        }

        const changed = new CustomerWorkspace({
          createdAt: workspace.createdAt,
          externalId: externalId.value,
          id: workspace.id,
          name: name.value,
          partnerId: workspace.partnerId,
        });

        if (!(yield* workspaces.save(changed))) {
          return yield* new CustomerWorkspaceNotFound();
        }

        return yield* one(changed);
      });

      const account = Effect.fn("PartnerWorkspaces.account")(function* account(
        key: PartnerKeyPrincipal
      ) {
        const partner = yield* partners.get(key.partnerId);

        if (Option.isNone(partner)) {
          return yield* new PartnerNotFound();
        }

        return { partner: partner.value, usage: yield* usageOf(partner.value) };
      });

      const listFor = Effect.fn("PartnerWorkspaces.listFor")(function* listFor(
        actor: Actor,
        request: WorkspaceListRequest
      ) {
        yield* Effect.fromResult(authorize(actor, "partner:read"));

        return yield* page((yield* partnerOf(actor)).id, request);
      });

      const usageFor = Effect.fn("PartnerWorkspaces.usageFor")(
        function* usageFor(actor: Actor) {
          yield* Effect.fromResult(authorize(actor, "partner:read"));

          return yield* usageOf(yield* partnerOf(actor));
        }
      );

      const meter = Effect.gen(function* meter() {
        const day = DateTime.formatIsoDateUtc(yield* DateTime.now);
        const every = yield* partners.all;

        yield* Effect.forEach(
          every,
          (partner) =>
            usageOf(partner).pipe(
              Effect.flatMap(({ channels, workspaces: held }) =>
                partners.recordUsage(partner.id, {
                  channels,
                  day,
                  workspaces: held,
                })
              )
            ),
          { discard: true }
        );

        return every.length;
      }).pipe(Effect.withSpan("PartnerWorkspaces.meter"));

      const purgeKeys = DateTime.now.pipe(
        Effect.flatMap((now) =>
          workspaces.purgeKeys(
            DateTime.subtractDuration(now, creationKeyLifetime)
          )
        ),
        Effect.withSpan("PartnerWorkspaces.purgeKeys")
      );

      return PartnerWorkspaces.of({
        account,
        change,
        create,
        get,
        list,
        listFor,
        meter,
        pageOf: page,
        purgeKeys,
        usageFor,
      });
    })
  );
}
