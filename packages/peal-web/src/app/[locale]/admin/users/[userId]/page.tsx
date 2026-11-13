import { DateTime, Effect } from "effect";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Button } from "peal-ui/components/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "peal-ui/components/table";

import { AuditTable } from "#components/staff/audit-table.tsx";
import { Instant } from "#components/staff/instant.tsx";
import { Fact, Section } from "#components/staff/section.tsx";
import { UserActions } from "#components/staff/user-actions.tsx";
import { Link } from "#i18n/navigation.ts";
import { routing } from "#i18n/routing.ts";
import { staffRead } from "#staff/server.ts";

// One account: who it is, its ban, its workspaces and sessions, what staff
// may do to it, and what staff did. Never what it wrote.
const UserPage = async ({
  params,
}: PageProps<"/[locale]/admin/users/[userId]">) => {
  const { locale, userId } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const { history, staff, user } = await staffRead((client) =>
    Effect.all(
      {
        history: client.audit({ query: { targetId: userId } }),
        staff: client.session(),
        user: client.user({ params: { userId } }),
      },
      { concurrency: "unbounded" }
    )
  );

  const t = await getTranslations("Staff.user");
  const actions = await getTranslations("Staff.actions");
  const roles = await getTranslations("WorkspaceSettings");
  const staffT = await getTranslations("Staff");
  const twoStep = await getTranslations("TwoStep");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div>
          <Button
            variant="link"
            size="sm"
            render={<Link href="/admin/users" />}
          >
            {t("back")}
          </Button>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">{user.name}</h1>
        <p className="text-muted-foreground">{t("minimisation")}</p>
      </div>
      <Section title={t("profileTitle")}>
        <dl className="grid gap-4 sm:grid-cols-3">
          <Fact label={t("email")}>
            {user.email} (
            {t("emailVerified", { verified: String(user.emailVerified) })})
          </Fact>
          <Fact label={t("language")}>
            {t("languageName", { locale: user.locale })}
          </Fact>
          <Fact label={t("role")}>
            {t("roleName", { staff: String(user.staff) })}
          </Fact>
          <Fact label={t("created")}>
            <Instant value={DateTime.formatIso(user.createdAt)} />
          </Fact>
          <Fact label={t("lastSignIn")}>
            {user.lastSignInAt === null ? (
              staffT("never")
            ) : (
              <Instant value={DateTime.formatIso(user.lastSignInAt)} />
            )}
          </Fact>
          <Fact label={t("sessions")}>{user.sessions}</Fact>
          <Fact label={twoStep("staffField")}>
            {twoStep("staffValue", { on: String(user.twoStepEnabled) })}
          </Fact>
        </dl>
      </Section>
      <Section title={t("banTitle")}>
        {user.ban === null ? (
          <p className="text-sm">{t("notBanned")}</p>
        ) : (
          <div className="flex flex-col gap-1 text-sm">
            {user.ban.expiresAt === null ? (
              <p>{t("bannedForGood")}</p>
            ) : (
              <p>
                {t("bannedUntil")}{" "}
                <Instant value={DateTime.formatIso(user.ban.expiresAt)} />
              </p>
            )}
            {user.ban.reason === null ? null : (
              <p className="text-muted-foreground">
                {t("banReason", { reason: user.ban.reason })}
              </p>
            )}
          </div>
        )}
      </Section>
      <Section title={actions("title")}>
        <UserActions
          banned={user.ban !== null}
          email={user.email}
          emailVerified={user.emailVerified}
          name={user.name}
          self={user.id === staff.userId}
          staff={user.staff}
          twoStepEnabled={user.twoStepEnabled}
          userId={user.id}
        />
      </Section>
      <Section title={t("workspacesTitle")}>
        {user.workspaces.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("noWorkspace")}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("workspaceColumns.name")}</TableHead>
                <TableHead>{t("workspaceColumns.role")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {user.workspaces.map((workspace) => (
                <TableRow key={workspace.id}>
                  <TableCell>
                    <Link href={`/admin/workspaces/${workspace.id}`}>
                      {workspace.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {roles("role", { role: workspace.role })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Section>
      <Section title={t("historyTitle")}>
        <AuditTable events={history.items} />
      </Section>
    </div>
  );
};

export default UserPage;
