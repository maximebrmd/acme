import { Context } from "effect";
import { Tool } from "effect/ai";

/**
 * A tool that only reads, within Acme: MCP clients may call it without
 * asking, and as often as they like.
 */
export const reading = Context.make(Tool.Readonly, true).pipe(
  Context.add(Tool.Destructive, false),
  Context.add(Tool.Idempotent, true),
  Context.add(Tool.OpenWorld, false)
);

/**
 * A tool that changes something, as the MCP annotations tell clients:
 * `destructive` when it removes or overwrites what was there rather than
 * only adding, `idempotent` when calling it again with the same arguments
 * changes nothing more, `openWorld` when its effect reaches outside Acme (a
 * post on a platform, an email).
 */
export const changing = (effects: {
  readonly destructive: boolean;
  readonly idempotent: boolean;
  readonly openWorld: boolean;
}) =>
  Context.make(Tool.Readonly, false).pipe(
    Context.add(Tool.Destructive, effects.destructive),
    Context.add(Tool.Idempotent, effects.idempotent),
    Context.add(Tool.OpenWorld, effects.openWorld)
  );
