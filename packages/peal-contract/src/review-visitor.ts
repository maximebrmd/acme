import { HttpApiMiddleware } from "effect/http-api";

import { ReviewRequestTooLarge } from "./review-request-too-large.ts";
import type { ReviewVisitorAddress } from "./review-visitor-address.ts";

/** The longest body the server reads from a review link, in bytes. */
export const maxReviewRequestBytes = 16 * 1024;

/**
 * What a request through a review link passes before it is read: a size,
 * checked before the body is decoded. It tells the handlers the address the
 * request came from, which they count writes by.
 */
export class ReviewVisitor extends HttpApiMiddleware.Service<
  ReviewVisitor,
  { provides: ReviewVisitorAddress }
>()("peal-contract/ReviewVisitor", { error: ReviewRequestTooLarge }) {}
