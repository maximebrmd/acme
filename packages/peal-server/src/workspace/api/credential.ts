import { Effect, Match, Option } from "effect";
import { HttpApiBuilder } from "effect/http-api";
import { Api, CurrentPrincipal, Unauthenticated } from "peal-contract";
import type { Credential, CredentialBinding } from "peal-contract";

import { forbidden } from "#shared/api/forbidden.ts";
import { CredentialCheck } from "#workspace/application/credential-check.ts";
import type {
  Binding,
  CredentialDescription,
} from "#workspace/application/credential-check.ts";

import { principalOf } from "./principal.ts";

const bindingView = Match.typeTags<Binding, CredentialBinding>()({
  bound: ({ id, name, permissions, refused }) => ({
    _tag: "bound",
    id,
    name,
    permissions,
    refused: Option.getOrNull(refused),
  }),
  left: ({ id }) => ({ _tag: "left", id }),
  unbound: () => ({ _tag: "unbound" }),
});

// What the contract answers: every kind of principal is a case, so adding
// one fails to compile here until it is described.
const toCredential = Match.typeTags<CredentialDescription, Credential>()({
  apiKey: ({ key, workspaceName }) => ({
    _tag: "apiKey",
    expiresAt: Option.getOrNull(key.expiresAt),
    id: key.id,
    name: key.name,
    permissions: key.permissions,
    start: Option.getOrNull(key.start),
    workspace: { id: key.workspaceId, name: workspaceName },
  }),
  partnerKey: ({ key, partner }) => ({
    _tag: "partnerKey",
    expiresAt: Option.getOrNull(key.expiresAt),
    id: key.id,
    name: key.name,
    partner: { id: partner.id, name: partner.name },
    permissions: key.permissions,
    scopes: key.scopes,
    start: key.start,
  }),
  user: ({ application, impersonatedBy, userId }) => ({
    _tag: "user",
    application: Option.getOrNull(
      application.pipe(
        Option.map(({ binding, clientId, scopes }) => ({
          binding: bindingView(binding),
          clientId,
          scopes,
        }))
      )
    ),
    impersonatedBy: Option.getOrNull(impersonatedBy),
    userId,
  }),
});

export const CredentialHandlers = HttpApiBuilder.group(
  Api,
  "credential",
  Effect.fn(function* credentialHandlers(handlers) {
    const check = yield* CredentialCheck;

    return handlers.handle("get", () =>
      Effect.gen(function* get() {
        const principal = yield* CurrentPrincipal;

        const described = yield* check.describe(principalOf(principal)).pipe(
          Effect.catchTags({
            AuthUnavailable: Effect.die,
            BannedUser: forbidden,
            DatabaseError: Effect.die,
            DirectoryUnavailable: Effect.die,
            NotSignedIn: () => Effect.fail(new Unauthenticated()),
          })
        );

        return toCredential(described);
      })
    );
  })
);
