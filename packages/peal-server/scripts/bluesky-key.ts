// Prints a new key for Peal's Bluesky OAuth client, as one entry of
// BLUESKY_CLIENT_KEYS: `<keyId>:<base64url of the private JWK>`, ES256 (P-256).
// Put the new entry first to sign with it, and keep the old ones listed until
// the sessions they signed for have been refreshed.
import { JoseKey } from "@atproto/oauth-client-node";
import { Base64Url } from "effect/encoding";

const keyId = `key-${new Date().toISOString().slice(0, 10)}`;
const key = await JoseKey.generate(["ES256"], keyId);

process.stdout.write(
  `${keyId}:${Base64Url.encode(JSON.stringify(key.privateJwk))}\n`
);
