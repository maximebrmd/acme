import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";

import { ComposerScreen } from "#components/posts/composer-screen.tsx";
import { routing } from "#i18n/routing.ts";
import { membershipOf } from "#posts/membership.ts";

// Opens a post of the workspace in the composer.
const PostPage = async ({
  params,
}: PageProps<"/[locale]/app/[workspaceId]/posts/[postId]">) => {
  const { locale, postId, workspaceId } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const membership = await membershipOf(locale, workspaceId);

  return (
    <ComposerScreen
      permissions={membership.permissions}
      postId={postId}
      workspaceId={membership.id}
    />
  );
};

export default PostPage;
