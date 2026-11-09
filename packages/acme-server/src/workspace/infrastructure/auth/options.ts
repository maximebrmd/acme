import { apiKey } from "@better-auth/api-key";
import {
  getCurrentAuthEndpointContext,
  tryGetCurrentAuthEndpointContext,
} from "@better-auth/core/context";
import { drizzleAdapter } from "@better-auth/drizzle-adapter/relations-v2";
import type { DrizzleAdapterConfig } from "@better-auth/drizzle-adapter/relations-v2";
import { mcp } from "@better-auth/mcp";
import {
  oauthDeviceAuthorization,
  oauthProvider,
} from "@better-auth/oauth-provider";
import type { OAuthOptions, Scope } from "@better-auth/oauth-provider";
import { betterAuth } from "better-auth";
import type { Session, User } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { admin, jwt, organization } from "better-auth/plugins";
import { Option, Redacted, Schema } from "effect";

import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import { defaultLocale, LocaleSchema } from "#shared/domain/locale.ts";
import type { Locale } from "#shared/domain/locale.ts";
import { RoleSchema } from "#workspace/domain/roles.ts";

import { accessControl, roles } from "./access-control.ts";
import {
  checkMemberRoom,
  refuseDeletingSubscribed,
  refusePersonalSubscriptions,
  stripeBilling,
  turnstile,
} from "./billing.ts";
import type { BillingHooks } from "./billing.ts";
import { refuseImpersonatedChanges } from "./impersonation.ts";
import {
  apiResourceOf,
  cliClientId,
  mcpResourceOf,
  oauthPages,
  oauthScopes,
  servesMcp,
  workspaceClaim,
} from "./oauth.ts";
import type { AuthConfiguration } from "./settings.ts";

/** A link Better Auth wants mailed, in the recipient's language. */
export interface AuthLink {
  readonly locale: Locale;
  readonly to: string;
  readonly url: string;
}

export interface InvitationLink extends AuthLink {
  readonly inviterName: string;
  readonly role: string;
  readonly workspaceName: string;
}

export type AuthLogLevel = "debug" | "error" | "info" | "warn";

/**
 * What Better Auth calls back into the rest of the server for. The email
 * hooks return at once: Better Auth awaits its email callbacks, and sending
 * inside the request would make the reply slower for known emails than for
 * unknown ones. The billing hooks are awaited.
 */
export interface AuthHooks extends BillingHooks {
  readonly invitation: (link: InvitationLink) => void;
  readonly log: (level: AuthLogLevel, message: string) => void;
  readonly resetPassword: (link: AuthLink) => void;
  readonly verifyEmail: (link: AuthLink) => void;
}

export interface AuthDatabase {
  /**
   * A promise-based Drizzle database (node-postgres), as the adapter awaits
   * its queries, built with the generated relations.
   */
  readonly db: Parameters<typeof drizzleAdapter>[0];
  /** The generated tables, by Better Auth model name. */
  readonly tables: DrizzleAdapterConfig["schema"];
}

export interface AuthDependencies {
  readonly database: AuthDatabase;
  readonly hooks: AuthHooks;
  readonly settings: AuthConfiguration;
}

// Better Auth serves its routes, and writes its links, under this path of
// PUBLIC_URL. The web app forwards /api/* to the server unchanged.
export const authBasePath = "/api/auth";

// Session cookies are named acme.session_token, or __Secure-acme.session_token
// over HTTPS.
export const cookiePrefix = "acme";

// Better Auth passes users as its core type; their locale is an additional
// field it does not type.
const decodeLocaleField = Schema.decodeUnknownOption(
  Schema.Struct({ locale: LocaleSchema })
);

const localeOf = (user: User): Locale =>
  decodeLocaleField(user).pipe(
    Option.match({
      onNone: () => defaultLocale,
      onSome: ({ locale }) => locale,
    })
  );

const localePrefix = (locale: Locale): string =>
  locale === defaultLocale ? "" : `/${locale}`;

/** The web app's page that answers an invitation, in the reader's language. */
export const invitationUrl = (
  publicUrl: string,
  locale: Locale,
  invitationId: string
): string => `${publicUrl}${localePrefix(locale)}/invitations/${invitationId}`;

const isRole = Schema.is(RoleSchema);

// A member holds one role. Better Auth would store several, comma-separated,
// which the emails and the web app would show as they are.
const oneRole = async (role: string): Promise<void> => {
  if (!isRole(role)) {
    throw APIError.from("BAD_REQUEST", {
      code: "ONE_ROLE_PER_MEMBER",
      message: "A member holds exactly one role",
    });
  }

  await Promise.resolve();
};

const thirtyDays = 60 * 60 * 24 * 30;

const oneDay = 60 * 60 * 24;

const fiveMinutes = 5 * 60;

const oneHour = 60 * 60;

const oneWeek = 7 * oneDay;

/** How long an invitation's link works, in seconds. */
export const invitationLifetime = oneWeek;

/** How many invitations a workspace may have pending, unexpired, at once. */
export const pendingInvitationLimit = 100;

const fifteenMinutes = 15 * 60;

const refreshReplayWindow = 30;

const decodeWorkspaceId = Schema.decodeUnknownOption(WorkspaceIdSchema);

const decodePickedWorkspace = Schema.decodeUnknownOption(
  Schema.Struct({ activeOrganizationId: WorkspaceIdSchema })
);

// The workspace the user picked for an OAuth client: the one they made their
// session's active workspace on the picker page.
const pickedWorkspace = (session: Session): Option.Option<WorkspaceId> =>
  decodePickedWorkspace(session).pipe(
    Option.map(({ activeOrganizationId }) => activeOrganizationId)
  );

const isMember = async (
  userId: string,
  workspaceId: WorkspaceId
): Promise<boolean> => {
  const { adapter } = getCurrentAuthEndpointContext().context;

  const found = await adapter.findOne({
    model: "member",
    select: ["id"],
    where: [
      { field: "userId", value: userId },
      { field: "organizationId", value: workspaceId },
    ],
  });

  return found !== null;
};

// MCP clients register themselves, when the server allows it, with the
// right to ask for reading; writing they may ask for too, and the user then
// agrees to it or not on the consent page.
const dynamicClientRegistration: Partial<OAuthOptions<Scope[]>> = {
  allowDynamicClientRegistration: true,
  allowUnauthenticatedClientRegistration: true,
  clientRegistrationAllowedScopes: ["workspace:write"],
  clientRegistrationDefaultApplicationType: "infer",
  clientRegistrationDefaultScopes: [
    "openid",
    "profile",
    "email",
    "offline_access",
    "workspace:read",
  ],
};

/**
 * The OAuth authorization server, for the HTTP API and the MCP endpoint.
 * Access tokens are JWTs that resource servers check locally, so they are
 * short-lived; refresh tokens renew them, once each.
 *
 * Better Auth's MCP plugin refuses an MCP endpoint that is neither HTTPS nor
 * on a loopback host, as MCP clients do. A server whose PUBLIC_URL is plain
 * HTTP elsewhere, as on a home network, still starts and signs the command
 * line in: it runs the same OAuth provider, with the same tables, without
 * the MCP resource, so no token is ever issued for its MCP endpoint.
 */
const oauthServer = (settings: AuthConfiguration) => {
  const options: OAuthOptions<Scope[]> = {
    accessTokenExpiresIn: fifteenMinutes,
    cachedTrustedClients: new Set([cliClientId]),
    consentPage: oauthPages.consent,
    // A token issued after the user picked a workspace is bound to it.
    // Renewing a token passes the reference it was stored with, which
    // is null for the command line's.
    customAccessTokenClaims: ({ referenceId }) =>
      Option.match(decodeWorkspaceId(referenceId), {
        onNone: () => ({}),
        onSome: (workspaceId) => ({ [workspaceClaim]: workspaceId }),
      }),
    // No client credentials grant: scripts use API keys.
    grantTypes: ["authorization_code", "refresh_token"],
    loginPage: oauthPages.signIn,
    // The workspace picker. Every authorization asks which workspace the
    // client may use, rather than taking the one the user last opened,
    // and the consent is kept per workspace.
    postLogin: {
      consentReferenceId: ({ session }) =>
        Option.getOrThrowWith(pickedWorkspace(session), () =>
          APIError.from("BAD_REQUEST", {
            code: "WORKSPACE_REQUIRED",
            message: "Pick the workspace the client may use",
          })
        ),
      page: oauthPages.workspace,
      // Coming back from the picker, the user must still belong to the
      // workspace they picked.
      shouldRedirect: async ({ isContinuation, session, user }) => {
        const picked = pickedWorkspace(session);

        return (
          !isContinuation ||
          Option.isNone(picked) ||
          !(await isMember(user.id, picked.value))
        );
      },
    },
    // A refresh token sent again within this window gets the answer it got
    // the first time, as when two commands renew the same saved sign-in or
    // a client retries after losing the answer. Sent again later, it reads
    // as stolen, and every refresh token of its user and client is revoked:
    // for the command line, its sign-ins on every machine.
    refreshTokenReuseInterval: refreshReplayWindow,
    resources: [apiResourceOf(settings.publicUrl)],
    scopes: oauthScopes,
  };

  const provider = settings.dynamicClientRegistration
    ? { ...options, ...dynamicClientRegistration }
    : options;

  return servesMcp(settings.publicUrl)
    ? mcp({ ...provider, resource: mcpResourceOf(settings.publicUrl) })
    : oauthProvider(provider);
};

// Every route's before hook.
const beforeEveryRoute = createAuthMiddleware(async (ctx) => {
  await refuseImpersonatedChanges(ctx);
  refusePersonalSubscriptions(ctx);
});

/**
 * The Better Auth instance: email and password with verification, workspaces
 * (the organization plugin), staff tools (the admin plugin), API keys owned
 * by workspaces, and the OAuth authorization server that MCP clients and the
 * command line sign in with (the MCP and device authorization plugins, which
 * sign their tokens with the JWT plugin's keys). On a server configured for
 * them, Cloudflare Turnstile on sign-ups and password resets (the captcha
 * plugin) and workspace subscriptions through Stripe (the Stripe plugin).
 *
 * Every other plugin is always on, and options that shape tables are
 * constants. The captcha plugin has no table, and `scripts/auth-schema.ts`
 * generates the tables with the Stripe plugin on, which Better Auth runs
 * without when billing is off, so every deployment has the same tables.
 */
export const makeAuth = ({ database, hooks, settings }: AuthDependencies) =>
  betterAuth({
    account: { encryptOAuthTokens: true },
    advanced: {
      cookiePrefix,
      database: { generateId: "uuid" },
      ipAddress: {
        ipAddressHeaders: [...settings.ipAddressHeaders],
        trustedProxies: [...settings.trustedProxies],
      },
    },
    appName: "Acme",
    basePath: authBasePath,
    baseURL: settings.publicUrl,
    database: drizzleAdapter(database.db, {
      provider: "pg",
      schema: database.tables,
      schemaName: "auth",
      transaction: true,
    }),
    // API keys go through Acme's own API only (/api/workspaces/:id/api-keys):
    // their permissions are the server's to set, and staff impersonating a
    // member may not see or revoke them, which Better Auth's routes ignore.
    //
    // The JWT plugin's session tokens would be signed with the keys that sign
    // OAuth access tokens; the device grant's session tokens bypass OAuth.
    // OAuth clients are registered by the server (the command line's) or by
    // MCP clients themselves, never by signed-in users.
    //
    // Workspaces and accounts are deleted through Acme's API too
    // (DELETE /api/workspaces/:id and DELETE /api/me), which delete what
    // every context keeps: the admin plugin's removal of a user would leave
    // their notices, preferences and the workspaces they alone belonged to.
    // Staff ban accounts instead.
    disabledPaths: [
      "/admin/remove-user",
      "/api-key/create",
      "/api-key/delete",
      "/api-key/get",
      "/api-key/list",
      "/api-key/update",
      "/device/token",
      "/oauth2/client/rotate-secret",
      "/oauth2/create-client",
      "/oauth2/delete-client",
      "/oauth2/get-client",
      "/oauth2/get-clients",
      "/oauth2/update-client",
      "/organization/delete",
      "/token",
    ],
    emailAndPassword: {
      // A sign-up for an email that already has an account answers with a
      // made-up user. Built with the admin plugin's fields, it reads the same
      // as a real one.
      customSyntheticUser: ({ additionalFields, coreFields, id }) => ({
        ...coreFields,
        banExpires: null,
        banReason: null,
        banned: false,
        locale: defaultLocale,
        role: "user",
        ...additionalFields,
        id,
      }),
      enabled: true,
      minPasswordLength: 12,
      requireEmailVerification: settings.requireEmailVerification,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ url, user }) => {
        hooks.resetPassword({ locale: localeOf(user), to: user.email, url });

        await Promise.resolve();
      },
    },
    emailVerification: {
      autoSignInAfterVerification: true,
      sendOnSignUp: true,
      sendVerificationEmail: async ({ url, user }) => {
        hooks.verifyEmail({ locale: localeOf(user), to: user.email, url });

        await Promise.resolve();
      },
    },
    hooks: { before: beforeEveryRoute },
    logger: {
      level: "warn",
      // Messages only: Better Auth passes request details as further
      // arguments, which must not reach the logs.
      log: (level, message) => {
        hooks.log(level, message);
      },
    },
    plugins: [
      organization({
        ac: accessControl,
        allowUserToCreateOrganization: true,
        cancelPendingInvitationsOnReInvite: true,
        creatorRole: "owner",
        invitationExpiresIn: invitationLifetime,
        invitationLimit: pendingInvitationLimit,
        organizationHooks: {
          // An invitation is accepted, or a member added, only while the
          // workspace's plan has room for one more.
          beforeAcceptInvitation: async ({ invitation }) => {
            await checkMemberRoom(
              hooks,
              invitation.organizationId,
              Option.none()
            );
          },
          beforeAddMember: async ({ member }) => {
            await oneRole(member.role);
            await checkMemberRoom(hooks, member.organizationId, Option.none());
          },
          beforeCreateInvitation: async ({ invitation }) => {
            await oneRole(invitation.role);
            await checkMemberRoom(
              hooks,
              invitation.organizationId,
              Option.some(invitation.email)
            );
          },
          // A workspace's API keys go with it: they refer to it by id alone,
          // with no foreign key, and would otherwise outlive it. They go
          // first, so that a failure may leave a workspace without its keys,
          // never keys without their workspace; a workspace a subscription
          // pays for is refused before.
          beforeDeleteOrganization: async (
            { organization: workspace },
            ctx
          ) => {
            await refuseDeletingSubscribed(hooks, workspace.id);

            const { adapter } = (ctx ?? getCurrentAuthEndpointContext())
              .context;

            await adapter.deleteMany({
              model: "apikey",
              where: [{ field: "referenceId", value: workspace.id }],
            });
          },
          beforeUpdateMemberRole: async ({ newRole }) => {
            await oneRole(newRole);
          },
        },
        requireEmailVerificationOnInvitation: true,
        roles,
        sendInvitationEmail: async ({
          id,
          email,
          invitation,
          inviter,
          organization: workspace,
        }) => {
          // In the reader's language: the invitee's, when they have an
          // account, otherwise the inviter's.
          const invitee =
            await tryGetCurrentAuthEndpointContext()?.context.internalAdapter.findUserByEmail(
              email
            );

          const locale = localeOf(invitee?.user ?? inviter.user);

          hooks.invitation({
            inviterName: inviter.user.name,
            locale,
            role: invitation.role,
            to: email,
            url: invitationUrl(settings.publicUrl, locale, id),
            workspaceName: workspace.name,
          });
        },
      }),
      admin({ adminRoles: ["admin"], impersonationSessionDuration: oneHour }),
      apiKey({
        defaultPrefix: "acme_",
        enableMetadata: true,
        keyExpiration: { defaultExpiresIn: null, maxExpiresIn: 365 },
        // These become the defaults of the apikey table's columns, so they
        // stay constants: 600 requests a minute per key.
        rateLimit: { enabled: true, maxRequests: 600, timeWindow: 60_000 },
        references: "organization",
        requireName: true,
      }),
      // Signs OAuth access tokens and publishes its keys at /api/auth/jwks.
      jwt({ disableSettingJwtHeader: true }),
      oauthServer(settings),
      // The command line's sign-in (RFC 8628): it shows a code, which the
      // user enters on the web app's /device page.
      oauthDeviceAuthorization({
        expiresIn: "10m",
        interval: "5s",
        verificationUri: oauthPages.device,
      }),
      ...Option.match(settings.captcha, {
        onNone: () => [],
        onSome: (captcha) => [turnstile(captcha)],
      }),
      ...Option.match(settings.stripe, {
        onNone: () => [],
        onSome: (billing) => [
          stripeBilling(billing, hooks, (message) => {
            hooks.log("warn", message);
          }),
        ],
      }),
    ],
    rateLimit: {
      // Stripe retries its webhooks, whose signature is their guard.
      customRules: { "/stripe/webhook": false },
      enabled: settings.production,
      storage: "database",
    },
    secret: Redacted.value(settings.secret),
    session: {
      cookieCache: { enabled: true, maxAge: fiveMinutes },
      expiresIn: thirtyDays,
      updateAge: oneDay,
    },
    telemetry: { enabled: false },
    trustedOrigins: [...settings.trustedOrigins],
    user: {
      additionalFields: {
        locale: {
          defaultValue: defaultLocale,
          input: true,
          required: false,
          type: [...LocaleSchema.literals],
        },
      },
    },
  });

export type AcmeAuth = ReturnType<typeof makeAuth>;
