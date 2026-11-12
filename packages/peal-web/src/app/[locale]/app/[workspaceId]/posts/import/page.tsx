import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { maxImportRows } from "peal-contract";
import type { Permission } from "peal-contract";

import { PostImport } from "#components/posts/post-import.tsx";
import { Link } from "#i18n/navigation.ts";
import { routing } from "#i18n/routing.ts";
import { membershipOf } from "#posts/membership.ts";

// What an import asks of the member.
const needed: readonly Permission[] = [
  "post:schedule",
  "post:read",
  "channel:read",
];

// Imports posts from a CSV file through `posts.import`, which needs
// post:schedule, post:read and channel:read: anyone else finds no page.
const PostImportPage = async ({
  params,
}: PageProps<"/[locale]/app/[workspaceId]/posts/import">) => {
  const { locale, workspaceId } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const membership = await membershipOf(locale, workspaceId);

  if (
    !needed.every((permission) => membership.permissions.includes(permission))
  ) {
    notFound();
  }

  const t = await getTranslations("Posts.Import");

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <Link
          href={`/app/${membership.id}/posts`}
          className="text-muted-foreground self-start text-sm underline-offset-4 hover:underline"
        >
          {t("allPosts")}
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">
          {t("description", {
            rows: maxImportRows,
            workspace: membership.name,
          })}
        </p>
      </div>
      <PostImport workspaceId={membership.id} />
    </div>
  );
};

export default PostImportPage;
