import { Option } from "effect";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Badge } from "peal-ui/components/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "peal-ui/components/card";

import { currentUser } from "#auth/session.ts";
import { UpgradePrompts } from "#components/billing/upgrade-prompts.tsx";
import { CreateWorkspaceForm } from "#components/create-workspace-form.tsx";
import { Link, redirect } from "#i18n/navigation.ts";
import { routing } from "#i18n/routing.ts";

// The signed-in home: the user's workspaces, read from GET /api/me with the
// visitor's cookies. Anyone else is sent to sign in.
const AppPage = async ({ params }: PageProps<"/[locale]/app">) => {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const me = await currentUser();

  if (Option.isNone(me)) {
    return redirect({ href: "/sign-in", locale });
  }

  const { user, workspaces } = me.value;
  const t = await getTranslations("AppPage");
  const channels = await getTranslations("ChannelsPage");
  const tPosts = await getTranslations("Posts.nav");
  const media = await getTranslations("Media.page");
  const settings = await getTranslations("WorkspaceSettings");
  const billing = await getTranslations("Billing");
  const analytics = await getTranslations("Analytics");

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          {t("title", { name: user.name })}
        </h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>
      {workspaces.length === 0 ? (
        <p className="text-muted-foreground">{t("empty")}</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {workspaces.map((workspace) => (
            <li key={workspace.id}>
              <Card>
                <CardHeader>
                  <CardTitle>{workspace.name}</CardTitle>
                  <CardDescription>
                    {t("permissions", { count: workspace.permissions.length })}
                  </CardDescription>
                  <CardAction>
                    <Badge variant="outline">
                      {t("role", { role: workspace.role })}
                    </Badge>
                  </CardAction>
                </CardHeader>
                <CardFooter>
                  <nav
                    aria-label={tPosts("workspaceLinks", {
                      workspace: workspace.name,
                    })}
                    className="flex flex-wrap gap-x-4 gap-y-1 text-sm"
                  >
                    <Link
                      href={`/app/${workspace.id}/calendar`}
                      className="underline-offset-4 hover:underline"
                    >
                      {tPosts("calendar")}
                    </Link>
                    {workspace.permissions.includes("post:create") ? (
                      <Link
                        href={`/app/${workspace.id}/posts/new`}
                        className="underline-offset-4 hover:underline"
                      >
                        {tPosts("newPost")}
                      </Link>
                    ) : null}
                    <Link
                      href={`/app/${workspace.id}/drafts`}
                      className="underline-offset-4 hover:underline"
                    >
                      {tPosts("drafts")}
                    </Link>
                    <Link
                      href={`/app/${workspace.id}/channels`}
                      className="underline-offset-4 hover:underline"
                    >
                      {channels("open")}
                    </Link>
                    {workspace.permissions.includes("media:read") ? (
                      <Link
                        href={`/app/${workspace.id}/media`}
                        aria-label={media("openLabel", {
                          workspace: workspace.name,
                        })}
                        className="underline-offset-4 hover:underline"
                      >
                        {media("open")}
                      </Link>
                    ) : null}
                    {workspace.permissions.includes("analytics:read") ? (
                      <Link
                        href={`/app/${workspace.id}/analytics`}
                        aria-label={analytics("openLabel", {
                          workspace: workspace.name,
                        })}
                        className="underline-offset-4 hover:underline"
                      >
                        {analytics("open")}
                      </Link>
                    ) : null}
                    {workspace.permissions.includes("billing:read") ? (
                      <Link
                        href={`/app/${workspace.id}/billing`}
                        aria-label={billing("openLabel", {
                          workspace: workspace.name,
                        })}
                        className="underline-offset-4 hover:underline"
                      >
                        {billing("open")}
                      </Link>
                    ) : null}
                    <Link
                      href={`/app/${workspace.id}/settings`}
                      aria-label={settings("openLabel", {
                        workspace: workspace.name,
                      })}
                      className="underline-offset-4 hover:underline"
                    >
                      {settings("open")}
                    </Link>
                  </nav>
                </CardFooter>
              </Card>
            </li>
          ))}
        </ul>
      )}
      <Card className="max-w-sm">
        <CardHeader>
          <CardTitle>
            <h2>{t("createTitle")}</h2>
          </CardTitle>
          <CardDescription>{t("createDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <UpgradePrompts current={null}>
            <CreateWorkspaceForm />
          </UpgradePrompts>
        </CardContent>
      </Card>
    </div>
  );
};

export default AppPage;
