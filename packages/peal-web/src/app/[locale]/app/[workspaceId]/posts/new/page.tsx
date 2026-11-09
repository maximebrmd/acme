import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";

import { ComposerScreen } from "#components/posts/composer-screen.tsx";
import { routing } from "#i18n/routing.ts";
import { viewerOf } from "#posts/membership.ts";

// Writes a new post for the workspace.
const NewPostPage = async ({
  params,
}: PageProps<"/[locale]/app/[workspaceId]/posts/new">) => {
  const { locale, workspaceId } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const { membership, userId } = await viewerOf(locale, workspaceId);

  return (
    <ComposerScreen
      permissions={membership.permissions}
      userId={userId}
      postId={undefined}
      workspaceId={membership.id}
    />
  );
};

export default NewPostPage;
