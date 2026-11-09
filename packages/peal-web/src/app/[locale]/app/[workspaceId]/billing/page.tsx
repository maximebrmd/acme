import { Button } from "acme-ui/components/button";
import { Option } from "effect";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { currentUser } from "#auth/session.ts";
import { BillingScreen } from "#components/billing/billing-screen.tsx";
import { Link, redirect } from "#i18n/navigation.ts";
import { routing } from "#i18n/routing.ts";

// A workspace's billing, for members with billing:read: its plan, what it
// uses of it, and, for those with billing:manage, checkout and the billing
// portal. Stripe sends the browser back here with ?checkout=done.
const BillingPage = async ({
  params,
  searchParams,
}: PageProps<"/[locale]/app/[workspaceId]/billing">) => {
  const { locale, workspaceId } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const me = await currentUser();

  if (Option.isNone(me)) {
    return redirect({ href: "/sign-in", locale });
  }

  const workspace = me.value.workspaces.find(({ id }) => id === workspaceId);

  if (
    workspace === undefined ||
    !workspace.permissions.includes("billing:read")
  ) {
    notFound();
  }

  const t = await getTranslations("Billing");
  const { checkout } = await searchParams;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <div>
          <Button
            variant="link"
            size="sm"
            render={<Link href="/app" />}
            nativeButton={false}
          >
            {t("back")}
          </Button>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">
          {t("description", { workspace: workspace.name })}
        </p>
      </div>
      <BillingScreen
        workspaceId={workspace.id}
        canManage={workspace.permissions.includes("billing:manage")}
        checkedOut={checkout === "done"}
      />
    </div>
  );
};

export default BillingPage;
