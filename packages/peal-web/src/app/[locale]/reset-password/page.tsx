import { Button } from "peal-ui/components/button";
import { Schema } from "effect";
import { getTranslations } from "next-intl/server";

import { AuthCard } from "#components/auth/auth-card.tsx";
import { ResetPasswordForm } from "#components/auth/reset-password-form.tsx";
import { Link } from "#i18n/navigation.ts";

const decodeToken = Schema.decodeUnknownOption(Schema.NonEmptyString);

// Where the reset link lands, once Better Auth checked its token: with the
// token to set the new password, or with ?error= when the link is invalid.
const ResetPasswordPage = async ({
  searchParams,
}: PageProps<"/[locale]/reset-password">) => {
  const { error, token } = await searchParams;
  const t = await getTranslations("ResetPasswordPage");
  const valid = decodeToken(token);

  if (error !== undefined || valid._tag === "None") {
    return (
      <AuthCard title={t("invalidTitle")} description={t("invalidDescription")}>
        <Button render={<Link href="/forgot-password" />} nativeButton={false}>
          {t("requestAgain")}
        </Button>
      </AuthCard>
    );
  }

  return (
    <AuthCard title={t("title")} description={t("description")}>
      <ResetPasswordForm token={valid.value} />
    </AuthCard>
  );
};

export default ResetPasswordPage;
