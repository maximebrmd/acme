import { Effect, Layer } from "effect";

import { ApplicationNames } from "#activity/application/application-names.ts";
import { CredentialNames } from "#workspace/application/credential-names.ts";

/**
 * ApplicationNames as the workspace context names its API keys and the
 * OAuth clients acting for its members.
 */
export const NamedApplications = Layer.effect(
  ApplicationNames,
  Effect.gen(function* NamedApplications() {
    const names = yield* CredentialNames;

    return ApplicationNames.of({
      apiKey: (workspaceId, apiKeyId) => names.apiKey(workspaceId, apiKeyId),
      client: (clientId) => names.application(clientId),
    });
  })
);
