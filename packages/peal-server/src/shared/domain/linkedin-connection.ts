import { Schema } from "effect";

/**
 * What a LinkedIn channel posts as, each through an app of its own, as
 * LinkedIn grants the two to separate apps:
 *
 * - `linkedinProfile`: a member's own profile, with the self-serve "Share on
 *   LinkedIn" product (`w_member_social`). Its account is the member.
 * - `linkedinPage`: a company page the member administers, with the
 *   Community Management API (`w_organization_social`,
 *   `r_organization_social`, `rw_organization_admin`), which LinkedIn
 *   reviews and grants to an app that has no other product. Its account is
 *   the organization, and its token the member's.
 */
export const LinkedInConnectionSchema = Schema.Literals([
  "linkedinProfile",
  "linkedinPage",
]);

export type LinkedInConnection = typeof LinkedInConnectionSchema.Type;
