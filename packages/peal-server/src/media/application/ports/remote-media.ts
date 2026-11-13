import { Context } from "effect";
import type { Effect, Option, Scope, Stream } from "effect";

import type { MediaSourceNotPublic } from "#media/application/media-source-not-public.ts";
import type { MediaSourceUnreachable } from "#media/application/media-source-unreachable.ts";

/** A file as its host serves it, read as it arrives. */
export interface RemoteFile {
  /** The address that served it, after redirects: what names the file. */
  readonly address: string;
  /** The bytes after `start`, to the end of the file. */
  readonly rest: Stream.Stream<Uint8Array, MediaSourceUnreachable>;
  /** The size its host declares, if it does: not to be trusted. */
  readonly declaredSize: Option.Option<number>;
  /** The content type its host declares, if any: not to be trusted. */
  readonly declaredType: Option.Option<string>;
  /** Its first bytes, as they came: enough to tell its format. */
  readonly start: Uint8Array;
}

/**
 * Files at addresses members give, fetched by the server itself: only
 * from public hosts over HTTPS (the OutboundGuard), without credentials,
 * each redirect checked like the address. The file is open while the scope
 * is, and nothing of it is held but the bytes in flight.
 */
export class RemoteMedia extends Context.Service<
  RemoteMedia,
  {
    readonly open: (
      url: string
    ) => Effect.Effect<
      RemoteFile,
      MediaSourceNotPublic | MediaSourceUnreachable,
      Scope.Scope
    >;
  }
>()("peal-server/media/application/RemoteMedia") {}
