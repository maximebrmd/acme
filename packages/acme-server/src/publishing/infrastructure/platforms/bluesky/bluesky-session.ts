import { JoseKey } from "@atproto/oauth-client-node";
import { DateTime, Duration, Effect, Option, Redacted, Schema } from "effect";

import { TokenRejected } from "#shared/domain/token-rejected.ts";

// What publishing reads of the channel's credential: the AT Protocol OAuth
// client's saved session, as the channels context stores it (JSON). Its
// access token and DPoP key sign each call; its refresh token is the
// channels context's alone, which renews the session when a call is refused.
const SavedSessionSchema = Schema.fromJsonString(
  Schema.Struct({
    dpopJwk: Schema.Record(Schema.String, Schema.Unknown),
    tokenSet: Schema.Struct({
      access_token: Schema.NonEmptyString,
      // The account's PDS, which the token is for.
      aud: Schema.String,
      expires_at: Schema.optionalKey(Schema.String),
      sub: Schema.String.check(Schema.isStartingWith("did:")),
      token_type: Schema.Literal("DPoP"),
    }),
  })
);

const decodeSession = Schema.decodeUnknownEffect(SavedSessionSchema);

/** A Bluesky session, ready to sign calls to the account's PDS. */
export interface BlueskySession {
  readonly accessToken: Redacted.Redacted;
  /** The account's DID. */
  readonly did: string;
  /** The private key the session's tokens are bound to (DPoP). */
  readonly dpopKey: JoseKey;
  /** The account's PDS, as an origin. */
  readonly pds: URL;
}

// A token this close to expiring is renewed before the call: it would
// expire before the PDS read it.
const expiryMargin = Duration.seconds(30);

const isExpired = (expiresAt: string | undefined, now: DateTime.Utc) =>
  Option.fromUndefinedOr(expiresAt).pipe(
    Option.flatMap((at) => DateTime.make(at)),
    Option.exists((at) =>
      DateTime.isLessThanOrEqualTo(at, DateTime.addDuration(now, expiryMargin))
    )
  );

/**
 * The session the credential holds. One that does not read, or whose access
 * token has run out, is refused before anything is sent, so the channels
 * context renews it.
 */
export const sessionOf = Effect.fn("BlueskySession.of")(function* sessionOf(
  credential: Redacted.Redacted
) {
  const saved = yield* decodeSession(Redacted.value(credential)).pipe(
    Effect.mapError(() => new TokenRejected())
  );

  const { tokenSet } = saved;

  if (isExpired(tokenSet.expires_at, yield* DateTime.now)) {
    return yield* new TokenRejected();
  }

  const pds = URL.parse(tokenSet.aud);

  if (pds === null) {
    return yield* new TokenRejected();
  }

  const dpopKey = yield* Effect.tryPromise({
    catch: () => new TokenRejected(),
    try: async () => await JoseKey.fromJWK(saved.dpopJwk),
  });

  const session: BlueskySession = {
    accessToken: Redacted.make(tokenSet.access_token),
    did: tokenSet.sub,
    dpopKey,
    pds: new URL(pds.origin),
  };

  return session;
});
