import { Option, Schema } from "effect";
import { getTranslations } from "next-intl/server";

import { currentUser } from "#auth/session.ts";
import { AuthCard } from "#components/auth/auth-card.tsx";
import { DeviceApproval } from "#components/oauth/device-approval.tsx";
import { SignInToContinue } from "#components/oauth/sign-in-to-continue.tsx";

const decodeCode = Schema.decodeUnknownOption(Schema.String);

// Where the command line sends people to approve its sign-in, with
// ?user_code= when they open the link it prints. Signed out, they sign in
// first and come back here.
const DevicePage = async ({ searchParams }: PageProps<"/[locale]/device">) => {
  const { user_code: userCode } = await searchParams;
  const t = await getTranslations("OAuth.device");
  const code = Option.getOrElse(decodeCode(userCode), () => "");
  const me = await currentUser();

  if (Option.isNone(me)) {
    const back = new URLSearchParams(code === "" ? {} : { user_code: code });

    return (
      <SignInToContinue
        title={t("title")}
        query={{ next: `/device?${back.toString()}` }}
      />
    );
  }

  return (
    <AuthCard title={t("title")} description={t("description")}>
      <DeviceApproval initialCode={code} />
    </AuthCard>
  );
};

export default DevicePage;
