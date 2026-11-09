import { Schema } from "effect";

/**
 * What a legal request asks about: the closed accounts with an email
 * address, an account by its id (closed or not), or a workspace by its id.
 */
export const LegalSubjectSchema = Schema.Union([
  Schema.Struct({ email: Schema.String }),
  Schema.Struct({ userId: Schema.String }),
  Schema.Struct({ workspaceId: Schema.String }),
]);

export type LegalSubject = typeof LegalSubjectSchema.Type;
