import { Context } from "effect";
import { OpenApi } from "effect/http-api";

/** When an endpoint was deprecated, and what its callers should know. */
export interface DeprecationNotice {
  /**
   * Where the deprecation is explained, with what to call instead: the
   * `Link` header's target (`rel="deprecation"`).
   */
  readonly link?: string;
  /** Since when it is deprecated: an instant, in ISO 8601 (UTC). */
  readonly since: string;
  /**
   * When it stops answering, if that is decided: an instant, in ISO 8601,
   * never before `since`. Until then it answers as it always did.
   */
  readonly sunset?: string;
}

/**
 * An endpoint's deprecation, which the server tells its callers in every
 * answer (`Deprecation`, RFC 9745; `Sunset`, RFC 8594) and the OpenAPI
 * document marks. Annotate an endpoint with `deprecated(...)`, never with
 * this alone.
 */
export class Deprecation extends Context.Service<
  Deprecation,
  DeprecationNotice
>()("peal-contract/Deprecation") {}

/**
 * The annotations of a deprecated endpoint:
 * `.annotateMerge(deprecated({ since: "2027-01-01T00:00:00Z" }))`. The
 * endpoint keeps answering as before; it is removed, if ever, by a decided
 * breaking change (the docs' "API conventions", Versioning).
 */
export const deprecated = (notice: DeprecationNotice) =>
  Context.make(Deprecation, notice).pipe(Context.add(OpenApi.Deprecated, true));
