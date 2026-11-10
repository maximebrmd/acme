import { Effect, Option } from "effect";
import { HttpApiBuilder, HttpApiError } from "effect/http-api";
import {
  Api,
  BillingUnavailable,
  CurrentPrincipal,
  DeletionIncomplete,
  ExternalIdTaken,
  Forbidden,
  IdempotencyKeyReused,
  MediaStoreUnavailable,
  PartnerDetailsInvalid,
  WorkspaceBusy,
  WorkspaceNotFound,
} from "peal-contract";

import { ActivityJournal } from "#workspace/application/activity-journal.ts";
import { OffboardWorkspace } from "#workspace/application/offboard-workspace.ts";
import { PartnerWorkspaces } from "#workspace/application/partner-workspaces.ts";
import type { WorkspaceListRequest } from "#workspace/application/partner-workspaces.ts";
import type { MissingPartnerScope } from "#workspace/domain/missing-partner-scope.ts";

import { recordMade } from "./activity-recording.ts";
import {
  customerWorkspacePageView,
  customerWorkspaceView,
  partnerUsageView,
  partnerView,
} from "./partner-view.ts";
import { partnerKeyPrincipalOf } from "./principal.ts";

// The key works, and its partner account is gone: closed meanwhile.
const forbidden = () =>
  Effect.fail(
    new Forbidden({
      message:
        "The partner account this key belongs to was closed: its keys do nothing more.",
    })
  );

// A key without the scope a request takes is told which, and who gives it.
const withoutScope = ({ scope }: MissingPartnerScope) =>
  Effect.fail(
    new Forbidden({
      message: `This partner key was not given the scope ${scope}, which this request takes. An owner or an admin of the partner's workspace creates a key that has it.`,
      reason: "missingScope",
      scope,
    })
  );

const notFound = () => Effect.fail(new WorkspaceNotFound());

// The partner key a request to the partner API carries. Anything else, a
// workspace's API key and a member's session included, may not call it.
const currentKey = Effect.gen(function* currentKey() {
  const principal = yield* CurrentPrincipal;

  return principal._tag === "partnerKey"
    ? partnerKeyPrincipalOf(principal)
    : yield* new Forbidden({
        message:
          "The partner API takes a partner key, sent as a bearer token: not a session, a workspace's API key or an application's token.",
      });
});

/** The filters and the page a list of workspaces was asked with. */
export const listRequestOf = (query: {
  readonly before?: string;
  readonly externalId?: string;
  readonly limit?: number;
  readonly name?: string;
}): WorkspaceListRequest => ({
  before: Option.fromUndefinedOr(query.before),
  externalId: Option.fromUndefinedOr(query.externalId),
  limit: Option.fromUndefinedOr(query.limit),
  name: Option.fromUndefinedOr(query.name),
});

// A request as its idempotency key keeps it: the same request gives the
// same text, whatever order its fields came in.
const fingerprintOf = (payload: {
  readonly externalId?: string;
  readonly name: string;
}): string =>
  JSON.stringify({
    externalId: payload.externalId ?? null,
    name: payload.name,
  });

export const PartnerHandlers = HttpApiBuilder.group(
  Api,
  "partner",
  Effect.fn(function* partnerHandlers(handlers) {
    const workspaces = yield* PartnerWorkspaces;
    const offboarding = yield* OffboardWorkspace;
    const activity = yield* ActivityJournal;

    return handlers.handleAll({
      account: () =>
        Effect.gen(function* account() {
          const key = yield* currentKey;

          const { partner, usage } = yield* workspaces.account(key).pipe(
            Effect.catchTags({
              DatabaseError: Effect.die,
              // The key's account went between its check and this read.
              PartnerNotFound: forbidden,
            })
          );

          return {
            partner: partnerView(partner),
            usage: partnerUsageView(usage),
          };
        }),
      createWorkspace: ({ headers, payload }) =>
        Effect.gen(function* createWorkspace() {
          const key = yield* currentKey;

          const created = yield* workspaces
            .create(key, {
              externalId: Option.fromUndefinedOr(payload.externalId),
              idempotency: Option.fromUndefinedOr(
                headers["idempotency-key"]
              ).pipe(
                Option.map((idempotencyKey) => ({
                  fingerprint: fingerprintOf(payload),
                  key: idempotencyKey,
                }))
              ),
              name: payload.name,
            })
            .pipe(
              Effect.catchTags({
                CreationKeyReused: () =>
                  Effect.fail(new IdempotencyKeyReused()),
                CustomerWorkspaceNotFound: notFound,
                DatabaseError: Effect.die,
                ExternalIdTaken: ({ workspaceId }) =>
                  Effect.fail(new ExternalIdTaken({ workspaceId })),
                InvalidWorkspaceDetails: ({ field }) =>
                  Effect.fail(new PartnerDetailsInvalid({ field })),
                MissingPartnerScope: withoutScope,
              })
            );

          // The new workspace's log starts with its making; a request
          // answered with the workspace it made before made nothing.
          if (!created.replayed) {
            yield* recordMade(activity, {
              operation: "partner.createWorkspace",
              principal: key,
              status: 201,
              workspaceId: created.workspace.id,
            });
          }

          return customerWorkspaceView({
            channels: 0,
            workspace: created.workspace,
          });
        }),
      deleteWorkspace: ({ params }) =>
        Effect.gen(function* deleteWorkspace() {
          const key = yield* currentKey;

          yield* offboarding.offboard(key, params.workspaceId).pipe(
            Effect.catchTags({
              BillingUnavailable: ({ workspaceId }) =>
                Effect.logWarning(
                  "Stripe could not be reached to expire a workspace's open checkouts"
                ).pipe(
                  Effect.annotateLogs({ workspaceId }),
                  Effect.andThen(
                    Effect.fail(new BillingUnavailable({ workspaceId }))
                  )
                ),
              CustomerWorkspaceNotFound: notFound,
              DatabaseError: Effect.die,
              ErasureIncomplete: ({ subscriptionsCancelled }) =>
                Effect.fail(new DeletionIncomplete({ subscriptionsCancelled })),
              ErasureLedgerUnavailable: ({ cause }) =>
                Effect.logWarning(
                  "The erasure ledger could not be written, so nothing was deleted",
                  cause
                ).pipe(
                  Effect.andThen(Effect.fail(new MediaStoreUnavailable()))
                ),
              MissingPartnerScope: withoutScope,
              WorkspaceBusy: ({ workspaceId }) =>
                Effect.fail(new WorkspaceBusy({ workspaceId })),
            })
          );
        }),
      getWorkspace: ({ params }) =>
        Effect.gen(function* getWorkspace() {
          const key = yield* currentKey;

          const found = yield* workspaces.get(key, params.workspaceId).pipe(
            Effect.catchTags({
              CustomerWorkspaceNotFound: notFound,
              DatabaseError: Effect.die,
              MissingPartnerScope: withoutScope,
            })
          );

          return customerWorkspaceView(found);
        }),
      listWorkspaces: ({ query }) =>
        Effect.gen(function* listWorkspaces() {
          const key = yield* currentKey;

          const page = yield* workspaces.list(key, listRequestOf(query)).pipe(
            Effect.catchTags({
              DatabaseError: Effect.die,
              InvalidWorkspaceCursor: () =>
                Effect.fail(new HttpApiError.BadRequest()),
              MissingPartnerScope: withoutScope,
            })
          );

          return customerWorkspacePageView(page);
        }),
      updateWorkspace: ({ params, payload }) =>
        Effect.gen(function* updateWorkspace() {
          const key = yield* currentKey;

          const changed = yield* workspaces
            .change(key, params.workspaceId, payload)
            .pipe(
              Effect.catchTags({
                CustomerWorkspaceNotFound: notFound,
                DatabaseError: Effect.die,
                ExternalIdTaken: ({ workspaceId }) =>
                  Effect.fail(new ExternalIdTaken({ workspaceId })),
                InvalidWorkspaceDetails: ({ field }) =>
                  Effect.fail(new PartnerDetailsInvalid({ field })),
                MissingPartnerScope: withoutScope,
              })
            );

          yield* recordMade(activity, {
            operation: "partner.updateWorkspace",
            principal: key,
            status: 200,
            workspaceId: changed.workspace.id,
          });

          return customerWorkspaceView(changed);
        }),
    });
  })
);
