import { Schema } from "effect";

/**
 * What staff asked for while acting as someone: an API endpoint, as
 * `group.endpoint` (`posts.update`), or a route of the sign-in service, as
 * `auth:/path` (`auth:/organization/set-active`). A name, never a value
 * anyone wrote.
 */
export const AuditOperationSchema = Schema.String.check(
  Schema.isPattern(/^[\w.:/-]{1,200}$/u)
).pipe(Schema.brand("AuditOperation"));

export type AuditOperation = typeof AuditOperationSchema.Type;

const objectIdName = /^[A-Za-z]\w{0,63}$/u;

// Ids are UUIDs, platform names or the sign-in service's ids: letters,
// digits, dashes and underscores.
const objectIdValue = /^[\w-]{1,128}$/u;

/**
 * The ids a change named, by the name the route gives them (`postId`,
 * `channelId`): what it was about, never what it said.
 */
export const ObjectIdsSchema = Schema.Record(
  Schema.String.check(Schema.isPattern(objectIdName)),
  Schema.String.check(Schema.isPattern(objectIdValue))
);

export type ObjectIds = typeof ObjectIdsSchema.Type;

/**
 * The ids among what a request named: entries whose name or value is not
 * shaped like an id are left out, as they could hold anything.
 */
export const objectIdsOf = (
  named: Readonly<Record<string, string | undefined>>
): ObjectIds =>
  Object.fromEntries(
    Object.entries(named).flatMap(([name, value]) =>
      value !== undefined &&
      objectIdName.test(name) &&
      objectIdValue.test(value)
        ? [[name, value]]
        : []
    )
  );
