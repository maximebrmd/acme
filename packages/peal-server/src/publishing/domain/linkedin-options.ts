import { Schema } from "effect";

import type { FieldNotes } from "./field-description.ts";
import {
  isLinkableMention,
  LinkedInMentionSchema,
} from "./linkedin-mentions.ts";
import type { LookupName } from "./lookup.ts";
import type { OptionConstraint } from "./option-constraint.ts";
import { invalid, missing } from "./option-problem.ts";
import type { OptionProblem } from "./option-problem.ts";
import { PostTextSchema } from "./post-text.ts";
import { measureText } from "./text-length.ts";

// LinkedIn's Posts API: `visibility`, `isReshareDisabledByAuthor`, an
// article's `source`, `title` and `description`, a document's `title`, and
// the mentions its `commentary` holds. The commentary is the post's text on
// the channel.

/**
 * Who sees the post: anyone (`PUBLIC`), the member's connections
 * (`CONNECTIONS`, for a profile: a page has none), or members signed in to
 * LinkedIn (`LOGGED_IN`).
 */
export const LinkedInVisibilitySchema = Schema.Literals([
  "public",
  "connections",
  "loggedIn",
]);

export type LinkedInVisibility = typeof LinkedInVisibilitySchema.Type;

// LinkedIn documents no maximum for a document's title, nor for an
// article's title and description: these are Peal's own, so options never
// hold an essay. A title LinkedIn finds too long fails the post with
// LinkedIn's own refusal.

/** The longest title of a document Peal takes, in characters. */
export const maxLinkedInDocumentTitleLength = 400;

/** The longest title of a link Peal takes, in characters. */
export const maxLinkedInLinkTitleLength = 400;

/** The longest description of a link Peal takes, in characters. */
export const maxLinkedInLinkDescriptionLength = 4000;

/** The longest address of a link Peal takes, in characters. */
export const maxLinkedInLinkUrlLength = 2000;

/** The most pages one post names. */
export const maxLinkedInMentions = 30;

const characters = (text: string) => measureText(text, "codePoints");

// An address LinkedIn can open: HTTPS or HTTP, with a host.
const isWebAddress = (value: string) => {
  const url = URL.parse(value);

  return (
    url !== null &&
    (url.protocol === "https:" || url.protocol === "http:") &&
    url.hostname !== ""
  );
};

const isBlank = (text: string | undefined) =>
  text === undefined || text.trim() === "";

const lengthProblems = (
  field: LinkedInField,
  text: string | undefined,
  maximum: number
): readonly OptionProblem<LinkedInField>[] => {
  const length = characters(text ?? "");

  return length > maximum ? [{ _tag: "tooLong", field, length, maximum }] : [];
};

// A link is LinkedIn's article: its address and its title go together, as
// LinkedIn reads no page itself; a description alone has nothing to
// describe.
const linkProblems = (
  options: LinkedInOptions
): readonly OptionProblem<LinkedInField>[] => {
  const { linkDescription, linkTitle, linkUrl } = options;

  if (isBlank(linkUrl)) {
    return isBlank(linkTitle) && isBlank(linkDescription)
      ? []
      : [missing("linkUrl")];
  }

  return [
    ...(isWebAddress(linkUrl ?? "") ? [] : [invalid("linkUrl")]),
    ...lengthProblems("linkUrl", linkUrl, maxLinkedInLinkUrlLength),
    ...(isBlank(linkTitle) ? [missing("linkTitle")] : []),
    ...lengthProblems("linkTitle", linkTitle, maxLinkedInLinkTitleLength),
    ...lengthProblems(
      "linkDescription",
      linkDescription,
      maxLinkedInLinkDescriptionLength
    ),
  ];
};

const documentProblems = (
  title: string | undefined
): readonly OptionProblem<LinkedInField>[] =>
  title === undefined
    ? []
    : [
        ...(title.trim() === "" ? [invalid("documentTitle")] : []),
        ...lengthProblems(
          "documentTitle",
          title,
          maxLinkedInDocumentTitleLength
        ),
      ];

// Each mention is a page LinkedIn could link, and a name stands for one
// page: two pages of the same name could not be told apart in the text.
const mentionProblems = (
  mentions: LinkedInOptions["mentions"] = []
): readonly OptionProblem<LinkedInField>[] =>
  mentions.every(isLinkableMention) &&
  new Set(mentions.map(({ name }) => name)).size === mentions.length
    ? []
    : [invalid("mentions")];

const linkedInProblems = (
  options: LinkedInOptions
): readonly OptionProblem<LinkedInField>[] => [
  ...documentProblems(options.documentTitle),
  ...linkProblems(options),
  ...mentionProblems(options.mentions),
];

/**
 * How a post goes out on a LinkedIn channel, a member's profile or a
 * company page. Scheduling needs none of them: left out, the post is
 * public, can be reshared, shows no link card, names no page, and a
 * document it shows is titled by its file's name.
 */
export class LinkedInOptions extends Schema.Class<LinkedInOptions>(
  "peal-server/publishing/domain/LinkedInOptions"
)({
  // Keeps other members from resharing the post.
  disableReshare: Schema.optionalKey(Schema.Boolean),
  // What LinkedIn shows above a document (a PDF shown page by page).
  documentTitle: Schema.optionalKey(PostTextSchema),
  // A link shown as a card under the text: LinkedIn's article.
  linkDescription: Schema.optionalKey(PostTextSchema),
  linkTitle: Schema.optionalKey(PostTextSchema),
  linkUrl: Schema.optionalKey(PostTextSchema),
  // The pages the text names, each where the text holds `@` and its name.
  mentions: Schema.optionalKey(
    Schema.Array(LinkedInMentionSchema).check(
      Schema.isMaxLength(maxLinkedInMentions)
    )
  ),
  platform: Schema.tag("linkedin"),
  visibility: Schema.optionalKey(LinkedInVisibilitySchema),
}) {
  /**
   * What the fields' schemas do not say, for the description clients read
   * (`optionFieldsOn`): every field has an entry.
   */
  static readonly notes: Readonly<
    Record<LinkedInField, FieldNotes<LookupName>>
  > = {
    disableReshare: { ifLeftOut: false },
    documentTitle: { maxLength: maxLinkedInDocumentTitleLength },
    linkDescription: { maxLength: maxLinkedInLinkDescriptionLength },
    linkTitle: { maxLength: maxLinkedInLinkTitleLength },
    linkUrl: {
      maxLength: maxLinkedInLinkUrlLength,
      pattern: "^https?://.+",
    },
    mentions: { lookup: "linkedinOrganizations", maximum: maxLinkedInMentions },
    visibility: { ifLeftOut: "public" },
  };

  /**
   * The rules between a link's fields are in `problems`: no constraint
   * between yes-or-no options says them.
   */
  static readonly constraints: readonly OptionConstraint<LinkedInField>[] = [];

  /** What LinkedIn, or Peal for it, would refuse in them. */
  problems(): readonly OptionProblem<LinkedInField>[] {
    return linkedInProblems(this);
  }
}

/** An option of LinkedIn's. */
export type LinkedInField = Exclude<
  keyof typeof LinkedInOptions.fields,
  "platform"
>;
