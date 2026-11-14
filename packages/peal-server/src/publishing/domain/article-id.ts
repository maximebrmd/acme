import { Schema } from "effect";

import { Uuid7Schema } from "#shared/domain/ids.ts";

/** An article of a workspace, to publish on one of its websites. */
export const ArticleIdSchema = Uuid7Schema.pipe(Schema.brand("ArticleId"));

export type ArticleId = typeof ArticleIdSchema.Type;
