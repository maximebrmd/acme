import { Effect, Layer, Option } from "effect";
import { errorsByTag } from "peal-contract/errors";

import { ActivityLog } from "#activity/application/activity-log.ts";
import { ActivityJournal } from "#workspace/application/activity-journal.ts";
import type { ChangeOutcome } from "#workspace/application/activity-journal.ts";
import type { Principal } from "#workspace/domain/principal.ts";

// Who asked, as the log names them: the member staff act as is the actor,
// and the log says staff asked, never who.
const whoOf = (principal: Principal) =>
  principal._tag === "ApiKeyPrincipal"
    ? {
        actor: { _tag: "apiKey" as const, apiKeyId: principal.apiKeyId },
        clientId: Option.none<string>(),
        impersonated: false,
      }
    : {
        actor: {
          _tag: "user" as const,
          userId: Option.some(principal.userId),
        },
        clientId: principal.oauth.pipe(Option.map(({ clientId }) => clientId)),
        impersonated: Option.isSome(principal.impersonatedBy),
      };

interface Answer {
  readonly errorCode: Option.Option<string>;
  readonly status: Option.Option<number>;
}

// A failure the contract does not declare, or a bug: the caller is told
// 500, and no more.
const serverError: Answer = {
  errorCode: Option.none(),
  status: Option.some(500),
};

/**
 * The status and the code an outcome was answered with: a response's own
 * status, or those of the contract's error a handler failed with, as the
 * API's list of errors gives them.
 */
export const answerOf = (
  outcome: ChangeOutcome,
  catalogue: ReturnType<typeof errorsByTag>
): Answer => {
  if (outcome._tag === "answered") {
    return { errorCode: Option.none(), status: Option.some(outcome.status) };
  }

  if (outcome._tag === "toolCalled") {
    return { errorCode: outcome.errorCode, status: Option.none() };
  }

  if (outcome._tag === "unanswered") {
    return { errorCode: Option.none(), status: Option.none() };
  }

  return outcome.error.pipe(
    Option.flatMapNullishOr((tag) => catalogue.get(tag)),
    Option.match({
      onNone: () => serverError,
      onSome: ({ code, status }) => ({
        errorCode: Option.some(code),
        status: Option.some(status),
      }),
    })
  );
};

/** The ActivityJournal in the activity context's logs. */
export const LoggedActivityJournal = Layer.effect(
  ActivityJournal,
  Effect.gen(function* LoggedActivityJournal() {
    const log = yield* ActivityLog;
    const catalogue = errorsByTag();

    return ActivityJournal.of({
      record: (change) =>
        log
          .record({
            ...whoOf(change.principal),
            ...answerOf(change.outcome, catalogue),
            named: change.named,
            operation: change.operation,
            requestId: change.requestId,
            via: change.via,
            workspaceId: change.workspaceId,
          })
          .pipe(Effect.asVoid),
    });
  })
);
