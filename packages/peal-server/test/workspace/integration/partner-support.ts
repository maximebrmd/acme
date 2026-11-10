import { assert } from "@effect/vitest";
import { Effect, Schema } from "effect";

import {
  bodyOf,
  signedUpUnconfirmed,
  TestApp,
  workspaceOf,
} from "./harness.ts";
import type { Person } from "./harness.ts";

// Partner accounts, their keys and their customers' workspaces, as the
// integration tests make them: on a server where owners open accounts
// themselves (PEAL_PARTNER_SELF_SERVICE).

export const PartnerSchema = Schema.Struct({
  id: Schema.String,
  logoUrl: Schema.NullOr(Schema.String),
  name: Schema.String,
  returnOrigins: Schema.Array(Schema.String),
  workspaceId: Schema.String,
});

export const CreatedKeySchema = Schema.Struct({
  key: Schema.String,
  partnerKey: Schema.Struct({
    id: Schema.String,
    permissions: Schema.Array(Schema.String),
    scopes: Schema.Array(Schema.String),
    start: Schema.String,
  }),
});

export const WorkspaceSchema = Schema.Struct({
  channels: Schema.Number,
  externalId: Schema.NullOr(Schema.String),
  id: Schema.String,
  name: Schema.String,
});

export const bearer = (key: string) => ({ authorization: `Bearer ${key}` });

export const everyScope = [
  "workspaces:read",
  "workspaces:write",
  "workspaces:delete",
];

export const everyPermission = [
  "analytics:read",
  "assistant:use",
  "billing:read",
  "channel:read",
  "channel:connect",
  "channel:disconnect",
  "media:read",
  "media:upload",
  "media:delete",
  "post:read",
  "post:create",
  "post:update",
  "post:delete",
  "post:schedule",
  "post:approve",
  "post:publish",
  "webhook:read",
  "webhook:manage",
];

/** A partner account its owner opened for a new workspace. */
export const partnerOf = Effect.fn("partnerOf")(function* partnerOf(
  label: string
) {
  const app = yield* TestApp;
  const owner = yield* signedUpUnconfirmed(label);
  const home = yield* workspaceOf(owner, label);

  const opened = yield* app.request(`/api/workspaces/${home}/partner`, {
    body: { name: `${label} Suite` },
    headers: { cookie: owner.cookies },
  });

  assert.strictEqual(opened.status, 201);

  return { home, owner, partner: yield* bodyOf(PartnerSchema, opened) };
});

/** A partner key the owner creates. */
export const keyOf = Effect.fn("keyOf")(function* keyOf(
  owner: Person,
  home: string,
  {
    permissions = everyPermission,
    scopes = everyScope,
  }: {
    readonly permissions?: readonly string[];
    readonly scopes?: readonly string[];
  } = {}
) {
  const app = yield* TestApp;

  const reply = yield* app.request(`/api/workspaces/${home}/partner/keys`, {
    body: { name: "backend", permissions, scopes },
    headers: { cookie: owner.cookies },
  });

  assert.strictEqual(reply.status, 201);

  return yield* bodyOf(CreatedKeySchema, reply);
});

/** A workspace the partner creates for a customer. */
export const customerOf = Effect.fn("customerOf")(function* customerOf(
  key: string,
  name: string,
  externalId?: string
) {
  const app = yield* TestApp;

  const reply = yield* app.request("/api/partner/workspaces", {
    body: { externalId, name },
    headers: bearer(key),
  });

  assert.strictEqual(reply.status, 201);

  return yield* bodyOf(WorkspaceSchema, reply);
});
