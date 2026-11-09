import { Context } from "effect";
import type { Effect } from "effect";

import type { Locale } from "#shared/domain/locale.ts";

/** Where a copy of the account's data was downloaded. */
export type ExportChannel = "commandLine" | "web";

/** Emails about the account itself. They never fail the request. */
export class AccountMail extends Context.Service<
  AccountMail,
  {
    /**
     * Confirms, to the address it had, that the account is deleted, with
     * the subscriptions of the workspaces it deleted that were cancelled.
     */
    readonly deleted: (to: {
      readonly email: string;
      readonly locale: Locale;
      readonly subscriptionsCancelled: number;
    }) => Effect.Effect<void>;
    /**
     * Tells the account's address that a copy of its data was downloaded,
     * so a copy someone else took is noticed.
     */
    readonly exported: (to: {
      readonly email: string;
      readonly locale: Locale;
      readonly via: ExportChannel;
    }) => Effect.Effect<void>;
    /**
     * Confirms, to the owner who deleted it, that a workspace is deleted,
     * and whether its subscription was cancelled with it.
     */
    readonly workspaceDeleted: (to: {
      readonly email: string;
      readonly locale: Locale;
      readonly subscriptionsCancelled: number;
      readonly workspaceName: string;
    }) => Effect.Effect<void>;
  }
>()("peal-server/workspace/application/AccountMail") {}
