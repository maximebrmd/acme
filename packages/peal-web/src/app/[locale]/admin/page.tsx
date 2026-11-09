import { Badge } from "peal-ui/components/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "peal-ui/components/table";
import { DateTime } from "effect";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { ChannelHealth } from "#components/staff/channel-health.tsx";
import { Instant } from "#components/staff/instant.tsx";
import { Fact, Section } from "#components/staff/section.tsx";
import { Link } from "#i18n/navigation.ts";
import { routing } from "#i18n/routing.ts";
import { staffRead } from "#staff/server.ts";

const iso = DateTime.formatIso;

// The server's health: its database, its release, the posts due soon or
// overdue, and the channels to reconnect, in every workspace.
const SystemPage = async ({ params }: PageProps<"/[locale]/admin">) => {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const system = await staffRead((staff) => staff.system());
  const t = await getTranslations("Staff.system");
  const posts = await getTranslations("Posts");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>
      <dl className="grid gap-4 sm:grid-cols-4">
        <Fact label={t("database")}>
          {system.ready ? (
            <Badge variant="secondary">{t("ready")}</Badge>
          ) : (
            <Badge variant="destructive">{t("notReady")}</Badge>
          )}
        </Fact>
        <Fact label={t("release")}>{system.release ?? t("noRelease")}</Fact>
        <Fact label={t("overdue")}>
          {system.overdue > 0 ? (
            <Badge variant="destructive">{system.overdue}</Badge>
          ) : (
            system.overdue
          )}
        </Fact>
        <Fact label={t("checkedAt")}>
          <Instant value={iso(system.checkedAt)} />
        </Fact>
      </dl>
      <p className="text-muted-foreground text-sm">{t("overdueHint")}</p>
      <Section
        title={t("dueTitle")}
        description={t("dueTotal", { total: system.due.total })}
      >
        {system.due.posts.length === 0 ? null : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("dueColumns.at")}</TableHead>
                <TableHead>{t("dueColumns.workspace")}</TableHead>
                <TableHead>{t("dueColumns.channels")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {system.due.posts.map((post) => (
                <TableRow key={post.postId}>
                  <TableCell>
                    <Instant value={iso(post.scheduledAt)} />
                  </TableCell>
                  <TableCell>
                    <Link href={`/admin/workspaces/${post.workspaceId}`}>
                      <code>{post.workspaceId}</code>
                    </Link>
                  </TableCell>
                  <TableCell>{post.channels}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Section>
      <Section title={t("failingTitle")} description={t("failingDescription")}>
        {system.failingChannels.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("failingEmpty")}</p>
        ) : (
          <ul className="divide-y">
            {system.failingChannels.map((channel) => (
              <li
                key={channel.id}
                className="flex flex-wrap items-center justify-between gap-2 py-3"
              >
                <span className="flex flex-col gap-1">
                  <span className="text-sm font-medium">{channel.handle}</span>
                  <span className="text-muted-foreground text-sm">
                    {posts("platform", { platform: channel.platform })}
                    {" · "}
                    <Link href={`/admin/workspaces/${channel.workspaceId}`}>
                      <code>{channel.workspaceId}</code>
                    </Link>
                  </span>
                </span>
                <ChannelHealth status={channel.status} />
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
};

export default SystemPage;
