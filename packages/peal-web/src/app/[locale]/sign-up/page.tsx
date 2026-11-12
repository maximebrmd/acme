import { Option } from "effect";
import { getTranslations } from "next-intl/server";
import { connection } from "next/server";

import { signUpSettings } from "#auth/captcha.ts";
import { signUpFormShown } from "#auth/sign-up-mode.ts";
import { AuthCard } from "#components/auth/auth-card.tsx";
import { SignUpByInvitation } from "#components/auth/sign-up-by-invitation.tsx";
import { SignUpForm } from "#components/auth/sign-up-form.tsx";
import { Link } from "#i18n/navigation.ts";

// Read at request time: whether the server wants a captcha, and who may
// sign up, are its settings, not the build's. On a server where accounts
// are made by invitation, the form shows to a visitor an invitation's page
// sent here (?invitation=<id>); the server decides on the address.
const SignUpPage = async ({ searchParams }: PageProps<"/[locale]/sign-up">) => {
  await connection();

  const { invitation } = await searchParams;
  const t = await getTranslations("SignUpPage");
  const { mode, siteKey } = await signUpSettings();

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
      {signUpFormShown(mode, invitation) ? (
        <SignUpForm captchaSiteKey={Option.getOrNull(siteKey)} />
      ) : (
        <SignUpByInvitation />
      )}
    </AuthCard>
  );
};

export default SignUpPage;
