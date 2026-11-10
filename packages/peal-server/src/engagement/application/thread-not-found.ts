import { Schema } from "effect";

import { ThreadIdSchema } from "#engagement/domain/thread-id.ts";

/** The workspace has no such thread. */
export class ThreadNotFound extends Schema.TaggedError<ThreadNotFound>()(
  "ThreadNotFound",
  {
    threadId: ThreadIdSchema,
  }
) {}
