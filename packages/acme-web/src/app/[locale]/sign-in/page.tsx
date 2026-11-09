import { useTranslations } from "next-intl";

import { AuthCard } from "#components/auth/auth-card.tsx";
import { SignInForm } from "#components/auth/sign-in-form.tsx";
import { Link } from "#i18n/navigation.ts";

const SignInPage = () => {
  const t = useTranslations("SignInPage");

  return (
    <AuthCard
      title={t("title")}
      description={t("description")}
      footer={
        <>
          <Link href="/forgot-password" className="text-foreground underline">
            {t("forgotPassword")}
          </Link>
          <p>
            {t("noAccount")}{" "}
            <Link href="/sign-up" className="text-foreground underline">
              {t("signUp")}
            </Link>
          </p>
        </>
      }
    >
      <SignInForm />
    </AuthCard>
  );
};

export default SignInPage;
