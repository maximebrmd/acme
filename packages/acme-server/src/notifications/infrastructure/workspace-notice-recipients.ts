import { Effect, Layer } from "effect";

import { NoticeRecipients } from "#notifications/application/notice-recipients.ts";
import { RecipientsUnavailable } from "#notifications/application/recipients-unavailable.ts";
import { WorkspaceContacts } from "#workspace/application/workspace-contacts.ts";

/**
 * Recipients from the workspace context: the members who may connect
 * channels, since they are the ones who can reconnect one.
 */
export const WorkspaceNoticeRecipients = Layer.effect(
  NoticeRecipients,
  Effect.gen(function* WorkspaceNoticeRecipients() {
    const contacts = yield* WorkspaceContacts;

    return NoticeRecipients.of({
      channelManagers: (workspaceId) =>
        contacts.withPermission(workspaceId, "channel:connect").pipe(
          Effect.map(({ contacts: people, workspaceName }) => ({
            recipients: people.map(({ email, locale, userId }) => ({
              email,
              id: userId,
              locale,
            })),
            workspaceName,
          })),
          Effect.mapError(
            (failure) => new RecipientsUnavailable({ cause: failure })
          )
        ),
    });
  })
);
