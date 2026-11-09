import { Context, DateTime, Effect, Layer, Option, Ref } from "effect";

import { PublishedPosts } from "#analytics/application/published-posts.ts";
import type { Publication } from "#analytics/domain/tracked-post.ts";

/** The publications PublishedPosts lists, which tests add to. */
export class Publications extends Context.Service<
  Publications,
  { readonly add: (...added: readonly Publication[]) => Effect.Effect<void> }
>()("test/analytics/Publications") {}

/** PublishedPosts over the publications a test adds, in publishing's order. */
export const PublishedPostsTest = Layer.effectContext(
  Effect.gen(function* PublishedPostsTest() {
    const all = yield* Ref.make<readonly Publication[]>([]);

    const from: PublishedPosts["Service"]["from"] = (cursor, limit) =>
      Ref.get(all).pipe(
        Effect.map((publications) =>
          publications
            .filter((publication) => {
              const order = DateTime.Order(
                publication.publishedAt,
                cursor.publishedAt
              );

              return Option.match(cursor.targetId, {
                onNone: () => order >= 0,
                onSome: (after) =>
                  order > 0 || (order === 0 && publication.targetId > after),
              });
            })
            .toSorted(
              (left, right) =>
                DateTime.Order(left.publishedAt, right.publishedAt) ||
                left.targetId.localeCompare(right.targetId)
            )
            .slice(0, limit)
        )
      );

    return Context.make(PublishedPosts, PublishedPosts.of({ from })).pipe(
      Context.add(
        Publications,
        Publications.of({
          add: (...added) => Ref.update(all, (before) => [...before, ...added]),
        })
      )
    );
  })
);
