import { Effect, Option, Schema } from "effect";
import { HttpApiBuilder } from "effect/http-api";
import {
  Api,
  CurrentMember,
  TagNameTaken,
  TagNotFound,
  TooManyTags,
} from "peal-contract";

import { PostTags } from "#publishing/application/post-tags.ts";
import { TagIdSchema } from "#publishing/domain/tag-id.ts";
import { actorOf } from "#shared/api/actor.ts";
import { forbidden } from "#shared/api/forbidden.ts";

import { tagView } from "./tag-view.ts";

const decodeTagId = Schema.decodeUnknownOption(TagIdSchema);

const notFound = () => Effect.fail(new TagNotFound());

const nameTaken = () => Effect.fail(new TagNameTaken());

/** The tag a path names, or TagNotFound: a malformed id names none. */
export const tagIdFrom = (raw: string) =>
  Option.match(decodeTagId(raw), {
    onNone: notFound,
    onSome: Effect.succeed,
  });

// A failure of the server's own (the database, a bug) is a defect: 500.
export const TagsHandlers = HttpApiBuilder.group(
  Api,
  "tags",
  Effect.fn(function* tagsHandlers(handlers) {
    const tags = yield* PostTags;

    return handlers.handleAll({
      create: ({ payload }) =>
        Effect.gen(function* create() {
          const actor = actorOf(yield* CurrentMember);

          return yield* tags.create(actor, payload).pipe(
            Effect.map(tagView),
            Effect.catchTags({
              DatabaseError: Effect.die,
              MissingPermission: forbidden,
              TagNameTaken: nameTaken,
              TooManyTags: ({ allowed }) =>
                Effect.fail(new TooManyTags({ allowed })),
            })
          );
        }),
      delete: ({ params }) =>
        Effect.gen(function* remove() {
          const actor = actorOf(yield* CurrentMember);
          const tagId = yield* tagIdFrom(params.tagId);

          yield* tags.remove(actor, tagId).pipe(
            Effect.catchTags({
              DatabaseError: Effect.die,
              MissingPermission: forbidden,
              TagNotFound: notFound,
            })
          );
        }),
      list: () =>
        Effect.gen(function* list() {
          const actor = actorOf(yield* CurrentMember);

          return yield* tags.list(actor).pipe(
            Effect.map((all) => all.map(tagView)),
            Effect.catchTags({
              DatabaseError: Effect.die,
              MissingPermission: forbidden,
            })
          );
        }),
      update: ({ params, payload }) =>
        Effect.gen(function* update() {
          const actor = actorOf(yield* CurrentMember);
          const tagId = yield* tagIdFrom(params.tagId);

          return yield* tags.update(actor, tagId, payload).pipe(
            Effect.map(tagView),
            Effect.catchTags({
              DatabaseError: Effect.die,
              MissingPermission: forbidden,
              TagNameTaken: nameTaken,
              TagNotFound: notFound,
            })
          );
        }),
    });
  })
);
