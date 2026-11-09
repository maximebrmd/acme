import { apiKey } from "@better-auth/api-key";
import { drizzleAdapter } from "@better-auth/drizzle-adapter/relations-v2";
import type { DrizzleAdapterConfig } from "@better-auth/drizzle-adapter/relations-v2";
import { betterAuth } from "better-auth";
import type { User } from "better-auth";
import { admin, organization } from "better-auth/plugins";
import { Option, Redacted, Schema } from "effect";

import { defaultLocale, LocaleSchema } from "#shared/domain/locale.ts";
import type { Locale } from "#shared/domain/locale.ts";

import { accessControl, roles } from "./access-control.ts";
import { refuseImpersonatedChanges } from "./impersonation.ts";
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
 * What Better Auth calls back into the rest of the server for. Each returns at
 * once: Better Auth awaits its email callbacks, and sending inside the request
 * would make the reply slower for known emails than for unknown ones.
 */
export interface AuthHooks {
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

const thirtyDays = 60 * 60 * 24 * 30;

const oneDay = 60 * 60 * 24;

const fiveMinutes = 5 * 60;

const oneHour = 60 * 60;

const oneWeek = 7 * oneDay;

/**
 * The Better Auth instance: email and password with verification, workspaces
 * (the organization plugin), staff tools (the admin plugin) and API keys owned
 * by workspaces.
 *
 * Every plugin is always on, and options that shape tables are constants, so
 * `scripts/auth-schema.ts` generates the same tables for every deployment.
 */
export const makeAuth = ({ database, hooks, settings }: AuthDependencies) =>
  betterAuth({
    account: { encryptOAuthTokens: true },
    advanced: {
      cookiePrefix,
      database: { generateId: "uuid" },
      ipAddress: { ipAddressHeaders: [...settings.ipAddressHeaders] },
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
    disabledPaths: [
      "/api-key/create",
      "/api-key/delete",
      "/api-key/get",
      "/api-key/list",
      "/api-key/update",
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
    hooks: { before: refuseImpersonatedChanges },
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
        invitationExpiresIn: oneWeek,
        requireEmailVerificationOnInvitation: true,
        roles,
        sendInvitationEmail: async ({
          id,
          email,
          invitation,
          inviter,
          organization: workspace,
        }) => {
          const locale = localeOf(inviter.user);

          hooks.invitation({
            inviterName: inviter.user.name,
            locale,
            role: invitation.role,
            to: email,
            url: `${settings.publicUrl}${localePrefix(locale)}/invitations/${id}`,
            workspaceName: workspace.name,
          });

          await Promise.resolve();
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
    ],
    rateLimit: { enabled: settings.production, storage: "database" },
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
