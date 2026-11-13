import type { Tag } from "peal-contract";
import { TagDot, TagStripe } from "peal-ui/components/tag";

const shownTags = 3;

/**
 * A post's tags on a calendar chip: the colour of the first three, then
 * how many more. The dots say nothing to assistive technology: the chip's
 * own name lists the tags, which `title` shows on hover too.
 */
export const ChipTags = ({
  tags,
  title,
}: {
  readonly tags: readonly Tag[];
  /** The tags' names, in a sentence. */
  readonly title: string;
}) =>
  tags.length === 0 ? null : (
    <span title={title} className="flex shrink-0 items-center gap-0.5">
      {tags.slice(0, shownTags).map((tag) => (
        <TagDot key={tag.id} colour={tag.colour} />
      ))}
      {tags.length > shownTags ? (
        <span aria-hidden="true" className="text-muted-foreground">
          +{tags.length - shownTags}
        </span>
      ) : null}
    </span>
  );

/**
 * A post's colour on the calendar: its first tag's, in the workspace's
 * order, along the chip's edge. Nothing for a post without tags, which
 * keeps its state's colour alone. Hidden from assistive technology, as
 * the chip's name lists the tags.
 */
export const ChipEdge = ({ tags }: { readonly tags: readonly Tag[] }) => {
  const [first] = tags;

  return first === undefined ? null : <TagStripe colour={first.colour} />;
};
