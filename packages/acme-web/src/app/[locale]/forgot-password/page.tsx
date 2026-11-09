import { useTranslations } from "next-intl";

import { AuthCard } from "#components/auth/auth-card.tsx";
import { ForgotPasswordForm } from "#components/auth/forgot-password-form.tsx";
import { Link } from "#i18n/navigation.ts";

const ForgotPasswordPage = () => {
  const t = useTranslations("ForgotPasswordPage");

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
      <ForgotPasswordForm />
    </AuthCard>
  );
};

export default ForgotPasswordPage;
