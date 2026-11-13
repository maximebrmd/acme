import { Effect, Option, Schema } from "effect";
import { HttpApiBuilder, HttpApiError } from "effect/http-api";
import {
  AccountsNotMerged,
  Api,
  BillingAccountNotFound,
  CurrentStaff,
} from "peal-contract";
import type { StaffBillingAccount } from "peal-contract";

import type { DeskAccount } from "#billing/application/billing-account-desk.ts";
import { BillingAccountDesk } from "#billing/application/billing-account-desk.ts";
import { BillingAccountIdSchema } from "#billing/domain/billing-account.ts";
import type { BillingAccountId } from "#billing/domain/billing-account.ts";
import { UserIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import { PlatformSchema } from "#shared/domain/platform.ts";

// A cursor is a position, written so that staff keep it as it is.
const CursorSchema = Schema.StringFromBase64Url.pipe(
  Schema.decodeTo(
    Schema.fromJsonString(
      Schema.Struct({ accountId: Schema.String, platform: PlatformSchema })
    )
  )
);

const decodeCursor = Schema.decodeUnknownEffect(CursorSchema);

const encodeCursor = Schema.encodeEffect(CursorSchema);

const decodeAccountId = Schema.decodeUnknownOption(BillingAccountIdSchema);

const decodeWorkspaceId = Schema.decodeUnknownOption(WorkspaceIdSchema);

const defaultPage = 50;

const notFound = () => Effect.fail(new BillingAccountNotFound());

// The account asked for: by its id first, else by a workspace it holds.
const namedAccount = (
  accountId: Option.Option<BillingAccountId>,
  workspaceId: Option.Option<WorkspaceId>
):
  | { readonly accountId: BillingAccountId }
  | { readonly workspaceId: WorkspaceId }
  | undefined => {
  if (Option.isSome(accountId)) {
    return { accountId: accountId.value };
  }

  if (Option.isSome(workspaceId)) {
    return { workspaceId: workspaceId.value };
  }

  return undefined;
};

const deskView = ({
  account,
  merged,
  subscribed,
  workspaceIds,
}: DeskAccount): StaffBillingAccount => ({
  mergedWorkspaceIds: merged,
  billingWorkspaceId: account.holder,
  freeTier: account.freeTier,
  id: account.id,
  partnerId: Option.getOrNull(account.partnerId),
  payerUserId: Option.getOrNull(account.payer),
  standalone: account.standalone,
  subscribed,
  workspaceIds,
});

/**
 * The billing accounts desk, behind StaffAccess: platform accounts under
 * several free accounts, an account by id or workspace, merging, and
 * requiring a payment method.
 */
export const BillingAccountsDeskHandlers = HttpApiBuilder.group(
  Api,
  "billingAccountsDesk",
  Effect.fn(function* billingAccountsDeskHandlers(handlers) {
    const desk = yield* BillingAccountDesk;

    return handlers
      .handle("sharedChannels", ({ query }) =>
        Effect.gen(function* sharedChannels() {
          const after = yield* Option.match(
            Option.fromUndefinedOr(query.after),
            {
              onNone: () => Effect.succeedNone,
              onSome: (cursor) =>
                decodeCursor(cursor).pipe(
                  Effect.mapError(() => new HttpApiError.BadRequest()),
                  Effect.asSome
                ),
            }
          );

          const page = yield* desk
            .sharedChannels(after, query.limit ?? defaultPage)
            .pipe(Effect.catchTag("DatabaseError", Effect.die));

          return {
            items: page.items.map(({ accountId, accounts, platform }) => ({
              accounts,
              platform,
              platformAccountId: accountId,
            })),
            next: yield* Option.match(page.next, {
              onNone: () => Effect.succeed(null),
              onSome: (position) => encodeCursor(position).pipe(Effect.orDie),
            }),
          };
        })
      )
      .handle("account", ({ query }) =>
        Effect.gen(function* account() {
          const accountId = Option.fromUndefinedOr(query.accountId).pipe(
            Option.flatMap(decodeAccountId)
          );

          const workspaceId = Option.fromUndefinedOr(query.workspaceId).pipe(
            Option.flatMap(decodeWorkspaceId)
          );

          const named = namedAccount(accountId, workspaceId);

          if (named === undefined) {
            return yield* notFound();
          }

          return deskView(
            yield* desk.account(named).pipe(
              Effect.catchTags({
                BillingAccountNotFound: notFound,
                DatabaseError: Effect.die,
              })
            )
          );
        })
      )
      .handle("merge", ({ payload }) =>
        Effect.gen(function* merge() {
          const staff = yield* CurrentStaff;

          const named = Option.all({
            from: decodeAccountId(payload.fromAccountId),
            into: decodeAccountId(payload.intoAccountId),
          });

          if (Option.isNone(named)) {
            return yield* notFound();
          }

          return deskView(
            yield* desk
              .merge({
                ...named.value,
                reason: payload.reason,
                staffId: UserIdSchema.make(staff.userId),
              })
              .pipe(
                Effect.catchTags({
                  AccountsNotMerged: ({ reason }) =>
                    Effect.fail(new AccountsNotMerged({ reason })),
                  BillingAccountNotFound: notFound,
                  DatabaseError: Effect.die,
                })
              )
          );
        })
      )
      .handle("detach", ({ payload }) =>
        Effect.gen(function* detach() {
          const staff = yield* CurrentStaff;
          const workspaceId = decodeWorkspaceId(payload.workspaceId);

          if (Option.isNone(workspaceId)) {
            return yield* notFound();
          }

          return deskView(
            yield* desk
              .detach({
                reason: payload.reason,
                staffId: UserIdSchema.make(staff.userId),
                workspaceId: workspaceId.value,
              })
              .pipe(
                Effect.catchTags({
                  AccountsNotMerged: ({ reason }) =>
                    Effect.fail(new AccountsNotMerged({ reason })),
                  BillingAccountNotFound: notFound,
                  DatabaseError: Effect.die,
                })
              )
          );
        })
      )
      .handle("requirePaymentMethod", ({ payload }) =>
        Effect.gen(function* requirePaymentMethod() {
          const staff = yield* CurrentStaff;
          const accountId = decodeAccountId(payload.accountId);

          if (Option.isNone(accountId)) {
            return yield* notFound();
          }

          return deskView(
            yield* desk
              .requirePaymentMethod({
                accountId: accountId.value,
                reason: payload.reason,
                required: payload.required,
                staffId: UserIdSchema.make(staff.userId),
              })
              .pipe(
                Effect.catchTags({
                  BillingAccountNotFound: notFound,
                  DatabaseError: Effect.die,
                })
              )
          );
        })
      );
  })
);
