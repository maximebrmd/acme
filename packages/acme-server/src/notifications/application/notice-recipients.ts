import { Context } from "effect";
import type { Effect } from "effect";

import type { WorkspaceId } from "#shared/domain/ids.ts";
import type { Locale } from "#shared/domain/locale.ts";

import type { RecipientsUnavailable } from "./recipients-unavailable.ts";

/** Someone a notice is for. */
export interface Recipient {
  readonly email: string;
  readonly locale: Locale;
  /** Stable per person, so each of their emails has its own key. */
  readonly id: string;
}

/** Who a workspace's notices about its channels go to. */
export class NoticeRecipients extends Context.Service<
  NoticeRecipients,
  {
    /**
     * The workspace's name, and its members who may connect channels, who
     * are the ones able to reconnect one.
     */
    readonly channelManagers: (workspaceId: WorkspaceId) => Effect.Effect<
      {
        readonly recipients: readonly Recipient[];
        readonly workspaceName: string;
      },
      RecipientsUnavailable
    >;
  }
>()("acme-server/notifications/application/NoticeRecipients") {}
