import { Schema } from "effect";

const objectIdName = /^[A-Za-z]\w{0,63}$/u;

// Ids are UUIDs, platform names or the sign-in service's ids: letters,
// digits, dashes and underscores.
const objectIdValue = /^[\w-]{1,128}$/u;

/**
 * The ids a request's path named, by the name the route gives them
 * (`postId`, `channelId`): what a change was about, never what it said.
 */
export const ObjectIdsSchema = Schema.Record(
  Schema.String.check(Schema.isPattern(objectIdName)),
  Schema.String.check(Schema.isPattern(objectIdValue))
);

export type ObjectIds = typeof ObjectIdsSchema.Type;

/**
 * The ids among what a request named: entries whose name or value is not
 * shaped like an id are left out, as they could hold anything, and so is
 * the workspace's, which an event keeps apart.
 */
export const objectIdsOf = (
  named: Readonly<Record<string, string | undefined>>
): ObjectIds =>
  Object.fromEntries(
    Object.entries(named).flatMap(([name, value]) =>
      value !== undefined &&
      name !== "workspaceId" &&
      objectIdName.test(name) &&
      objectIdValue.test(value)
        ? [[name, value]]
        : []
    )
  );
