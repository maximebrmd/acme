import { Schema } from "effect";

/**
 * Who may make an account on this server: anyone (`open`), or only an
 * address a workspace invited, and the first account (`invitation`).
 */
export const SignUpModeSchema = Schema.Literals(["open", "invitation"]);

export type SignUpMode = typeof SignUpModeSchema.Type;
