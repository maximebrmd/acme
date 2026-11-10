import { Effect, Option } from "effect";

import type { RecordedPosts } from "#publishing/application/recorded-posts.ts";
import type { ChannelId } from "#shared/domain/ids.ts";

/**
 * The post an attempt made, among those a search of the platform found to
 * look like it: the only one the channel is not already known to have made
 * (`RecordedPosts`). Another attempt's post, the same in every word, is
 * recorded, and never adopted; two that nothing tells apart settle
 * nothing, as does a ledger that cannot be read.
 */
export const attemptAmong = <Post>(
  recorded: RecordedPosts["Service"],
  channelId: ChannelId,
  matches: readonly Post[],
  idOf: (post: Post) => string
): Effect.Effect<Option.Option<Post>> =>
  recorded.among(channelId, matches.map(idOf)).pipe(
    Effect.map((known) => {
      const [only, ...others] = matches.filter(
        (post) => !known.has(idOf(post))
      );

      return only === undefined || others.length > 0
        ? Option.none<Post>()
        : Option.some(only);
    }),
    Effect.orElseSucceed(() => Option.none<Post>())
  );
