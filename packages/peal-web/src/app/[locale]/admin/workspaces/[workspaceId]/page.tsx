import { DateTime } from "effect";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Badge } from "peal-ui/components/badge";
import { Button } from "peal-ui/components/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "peal-ui/components/table";

import { ChannelHealth } from "#components/staff/channel-health.tsx";
import { Instant } from "#components/staff/instant.tsx";
import { Fact, Section } from "#components/staff/section.tsx";
import { Link } from "#i18n/navigation.ts";
import { routing } from "#i18n/routing.ts";
import { staffRead } from "#staff/server.ts";

const postStatuses = [
  "draft",
  "scheduled",
  "publishing",
  "finished",
  "cancelled",
] as const;

// One workspace: its members, plan, channels and their health, how many
// posts are where, and the latest that failed. Counts and ids only.
const WorkspacePage = async ({
  params,
}: PageProps<"/[locale]/admin/workspaces/[workspaceId]">) => {
  const { locale, workspaceId } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const workspace = await staffRead((staff) =>
    staff.workspace({ params: { workspaceId } })
  );

  const t = await getTranslations("Staff.workspace");
  const staffT = await getTranslations("Staff");
  const posts = await getTranslations("Posts");
  const roles = await getTranslations("WorkspaceSettings");
  const billing = await getTranslations("Billing");
  const { subscription } = workspace.billing;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div>
          <Button
            variant="link"
            size="sm"
            render={<Link href="/admin/workspaces" />}
            nativeButton={false}
          >
            {t("back")}
          </Button>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">
          {workspace.name}
        </h1>
        <p className="text-muted-foreground text-sm">
          <code>{workspace.slug}</code> · {t("created")}{" "}
          <Instant value={DateTime.formatIso(workspace.createdAt)} />
        </p>
      </div>
      <Section title={t("membersTitle")}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("memberColumns.name")}</TableHead>
              <TableHead>{t("memberColumns.email")}</TableHead>
              <TableHead>{t("memberColumns.role")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {workspace.members.map((member) => (
              <TableRow key={member.userId}>
                <TableCell>
                  <Link href={`/admin/users/${member.userId}`}>
                    {member.name}
                  </Link>
                </TableCell>
                <TableCell>{member.email}</TableCell>
                <TableCell>{roles("role", { role: member.role })}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Section>
      <Section title={t("billingTitle")}>
        {workspace.billing.plan === null ? (
          <p className="text-muted-foreground text-sm">{t("unmetered")}</p>
        ) : (
          <dl className="grid gap-4 sm:grid-cols-3">
            <Fact label={t("plan")}>
              {billing("plan", { plan: workspace.billing.plan })}
            </Fact>
            <Fact label={t("subscription")}>
              {subscription === null
                ? t("noSubscription")
                : billing("current.status", { status: subscription.status })}
            </Fact>
            {subscription?.currentPeriodEnd === null ||
            subscription === null ? null : (
              <Fact
                label={
                  subscription.cancelAtPeriodEnd
                    ? t("cancelsAtEnd")
                    : t("renews")
                }
              >
                <Instant
                  value={DateTime.formatIso(
                    subscription.endsAt ?? subscription.currentPeriodEnd
                  )}
                />
              </Fact>
            )}
          </dl>
        )}
      </Section>
      <Section title={t("channelsTitle")}>
        {workspace.channels.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("noChannel")}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("channelColumns.account")}</TableHead>
                <TableHead>{t("channelColumns.platform")}</TableHead>
                <TableHead>{t("channelColumns.health")}</TableHead>
                <TableHead>{t("channelColumns.expires")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workspace.channels.map((channel) => (
                <TableRow key={channel.id}>
                  <TableCell>{channel.handle}</TableCell>
                  <TableCell>
                    {posts("platform", { platform: channel.platform })}
                  </TableCell>
                  <TableCell>
                    <ChannelHealth status={channel.status} />
                  </TableCell>
                  <TableCell>
                    {channel.tokenExpiresAt === null ? (
                      t("noExpiry")
                    ) : (
                      <Instant
                        value={DateTime.formatIso(channel.tokenExpiresAt)}
                      />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Section>
      <Section title={t("webhooksTitle")} description={t("webhooksHint")}>
        {workspace.webhooks.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("noWebhook")}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("webhookColumns.host")}</TableHead>
                <TableHead>{t("webhookColumns.state")}</TableHead>
                <TableHead>{t("webhookColumns.events")}</TableHead>
                <TableHead>{t("webhookColumns.failingSince")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workspace.webhooks.map((webhook) => (
                <TableRow key={webhook.id}>
                  <TableCell>{webhook.host}</TableCell>
                  <TableCell>
                    {t("webhookState", {
                      state: webhook.enabled
                        ? "enabled"
                        : (webhook.disabledReason ?? "manual"),
                    })}
                  </TableCell>
                  <TableCell>{webhook.eventTypes}</TableCell>
                  <TableCell>
                    {webhook.failingSince === null ? (
                      t("notFailing")
                    ) : (
                      <Instant
                        value={DateTime.formatIso(webhook.failingSince)}
                      />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Section>
      <Section title={t("postsTitle")} description={t("postsHint")}>
        <dl className="grid gap-4 sm:grid-cols-5">
          {postStatuses.map((status) => (
            <Fact key={status} label={posts("status", { status })}>
              {workspace.posts[status]}
            </Fact>
          ))}
        </dl>
      </Section>
      <Section title={t("failuresTitle")}>
        {workspace.failures.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("noFailure")}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("failureColumns.at")}</TableHead>
                <TableHead>{t("failureColumns.platform")}</TableHead>
                <TableHead>{t("failureColumns.status")}</TableHead>
                <TableHead>{t("failureColumns.reason")}</TableHead>
                <TableHead>{t("failureColumns.code")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workspace.failures.map((failure) => (
                <TableRow key={`${failure.targetId}-${failure.status}`}>
                  <TableCell>
                    <Instant value={DateTime.formatIso(failure.at)} />
                  </TableCell>
                  <TableCell>
                    {failure.platform === null
                      ? t("removedChannel")
                      : posts("platform", { platform: failure.platform })}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        failure.status === "failed" ? "destructive" : "outline"
                      }
                    >
                      {staffT("troubleStatus", { status: failure.status })}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {staffT("reason", { reason: failure.reason })}
                  </TableCell>
                  <TableCell>
                    {failure.code === null ? null : <code>{failure.code}</code>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Section>
    </div>
  );
};

export default WorkspacePage;
