import { and, desc, eq } from "drizzle-orm";
import { Effect, Layer, Option, Schema } from "effect";

import { LinkStore } from "#review/application/ports/link-store.ts";
import { ReviewLink } from "#review/domain/review-link.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";

import { date, failed, utc, utcOption } from "./rows.ts";
import { links } from "./schema.ts";

type LinkRow = typeof links.$inferSelect;

const decodeLink = Schema.decodeUnknownEffect(ReviewLink);

const toLink = (row: LinkRow) =>
  decodeLink({
    access: row.access,
    createdAt: utc(row.createdAt),
    createdBy: Option.fromNullOr(row.createdBy),
    expiresAt: utc(row.expiresAt),
    id: row.id,
    postId: row.postId,
    revokedAt: utcOption(row.revokedAt),
    workspaceId: row.workspaceId,
  }).pipe(Effect.orDie);

const first = (rows: readonly LinkRow[]) => {
  const [row] = rows;

  return row === undefined
    ? Effect.succeedNone
    : toLink(row).pipe(Effect.map(Option.some));
};

/** Review links in the review schema. */
export const DrizzleLinkStore = Layer.effect(
  LinkStore,
  Effect.gen(function* DrizzleLinkStore() {
    const db = yield* Drizzle;

    return LinkStore.of({
      byTokenHash: (tokenHash) =>
        db
          .select()
          .from(links)
          .where(eq(links.tokenHash, tokenHash))
          .pipe(Effect.mapError(failed), Effect.flatMap(first)),
      get: (workspaceId, linkId) =>
        db
          .select()
          .from(links)
          .where(and(eq(links.workspaceId, workspaceId), eq(links.id, linkId)))
          .pipe(Effect.mapError(failed), Effect.flatMap(first)),
      insert: (link, tokenHash) =>
        db
          .insert(links)
          .values({
            access: link.access,
            createdAt: date(link.createdAt),
            createdBy: Option.getOrNull(link.createdBy),
            expiresAt: date(link.expiresAt),
            id: link.id,
            postId: link.postId,
            revokedAt: null,
            tokenHash,
            workspaceId: link.workspaceId,
          })
          .pipe(Effect.mapError(failed), Effect.asVoid),
      ofPost: (workspaceId, postId) =>
        db
          .select()
          .from(links)
          .where(
            and(eq(links.workspaceId, workspaceId), eq(links.postId, postId))
          )
          .orderBy(desc(links.id))
          .pipe(
            Effect.mapError(failed),
            Effect.flatMap(Effect.forEach(toLink))
          ),
      update: (link) =>
        db
          .update(links)
          .set({
            revokedAt: link.revokedAt.pipe(Option.map(date), Option.getOrNull),
          })
          .where(eq(links.id, link.id))
          .pipe(Effect.mapError(failed), Effect.asVoid),
    });
  })
);
