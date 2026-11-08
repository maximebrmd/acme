import { Schema } from "effect";

// Every entity id Acme issues is a UUIDv7 in canonical lowercase form: unique
// without coordination, and ordered by creation time so primary keys stay
// index-friendly. Ids come from the `Ids` port, never from `crypto` directly.
export const Uuid7Schema = Schema.String.check(
  Schema.isUUID(7),
  Schema.isLowercased()
).pipe(Schema.brand("Uuid7"));

export type Uuid7 = typeof Uuid7Schema.Type;

// Users and workspaces are Better Auth's users and organizations, and their
// ids are the random UUIDs (v4) its tables generate. They stay random on
// purpose: Better Auth answers a sign-up for a known email with a made-up
// user whose id is a v4, so v7 ids for real users would tell which emails
// have an account.
const AuthUuidSchema = Schema.String.check(
  Schema.isUUID(),
  Schema.isLowercased()
);

// Ids that more than one context refers to live in the shared kernel, so a
// context can hold another's id without importing its domain. Each brand is
// distinct: a ChannelId is never accepted where a PostId is expected.
export const UserIdSchema = AuthUuidSchema.pipe(Schema.brand("UserId"));

export type UserId = typeof UserIdSchema.Type;

export const WorkspaceIdSchema = AuthUuidSchema.pipe(
  Schema.brand("WorkspaceId")
);

export type WorkspaceId = typeof WorkspaceIdSchema.Type;

export const ChannelIdSchema = Uuid7Schema.pipe(Schema.brand("ChannelId"));

export type ChannelId = typeof ChannelIdSchema.Type;

export const PostIdSchema = Uuid7Schema.pipe(Schema.brand("PostId"));

export type PostId = typeof PostIdSchema.Type;
