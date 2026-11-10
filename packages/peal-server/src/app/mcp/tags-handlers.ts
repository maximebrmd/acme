import { Effect } from "effect";
import { CurrentMember, maxTagsPerWorkspace } from "peal-contract";

import { notAllowed, refuse, unknownTags } from "#app/mcp/refusals.ts";
import { TagTools } from "#app/mcp/tags-tools.ts";
import { postIdFrom, tagIdsFrom } from "#publishing/api/post-input.ts";
import { postView } from "#publishing/api/post-view.ts";
import { tagView } from "#publishing/api/tag-view.ts";
import { tagIdFrom } from "#publishing/api/tags.ts";
import { PostTags } from "#publishing/application/post-tags.ts";
import { actorOf } from "#shared/api/actor.ts";

// What the use case's refusals tell the user, through their MCP client.

const noTag = () =>
  refuse("The workspace has no tag with this id: list_tags answers its tags.");

const noPost = () => refuse("The workspace has no post with this id.");

const nameTaken = () =>
  refuse(
    "The workspace already has a tag of this name, whatever its case: nothing was changed. list_tags answers its tags."
  );

/** What the tag tools do, through the publishing context's use case. */
export const TagToolsLive = TagTools.toLayer(
  Effect.gen(function* tagTools() {
    const tags = yield* PostTags;
    const actor = CurrentMember.pipe(Effect.map(actorOf));

    return TagTools.of({
      create_tag: (details) =>
        Effect.gen(function* create() {
          const created = yield* tags.create(yield* actor, details).pipe(
            Effect.catchTags({
              DatabaseError: Effect.die,
              MissingPermission: notAllowed("create tags"),
              TagNameTaken: nameTaken,
              TooManyTags: () =>
                refuse(
                  `The workspace has ${String(maxTagsPerWorkspace)} tags, the most it may: nothing was created. The user deletes one first.`
                ),
            })
          );

          return tagView(created);
        }),
      delete_tag: ({ tagId }) =>
        Effect.gen(function* remove() {
          yield* tags.remove(yield* actor, yield* tagIdFrom(tagId)).pipe(
            Effect.catchTags({
              DatabaseError: Effect.die,
              MissingPermission: notAllowed("delete tags"),
            })
          );

          return { deleted: tagId };
        }).pipe(Effect.catchTags({ TagNotFound: noTag })),
      list_tags: () =>
        Effect.gen(function* list() {
          const found = yield* tags.list(yield* actor).pipe(
            Effect.catchTags({
              DatabaseError: Effect.die,
              MissingPermission: notAllowed("read tags"),
            })
          );

          return { tags: found.map(tagView) };
        }),
      tag_post: ({ postId, tagIds }) =>
        Effect.gen(function* tag() {
          const tagged = yield* tags
            .assign(
              yield* actor,
              yield* postIdFrom(postId),
              yield* tagIdsFrom(tagIds)
            )
            .pipe(
              Effect.catchTags({
                DatabaseError: Effect.die,
                MissingPermission: notAllowed("tag posts"),
              })
            );

          return postView(tagged);
        }).pipe(
          Effect.catchTags({ PostNotFound: noPost, UnknownTags: unknownTags })
        ),
      update_tag: ({ colour, name, tagId }) =>
        Effect.gen(function* update() {
          if (colour === undefined && name === undefined) {
            return yield* refuse(
              "Give a name, a colour or both: nothing else of a tag changes."
            );
          }

          const member = yield* actor;
          const id = yield* tagIdFrom(tagId);

          // What the call leaves out stays as the tag has it.
          const current = yield* tags.list(member).pipe(
            Effect.catchTags({
              DatabaseError: Effect.die,
              MissingPermission: notAllowed("change tags"),
            }),
            Effect.map((kept) => kept.find((tag) => tag.id === id))
          );

          if (current === undefined) {
            return yield* noTag();
          }

          const updated = yield* tags
            .update(member, id, {
              colour: colour ?? current.colour,
              name: name ?? current.name,
            })
            .pipe(
              Effect.catchTags({
                DatabaseError: Effect.die,
                MissingPermission: notAllowed("change tags"),
                TagNameTaken: nameTaken,
              })
            );

          return tagView(updated);
        }).pipe(Effect.catchTags({ TagNotFound: noTag })),
    });
  })
);
