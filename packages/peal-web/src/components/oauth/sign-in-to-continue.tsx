import { Button } from "peal-ui/components/button";
import { getTranslations } from "next-intl/server";

import { AuthCard } from "#components/auth/auth-card.tsx";
import { Link } from "#i18n/navigation.ts";

type Query = Readonly<Record<string, string | string[] | undefined>>;

// A page of an OAuth flow, opened without a session: signing in with the
// same query carries the flow on, as Better Auth's client sends that query
// with the sign-in. `description` says what comes after, when the page has
// more to say than that signing in comes first.
export const SignInToContinue = async ({
  description,
  query,
  title,
}: {
  readonly description?: string;
  readonly query: Query;
  readonly title: string;
}) => {
  const t = await getTranslations("OAuth");

  return (
    <AuthCard title={title} description={description ?? t("signedOut")}>
      <Button
        render={<Link href={{ pathname: "/sign-in", query }} />}
        nativeButton={false}
      >
        {t("signIn")}
      </Button>
    </AuthCard>
  );
};
