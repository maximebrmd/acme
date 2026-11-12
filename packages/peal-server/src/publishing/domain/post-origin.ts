import { Effect, Option, Schema } from "effect";

import type { Actor } from "#shared/domain/access.ts";
import { UserIdSchema } from "#shared/domain/ids.ts";

/**
 * How whoever created or scheduled a post reached Peal: in the web app
 * (`web`, a member in their session), with an API key of the workspace
 * (`apiKey`), or through an OAuth client acting for a member
 * (`application`: the command line, an MCP client). A key and an
 * application come with the name they had then, if they had one, so the
 * post still says which one once the key is revoked or the application
 * renamed.
 *
 * Stored with the post as JSON (`publishing.posts.created_via`,
 * `scheduled_via`), so it is persisted contract: add a member or an
 * optional field, never rename or remove one.
 */
export const PostOriginSchema = Schema.Union([
  Schema.TaggedStruct("web", {}),
  Schema.TaggedStruct("apiKey", {
    apiKeyId: Schema.NonEmptyString,
    name: Schema.optionalKey(Schema.String),
  }),
  Schema.TaggedStruct("application", {
    clientId: Schema.NonEmptyString,
    name: Schema.optionalKey(Schema.String),
  }),
]);

export type PostOrigin = typeof PostOriginSchema.Type;

const named = (name: Option.Option<string>) =>
  Option.match(name, {
    onNone: () => ({}),
    onSome: (value) => ({ name: value }),
  });

/**
 * How an actor reached Peal, with the name of the key or the application
 * they act through, when one is known.
 */
export const originOf = (
  actor: Actor,
  name: Option.Option<string>
): PostOrigin => {
  const { subject } = actor;

  if (subject._tag === "apiKey") {
    return { _tag: "apiKey", apiKeyId: subject.apiKeyId, ...named(name) };
  }

  return subject.clientId === undefined
    ? { _tag: "web" }
    : { _tag: "application", clientId: subject.clientId, ...named(name) };
};

/**
 * Whether two origins are the same way in: the web app, the same API key,
 * or the same OAuth application, whatever their names.
 */
export const isSameOrigin = (left: PostOrigin, right: PostOrigin): boolean => {
  if (left._tag === "apiKey") {
    return right._tag === "apiKey" && right.apiKeyId === left.apiKeyId;
  }

  if (left._tag === "application") {
    return right._tag === "application" && right.clientId === left.clientId;
  }

  return right._tag === "web";
};

/**
 * How a post was created, and how and by whom it was last scheduled or
 * moved: none of the latter while it is a draft. The member who created it
 * is the post's author. All unknown on posts from before this was kept.
 * Never sent to a platform: adapters get a post's content and options only.
 */
export class PostAttribution extends Schema.Class<PostAttribution>(
  "peal-server/publishing/domain/PostAttribution"
)({
  createdVia: Schema.Option(PostOriginSchema),
  // The member who scheduled it; none when an API key did.
  scheduledBy: Schema.Option(UserIdSchema),
  scheduledVia: Schema.Option(PostOriginSchema),
}) {
  /** Nothing known, as on a post from before attribution was kept. */
  static readonly unknown = new PostAttribution({
    createdVia: Option.none(),
    scheduledBy: Option.none(),
    scheduledVia: Option.none(),
  });
}

/** A Post's attribution field: unknown unless given. */
export const PostAttributionField = PostAttribution.pipe(
  Schema.withConstructorDefault(Effect.succeed(PostAttribution.unknown))
);
