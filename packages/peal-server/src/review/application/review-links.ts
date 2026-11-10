import { Context, DateTime, Effect, Layer, Option } from "effect";
import type { Duration } from "effect";

import { isImpersonated } from "#review/domain/approval-policy.ts";
import { ReviewLinkIdSchema } from "#review/domain/review-ids.ts";
import type { ReviewLinkId } from "#review/domain/review-ids.ts";
import {
  expiryOf,
  ReviewLink,
  revoke as revokeLink,
  standingOf,
} from "#review/domain/review-link.ts";
import type { LinkAccess } from "#review/domain/review-link.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import { newId } from "#shared/application/ids.ts";
import type { Ids } from "#shared/application/ids.ts";
import type { Actor } from "#shared/domain/access.ts";
import { authorize } from "#shared/domain/authorize.ts";
import type { PostId } from "#shared/domain/ids.ts";
import { MissingPermission } from "#shared/domain/missing-permission.ts";

import { LinkAddresses } from "./ports/link-addresses.ts";
import { LinkStore } from "./ports/link-store.ts";
import { LinkTokens } from "./ports/link-tokens.ts";
import { ReviewedPosts } from "./ports/reviewed-posts.ts";
import { PostNotReviewable } from "./post-not-reviewable.ts";
import { ReviewLinkNotFound } from "./review-link-not-found.ts";
import { ReviewPostNotFound } from "./review-post-not-found.ts";
import { TooManyLinks } from "./too-many-links.ts";

/** The most links of a post that work at once. */
export const maxActiveLinksPerPost = 20;

/** A link to make: what it allows, and how long it works. */
export interface LinkRequest {
  readonly access: LinkAccess;
  /** None for the default, `defaultLinkLifetime`. */
  readonly lifetime: Option.Option<Duration.Duration>;
}

/** A link just made, with the token that opens it, told this once. */
export interface CreatedLink {
  readonly link: ReviewLink;
  readonly token: string;
  /** The page that shows the post. */
  readonly url: string;
}

const mayManage = (actor: Actor) =>
  isImpersonated(actor)
    ? Effect.fail(new MissingPermission({ permission: "post:approve" }))
    : Effect.fromResult(authorize(actor, "post:approve"));

/**
 * The links that show a post to people without an account. Making and
 * revoking one need post:approve, since a link may let its holders approve,
 * and never work for staff acting as a member: a link outlives them, and
 * reaches outside Peal. Listing a post's links needs post:read, and shows
 * no token: a link's address is told once, when it is made.
 *
 * A link is made for a post that may still change or go out (a draft, one
 * that waits for an approval, a scheduled one), `maxActiveLinksPerPost` at
 * most at once.
 */
export class ReviewLinks extends Context.Service<
  ReviewLinks,
  {
    readonly create: (
      actor: Actor,
      postId: PostId,
      request: LinkRequest
    ) => Effect.Effect<
      CreatedLink,
      | DatabaseError
      | MissingPermission
      | PostNotReviewable
      | ReviewPostNotFound
      | TooManyLinks
    >;
    /** The post's links, newest first, ended ones included. */
    readonly ofPost: (
      actor: Actor,
      postId: PostId
    ) => Effect.Effect<
      readonly ReviewLink[],
      DatabaseError | MissingPermission | ReviewPostNotFound
    >;
    /** Ends a link at once. One already revoked stays as it is. */
    readonly revoke: (
      actor: Actor,
      linkId: ReviewLinkId
    ) => Effect.Effect<
      ReviewLink,
      DatabaseError | MissingPermission | ReviewLinkNotFound
    >;
  }
>()("peal-server/review/application/ReviewLinks") {
  static readonly layer = Layer.effect(
    ReviewLinks,
    Effect.gen(function* ReviewLinksLive() {
      const addresses = yield* LinkAddresses;
      const links = yield* LinkStore;
      const posts = yield* ReviewedPosts;
      const tokens = yield* LinkTokens;
      const ids = yield* Effect.context<Ids>();

      const postOf = Effect.fn("ReviewLinks.postOf")(function* postOf(
        actor: Actor,
        postId: PostId
      ) {
        const found = yield* posts.get(actor.workspaceId, postId);

        return yield* Option.match(found, {
          onNone: () => Effect.fail(new ReviewPostNotFound({ postId })),
          onSome: Effect.succeed,
        });
      });

      const create = Effect.fn("ReviewLinks.create")(function* create(
        actor: Actor,
        postId: PostId,
        { access, lifetime }: LinkRequest
      ) {
        yield* mayManage(actor);

        const post = yield* postOf(actor, postId);

        if (post.status === "published" || post.status === "cancelled") {
          return yield* new PostNotReviewable({ postId, status: post.status });
        }

        const now = yield* DateTime.now;
        const existing = yield* links.ofPost(actor.workspaceId, postId);

        const active = existing.filter(
          (link) => standingOf(link, now) === "active"
        );

        if (active.length >= maxActiveLinksPerPost) {
          return yield* new TooManyLinks({ limit: maxActiveLinksPerPost });
        }

        const { hash, token } = yield* tokens.issue;

        const link = new ReviewLink({
          access,
          createdAt: now,
          createdBy:
            actor.subject._tag === "user"
              ? Option.some(actor.subject.userId)
              : Option.none(),
          expiresAt: expiryOf(now, lifetime),
          id: yield* newId(ReviewLinkIdSchema).pipe(Effect.provideContext(ids)),
          postId,
          revokedAt: Option.none(),
          workspaceId: actor.workspaceId,
        });

        yield* links.insert(link, hash);

        return { link, token, url: addresses.of(token) };
      });

      const ofPost = Effect.fn("ReviewLinks.ofPost")(function* ofPost(
        actor: Actor,
        postId: PostId
      ) {
        yield* Effect.fromResult(authorize(actor, "post:read"));
        yield* postOf(actor, postId);

        return yield* links.ofPost(actor.workspaceId, postId);
      });

      const revoke = Effect.fn("ReviewLinks.revoke")(function* revoke(
        actor: Actor,
        linkId: ReviewLinkId
      ) {
        yield* mayManage(actor);

        const found = yield* links.get(actor.workspaceId, linkId);

        if (Option.isNone(found)) {
          return yield* new ReviewLinkNotFound({ linkId });
        }

        const revoked = revokeLink(found.value, yield* DateTime.now);

        yield* links.update(revoked);

        return revoked;
      });

      return ReviewLinks.of({ create, ofPost, revoke });
    })
  );
}
