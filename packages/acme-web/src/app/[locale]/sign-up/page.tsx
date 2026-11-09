import { useTranslations } from "next-intl";

import { AuthCard } from "#components/auth/auth-card.tsx";
import { SignUpForm } from "#components/auth/sign-up-form.tsx";
import { Link } from "#i18n/navigation.ts";

const SignUpPage = () => {
  const t = useTranslations("SignUpPage");

  return (
    <AuthCard
      title={t("title")}
      description={t("description")}
      footer={
        <p>
          {t("haveAccount")}{" "}
          <Link href="/sign-in" className="text-foreground underline">
            {t("signIn")}
          </Link>
        </p>
      }
    >
      <SignUpForm />
    </AuthCard>
  );
};

export default SignUpPage;
