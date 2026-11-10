import { Context, Effect, Layer } from "effect";
import type { Option } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import type { Principal } from "#workspace/domain/principal.ts";

/**
 * How a request was answered: with a response (`answered`), with a failure
 * of its handler (`failed`: the tag of the contract's error, whose status
 * and code the journal knows, or none for a failure the contract does not
 * declare, a 500), not at all, the caller having gone (`unanswered`), or,
 * for a tool of the MCP endpoint, which answers in JSON-RPC, with what the
 * tool said (`toolCalled`: the code of its refusal, if it refused).
 */
export type ChangeOutcome =
  | { readonly _tag: "answered"; readonly status: number }
  | { readonly _tag: "failed"; readonly error: Option.Option<string> }
  | { readonly _tag: "toolCalled"; readonly errorCode: Option.Option<string> }
  | { readonly _tag: "unanswered" };

/** A request that asked to change something in a workspace, once answered. */
export interface AnsweredChange {
  /**
   * What the request's path named, by name (`postId`): never what it
   * carried.
   */
  readonly named: Readonly<Record<string, string | undefined>>;
  /** `group.endpoint` from the contract, or `mcp.<tool>`. */
  readonly operation: string;
  readonly outcome: ChangeOutcome;
  /** Who asked: the member, staff acting as them included, or the key. */
  readonly principal: Principal;
  readonly requestId: Option.Option<string>;
  /**
   * How it authenticated: `session` (the web app), `apiKey`, `oauth` (the
   * command line or another client of the API), or `mcp`.
   */
  readonly via: "apiKey" | "mcp" | "oauth" | "session";
  readonly workspaceId: WorkspaceId;
}

/**
 * The workspaces' activity logs, which the activity context keeps: every
 * request that asks to change something in a workspace is recorded once it
 * is answered, refused or not, for the workspace's owners to read.
 */
export class ActivityJournal extends Context.Service<
  ActivityJournal,
  {
    readonly record: (
      change: AnsweredChange
    ) => Effect.Effect<void, DatabaseError>;
  }
>()("peal-server/workspace/application/ActivityJournal") {
  /** Keeps nothing: for tests of what the log is not about. */
  static readonly none = Layer.succeed(
    ActivityJournal,
    ActivityJournal.of({ record: () => Effect.void })
  );
}
