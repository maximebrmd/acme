import { Schema } from "effect";

/**
 * What a partner key may do with the workspaces its partner owns: list and
 * read them, create and change them, and delete them with everything they
 * hold. The server's list (src/workspace/domain/partner-key.ts) is the
 * source; a test keeps the two equal.
 */
export const PartnerScopeSchema = Schema.Literals([
  "workspaces:read",
  "workspaces:write",
  "workspaces:delete",
]).annotate({
  description: "What a partner key may do with its partner's workspaces.",
  identifier: "PartnerScope",
});

export type PartnerScope = typeof PartnerScopeSchema.Type;
