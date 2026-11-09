import { Option } from "effect";
import { getTranslations } from "next-intl/server";

import { nextPathOf } from "#auth/next-path.ts";
import { AuthCard } from "#components/auth/auth-card.tsx";
import { SignInForm } from "#components/auth/sign-in-form.tsx";
import { Link } from "#i18n/navigation.ts";

// ?next= names where to go once signed in, as the /device page asks.
const SignInPage = async ({ searchParams }: PageProps<"/[locale]/sign-in">) => {
  const { next } = await searchParams;
  const t = await getTranslations("SignInPage");

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
      <SignInForm next={Option.getOrElse(nextPathOf(next), () => "/app")} />
    </AuthCard>
  );
};

export default SignInPage;
