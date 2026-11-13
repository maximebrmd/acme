import { Schema } from "effect";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { PostList } from "#components/posts/post-list.tsx";
import { routing } from "#i18n/routing.ts";
import { membershipOf } from "#posts/membership.ts";

const isText = Schema.is(Schema.String);

// The workspace's posts, whatever their state, filtered and ordered by the
// query string (`#posts/post-list-filter.ts`), each opening on its page.
// The search needs post:read and channel:read: anyone else finds no page.
const PostsPage = async ({
  params,
  searchParams,
}: PageProps<"/[locale]/app/[workspaceId]/posts">) => {
  const { locale, workspaceId } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const membership = await membershipOf(locale, workspaceId);

  if (
    !(
      membership.permissions.includes("post:read") &&
      membership.permissions.includes("channel:read")
    )
  ) {
    notFound();
  }

  // Only single values are filters; a name given twice is ignored.
  const query = new URLSearchParams(
    Object.entries(await searchParams).flatMap(([name, value]) =>
      isText(value) ? [[name, value]] : []
    )
  ).toString();

  const t = await getTranslations("Posts.List");

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">
          {t("description", { workspace: membership.name })}
        </p>
      </div>
      <PostList
        canCreate={membership.permissions.includes("post:create")}
        canImport={membership.permissions.includes("post:schedule")}
        query={query}
        workspaceId={membership.id}
      />
    </div>
  );
};

export default PostsPage;
