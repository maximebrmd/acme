import { Context, DateTime, Effect, Layer, Option } from "effect";

import type { ApprovalChanged } from "#review/domain/approval-changed.ts";
import type { ApprovalNotPending } from "#review/domain/approval-not-pending.ts";
import type {
  ApprovalRequest,
  ShownRequest,
} from "#review/domain/approval-request.ts";
import { visitorEmail, visitorName } from "#review/domain/plain-text.ts";
import type { ReviewComment } from "#review/domain/review-comment.ts";
import { allows, standingOf } from "#review/domain/review-link.ts";
import type { LinkAccess, ReviewLink } from "#review/domain/review-link.ts";
import type { Reviewer } from "#review/domain/reviewer.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { UserId } from "#shared/domain/ids.ts";
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
import { MemberNames } from "./ports/member-names.ts";
import { ReviewedPosts } from "./ports/reviewed-posts.ts";
import type { ReviewedPost } from "./ports/reviewed-posts.ts";
import { VisitorGuard } from "./ports/visitor-guard.ts";
import { membersIn } from "./post-review.ts";
import { ReviewDesk } from "./review-desk.ts";
import type { CommentDraft } from "./review-desk.ts";
import { shownMedia } from "./shown-media.ts";
import type { ShownMedia } from "./shown-media.ts";
import { VisitorRefused } from "./visitor-refused.ts";

/** What a link shows: one post, and nothing else of its workspace. */
export interface LinkPage {
  /** The post's comments; none through a link that only shows the post. */
  readonly comments: readonly ReviewComment[];
  readonly link: ReviewLink;
  readonly names: ReadonlyMap<UserId, string>;
  readonly post: ReviewedPost;
  /** The files it shows; a file that cannot be shown has none. */
  readonly previews: ShownMedia;
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
      visitor: VisitorIdentity,
      shown: ShownRequest
    ) => Effect.Effect<
      { readonly late: boolean },
      ApprovalChanged | ApprovalNotPending | Refusal
    >;
    readonly requestChanges: (
      token: string,
      visitor: VisitorIdentity,
      shown: ShownRequest,
      text: string
    ) => Effect.Effect<
      ReviewComment,
      ApprovalChanged | ApprovalNotPending | Refusal
    >;
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

      // The link's post, while it may still change or go out.
      const shownPost = Effect.fn("VisitorReview.shownPost")(
        function* shownPost(link: ReviewLink) {
          const post = yield* posts.get(link.workspaceId, link.postId);

          if (Option.isNone(post)) {
            return yield* new LinkClosed({ reason: "deleted" });
          }

          const { status } = post.value;

          if (status === "published" || status === "cancelled") {
            return yield* new LinkClosed({ reason: status });
          }

          return post.value;
        }
      );

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

        return { link, post: yield* shownPost(link) };
      });

      const open = Effect.fn("VisitorReview.open")(function* open(
        token: string
      ) {
        const { link } = yield* standing(token);

        const written = allows(link, "comment")
          ? yield* comments.ofPost(link.workspaceId, link.postId)
          : [];

        // What the page shows is never older than the approval it names:
        // the approval is read first, then the post again, so a decision
        // for this page's approval is one for this page's post, or is
        // refused (ApprovalChanged).
        const asked = yield* requests.ofPost(link.workspaceId, link.postId);
        const request = Option.fromUndefinedOr(asked[0]);
        const post = yield* shownPost(link);

        return {
          comments: written,
          link,
          names: yield* names.of(membersIn(written, Option.toArray(request))),
          post,
          previews: yield* shownMedia(previews, post),
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
          link,
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
        visitor: VisitorIdentity,
        shown: ShownRequest
      ) {
        const { by, link, post } = yield* admitted(token, visitor, "approve");

        // A visitor is a person, the link's holder under the name given,
        // when a person made the link. No application makes one that
        // approves: one that names no member approves nothing an
        // application asked for.
        const { late } = yield* desk
          .approve(by, post, shown, Option.isNone(link.createdBy))
          .pipe(
            Effect.catchTag("ApprovalNeedsPerson", () =>
              Effect.fail(new LinkAccessDenied({ needed: "approve" }))
            )
          );

        return { late };
      });

      const requestChanges = Effect.fn("VisitorReview.requestChanges")(
        function* requestChanges(
          token: string,
          visitor: VisitorIdentity,
          shown: ShownRequest,
          text: string
        ) {
          const { by, post } = yield* admitted(token, visitor, "approve");
          const sentBack = yield* desk.requestChanges(by, post, shown, text);

          return sentBack.comment;
        }
      );

      return VisitorReview.of({ approve, comment, open, requestChanges });
    })
  );
}
