import { Effect, Exit, Option, Schema } from "effect";
import { McpServer } from "effect/ai";
import { CurrentMember } from "peal-contract";

import { recordToolCall } from "#workspace/api/activity-recording.ts";
import { ActivityJournal } from "#workspace/application/activity-journal.ts";

// What a tool answered, as the MCP server hands it on: an error or not.
const decodeAnswer = Schema.decodeUnknownOption(
  Schema.Struct({ isError: Schema.Boolean })
);

/** The code the log keeps for a tool that answered an error. */
export const toolRefusedCode = "tool_refused";

/** The code the log keeps for a call the MCP server itself failed. */
export const toolFailedCode = "tool_failed";

// How a call that ran ended: nothing when the tool did what was asked.
const errorCodeOf = (
  exit: Exit.Exit<unknown, unknown>
): Option.Option<string> =>
  Exit.match(exit, {
    onFailure: () => Option.some(toolFailedCode),
    onSuccess: (answer) =>
      decodeAnswer(answer).pipe(
        Option.filter(({ isError }) => isError),
        Option.as(toolRefusedCode)
      ),
  });

/**
 * Keeps each call of a tool that changes something in the workspace's
 * activity log (ActivityJournal), by the tool's name, once the tool has
 * run, with how it ended: nothing when it did what was asked,
 * `tool_refused` when it answered an error (a permission the connection
 * lacks, a plan's limit, something not found), `tool_failed` when the
 * call ended without an answer. It runs around the tool itself, so a
 * request the endpoint refused before any tool ran (a batch, a session it
 * does not know, a method it does not serve) keeps nothing, however many
 * calls its body names.
 */
export const recordedCalls = (changingTools: ReadonlySet<string>) =>
  McpServer.middleware()(
    Effect.gen(function* recording() {
      const activity = yield* ActivityJournal;

      return (effect, { method, target }) =>
        method === "tools/call" && changingTools.has(target)
          ? effect.pipe(
              Effect.onExit((exit) =>
                CurrentMember.pipe(
                  Effect.flatMap((member) =>
                    recordToolCall(activity, {
                      errorCode: Option.getOrUndefined(errorCodeOf(exit)),
                      member,
                      tool: target,
                    })
                  )
                )
              )
            )
          : effect;
    })
  ).layer;
