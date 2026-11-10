import { Context } from "effect";

/**
 * The id of the request being answered, for what is written about it: the
 * error it is told, the activity it leaves. The server's answers
 * middleware provides it; a test that serves handlers alone has none.
 */
export class RequestId extends Context.Service<RequestId, string>()(
  "peal-server/shared/api/RequestId"
) {}
