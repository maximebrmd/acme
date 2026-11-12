import { Effect, Option, Redacted } from "effect";
import { HttpApiBuilder, HttpApiError } from "effect/http-api";
import {
  Api,
  CurrentMember,
  PartnerAccountsClosed,
  PartnerDetailsInvalid,
  PartnerKeyNotFound,
  PartnerNotFound,
  PartnerOwnsWorkspaces,
} from "peal-contract";

import { actorOf } from "#shared/api/actor.ts";
import { forbidden } from "#shared/api/forbidden.ts";
import { PartnerAccounts } from "#workspace/application/partner-accounts.ts";
import { PartnerHealth } from "#workspace/application/partner-health.ts";
import { PartnerKeys } from "#workspace/application/partner-keys.ts";
import { PartnerWorkspaces } from "#workspace/application/partner-workspaces.ts";

import {
  customerWorkspacePageView,
  partnerHealthView,
  partnerKeyView,
  partnerUsageView,
  partnerView,
} from "./partner-view.ts";
import { healthRequestOf, listRequestOf } from "./partner.ts";

const noPartner = () => Effect.fail(new PartnerNotFound());

const invalid = (field: PartnerDetailsInvalid["field"]) => () =>
  Effect.fail(new PartnerDetailsInvalid({ field }));

export const PartnerAccountHandlers = HttpApiBuilder.group(
  Api,
  "partnerAccount",
  Effect.fn(function* partnerAccountHandlers(handlers) {
    const accounts = yield* PartnerAccounts;
    const keys = yield* PartnerKeys;
    const workspaces = yield* PartnerWorkspaces;
    const health = yield* PartnerHealth;

    return handlers.handleAll({
      close: () =>
        Effect.gen(function* close() {
          const actor = actorOf(yield* CurrentMember);

          yield* accounts.close(actor).pipe(
            Effect.catchTags({
              DatabaseError: Effect.die,
              MissingPermission: forbidden,
              PartnerNotFound: noPartner,
              PartnerOwnsWorkspaces: ({ owned }) =>
                Effect.fail(new PartnerOwnsWorkspaces({ owned })),
              PersonRequired: forbidden,
            })
          );
        }),
      createKey: ({ payload }) =>
        Effect.gen(function* createKey() {
          const actor = actorOf(yield* CurrentMember);

          const created = yield* keys
            .create(actor, {
              expiresInDays: Option.fromUndefinedOr(payload.expiresInDays),
              name: payload.name,
              permissions: payload.permissions,
              scopes: payload.scopes,
            })
            .pipe(
              Effect.catchTags({
                DatabaseError: Effect.die,
                MissingPermission: forbidden,
                PartnerNotFound: noPartner,
                PermissionNotGrantable: invalid("permissions"),
                PersonRequired: forbidden,
              })
            );

          return {
            key: Redacted.value(created.key),
            partnerKey: partnerKeyView(created.partnerKey),
          };
        }),
      get: () =>
        Effect.gen(function* get() {
          const actor = actorOf(yield* CurrentMember);

          const standing = yield* accounts.standing(actor).pipe(
            Effect.catchTags({
              DatabaseError: Effect.die,
              MissingPermission: forbidden,
            })
          );

          // Closed between the two reads: it then has no usage either.
          const usage = Option.isSome(standing.partner)
            ? yield* workspaces.usageFor(actor).pipe(
                Effect.map(Option.some),
                Effect.catchTags({
                  DatabaseError: Effect.die,
                  MissingPermission: forbidden,
                  PartnerNotFound: () => Effect.succeedNone,
                })
              )
            : Option.none();

          return {
            canOpen: standing.canOpen,
            partner: Option.getOrNull(
              standing.partner.pipe(Option.map(partnerView))
            ),
            usage: Option.getOrNull(usage.pipe(Option.map(partnerUsageView))),
          };
        }),
      listKeys: () =>
        Effect.gen(function* listKeys() {
          const actor = actorOf(yield* CurrentMember);

          const listed = yield* keys.list(actor).pipe(
            Effect.catchTags({
              DatabaseError: Effect.die,
              MissingPermission: forbidden,
              PartnerNotFound: noPartner,
            })
          );

          return listed.map(partnerKeyView);
        }),
      listWorkspaces: ({ query }) =>
        Effect.gen(function* listWorkspaces() {
          const actor = actorOf(yield* CurrentMember);

          const page = yield* workspaces
            .listFor(actor, listRequestOf(query))
            .pipe(
              Effect.catchTags({
                DatabaseError: Effect.die,
                InvalidWorkspaceCursor: () =>
                  Effect.fail(new HttpApiError.BadRequest()),
                MissingPermission: forbidden,
                PartnerNotFound: noPartner,
              })
            );

          return customerWorkspacePageView(page);
        }),
      open: ({ payload }) =>
        Effect.gen(function* open() {
          const actor = actorOf(yield* CurrentMember);

          const partner = yield* accounts.open(actor, payload.name).pipe(
            Effect.catchTags({
              DatabaseError: Effect.die,
              InvalidPartnerName: invalid("name"),
              MissingPermission: forbidden,
              PartnerAccountsClosed: () =>
                Effect.fail(new PartnerAccountsClosed()),
              PersonRequired: forbidden,
            })
          );

          return partnerView(partner);
        }),
      overview: ({ query }) =>
        Effect.gen(function* overview() {
          const actor = actorOf(yield* CurrentMember);

          const page = yield* health
            .forMember(actor, healthRequestOf(query))
            .pipe(
              Effect.catchTags({
                DatabaseError: Effect.die,
                InvalidWorkspaceCursor: () =>
                  Effect.fail(new HttpApiError.BadRequest()),
                MissingPermission: forbidden,
                PartnerNotFound: noPartner,
              })
            );

          return partnerHealthView(page);
        }),
      revokeKey: ({ params }) =>
        Effect.gen(function* revokeKey() {
          const actor = actorOf(yield* CurrentMember);

          yield* keys.revoke(actor, params.partnerKeyId).pipe(
            Effect.catchTags({
              DatabaseError: Effect.die,
              MissingPermission: forbidden,
              PartnerKeyNotFound: () => Effect.fail(new PartnerKeyNotFound()),
              PartnerNotFound: noPartner,
            })
          );
        }),
      update: ({ payload }) =>
        Effect.gen(function* update() {
          const actor = actorOf(yield* CurrentMember);

          const partner = yield* accounts.change(actor, payload).pipe(
            Effect.catchTags({
              DatabaseError: Effect.die,
              InvalidPartnerLogo: invalid("logoUrl"),
              InvalidPartnerName: invalid("name"),
              InvalidReturnOrigin: invalid("returnOrigins"),
              MissingPermission: forbidden,
              PartnerNotFound: noPartner,
              PersonRequired: forbidden,
              TooManyReturnOrigins: invalid("returnOrigins"),
            })
          );

          return partnerView(partner);
        }),
    });
  })
);
