import { Context, Effect, Layer } from "effect";
import type { Option } from "effect";

import type { ReviewLinkId } from "#review/domain/review-ids.ts";

/** What a visitor's request comes with, besides what it asks. */
export interface VisitorRequest {
  /** The address it came from, for counting. Never stored. */
  readonly address: string;
  /** The captcha's token, when the page showed one. */
  readonly captchaToken: Option.Option<string>;
  readonly linkId: ReviewLinkId;
}

/** Why a visitor's write is not taken. */
export type VisitorRefusal = "captchaRequired" | "tooManyRequests";

/**
 * Keeps visitors' writes, which need no account, from being a way to flood
 * a workspace: so many per address and per link in a while, and a captcha
 * where the server has one.
 */
export class VisitorGuard extends Context.Service<
  VisitorGuard,
  {
    /** Counts the write, and says why it is refused, if it is. */
    readonly admit: (
      request: VisitorRequest
    ) => Effect.Effect<Option.Option<VisitorRefusal>>;
  }
>()("peal-server/review/application/VisitorGuard") {
  /** Lets everything through, for tests of what comes after. */
  static readonly open = Layer.succeed(
    VisitorGuard,
    VisitorGuard.of({ admit: () => Effect.succeedNone })
  );
}
