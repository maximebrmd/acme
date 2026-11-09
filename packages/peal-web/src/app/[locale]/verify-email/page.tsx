import { getTranslations } from "next-intl/server";
import { Button } from "peal-ui/components/button";

import { AuthCard } from "#components/auth/auth-card.tsx";
import { ResendVerificationForm } from "#components/auth/resend-verification-form.tsx";
import { Link } from "#i18n/navigation.ts";

// Where the confirmation link lands. Better Auth has already checked the
// token: it signed the user in, or added ?error= when the link was invalid
// or expired.
const VerifyEmailPage = async ({
  searchParams,
}: PageProps<"/[locale]/verify-email">) => {
  const { error } = await searchParams;
  const t = await getTranslations("VerifyEmailPage");

  if (error !== undefined) {
    return (
      <AuthCard title={t("invalidTitle")} description={t("invalidDescription")}>
        <ResendVerificationForm />
      </AuthCard>
    );
  }

  return (
    <AuthCard title={t("title")} description={t("description")}>
      <Button render={<Link href="/app" />} nativeButton={false}>
        {t("continue")}
      </Button>
    </AuthCard>
  );
};

export default VerifyEmailPage;
