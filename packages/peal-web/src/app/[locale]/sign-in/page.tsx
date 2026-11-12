import { Option } from "effect";
import { getTranslations } from "next-intl/server";
import { connection } from "next/server";

import { signUpSettings } from "#auth/captcha.ts";
import { nextPathOf } from "#auth/next-path.ts";
import { offersSignUp } from "#auth/sign-up-mode.ts";
import { AuthCard } from "#components/auth/auth-card.tsx";
import { SignInForm } from "#components/auth/sign-in-form.tsx";
import { Link } from "#i18n/navigation.ts";

// ?next= names where to go once signed in, as the /device page asks. The
// link to sign up shows only where anyone may, which the server says at
// request time.
const SignInPage = async ({ searchParams }: PageProps<"/[locale]/sign-in">) => {
  await connection();

  const { next } = await searchParams;
  const { mode } = await signUpSettings();
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
          {offersSignUp(mode) ? (
            <p>
              {t("noAccount")}{" "}
              <Link href="/sign-up" className="text-foreground underline">
                {t("signUp")}
              </Link>
            </p>
          ) : null}
        </>
      }
    >
      <SignInForm next={Option.getOrElse(nextPathOf(next), () => "/app")} />
    </AuthCard>
  );
};

export default SignInPage;
