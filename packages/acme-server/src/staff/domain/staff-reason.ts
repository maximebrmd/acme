import { Schema } from "effect";

/** The longest reason staff may give. */
export const maxReasonLength = 500;

/**
 * Why staff act, in their words, kept in the audit log: some text, without
 * the spaces around it.
 */
export const StaffReasonSchema = Schema.Trimmed.check(
  Schema.isNonEmpty(),
  Schema.isMaxLength(maxReasonLength)
).pipe(Schema.brand("StaffReason"));

export type StaffReason = typeof StaffReasonSchema.Type;
