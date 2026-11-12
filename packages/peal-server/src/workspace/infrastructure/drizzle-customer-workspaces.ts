import { and, count, desc, eq, gt, ilike, lt, lte, or, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { DateTime, Effect, Layer, Option, Schema } from "effect";
import { Digest } from "effect/crypto";
import { SqlClient } from "effect/sql";

import { DatabaseError } from "#shared/application/database-error.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import { anyUuid } from "#shared/infrastructure/any-uuid.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";
import { CustomerWorkspaces } from "#workspace/application/customer-workspaces.ts";
import type {
  CreationKeyUse,
  KeyedCreation,
  WorkspaceOwner,
} from "#workspace/application/customer-workspaces.ts";
import { CustomerWorkspace } from "#workspace/domain/customer-workspace.ts";
import { ExternalIdTaken } from "#workspace/domain/external-id-taken.ts";
import { PartnerIdSchema } from "#workspace/domain/partner-id.ts";
import type { PartnerId } from "#workspace/domain/partner-id.ts";

import { organization } from "./auth-schema.generated.ts";
import {
  partnerIdempotencyKeys,
  partners,
  partnerWorkspaces,
} from "./schema.ts";

const failed = (cause: unknown) => new DatabaseError({ cause });

const date = (instant: DateTime.Utc) => DateTime.toDateUtc(instant);

const utc = (stored: Date) => DateTime.fromDateUnsafe(stored);

const encoder = new TextEncoder();

const decodeWorkspace = Schema.decodeUnknownEffect(CustomerWorkspace);

interface Row {
  readonly createdAt: Date;
  readonly externalId: string | null;
  readonly name: string;
  readonly partnerId: string;
  readonly workspaceId: string;
}

const toWorkspace = (row: Row) =>
  decodeWorkspace({
    createdAt: utc(row.createdAt),
    externalId: Option.fromNullOr(row.externalId),
    id: row.workspaceId,
    name: row.name,
    partnerId: row.partnerId,
  }).pipe(Effect.orDie);

const one = (rows: readonly Row[]) =>
  Option.match(Option.fromUndefinedOr(rows[0]), {
    onNone: () => Effect.succeedNone,
    onSome: (row) => toWorkspace(row).pipe(Effect.map(Option.some)),
  });

// LIKE reads these as wildcards: a name is searched as it is written.
const literally = (text: string) =>
  text.replaceAll(/[\\%_]/gu, String.raw`\$&`);

/**
 * CustomerWorkspaces on the sign-in service's `organization` table, where
 * every workspace is, and the workspace schema, which says whose each is.
 * A workspace a partner owns is written here, not through the sign-in
 * service's routes, which create a workspace for the person who asks and
 * make them its owner: these have no members. Its slug, which the sign-in
 * service wants unique, is its id.
 */
export const DrizzleCustomerWorkspaces = Layer.effect(
  CustomerWorkspaces,
  Effect.gen(function* DrizzleCustomerWorkspaces() {
    const db = yield* Drizzle;
    const client = yield* SqlClient.SqlClient;
    const digest = yield* Digest.Digest;

    const hashOf = (text: string) =>
      digest
        .digestHex(Digest.sha256, encoder.encode(text))
        .pipe(Effect.mapError(failed));

    const digestsOf = ({ fingerprint, key }: KeyedCreation) =>
      Effect.all({
        keyDigest: hashOf(key),
        requestDigest: hashOf(fingerprint),
      });

    const columns = {
      createdAt: partnerWorkspaces.createdAt,
      externalId: partnerWorkspaces.externalId,
      name: organization.name,
      partnerId: partnerWorkspaces.partnerId,
      workspaceId: partnerWorkspaces.workspaceId,
    };

    const owned = () =>
      db
        .select(columns)
        .from(partnerWorkspaces)
        .innerJoin(
          organization,
          eq(organization.id, partnerWorkspaces.workspaceId)
        );

    // The partner of each workspace `where` names, with its home
    // workspace.
    const owners = (where: SQL, limit?: number) => {
      const query = db
        .select({
          externalId: partnerWorkspaces.externalId,
          homeWorkspaceId: partners.workspaceId,
          partnerId: partnerWorkspaces.partnerId,
          workspaceId: partnerWorkspaces.workspaceId,
        })
        .from(partnerWorkspaces)
        .innerJoin(partners, eq(partners.id, partnerWorkspaces.partnerId))
        .where(where);

      return (limit === undefined ? query : query.limit(limit)).pipe(
        Effect.mapError(failed),
        Effect.map((rows) =>
          rows.map((found) => ({
            owner: {
              externalId: Option.fromNullOr(found.externalId),
              homeWorkspaceId: WorkspaceIdSchema.make(found.homeWorkspaceId),
              partnerId: PartnerIdSchema.make(found.partnerId),
            } satisfies WorkspaceOwner,
            workspaceId: WorkspaceIdSchema.make(found.workspaceId),
          }))
        )
      );
    };

    const findByExternalId = (partnerId: PartnerId, externalId: string) =>
      owned()
        .where(
          and(
            eq(partnerWorkspaces.partnerId, partnerId),
            eq(partnerWorkspaces.externalId, externalId)
          )
        )
        .limit(1)
        .pipe(Effect.mapError(failed), Effect.flatMap(one));

    // The workspace of the partner that has the external id, when a write
    // that gave it changed nothing: the unique constraint held it back.
    const takenBy = (
      partnerId: PartnerId,
      externalId: Option.Option<string>,
      except: Option.Option<WorkspaceId>
    ) =>
      Option.match(externalId, {
        onNone: () => Effect.void,
        onSome: (given) =>
          findByExternalId(partnerId, given).pipe(
            Effect.flatMap(
              Option.match({
                onNone: () => Effect.void,
                onSome: (holder) =>
                  Option.contains(except, holder.id)
                    ? Effect.void
                    : Effect.fail(
                        new ExternalIdTaken({
                          externalId: given,
                          workspaceId: holder.id,
                        })
                      ),
              })
            )
          ),
      });

    const useOf = (
      partnerId: PartnerId,
      digests: { readonly keyDigest: string; readonly requestDigest: string },
      since: DateTime.Utc
    ) =>
      db
        .select({
          requestDigest: partnerIdempotencyKeys.requestDigest,
          workspaceId: partnerIdempotencyKeys.workspaceId,
        })
        .from(partnerIdempotencyKeys)
        .where(
          and(
            eq(partnerIdempotencyKeys.partnerId, partnerId),
            eq(partnerIdempotencyKeys.keyDigest, digests.keyDigest),
            gt(partnerIdempotencyKeys.createdAt, date(since))
          )
        )
        .limit(1)
        .pipe(
          Effect.mapError(failed),
          Effect.map(([row]) =>
            Option.fromUndefinedOr(row).pipe(
              Option.map((used): CreationKeyUse => ({
                sameRequest: used.requestDigest === digests.requestDigest,
                workspaceId: WorkspaceIdSchema.make(used.workspaceId),
              }))
            )
          )
        );

    return CustomerWorkspaces.of({
      claimKey: (partnerId, request, use, since) =>
        Effect.gen(function* claimKey() {
          const digests = yield* digestsOf(request);

          // The key's row, written unless one newer than `since` holds
          // it. A row another transaction is writing is waited for here.
          const written = yield* db
            .insert(partnerIdempotencyKeys)
            .values({
              createdAt: date(use.at),
              keyDigest: digests.keyDigest,
              partnerId,
              requestDigest: digests.requestDigest,
              workspaceId: use.workspaceId,
            })
            .onConflictDoUpdate({
              set: {
                createdAt: date(use.at),
                requestDigest: digests.requestDigest,
                workspaceId: use.workspaceId,
              },
              setWhere: lte(partnerIdempotencyKeys.createdAt, date(since)),
              target: [
                partnerIdempotencyKeys.partnerId,
                partnerIdempotencyKeys.keyDigest,
              ],
            })
            .returning({ workspaceId: partnerIdempotencyKeys.workspaceId })
            .pipe(Effect.mapError(failed));

          return written.length > 0
            ? Option.none<CreationKeyUse>()
            : yield* useOf(partnerId, digests, since);
        }),
      // In one transaction, which joins the caller's: the workspace and
      // whose it is are written together, and an external id another of
      // the partner's workspaces has writes neither.
      create: (workspace) =>
        client
          .withTransaction(
            Effect.gen(function* create() {
              const externalId = Option.getOrNull(workspace.externalId);

              const [made] = yield* db
                .insert(organization)
                .values({
                  createdAt: date(workspace.createdAt),
                  name: workspace.name,
                  // Replaced by the id just below: unique meanwhile.
                  slug: sql`pg_catalog.gen_random_uuid()::text`,
                })
                .returning({ id: organization.id })
                .pipe(Effect.mapError(failed));

              if (made === undefined) {
                return yield* Effect.die("A workspace was not written");
              }

              yield* db
                .update(organization)
                .set({ slug: made.id })
                .where(eq(organization.id, made.id))
                .pipe(Effect.mapError(failed));

              const tied = yield* db
                .insert(partnerWorkspaces)
                .values({
                  createdAt: date(workspace.createdAt),
                  externalId,
                  partnerId: workspace.partnerId,
                  workspaceId: made.id,
                })
                .onConflictDoNothing({
                  target: [
                    partnerWorkspaces.partnerId,
                    partnerWorkspaces.externalId,
                  ],
                })
                .returning({ workspaceId: partnerWorkspaces.workspaceId })
                .pipe(Effect.mapError(failed));

              if (tied.length === 0) {
                yield* takenBy(
                  workspace.partnerId,
                  workspace.externalId,
                  Option.none()
                );

                return yield* Effect.die("A workspace was not tied");
              }

              return yield* toWorkspace({
                createdAt: date(workspace.createdAt),
                externalId,
                name: workspace.name,
                partnerId: workspace.partnerId,
                workspaceId: made.id,
              });
            })
          )
          .pipe(
            Effect.catchTag("SqlError", (failure) =>
              Effect.fail(failed(failure))
            )
          ),
      findByExternalId,
      // A transaction's advisory lock, in the two-key form: the first key
      // names what it guards, the second the partner.
      hold: (partnerId) =>
        client`SELECT pg_advisory_xact_lock(hashtext('peal-server/workspace/partner'), hashtext(${partnerId}))`.pipe(
          Effect.mapError(failed),
          Effect.asVoid
        ),
      idsOf: (partnerId) =>
        db
          .select({ workspaceId: partnerWorkspaces.workspaceId })
          .from(partnerWorkspaces)
          .where(eq(partnerWorkspaces.partnerId, partnerId))
          .pipe(
            Effect.mapError(failed),
            Effect.map((rows) =>
              rows.map(({ workspaceId }) => WorkspaceIdSchema.make(workspaceId))
            )
          ),
      idsOfEach: (partnerIds) =>
        partnerIds.length === 0
          ? Effect.succeed(new Map())
          : db
              .select({
                partnerId: partnerWorkspaces.partnerId,
                workspaceId: partnerWorkspaces.workspaceId,
              })
              .from(partnerWorkspaces)
              .where(anyUuid(partnerWorkspaces.partnerId, partnerIds))
              .pipe(
                Effect.mapError(failed),
                Effect.map((rows) => {
                  const byPartner = new Map<PartnerId, WorkspaceId[]>();

                  for (const row of rows) {
                    const partnerId = PartnerIdSchema.make(row.partnerId);
                    const workspaces = byPartner.get(partnerId) ?? [];

                    workspaces.push(WorkspaceIdSchema.make(row.workspaceId));
                    byPartner.set(partnerId, workspaces);
                  }

                  return byPartner;
                })
              ),
      keyUse: (partnerId, request, since) =>
        digestsOf(request).pipe(
          Effect.flatMap((digests) => useOf(partnerId, digests, since))
        ),
      list: (partnerId, filter) =>
        Effect.gen(function* list() {
          const matching = and(
            eq(partnerWorkspaces.partnerId, partnerId),
            Option.getOrUndefined(
              filter.externalId.pipe(
                Option.map((externalId) =>
                  eq(partnerWorkspaces.externalId, externalId)
                )
              )
            ),
            Option.getOrUndefined(
              filter.name.pipe(
                Option.map((name) =>
                  ilike(organization.name, `%${literally(name)}%`)
                )
              )
            )
          );

          const [counted] = yield* db
            .select({ total: count() })
            .from(partnerWorkspaces)
            .innerJoin(
              organization,
              eq(organization.id, partnerWorkspaces.workspaceId)
            )
            .where(matching)
            .pipe(Effect.mapError(failed));

          // Newest first; the page after `before` holds those created
          // earlier, or at the same instant with a smaller id.
          const rows = yield* owned()
            .where(
              and(
                matching,
                Option.getOrUndefined(
                  filter.before.pipe(
                    Option.map(({ createdAt, id }) => {
                      const at = DateTime.toDateUtc(createdAt);

                      return or(
                        lt(partnerWorkspaces.createdAt, at),
                        and(
                          eq(partnerWorkspaces.createdAt, at),
                          lt(partnerWorkspaces.workspaceId, id)
                        )
                      );
                    })
                  )
                )
              )
            )
            .orderBy(
              desc(partnerWorkspaces.createdAt),
              desc(partnerWorkspaces.workspaceId)
            )
            .limit(filter.limit)
            .pipe(Effect.mapError(failed));

          return {
            total: counted?.total ?? 0,
            workspaces: yield* Effect.all(rows.map((row) => toWorkspace(row))),
          };
        }),
      nameOf: (workspaceId) =>
        db
          .select({ name: organization.name })
          .from(organization)
          .where(eq(organization.id, workspaceId))
          .limit(1)
          .pipe(
            Effect.mapError(failed),
            Effect.map(([row]) =>
              Option.fromUndefinedOr(row).pipe(Option.map(({ name }) => name))
            )
          ),
      ofPartner: (partnerId, workspaceId) =>
        owned()
          .where(
            and(
              eq(partnerWorkspaces.partnerId, partnerId),
              eq(partnerWorkspaces.workspaceId, workspaceId)
            )
          )
          .limit(1)
          .pipe(Effect.mapError(failed), Effect.flatMap(one)),
      ownerOf: (workspaceId) =>
        owners(eq(partnerWorkspaces.workspaceId, workspaceId), 1).pipe(
          Effect.map(([found]) => Option.fromUndefinedOr(found?.owner))
        ),
      ownersIn: (workspaceIds) =>
        workspaceIds.length === 0
          ? Effect.succeed(new Map())
          : owners(anyUuid(partnerWorkspaces.workspaceId, workspaceIds)).pipe(
              Effect.map(
                (found) =>
                  new Map(
                    found.map(({ owner, workspaceId }) => [workspaceId, owner])
                  )
              )
            ),
      purgeKeys: (before) =>
        db
          .delete(partnerIdempotencyKeys)
          .where(lte(partnerIdempotencyKeys.createdAt, date(before)))
          .returning({ partnerId: partnerIdempotencyKeys.partnerId })
          .pipe(
            Effect.mapError(failed),
            Effect.map((rows) => rows.length)
          ),
      release: (workspaceId) =>
        db
          .delete(partnerWorkspaces)
          .where(eq(partnerWorkspaces.workspaceId, workspaceId))
          .pipe(Effect.mapError(failed), Effect.asVoid),
      save: (workspace) =>
        client
          .withTransaction(
            Effect.gen(function* save() {
              const externalId = Option.getOrNull(workspace.externalId);

              // Another of the partner's workspaces holding the external
              // id is found before the write, which would fail on it; one
              // that takes it in between fails the write, as a conflict.
              yield* takenBy(
                workspace.partnerId,
                workspace.externalId,
                Option.some(workspace.id)
              );

              const tied = yield* db
                .update(partnerWorkspaces)
                .set({ externalId })
                .where(
                  and(
                    eq(partnerWorkspaces.partnerId, workspace.partnerId),
                    eq(partnerWorkspaces.workspaceId, workspace.id)
                  )
                )
                .returning({ workspaceId: partnerWorkspaces.workspaceId })
                .pipe(Effect.mapError(failed));

              if (tied.length === 0) {
                return false;
              }

              yield* db
                .update(organization)
                .set({ name: workspace.name })
                .where(eq(organization.id, workspace.id))
                .pipe(Effect.mapError(failed));

              return true;
            })
          )
          .pipe(
            Effect.catchTag("SqlError", (failure) =>
              Effect.fail(failed(failure))
            )
          ),
    });
  })
).pipe(Layer.provide(Digest.layerWebCrypto));
