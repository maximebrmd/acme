import { Schema } from "effect";

/**
 * What every error of the API carries beside its own fields, so a client
 * handles any of them the same way:
 *
 * - `code`: the error's stable name for programs, in snake case
 *   (`post_not_found`). It never changes once published; `_tag` names the
 *   same error for clients generated from this contract.
 * - `message`: one or two sentences in English for the person reading a log
 *   or a terminal. Its wording may change: never parse it.
 * - `requestId`: the id of the request, as its `X-Request-Id` header gives
 *   it, to quote when asking for help.
 *
 * The server fills all three on every error it answers; they are optional
 * here so that an answer from a server older than them still decodes.
 */
export const errorEnvelope = {
  code: Schema.optionalKey(Schema.String),
  message: Schema.optionalKey(Schema.String),
  requestId: Schema.optionalKey(Schema.String),
};
