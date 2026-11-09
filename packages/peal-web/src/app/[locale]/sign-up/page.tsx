import { Option } from "effect";
import { getTranslations } from "next-intl/server";
import { connection } from "next/server";

import { captchaSiteKey } from "#auth/captcha.ts";
import { AuthCard } from "#components/auth/auth-card.tsx";
import { SignUpForm } from "#components/auth/sign-up-form.tsx";
import { Link } from "#i18n/navigation.ts";

// Read at request time: whether the server wants a captcha is its setting,
// not the build's.
const SignUpPage = async () => {
  await connection();

  const t = await getTranslations("SignUpPage");
  const siteKey = await captchaSiteKey();

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
      <SignUpForm captchaSiteKey={Option.getOrNull(siteKey)} />
    </AuthCard>
  );
};

export default SignUpPage;
