import { Effect, Redacted } from "effect";
import { Mac } from "effect/crypto";
import { Hex } from "effect/encoding";

/**
 * The Graph API version Peal calls Facebook and Instagram with. Meta keeps
 * each version about two years; this one constant moves them all.
 */
export const graphApiVersion = "v27.0";

/** The Threads API's version, which moves on its own. */
export const threadsApiVersion = "v1.0";

/**
 * Where Meta's services are. Production uses `metaHosts`; tests point each
 * at a fake on loopback.
 */
export interface MetaHosts {
  /** Facebook Login's dialog, on the website. */
  readonly facebookDialog: URL;
  /** The Graph API, for Facebook Pages and Instagram. */
  readonly facebookGraph: URL;
  /** The Threads sign-in page. */
  readonly threadsAuthorize: URL;
  /** The Threads API. */
  readonly threadsGraph: URL;
}

export const metaHosts: MetaHosts = {
  facebookDialog: new URL("https://www.facebook.com"),
  facebookGraph: new URL("https://graph.facebook.com"),
  threadsAuthorize: new URL("https://threads.com"),
  threadsGraph: new URL("https://graph.threads.com"),
};

/** A path of the Graph API at its version, such as `/me/accounts`. */
export const graphUrl = (hosts: MetaHosts, path: string): URL =>
  new URL(`/${graphApiVersion}${path}`, hosts.facebookGraph);

/** A path of the Threads API at its version, such as `/me/threads`. */
export const threadsUrl = (hosts: MetaHosts, path: string): URL =>
  new URL(`/${threadsApiVersion}${path}`, hosts.threadsGraph);

const encoder = new TextEncoder();

/**
 * The `appsecret_proof` Meta asks for with every Graph call when the app
 * requires it: the HMAC-SHA256 of the access token, keyed with the app
 * secret, in hexadecimal. A token stolen without the secret is then useless.
 */
export const appSecretProof = Effect.fn("MetaGraph.appSecretProof")(
  function* appSecretProof(
    accessToken: Redacted.Redacted,
    appSecret: Redacted.Redacted
  ) {
    const mac = yield* Mac.Mac;

    const key = yield* Mac.key(
      Mac.hmacSha256,
      encoder.encode(Redacted.value(appSecret))
    );

    const tag = yield* mac.sign(
      key,
      encoder.encode(Redacted.value(accessToken))
    );

    return Redacted.make(Hex.encode(tag));
  },
  // A key or tag that cannot be computed is a bug, not a platform's answer.
  Effect.orDie
);
