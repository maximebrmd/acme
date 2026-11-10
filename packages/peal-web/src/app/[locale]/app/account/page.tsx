import { Option } from "effect";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "peal-ui/components/card";
import type { ReactNode } from "react";

import { accountClosure } from "#auth/closure.ts";
import { currentUser } from "#auth/session.ts";
import { ConnectedAppsList } from "#components/account/connected-apps-list.tsx";
import { DeleteAccount } from "#components/account/delete-account.tsx";
import { ExportData } from "#components/account/export-data.tsx";
import { LanguageForm } from "#components/account/language-form.tsx";
import { LegalHoldNotice } from "#components/account/legal-hold-notice.tsx";
import { PasswordForm } from "#components/account/password-form.tsx";
import { ProfileForm } from "#components/account/profile-form.tsx";
import { SessionsList } from "#components/account/sessions-list.tsx";
import { redirect } from "#i18n/navigation.ts";
import { routing } from "#i18n/routing.ts";

const Section = ({
  children,
  description,
  title,
}: {
  readonly children: ReactNode;
  readonly description: string;
  readonly title: string;
}) => (
  <Card>
    <CardHeader>
      <CardTitle>
        <h2>{title}</h2>
      </CardTitle>
      <CardDescription>{description}</CardDescription>
    </CardHeader>
    <CardContent>{children}</CardContent>
  </Card>
);

// The signed-in user's account: their name and language, password,
// sessions, connected applications, and their rights over their data.
const AccountPage = async ({ params }: PageProps<"/[locale]/app/account">) => {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const me = await currentUser();

  if (Option.isNone(me)) {
    return redirect({ href: "/sign-in", locale });
  }

  const { user } = me.value;
  const t = await getTranslations("AccountSettings");
  // What this server keeps of a closed account for the law, if anything.
  const { legalHold } = await accountClosure();

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">
          {t("description", { email: user.email })}
        </p>
      </div>
      <Section
        title={t("profile.title")}
        description={t("profile.description")}
      >
        <ProfileForm name={user.name} />
      </Section>
      <Section
        title={t("language.title")}
        description={t("language.description")}
      >
        <LanguageForm saved={user.locale} />
      </Section>
      <Section
        title={t("password.title")}
        description={t("password.description")}
      >
        <PasswordForm />
      </Section>
      <Section
        title={t("sessions.title")}
        description={t("sessions.description")}
      >
        <SessionsList />
      </Section>
      <Section title={t("apps.title")} description={t("apps.description")}>
        <ConnectedAppsList />
      </Section>
      <Section
        title={t("export.title")}
        description={
          legalHold === null
            ? t("export.description")
            : `${t("export.description")} ${t("legalHold.exported")}`
        }
      >
        <ExportData />
      </Section>
      <Section title={t("delete.title")} description={t("delete.description")}>
        <DeleteAccount legalHold={<LegalHoldNotice legalHold={legalHold} />} />
      </Section>
    </div>
  );
};

export default AccountPage;
