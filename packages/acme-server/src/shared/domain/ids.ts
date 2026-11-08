import { Schema } from "effect";

// Every entity id is a UUIDv7 in canonical lowercase form: unique without
// coordination, and ordered by creation time so primary keys stay
// index-friendly. Ids come from the `Ids` port, never from `crypto` directly.
export const Uuid7Schema = Schema.String.check(
  Schema.isUUID(7),
  Schema.isLowercased()
).pipe(Schema.brand("Uuid7"));

export type Uuid7 = typeof Uuid7Schema.Type;

// Ids that more than one context refers to live in the shared kernel, so a
// context can hold another's id without importing its domain. Each brand is
// distinct: a ChannelId is never accepted where a PostId is expected.
export const WorkspaceIdSchema = Uuid7Schema.pipe(Schema.brand("WorkspaceId"));

export type WorkspaceId = typeof WorkspaceIdSchema.Type;

export const ChannelIdSchema = Uuid7Schema.pipe(Schema.brand("ChannelId"));

export type ChannelId = typeof ChannelIdSchema.Type;

export const PostIdSchema = Uuid7Schema.pipe(Schema.brand("PostId"));

export type PostId = typeof PostIdSchema.Type;
