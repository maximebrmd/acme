import {
  isAtprotoDid,
  isAtprotoOAuthScope,
  jwkSchema,
} from "@atproto/oauth-client-node";
import type {
  NodeSavedSession,
  NodeSavedState,
} from "@atproto/oauth-client-node";
import { Option, Schema } from "effect";

// What the AT Protocol OAuth client keeps between calls, as JSON: a pending
// sign-in (its state store) and a session (its session store). Acme stores
// both encrypted, and parses them back here before the client sees them.

const AuthMethodSchema = Schema.Union([
  Schema.Struct({ method: Schema.Literal("none") }),
  Schema.Struct({
    kid: Schema.String,
    method: Schema.Literal("private_key_jwt"),
  }),
]);

const JwkObjectSchema = Schema.Record(Schema.String, Schema.Unknown);

const SavedStateSchema = Schema.Struct({
  appState: Schema.optionalKey(Schema.String),
  authMethod: AuthMethodSchema,
  dpopJwk: JwkObjectSchema,
  iss: Schema.String,
  verifier: Schema.String,
});

const SavedSessionSchema = Schema.Struct({
  authMethod: AuthMethodSchema,
  dpopJwk: JwkObjectSchema,
  tokenSet: Schema.Struct({
    access_token: Schema.String,
    aud: Schema.String,
    expires_at: Schema.optionalKey(Schema.String),
    iss: Schema.String,
    refresh_token: Schema.optionalKey(Schema.String),
    scope: Schema.String,
    sub: Schema.String,
    token_type: Schema.Literal("DPoP"),
  }),
});

const decodeState = Schema.decodeUnknownOption(
  Schema.fromJsonString(SavedStateSchema)
);

const decodeSession = Schema.decodeUnknownOption(
  Schema.fromJsonString(SavedSessionSchema)
);

type JwkObject = typeof JwkObjectSchema.Type;

// The DPoP key, as the library's own schema reads it.
const jwkOf = (jwk: JwkObject) => {
  const parsed = jwkSchema.safeParse(jwk);

  return parsed.success ? Option.some(parsed.data) : Option.none();
};

/** A pending sign-in, from the JSON `stateText` holds. */
export const parseSavedState = (
  stateText: string
): Option.Option<NodeSavedState> =>
  decodeState(stateText).pipe(
    Option.flatMap((saved) =>
      jwkOf(saved.dpopJwk).pipe(
        Option.map((dpopJwk) => ({ ...saved, dpopJwk }))
      )
    )
  );

/** A session, from the JSON `sessionText` holds. */
export const parseSavedSession = (
  sessionText: string
): Option.Option<NodeSavedSession> =>
  decodeSession(sessionText).pipe(
    Option.flatMap((saved) => {
      const { scope, sub } = saved.tokenSet;

      if (!isAtprotoDid(sub) || !isAtprotoOAuthScope(scope)) {
        return Option.none();
      }

      return jwkOf(saved.dpopJwk).pipe(
        Option.map((dpopJwk) => ({
          ...saved,
          dpopJwk,
          tokenSet: { ...saved.tokenSet, scope, sub },
        }))
      );
    })
  );
