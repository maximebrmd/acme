import { Option, Schema } from "effect";

import type { OutgoingPost } from "#publishing/application/platform-client.ts";
import { LinkedInOptions } from "#publishing/domain/linkedin-options.ts";
import type { LinkedInVisibility } from "#publishing/domain/linkedin-options.ts";

import { authorUrnOf } from "./linkedin-author.ts";
import { littleTextOf } from "./little-text.ts";

/** The post's LinkedIn options, when its target has any. */
export const linkedinOptionsOf = (
  post: OutgoingPost
): Option.Option<LinkedInOptions> =>
  post.options.pipe(Option.filter(Schema.is(LinkedInOptions)));

// The Posts API's names for who sees a post.
const visibilities: Readonly<Record<LinkedInVisibility, string>> = {
  connections: "CONNECTIONS",
  loggedIn: "LOGGED_IN",
  public: "PUBLIC",
};

/**
 * The post's text as LinkedIn's commentary, the pages its options name
 * written as mentions.
 */
export const commentaryOf = (post: OutgoingPost): string =>
  littleTextOf(
    post.text,
    linkedinOptionsOf(post).pipe(
      Option.flatMap(({ mentions }) => Option.fromUndefinedOr(mentions)),
      Option.getOrElse(() => [])
    )
  );

/** A link the post shows as a card, from its options: LinkedIn's article. */
export interface LinkedInLink {
  readonly description: Option.Option<string>;
  readonly source: string;
  readonly title: string;
}

/**
 * The link the post's options ask for: an address and its title. LinkedIn
 * reads no page itself, so a link without a title is none.
 */
export const linkOf = (post: OutgoingPost): Option.Option<LinkedInLink> =>
  linkedinOptionsOf(post).pipe(
    Option.flatMap(({ linkDescription, linkTitle, linkUrl }) =>
      linkUrl === undefined || linkTitle === undefined
        ? Option.none()
        : Option.some({
            description: Option.fromUndefinedOr(linkDescription).pipe(
              Option.filter((text) => text.trim() !== "")
            ),
            source: linkUrl,
            title: linkTitle,
          })
    )
  );

/**
 * The title a document shows under: the one its options give, or the
 * file's name, as LinkedIn needs one.
 */
export const documentTitleOf = (post: OutgoingPost, fileName: string): string =>
  linkedinOptionsOf(post).pipe(
    Option.flatMap(({ documentTitle }) =>
      Option.fromUndefinedOr(documentTitle)
    ),
    Option.filter((title) => title.trim() !== ""),
    Option.getOrElse(() => fileName)
  );

/**
 * The body of POST /rest/posts: who posts (the member, or the page), the
 * commentary, who sees it and whether it can be reshared, from the
 * target's options, and what `content` adds (media, an article, or
 * nothing for a text post). The post goes to the main feed at once.
 */
export const postBodyOf = <Content extends object>(
  post: OutgoingPost,
  content: Content
) => {
  const options = linkedinOptionsOf(post);

  return {
    author: authorUrnOf(post.accountId),
    commentary: commentaryOf(post),
    distribution: {
      feedDistribution: "MAIN_FEED",
      targetEntities: [],
      thirdPartyDistributionChannels: [],
    },
    isReshareDisabledByAuthor: options.pipe(
      Option.exists(({ disableReshare }) => disableReshare === true)
    ),
    lifecycleState: "PUBLISHED",
    visibility:
      visibilities[
        options.pipe(
          Option.flatMap(({ visibility }) =>
            Option.fromUndefinedOr(visibility)
          ),
          Option.getOrElse(() => "public" as const)
        )
      ],
    ...content,
  };
};
