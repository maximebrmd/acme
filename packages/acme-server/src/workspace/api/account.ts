import {
  Api,
  BillingUnavailable,
  Forbidden,
  IncorrectPassword,
  LastOwner,
  NoticeEventSchema,
  TooManyPasswordAttempts,
  Unauthenticated,
  WorkspaceBusy,
  WorkspaceSubscribed,
} from "acme-contract";
import type { AccountExport as AccountExportView } from "acme-contract";
import { DateTime, Effect, Option, Redacted, Schema } from "effect";
import { HttpApiBuilder, HttpApiSchema } from "effect/http-api";

import { AccountData } from "#workspace/application/account-data.ts";
import type { AccountExport } from "#workspace/application/account-data.ts";
import { CloseAccount } from "#workspace/application/close-account.ts";

import { currentUser } from "./connected-apps.ts";

const forbidden = () => Effect.fail(new Forbidden());

const decodeEvent = Schema.decodeUnknownEffect(NoticeEventSchema);

const viewOf = Effect.fn("AccountExport.view")(function* viewOf(
  exported: AccountExport
) {
  const { account } = exported;

  const notices = yield* Effect.all(
    exported.notices.map((notice) =>
      decodeEvent(notice.event).pipe(
        Effect.orDie,
        Effect.map((event) => ({ ...notice, event }))
      )
    )
  );

  const view: AccountExportView = {
    authoredPosts: exported.authoredPosts,
    connectedApps: exported.connectedApps,
    exportedAt: exported.exportedAt,
    invitations: {
      received: account.invitationsReceived,
      sent: account.invitationsSent,
    },
    memberships: account.memberships,
    notices,
    notificationPreferences: exported.preferences,
    sessions: account.sessions,
    signInMethods: account.signInMethods,
    user: account.user,
    workspaces: exported.workspaces.map((workspace) => ({
      analytics: workspace.analytics,
      apiKeys: workspace.apiKeys.map((apiKey) => ({
        createdAt: apiKey.createdAt,
        expiresAt: Option.getOrNull(apiKey.expiresAt),
        id: apiKey.id,
        name: apiKey.name,
        permissions: apiKey.permissions,
        start: Option.getOrNull(apiKey.start),
      })),
      assistantUsage: workspace.assistantUsage,
      billing: workspace.billing,
      channels: workspace.channels,
      createdAt: workspace.createdAt,
      id: workspace.id,
      media: workspace.media,
      name: workspace.name,
      posts: workspace.posts,
      slug: workspace.slug,
    })),
  };

  return view;
});

// acme-data-2026-11-09.json: the day it was made, in UTC.
const fileNameOf = (exportedAt: DateTime.Utc): string =>
  `acme-data-${DateTime.formatIsoDate(exportedAt)}.json`;

export const AccountHandlers = HttpApiBuilder.group(
  Api,
  "account",
  Effect.fn(function* accountHandlers(handlers) {
    const data = yield* AccountData;
    const closing = yield* CloseAccount;

    return handlers.handleAll({
      delete: ({ payload }) =>
        Effect.gen(function* remove() {
          yield* closing
            .close(yield* currentUser, Redacted.make(payload.password))
            .pipe(
              Effect.catchTags({
                AuthUnavailable: Effect.die,
                BillingUnavailable: ({ workspaceId }) =>
                  Effect.logWarning(
                    "Stripe could not be reached to expire a workspace's open checkouts"
                  ).pipe(
                    Effect.annotateLogs({ workspaceId }),
                    Effect.andThen(
                      Effect.fail(new BillingUnavailable({ workspaceId }))
                    )
                  ),
                DatabaseError: Effect.die,
                IncorrectPassword: () => Effect.fail(new IncorrectPassword()),
                LastOwner: ({ workspaces }) =>
                  Effect.fail(new LastOwner({ workspaces })),
                NotSignedIn: () => Effect.fail(new Unauthenticated()),
                SessionRequired: forbidden,
                TooManyPasswordAttempts: () =>
                  Effect.fail(new TooManyPasswordAttempts()),
                WorkspaceBusy: ({ workspaceId }) =>
                  Effect.fail(new WorkspaceBusy({ workspaceId })),
                WorkspaceSubscribed: ({ workspaceId }) =>
                  Effect.fail(new WorkspaceSubscribed({ workspaceId })),
              })
            );
        }),
      export: () =>
        Effect.gen(function* exportData() {
          const exported = yield* data.export(yield* currentUser).pipe(
            Effect.catchTags({
              AuthUnavailable: Effect.die,
              DatabaseError: Effect.die,
              NotSignedIn: () => Effect.fail(new Unauthenticated()),
              SessionRequired: forbidden,
            })
          );

          return HttpApiSchema.withHeaders({
            body: yield* viewOf(exported),
            headers: {
              "content-disposition": `attachment; filename="${fileNameOf(exported.exportedAt)}"`,
            },
          });
        }),
    });
  })
);
