import { DateTime, Effect, Option, Redacted, Schema } from "effect";
import { HttpApiBuilder, HttpApiSchema } from "effect/http-api";
import {
  Api,
  BillingUnavailable,
  DeletionIncomplete,
  IncorrectPassword,
  LastOwner,
  MediaStoreUnavailable,
  PartnerOwnsWorkspaces,
  NoticeEventSchema,
  StaffActionSchema,
  TargetOptionsSchema,
  TooManyPasswordAttempts,
  Unauthenticated,
  WorkspaceBusy,
} from "peal-contract";
import type { AccountExport as AccountExportView } from "peal-contract";

import { forbidden } from "#shared/api/forbidden.ts";
import type { PostRecord } from "#shared/application/personal-data.ts";
import { AccountData } from "#workspace/application/account-data.ts";
import type { AccountExport } from "#workspace/application/account-data.ts";
import { CloseAccount } from "#workspace/application/close-account.ts";

import { aboutOf } from "./about.ts";
import { currentUser } from "./connected-apps.ts";
import { subscribedOf } from "./subscribed.ts";

const decodeEvent = Schema.decodeUnknownEffect(NoticeEventSchema);

const decodeOptions = Schema.decodeUnknownEffect(
  Schema.NullOr(TargetOptionsSchema)
);

// A post with its targets' options as the contract describes them, decoded
// from what publishing stored.
const postOf = <P extends PostRecord>(post: P) =>
  Effect.all(
    post.targets.map((target) =>
      decodeOptions(target.options).pipe(
        Effect.orDie,
        Effect.map((options) => ({ ...target, options }))
      )
    )
  ).pipe(Effect.map((targets) => ({ ...post, targets })));

const postsOf = <P extends PostRecord>(posts: readonly P[]) =>
  Effect.all(posts.map(postOf));

const decodeAction = Schema.decodeUnknownEffect(StaffActionSchema);

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

  const authoredPosts = yield* postsOf(exported.authoredPosts);

  const staffActions = yield* Effect.all(
    exported.staffActions.map((done) =>
      decodeAction(done.action).pipe(
        Effect.orDie,
        Effect.map((action) => ({ ...done, action }))
      )
    )
  );

  const workspacePosts = yield* Effect.all(
    exported.workspaces.map((workspace) => postsOf(workspace.posts))
  );

  const view: AccountExportView = {
    about: aboutOf({
      bills: exported.bills,
      declaration: exported.declaration,
      legalRetention: exported.legalHold !== null,
      locale: account.user.locale,
    }),
    activity: exported.activity,
    authoredPosts,
    connectedApps: exported.connectedApps,
    contracts: exported.contracts,
    exportedAt: exported.exportedAt,
    invitations: {
      received: account.invitationsReceived,
      sent: account.invitationsSent,
    },
    legalHold: exported.legalHold,
    memberships: account.memberships,
    notices,
    notificationPreferences: exported.preferences,
    review: exported.review,
    sessions: account.sessions,
    signInMethods: account.signInMethods,
    staffActions,
    user: account.user,
    workspaces: exported.workspaces.map((workspace, index) => ({
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
      posts: workspacePosts[index] ?? [],
      review: workspace.review,
      saved: workspace.saved,
      slug: workspace.slug,
      webhooks: workspace.webhooks,
    })),
  };

  return view;
});

// peal-data-2026-11-09.json: the day it was made, in UTC.
const fileNameOf = (exportedAt: DateTime.Utc): string =>
  `peal-data-${DateTime.formatIsoDate(exportedAt)}.json`;

export const AccountHandlers = HttpApiBuilder.group(
  Api,
  "account",
  Effect.fn(function* accountHandlers(handlers) {
    const data = yield* AccountData;
    const closing = yield* CloseAccount;

    return handlers.handleAll({
      closure: () =>
        Effect.gen(function* closure() {
          const legalHold = yield* data.afterClosure(yield* currentUser).pipe(
            Effect.catchTags({
              DatabaseError: Effect.die,
              SessionRequired: forbidden,
            })
          );

          return { legalHold };
        }),
      delete: ({ payload }) =>
        Effect.gen(function* remove() {
          yield* closing
            .close(yield* currentUser, Redacted.make(payload.password), {
              cancelSubscriptions: payload.cancelSubscriptions === true,
            })
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
                ErasureIncomplete: ({ subscriptionsCancelled }) =>
                  Effect.fail(
                    new DeletionIncomplete({ subscriptionsCancelled })
                  ),
                ErasureLedgerUnavailable: ({ cause }) =>
                  Effect.logWarning(
                    "The erasure ledger could not be written, so nothing was deleted",
                    cause
                  ).pipe(
                    Effect.andThen(Effect.fail(new MediaStoreUnavailable()))
                  ),
                IncorrectPassword: () => Effect.fail(new IncorrectPassword()),
                LastOwner: ({ workspaces }) =>
                  Effect.fail(new LastOwner({ workspaces })),
                NotSignedIn: () => Effect.fail(new Unauthenticated()),
                PartnerOwnsWorkspaces: ({ owned }) =>
                  Effect.fail(new PartnerOwnsWorkspaces({ owned })),
                SessionRequired: forbidden,
                TooManyPasswordAttempts: () =>
                  Effect.fail(new TooManyPasswordAttempts()),
                WorkspaceBusy: ({ workspaceId }) =>
                  Effect.fail(new WorkspaceBusy({ workspaceId })),
                WorkspaceSubscribed: (refused) =>
                  Effect.fail(subscribedOf(refused)),
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
