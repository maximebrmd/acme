import { Context } from "effect";
import type { Effect } from "effect";

import type { LegalRemainsRecord } from "#shared/application/personal-data.ts";
import type { Locale } from "#shared/domain/locale.ts";

/**
 * What changed in an account's two-step verification: turned on or off by
 * its person, new recovery codes made, one used to sign in, or reset by
 * staff.
 */
export type TwoStepChange =
  | "recoveryCodesRenewed"
  | "recoveryCodeUsed"
  | "resetByStaff"
  | "turnedOff"
  | "turnedOn";

/** Where a copy of the account's data was downloaded. */
export type ExportChannel = "commandLine" | "web";

/** Emails about the account itself. They never fail the request. */
export class AccountMail extends Context.Service<
  AccountMail,
  {
    /**
     * Confirms, to the address it had, that the account is deleted, with
     * the subscriptions of the workspaces it deleted that were cancelled,
     * and what the law has the server keep of it, if anything.
     */
    readonly deleted: (to: {
      readonly email: string;
      readonly legalHold: LegalRemainsRecord | null;
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
     * Tells the account's address what changed in its two-step
     * verification, so a change someone else made is noticed: with how
     * many recovery codes are left once one was used.
     */
    readonly twoStepChanged: (to: {
      readonly email: string;
      readonly kind: TwoStepChange;
      readonly locale: Locale;
      readonly recoveryCodesLeft: number | null;
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
