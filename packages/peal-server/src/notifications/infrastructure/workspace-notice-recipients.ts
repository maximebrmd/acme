import { Effect, Layer } from "effect";

import { NoticeRecipients } from "#notifications/application/notice-recipients.ts";
import { RecipientsUnavailable } from "#notifications/application/recipients-unavailable.ts";
import { WorkspaceContacts } from "#workspace/application/workspace-contacts.ts";

/**
 * Recipients from the workspace context: the members whose roles allow what
 * a notice asks of them, leaving out banned users.
 */
export const WorkspaceNoticeRecipients = Layer.effect(
  NoticeRecipients,
  Effect.gen(function* WorkspaceNoticeRecipients() {
    const contacts = yield* WorkspaceContacts;

    return NoticeRecipients.of({
      withPermission: (workspaceId, permission) =>
        contacts.withPermission(workspaceId, permission).pipe(
          Effect.map(({ contacts: people, workspaceName }) => ({
            recipients: people.map(({ email, locale, userId }) => ({
              email,
              locale,
              userId,
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
