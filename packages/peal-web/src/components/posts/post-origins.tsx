import { useTranslations } from "next-intl";
import type { Post, PostOrigin } from "peal-contract";

// What the catalogues need to tell an origin: through what, under which
// name if it had one, and whether the reader is the member behind it.
const told = (
  origin: PostOrigin,
  memberId: string | null,
  viewerId: string | null
) => {
  const name = origin.name?.trim() ?? "";

  return {
    name,
    named: name === "" ? "no" : "yes",
    via: origin.via,
    who: memberId !== null && memberId === viewerId ? "you" : "other",
  };
};

/**
 * How a post came to be, in a line or two: created in the web app, with an
 * API key or by an application, and scheduled likewise. Nothing for a post
 * from before this was kept. It names the reader when they are the member
 * behind it, and nobody else: the page holds no list of members.
 */
export const PostOrigins = ({
  post,
  viewerId,
}: {
  readonly post: Pick<
    Post,
    "authorId" | "createdVia" | "scheduledBy" | "scheduledVia"
  >;
  /** The signed-in user, when the page knows them. */
  readonly viewerId: string | null;
}) => {
  const t = useTranslations("Posts.Origin");
  const { createdVia, scheduledVia } = post;

  if (createdVia === null && scheduledVia === null) {
    return null;
  }

  return (
    <div className="text-muted-foreground flex flex-col gap-1 text-xs">
      {createdVia === null ? null : (
        <p>{t("created", told(createdVia, post.authorId, viewerId))}</p>
      )}
      {scheduledVia === null ? null : (
        <p>{t("scheduled", told(scheduledVia, post.scheduledBy, viewerId))}</p>
      )}
    </div>
  );
};
