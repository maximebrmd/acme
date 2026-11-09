import { Option } from "effect";
import { getTranslations } from "next-intl/server";
import { connection } from "next/server";

import { captchaSiteKey } from "#auth/captcha.ts";
import { AuthCard } from "#components/auth/auth-card.tsx";
import { ForgotPasswordForm } from "#components/auth/forgot-password-form.tsx";
import { Link } from "#i18n/navigation.ts";

// Read at request time: whether the server wants a captcha is its setting,
// not the build's.
const ForgotPasswordPage = async () => {
  await connection();

  const t = await getTranslations("ForgotPasswordPage");
  const siteKey = await captchaSiteKey();

  return (
    <AuthCard
      title={t("title")}
      description={t("description")}
      footer={
        <Link href="/sign-in" className="text-foreground underline">
          {t("back")}
        </Link>
      }
    >
      <ForgotPasswordForm captchaSiteKey={Option.getOrNull(siteKey)} />
    </AuthCard>
  );
};

export default ForgotPasswordPage;
