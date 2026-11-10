import { Option, Schema } from "effect";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";

import { ComposerScreen } from "#components/posts/composer-screen.tsx";
import { routing } from "#i18n/routing.ts";
import { viewerOf } from "#posts/membership.ts";
import { StartAtSchema } from "#posts/start-time.ts";

const decodeStartAt = Schema.decodeUnknownOption(StartAtSchema);

// Writes a new post for the workspace. `?at=YYYY-MM-DDTHH:mm`, as the
// calendar links it, starts its schedule at that date and time on the
// viewer's clock.
const NewPostPage = async ({
  params,
  searchParams,
}: PageProps<"/[locale]/app/[workspaceId]/posts/new">) => {
  const { locale, workspaceId } = await params;
  const { at } = await searchParams;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const { membership, userId } = await viewerOf(locale, workspaceId);

  return (
    <ComposerScreen
      permissions={membership.permissions}
      userId={userId}
      postId={undefined}
      startAt={Option.getOrUndefined(decodeStartAt(at))}
      workspaceId={membership.id}
    />
  );
};

export default NewPostPage;
