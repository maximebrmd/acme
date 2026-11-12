import { Option } from "effect";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import type { WorkspaceOverview } from "peal-contract";
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
import { WorkspaceAttentionView } from "#components/overview/overview-views.tsx";
import { Link, redirect } from "#i18n/navigation.ts";
import { routing } from "#i18n/routing.ts";
import { byAttention } from "#overview/attention.ts";
import { overviewOrNothing } from "#overview/server.ts";

const attentionLink = (href: string, label: string) => (
  <Link href={href} className="underline-offset-4 hover:underline">
    {label}
  </Link>
);

// What needs attention in a card's workspace, when the overview told it.
const attentionOn = (found: WorkspaceOverview | undefined) =>
  found === undefined ? null : (
    <CardContent>
      <WorkspaceAttentionView linkTo={attentionLink} workspace={found} />
    </CardContent>
  );

// The signed-in home: the user's workspaces, read from GET /api/me with the
// visitor's cookies, those with something to attend first, each with what
// needs attention as GET /api/me/overview tells it. Anyone else is sent to
// sign in. Without the overview, the cards show their links alone.
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
  const overview = await overviewOrNothing();
  const t = await getTranslations("AppPage");
  const tOverview = await getTranslations("Overview.home");
  const channels = await getTranslations("ChannelsPage");
  const tPosts = await getTranslations("Posts.nav");
  const media = await getTranslations("Media.page");
  const settings = await getTranslations("WorkspaceSettings");
  const billing = await getTranslations("Billing");
  const analytics = await getTranslations("Analytics");
  const ads = await getTranslations("Ads");
  const review = await getTranslations("Review");
  const inbox = await getTranslations("Inbox");
  const twoStep = await getTranslations("TwoStep");

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          {t("title", { name: user.name })}
        </h1>
        <p className="text-muted-foreground">{t("description")}</p>
        {workspaces.length > 1 ? (
          <nav className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            <Link
              href="/app/agenda"
              className="underline-offset-4 hover:underline"
            >
              {tOverview("agenda")}
            </Link>
            <Link
              href="/app/report"
              className="underline-offset-4 hover:underline"
            >
              {tOverview("report")}
            </Link>
          </nav>
        ) : null}
      </div>
      {workspaces.length === 0 ? (
        <p className="text-muted-foreground">{t("empty")}</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {byAttention(workspaces, overview).map((workspace) => (
            <li key={workspace.id}>
              <Card>
                <CardHeader>
                  <CardTitle>{workspace.name}</CardTitle>
                  <CardDescription>
                    {workspace.twoStepRequired && !user.twoStepEnabled
                      ? twoStep("workspaceRequiresBadge")
                      : t("permissions", {
                          count: workspace.permissions.length,
                        })}
                  </CardDescription>
                  <CardAction>
                    <Badge variant="outline">
                      {t("role", { role: workspace.role })}
                    </Badge>
                  </CardAction>
                </CardHeader>
                {attentionOn(overview.get(workspace.id))}
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
                      href={`/app/${workspace.id}/posts`}
                      className="underline-offset-4 hover:underline"
                    >
                      {tPosts("allPosts")}
                    </Link>
                    <Link
                      href={`/app/${workspace.id}/approvals`}
                      className="underline-offset-4 hover:underline"
                    >
                      {review("approvals.nav")}
                    </Link>
                    {workspace.permissions.includes("engagement:read") ? (
                      <Link
                        href={`/app/${workspace.id}/inbox`}
                        aria-label={inbox("openLabel", {
                          workspace: workspace.name,
                        })}
                        className="underline-offset-4 hover:underline"
                      >
                        {inbox("open")}
                      </Link>
                    ) : null}
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
                    {workspace.permissions.includes("ads:read") ? (
                      <Link
                        href={`/app/${workspace.id}/ads`}
                        aria-label={ads("openLabel", {
                          workspace: workspace.name,
                        })}
                        className="underline-offset-4 hover:underline"
                      >
                        {ads("open")}
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
