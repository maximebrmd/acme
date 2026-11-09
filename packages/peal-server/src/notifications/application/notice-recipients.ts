import { Context } from "effect";
import type { Effect } from "effect";

import type { Permission } from "#shared/domain/access.ts";
import type { UserId, WorkspaceId } from "#shared/domain/ids.ts";
import type { Locale } from "#shared/domain/locale.ts";

import type { RecipientsUnavailable } from "./recipients-unavailable.ts";

/** Someone a notice is for, with where and how to write to them. */
export interface Recipient {
  readonly email: string;
  readonly locale: Locale;
  readonly userId: UserId;
}

/** Who a workspace's notices go to. */
export class NoticeRecipients extends Context.Service<
  NoticeRecipients,
  {
    /**
     * The workspace's name, and its members whose roles allow `permission`:
     * those able to act on what a notice tells. A workspace that no longer
     * exists has nobody.
     */
    readonly withPermission: (
      workspaceId: WorkspaceId,
      permission: Permission
    ) => Effect.Effect<
      {
        readonly recipients: readonly Recipient[];
        readonly workspaceName: string;
      },
      RecipientsUnavailable
    >;
  }
>()("peal-server/notifications/application/NoticeRecipients") {}
