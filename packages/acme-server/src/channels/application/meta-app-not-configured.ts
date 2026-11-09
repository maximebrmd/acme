import { Schema } from "effect";

import { MetaAppKindSchema } from "#channels/domain/data-deletion.ts";

/** This server has no settings for the Meta app, so it signed no one in. */
export class MetaAppNotConfigured extends Schema.TaggedError<MetaAppNotConfigured>()(
  "MetaAppNotConfigured",
  { app: MetaAppKindSchema }
) {
  override get message(): string {
    return `This server has no ${this.app} app`;
  }
}
