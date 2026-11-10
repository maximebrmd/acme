import { DEVICE_CODE_GRANT_TYPE } from "@better-auth/oauth-provider";
import { DateTime, Effect, Layer } from "effect";

import { Drizzle } from "#shared/infrastructure/database.ts";
import {
  oauthClient,
  oauthClientResource,
} from "#workspace/infrastructure/auth-schema.generated.ts";

import { AuthStartFailed } from "./auth-start-failed.ts";
import { BetterAuth } from "./better-auth.ts";
import { apiResourceOf, cliClientId } from "./oauth.ts";
import { AuthSettings } from "./settings.ts";

// What the command line may ask for: to renew its sign-in, and every
// workspace scope, publishing included, which the user agrees to or not.
const cliScopes = [
  "offline_access",
  "workspace:read",
  "workspace:write",
  "workspace:publish",
];

/**
 * Registers the command line's OAuth client, `peal-cli`, when the server
 * starts. Better Auth issues client ids at random, so the client is written
 * to its tables directly: public (no secret), signing in with the device
 * authorization grant and renewing its tokens, for the HTTP API only. It has
 * no owner, and Better Auth refuses to change it, as a trusted client.
 *
 * Servers starting together may both write it; the first one wins. One
 * registered by an earlier release gets the scopes this one knows, and when
 * PUBLIC_URL changes, the client is linked to the new API resource as well.
 */
export const CliClientLive = Layer.effectDiscard(
  Effect.gen(function* cliClient() {
    // Better Auth has started: it wrote its resources, which the client's
    // link refers to.
    yield* BetterAuth;

    const { publicUrl } = yield* AuthSettings;
    const db = yield* Drizzle;
    const now = DateTime.toDateUtc(yield* DateTime.now);

    yield* db
      .insert(oauthClient)
      .values({
        applicationType: "native",
        clientId: cliClientId,
        createdAt: now,
        disabled: false,
        grantTypes: [DEVICE_CODE_GRANT_TYPE, "refresh_token"],
        name: "Peal CLI",
        redirectUris: [],
        responseTypes: [],
        scopes: cliScopes,
        tokenEndpointAuthMethod: "none",
        updatedAt: now,
      })
      // A client registered before a scope existed may now ask for it.
      .onConflictDoUpdate({
        set: { scopes: cliScopes, updatedAt: now },
        target: oauthClient.clientId,
      });

    yield* db
      .insert(oauthClientResource)
      .values({
        clientId: cliClientId,
        createdAt: now,
        resourceId: apiResourceOf(publicUrl),
      })
      .onConflictDoNothing({
        target: [oauthClientResource.clientId, oauthClientResource.resourceId],
      });
  }).pipe(
    Effect.mapError((cause) => new AuthStartFailed({ cause })),
    Effect.withSpan("CliClient.register")
  )
);
