import { Effect, Option } from "effect";
import { HttpApiBuilder } from "effect/http-api";
import {
  Api,
  ApprovalChanged,
  ApprovalNotPending,
  CommentInvalid,
  ReviewAccessDenied,
  ReviewCaptchaRequired,
  ReviewLinkClosed,
  ReviewLinkNotFound,
  ReviewVisitorAddress,
  TooManyReviewRequests,
} from "peal-contract";

import type { LinkAccessDenied } from "#review/application/link-access-denied.ts";
import type { LinkClosed } from "#review/application/link-closed.ts";
import type { VisitorRefused } from "#review/application/visitor-refused.ts";
import { VisitorReview } from "#review/application/visitor-review.ts";
import type { VisitorIdentity } from "#review/application/visitor-review.ts";

import { draftOf, shownOf } from "./review-input.ts";
import { pageView } from "./review-view.ts";

// How the use cases' failures answer a visitor. Nothing here names the
// workspace, the post or the link: a visitor learns what the link shows.

const notFound = () => Effect.fail(new ReviewLinkNotFound());

const closed = ({ reason }: LinkClosed) =>
  Effect.fail(new ReviewLinkClosed({ reason }));

const denied = ({ needed }: LinkAccessDenied) =>
  Effect.fail(new ReviewAccessDenied({ needed }));

const refused = ({ reason }: VisitorRefused) =>
  reason === "captchaRequired"
    ? Effect.fail(new ReviewCaptchaRequired())
    : Effect.fail(new TooManyReviewRequests());

const invalid = ({
  problem,
}: {
  readonly problem: CommentInvalid["problem"];
}) => Effect.fail(new CommentInvalid({ problem }));

const writeFailures = {
  CommentRejected: invalid,
  DatabaseError: Effect.die,
  LinkAccessDenied: denied,
  LinkClosed: closed,
  LinkNotFound: notFound,
  VisitorRefused: refused,
} as const;

// Who a visitor says they are, with where their request comes from.
const visitorOf = Effect.fn("ReviewLink.visitorOf")(function* visitorOf(
  headers: { readonly "x-captcha-response"?: string },
  said: { readonly name: string }
) {
  const { address } = yield* ReviewVisitorAddress;

  const identity: VisitorIdentity = {
    address,
    captchaToken: Option.fromUndefinedOr(headers["x-captcha-response"]),
    name: said.name,
  };

  return identity;
});

export const ReviewLinkHandlers = HttpApiBuilder.group(
  Api,
  "reviewLink",
  Effect.fn(function* reviewLinkHandlers(handlers) {
    const visitors = yield* VisitorReview;

    // What the link shows, or why it shows nothing.
    const pageOf = (token: string) =>
      visitors.open(token).pipe(
        Effect.catchTags({
          DatabaseError: Effect.die,
          LinkClosed: closed,
          LinkNotFound: notFound,
        }),
        Effect.flatMap((page) => {
          const view = pageView(page);

          return view === undefined
            ? Effect.die("A link showed a post past reviewing")
            : Effect.succeed(view);
        })
      );

    // A comment just written, as the link shows it.
    const commentOn = (token: string, commentId: string) =>
      pageOf(token).pipe(
        Effect.flatMap(({ comments }) => {
          const view = comments.find(({ id }) => id === commentId);

          return view === undefined
            ? Effect.die("A comment just written is not on its page")
            : Effect.succeed(view);
        })
      );

    return handlers.handleAll({
      approve: ({ headers, payload }) =>
        Effect.gen(function* approve() {
          const visitor = yield* visitorOf(headers, payload);

          return yield* visitors
            .approve(headers["x-review-token"], visitor, shownOf(payload))
            .pipe(
              Effect.catchTags({
                ...writeFailures,
                ApprovalChanged: () => Effect.fail(new ApprovalChanged()),
                ApprovalNotPending: () => Effect.fail(new ApprovalNotPending()),
              })
            );
        }),
      comment: ({ headers, payload }) =>
        Effect.gen(function* comment() {
          const token = headers["x-review-token"];
          const visitor = yield* visitorOf(headers, payload);
          const input = draftOf(payload);

          if (input._tag === "invalid") {
            return yield* invalid(input);
          }

          const written = yield* visitors
            .comment(token, visitor, input.draft)
            .pipe(Effect.catchTags(writeFailures));

          return yield* commentOn(token, written.id);
        }),
      open: ({ headers }) => pageOf(headers["x-review-token"]),
      requestChanges: ({ headers, payload }) =>
        Effect.gen(function* requestChanges() {
          const token = headers["x-review-token"];
          const visitor = yield* visitorOf(headers, payload);

          const written = yield* visitors
            .requestChanges(token, visitor, shownOf(payload), payload.comment)
            .pipe(
              Effect.catchTags({
                ...writeFailures,
                ApprovalChanged: () => Effect.fail(new ApprovalChanged()),
                ApprovalNotPending: () => Effect.fail(new ApprovalNotPending()),
              })
            );

          return yield* commentOn(token, written.id);
        }),
    });
  })
);
