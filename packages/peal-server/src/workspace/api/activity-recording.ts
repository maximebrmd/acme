import { Cause, Effect, Exit, Option, Schema } from "effect";
import type { HttpServerResponse } from "effect/http";
import { HttpApiError } from "effect/http-api";
import type { Member } from "peal-contract";

import { RequestId } from "#shared/api/request-id.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import type {
  ActivityJournal,
  AnsweredChange,
  ChangeOutcome,
} from "#workspace/application/activity-journal.ts";
import type { Principal } from "#workspace/domain/principal.ts";

import { principalOf } from "./principal.ts";

const decodeTagged = Schema.decodeUnknownOption(
  Schema.Struct({ _tag: Schema.String })
);

/**
 * How a handler's exit is answered: with its response, or, for a failure,
 * with the contract's error it failed with. A failure the contract does
 * not declare and a defect name no error (a 500); a request interrupted
 * before its answer was not answered.
 */
export const outcomeOf = <E>(
  exit: Exit.Exit<HttpServerResponse.HttpServerResponse, E>
): ChangeOutcome => {
  if (Exit.isSuccess(exit)) {
    return { _tag: "answered", status: exit.value.status };
  }

  if (Cause.hasInterruptsOnly(exit.cause)) {
    return { _tag: "unanswered" };
  }

  // The contract's error the handler failed with, by its tag.
  const error = Cause.findErrorOption(exit.cause).pipe(
    Option.flatMap((failure) => {
      // A request that could not be read is the caller's; an answer that
      // could not be written, the server's.
      if (HttpApiError.HttpApiSchemaError.is(failure)) {
        return failure.kind === "Body" || failure.kind === "ResponseHeaders"
          ? Option.none()
          : Option.some("InvalidRequest");
      }

      return decodeTagged(failure).pipe(Option.map(({ _tag }) => _tag));
    })
  );

  return { _tag: "failed", error };
};

/** How a principal authenticated to the API. */
export const viaOf = (principal: Principal): "apiKey" | "oauth" | "session" => {
  if (principal._tag === "ApiKeyPrincipal") {
    return "apiKey";
  }

  // A partner key is a key too.
  if (principal._tag === "PartnerKeyPrincipal") {
    return "apiKey";
  }

  return Option.isSome(principal.oauth) ? "oauth" : "session";
};

// The operations that, once done, leave no workspace to keep a log for:
// its log went with it.
const erasing: ReadonlySet<string> = new Set(["workspaces.delete"]);

const erased = (operation: string, outcome: ChangeOutcome) =>
  erasing.has(operation) && outcome._tag === "answered" && outcome.status < 400;

// Keeping the log never changes an answer: a failure to keep it is logged.
const kept = (journal: ActivityJournal["Service"], change: AnsweredChange) =>
  journal
    .record(change)
    .pipe(
      Effect.catchCause((cause) =>
        Effect.logError(
          "Keeping a request in the workspace's activity log failed",
          cause
        )
      )
    );

/** A request to the API that asks to change something in a workspace. */
export interface RequestedChange {
  /** What the request's path named, by name. */
  readonly named: Readonly<Record<string, string | undefined>>;
  /** `group.endpoint`, from the contract. */
  readonly operation: string;
  readonly principal: Principal;
  readonly workspaceId: WorkspaceId;
}

/**
 * Keeps a request that asks for a change in its workspace's activity log
 * once its handler answered, whatever the answer: done, refused or failed.
 * The answer is the handler's, unchanged, whether or not the log took it.
 */
export const recorded =
  (journal: ActivityJournal["Service"], change: RequestedChange) =>
  <E, R>(
    handled: Effect.Effect<HttpServerResponse.HttpServerResponse, E, R>
  ): Effect.Effect<HttpServerResponse.HttpServerResponse, E, R> =>
    Effect.serviceOption(RequestId).pipe(
      Effect.flatMap((requestId) =>
        handled.pipe(
          Effect.onExit((exit) => {
            const outcome = outcomeOf(exit);

            return erased(change.operation, outcome)
              ? Effect.void
              : kept(journal, {
                  ...change,
                  outcome,
                  requestId,
                  via: viaOf(change.principal),
                });
          })
        )
      )
    );

/** A tool of the MCP endpoint a member's client called. */
export interface ToolCall {
  /**
   * The code of the refusal the tool answered with, when it refused: left
   * out when it did what was asked.
   */
  readonly errorCode?: string | undefined;
  /** The member the client acts for, as the MCP endpoint authenticated them. */
  readonly member: Member;
  /** The tool's name (`create_draft`). */
  readonly tool: string;
}

/**
 * Keeps a call to a tool that changes something in its workspace's
 * activity log, as `mcp.<tool>`, without a status: tools answer in
 * JSON-RPC. Never fails: a failure to keep it is logged.
 */
export const recordToolCall = (
  journal: ActivityJournal["Service"],
  call: ToolCall
): Effect.Effect<void> =>
  Effect.serviceOption(RequestId).pipe(
    Effect.flatMap((requestId) =>
      kept(journal, {
        named: {},
        operation: `mcp.${call.tool}`,
        outcome: {
          _tag: "toolCalled",
          errorCode: Option.fromUndefinedOr(call.errorCode),
        },
        principal: principalOf(call.member.principal),
        requestId,
        via: "mcp",
        workspaceId: WorkspaceIdSchema.make(call.member.workspaceId),
      })
    )
  );
