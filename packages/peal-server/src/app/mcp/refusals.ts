import { Effect } from "effect";

import { ToolRefused } from "#app/mcp/tool-refused.ts";

/** Fails the tool with a message the user can act on. */
export const refuse = (message: string) =>
  Effect.fail(new ToolRefused({ message }));

/**
 * The connection may not do this: the user's role does not allow it, or
 * the user let the client read only.
 */
export const notAllowed = (doing: string) => () =>
  refuse(
    `This connection may not ${doing} in this workspace: the user's role does not allow it, or they let this client read only. To change things, the user connects the client again and allows it to do what their role allows.`
  );
