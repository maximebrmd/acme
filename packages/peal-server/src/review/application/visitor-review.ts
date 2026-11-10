import { Context, DateTime, Effect, Layer, Option } from "effect";

import type { ApprovalNotPending } from "#review/domain/approval-not-pending.ts";
import type { ApprovalRequest } from "#review/domain/approval-request.ts";
import { visitorEmail, visitorName } from "#review/domain/plain-text.ts";
import type { ReviewComment } from "#review/domain/review-comment.ts";
import { allows, standingOf } from "#review/domain/review-link.ts";
import type { LinkAccess, ReviewLink } from "#review/domain/review-link.ts";
import type { Reviewer } from "#review/domain/reviewer.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { MediaAssetId, UserId } from "#shared/domain/ids.ts";
import type { Locale } from "#shared/domain/locale.ts";

import { CommentRejected } from "./comment-rejected.ts";
import { LinkAccessDenied } from "./link-access-denied.ts";
import { LinkClosed } from "./link-closed.ts";
import { LinkNotFound } from "./link-not-found.ts";
import { ApprovalStore } from "./ports/approval-store.ts";
import { CommentStore } from "./ports/comment-store.ts";
import { LinkStore } from "./ports/link-store.ts";
import { LinkTokens } from "./ports/link-tokens.ts";
import { MediaPreviews } from "./ports/media-previews.ts";
import type { MediaPreview } from "./ports/media-previews.ts";
import { MemberNames } from "./ports/member-names.ts";
import { ReviewedPosts } from "./ports/reviewed-posts.ts";
import type { ReviewedPost } from "./ports/reviewed-posts.ts";
import { VisitorGuard } from "./ports/visitor-guard.ts";
import { membersIn } from "./post-review.ts";
import { ReviewDesk } from "./review-desk.ts";
import type { CommentDraft } from "./review-desk.ts";
import { VisitorRefused } from "./visitor-refused.ts";

/** What a link shows: one post, and nothing else of its workspace. */
export interface LinkPage {
  /** The post's comments; none through a link that only shows the post. */
  readonly comments: readonly ReviewComment[];
  readonly link: ReviewLink;
  readonly names: ReadonlyMap<UserId, string>;
  readonly post: ReviewedPost;
  /** The files it shows; a file that cannot be shown has none. */
  readonly previews: ReadonlyMap<MediaAssetId, MediaPreview>;
  /** What is asked of whoever may approve, and what was decided last. */
  readonly request: Option.Option<ApprovalRequest>;
}

/** Who a visitor says they are, and where their request comes from. */
export interface VisitorIdentity {
  readonly address: string;
  readonly captchaToken: Option.Option<string>;
  /** Where they hear of answers, if they ask to. */
  readonly email: Option.Option<string>;
  /** The language they read the page in. */
  readonly locale: Locale;
  readonly name: string;
}

type Closed = DatabaseError | LinkClosed | LinkNotFound;

type Refusal = Closed | CommentRejected | LinkAccessDenied | VisitorRefused;

/**
 * A post's review for whoever holds a link to it: no account, no session.
 * The link's token is the only credential: an unknown one is LinkNotFound,
 * and one that ended, or whose post went out, was cancelled or deleted, is
 * LinkClosed, which says why and nothing more.
 *
 * A link shows its post and, when it lets its visitors comment, the post's
 * comments; never the workspace's name, its members' addresses, its other
 * posts or its channels' tokens. Visitors write under the name they give,
 * through the `VisitorGuard`, and do only what the link allows.
 */
export class VisitorReview extends Context.Service<
  VisitorReview,
  {
    readonly open: (token: string) => Effect.Effect<LinkPage, Closed>;
    readonly comment: (
      token: string,
      visitor: VisitorIdentity,
      draft: CommentDraft
    ) => Effect.Effect<ReviewComment, Refusal>;
    readonly approve: (
      token: string,
      visitor: VisitorIdentity
    ) => Effect.Effect<
      { readonly late: boolean },
      ApprovalNotPending | Refusal
    >;
    readonly requestChanges: (
      token: string,
      visitor: VisitorIdentity,
      text: string
    ) => Effect.Effect<ReviewComment, ApprovalNotPending | Refusal>;
  }
>()("peal-server/review/application/VisitorReview") {
  static readonly layer = Layer.effect(
    VisitorReview,
    Effect.gen(function* VisitorReviewLive() {
      const comments = yield* CommentStore;
      const desk = yield* ReviewDesk;
      const guard = yield* VisitorGuard;
      const links = yield* LinkStore;
      const names = yield* MemberNames;
      const posts = yield* ReviewedPosts;
      const previews = yield* MediaPreviews;
      const requests = yield* ApprovalStore;
      const tokens = yield* LinkTokens;

      // The link and its post, while both still stand.
      const standing = Effect.fn("VisitorReview.standing")(function* standing(
        token: string
      ) {
        const found = yield* links.byTokenHash(yield* tokens.hashOf(token));

        if (Option.isNone(found)) {
          return yield* new LinkNotFound();
        }

        const link = found.value;
        const state = standingOf(link, yield* DateTime.now);

        if (state !== "active") {
          return yield* new LinkClosed({ reason: state });
        }

        const post = yield* posts.get(link.workspaceId, link.postId);

        if (Option.isNone(post)) {
          return yield* new LinkClosed({ reason: "deleted" });
        }

        const { status } = post.value;

        if (status === "published" || status === "cancelled") {
          return yield* new LinkClosed({ reason: status });
        }

        return { link, post: post.value };
      });

      const open = Effect.fn("VisitorReview.open")(function* open(
        token: string
      ) {
        const { link, post } = yield* standing(token);

        const written = allows(link, "comment")
          ? yield* comments.ofPost(link.workspaceId, link.postId)
          : [];

        const asked = yield* requests.ofPost(link.workspaceId, link.postId);
        const request = Option.fromUndefinedOr(asked[0]);

        const shown = yield* Effect.forEach(
          post.media,
          ({ mediaId }) =>
            previews
              .of(post.workspaceId, mediaId)
              .pipe(
                Effect.map(Option.map((preview) => [mediaId, preview] as const))
              ),
          { concurrency: 4 }
        );

        return {
          comments: written,
          link,
          names: yield* names.of(membersIn(written, Option.toArray(request))),
          post,
          previews: new Map(shown.flatMap((entry) => Option.toArray(entry))),
          request,
        };
      });

      // The visitor as a reviewer, once the link lets them and the guard
      // took their request.
      const admitted = Effect.fn("VisitorReview.admitted")(function* admitted(
        token: string,
        visitor: VisitorIdentity,
        needed: LinkAccess
      ) {
        const { link, post } = yield* standing(token);

        if (!allows(link, needed)) {
          return yield* new LinkAccessDenied({ needed });
        }

        const name = visitorName(visitor.name);

        if (Option.isNone(name)) {
          return yield* new CommentRejected({ problem: "name" });
        }

        const email = visitor.email.pipe(Option.map(visitorEmail));

        if (Option.isSome(email) && Option.isNone(email.value)) {
          return yield* new CommentRejected({ problem: "email" });
        }

        const refusal = yield* guard.admit({
          address: visitor.address,
          captchaToken: visitor.captchaToken,
          linkId: link.id,
        });

        if (Option.isSome(refusal)) {
          return yield* new VisitorRefused({ reason: refusal.value });
        }

        const by: Reviewer = { _tag: "visitor", linkId: link.id, name };

        return {
          by,
          contact: Option.flatten(email).pipe(
            Option.map((address) => ({
              email: address,
              locale: visitor.locale,
            }))
          ),
          post,
        };
      });

      const comment = Effect.fn("VisitorReview.comment")(function* comment(
        token: string,
        visitor: VisitorIdentity,
        draft: CommentDraft
      ) {
        const { by, contact, post } = yield* admitted(
          token,
          visitor,
          "comment"
        );

        return yield* desk.comment(by, post, draft, contact);
      });

      const approve = Effect.fn("VisitorReview.approve")(function* approve(
        token: string,
        visitor: VisitorIdentity
      ) {
        const { by, post } = yield* admitted(token, visitor, "approve");

        // A visitor is a person: the link's holder, under the name given.
        const { late } = yield* desk
          .approve(by, post, false)
          .pipe(Effect.catchTag("ApprovalNeedsPerson", Effect.die));

        return { late };
      });

      const requestChanges = Effect.fn("VisitorReview.requestChanges")(
        function* requestChanges(
          token: string,
          visitor: VisitorIdentity,
          text: string
        ) {
          const { by, post } = yield* admitted(token, visitor, "approve");
          const sentBack = yield* desk.requestChanges(by, post, text);

          return sentBack.comment;
        }
      );

      return VisitorReview.of({ approve, comment, open, requestChanges });
    })
  );
}
