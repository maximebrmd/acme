import { Schema } from "effect";

import { Uuid7Schema } from "#shared/domain/ids.ts";

/** A notice's id: a UUIDv7, so newer notices sort after older ones. */
export const NoticeIdSchema = Uuid7Schema.pipe(Schema.brand("NoticeId"));

export type NoticeId = typeof NoticeIdSchema.Type;
