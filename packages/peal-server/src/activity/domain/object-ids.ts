import { Option, Schema } from "effect";

import { PlatformSchema } from "#shared/domain/platform.ts";

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

const uuid = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/u;

const isPlatform = Schema.is(PlatformSchema);

// An id as Peal issues them, in the lower case it stores them in, or a
// platform's name: nothing else a path can hold is an id.
const idOf = (value: string): Option.Option<string> => {
  const lowered = value.toLowerCase();

  if (uuid.test(lowered)) {
    return Option.some(lowered);
  }

  return isPlatform(value) ? Option.some(value) : Option.none();
};

/**
 * The ids among what a request named: a UUID, kept in lower case as Peal
 * stores ids, so one written otherwise in a path is still found when its
 * account is forgotten, or a platform's name. Anything else is left out,
 * as a path holds whatever its sender typed before the handler reads it,
 * and so is the workspace's id, which an event keeps apart.
 */
export const objectIdsOf = (
  named: Readonly<Record<string, string | undefined>>
): ObjectIds =>
  Object.fromEntries(
    Object.entries(named).flatMap(([name, value]) =>
      value !== undefined && name !== "workspaceId" && objectIdName.test(name)
        ? Option.match(idOf(value), {
            onNone: () => [],
            onSome: (id) => [[name, id]],
          })
        : []
    )
  );
