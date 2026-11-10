import { Schema } from "effect";

import { Uuid7Schema } from "#shared/domain/ids.ts";

/** A thread's id: the comments under one published post on one channel. */
export const ThreadIdSchema = Uuid7Schema.pipe(Schema.brand("ThreadId"));

export type ThreadId = typeof ThreadIdSchema.Type;
