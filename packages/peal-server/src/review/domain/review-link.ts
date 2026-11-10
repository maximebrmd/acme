import { DateTime, Duration, Option, Schema } from "effect";

import {
  PostIdSchema,
  UserIdSchema,
  WorkspaceIdSchema,
} from "#shared/domain/ids.ts";

import { ReviewLinkIdSchema } from "./review-ids.ts";

/**
 * What a link lets whoever opens it do: see the post (`view`); see it and
 * comment (`comment`); see it, comment and approve it or ask for changes
 * (`approve`). Stored with links: add a level, never rename or remove one.
 */
export const LinkAccessSchema = Schema.Literals(["view", "comment", "approve"]);

export type LinkAccess = typeof LinkAccessSchema.Type;

const levels: Readonly<Record<LinkAccess, number>> = {
  approve: 2,
  comment: 1,
  view: 0,
};

/** How long a link works when nobody says. */
export const defaultLinkLifetime = Duration.days(14);

/** The longest a link works. */
export const maxLinkLifetime = Duration.days(90);

/** The shortest a link works. */
export const minLinkLifetime = Duration.hours(1);

/**
 * A link to one post, for someone without an account. Whoever holds its
 * token opens it; only the token's hash is kept, so the link cannot be
 * rebuilt from what is stored. It ends when it expires or is revoked.
 */
export class ReviewLink extends Schema.Class<ReviewLink>(
  "peal-server/review/domain/ReviewLink"
)({
  access: LinkAccessSchema,
  createdAt: Schema.DateTimeUtc,
  // The member who made it; none when an API key did.
  createdBy: Schema.Option(UserIdSchema),
  expiresAt: Schema.DateTimeUtc,
  id: ReviewLinkIdSchema,
  postId: PostIdSchema,
  revokedAt: Schema.Option(Schema.DateTimeUtc),
  workspaceId: WorkspaceIdSchema,
}) {}

/** Whether the link lets its visitors do this. */
export const allows = (link: ReviewLink, needed: LinkAccess): boolean =>
  levels[link.access] >= levels[needed];

/** Where a link is: working, or ended and why. */
export type LinkStanding = "active" | "expired" | "revoked";

export const standingOf = (
  link: ReviewLink,
  now: DateTime.Utc
): LinkStanding => {
  if (Option.isSome(link.revokedAt)) {
    return "revoked";
  }

  return DateTime.isLessThan(now, link.expiresAt) ? "active" : "expired";
};

/**
 * When a link made at `now` ends: after the lifetime asked for, kept
 * between `minLinkLifetime` and `maxLinkLifetime`, or after
 * `defaultLinkLifetime`.
 */
export const expiryOf = (
  now: DateTime.Utc,
  asked: Option.Option<Duration.Duration>
): DateTime.Utc =>
  DateTime.addDuration(
    now,
    asked.pipe(
      Option.map((lifetime) =>
        Duration.clamp(lifetime, {
          maximum: maxLinkLifetime,
          minimum: minLinkLifetime,
        })
      ),
      Option.getOrElse(() => defaultLinkLifetime)
    )
  );

/** The link, revoked at `now`; one already revoked stays as it is. */
export const revoke = (link: ReviewLink, now: DateTime.Utc): ReviewLink =>
  Option.isSome(link.revokedAt)
    ? link
    : new ReviewLink({
        access: link.access,
        createdAt: link.createdAt,
        createdBy: link.createdBy,
        expiresAt: link.expiresAt,
        id: link.id,
        postId: link.postId,
        revokedAt: Option.some(now),
        workspaceId: link.workspaceId,
      });
