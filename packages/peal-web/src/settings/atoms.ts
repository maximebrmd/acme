import { Schema } from "effect";
import { Atom } from "effect/reactivity";

import { PealApi } from "#api/client.ts";
import { authClient } from "#auth/client.ts";

import { authCall } from "./auth-call.ts";

// The settings pages' data: what Better Auth's routes answer (members,
// invitations, sessions), read with the visitor's cookies and decoded, and
// the API's queries and mutations (API keys, connected applications,
// deletions). Pages refresh a list after each change.

const MemberSchema = Schema.Struct({
  id: Schema.String,
  role: Schema.String,
  user: Schema.Struct({ email: Schema.String, name: Schema.String }),
  userId: Schema.String,
});

export type WorkspaceMember = typeof MemberSchema.Type;

/** The workspace's members, as its owners and admins manage them. */
export const workspaceMembers = Atom.family((workspaceId: string) =>
  Atom.make(
    authCall(
      Schema.Struct({ members: Schema.Array(MemberSchema) }),
      async () =>
        await authClient.organization.listMembers({
          query: { limit: 1000, organizationId: workspaceId },
        })
    )
  )
);

const InvitationSchema = Schema.Struct({
  email: Schema.String,
  // Better Auth's client reads ISO dates into Dates.
  expiresAt: Schema.Date,
  id: Schema.String,
  role: Schema.NullOr(Schema.String),
  status: Schema.String,
});

export type WorkspaceInvitation = typeof InvitationSchema.Type;

/** The workspace's invitations, whatever became of them. */
export const workspaceInvitations = Atom.family((workspaceId: string) =>
  Atom.make(
    authCall(
      Schema.Array(InvitationSchema),
      async () =>
        await authClient.organization.listInvitations({
          query: { organizationId: workspaceId },
        })
    )
  )
);

const SessionSchema = Schema.Struct({
  createdAt: Schema.Date,
  id: Schema.String,
  ipAddress: Schema.optional(Schema.NullOr(Schema.String)),
  // Better Auth revokes a session by its token, which it lists to the
  // signed-in user only.
  token: Schema.String,
  updatedAt: Schema.Date,
  userAgent: Schema.optional(Schema.NullOr(Schema.String)),
});

export type AccountSession = typeof SessionSchema.Type;

/** The signed-in user's sessions, on every device. */
export const accountSessions = Atom.make(
  authCall(
    Schema.Array(SessionSchema),
    async () => await authClient.listSessions()
  )
);

const CurrentSessionSchema = Schema.Struct({
  session: Schema.Struct({ token: Schema.String }),
});

/** The session this page runs in, to tell it apart in the list. */
export const currentSession = Atom.make(
  authCall(CurrentSessionSchema, async () => await authClient.getSession())
);

const apiKeysKey = (workspaceId: string) => [`api-keys:${workspaceId}`];

/** What refreshes a workspace's API keys once a change lands. */
export const apiKeysChanged = apiKeysKey;

export const workspaceApiKeys = Atom.family((workspaceId: string) =>
  PealApi.query("apiKeys", "list", {
    params: { workspaceId },
    reactivityKeys: apiKeysKey(workspaceId),
  })
);

export const createApiKey = PealApi.mutation("apiKeys", "create");

export const revokeApiKey = PealApi.mutation("apiKeys", "revoke");

/** What refreshes the connected applications once one is revoked. */
export const connectedAppsChanged = ["connected-apps"];

export const connectedApps = PealApi.query("connectedApps", "list", {
  reactivityKeys: connectedAppsChanged,
});

export const revokeConnectedApp = PealApi.mutation("connectedApps", "revoke");

export const deleteWorkspace = PealApi.mutation("workspaces", "delete");

export const deleteAccount = PealApi.mutation("account", "delete");
