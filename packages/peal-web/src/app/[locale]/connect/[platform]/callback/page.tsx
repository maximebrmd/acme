import { Option, Schema } from "effect";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { ConnectCallbackSchema, PlatformSchema } from "peal-contract";

import { AuthCard } from "#components/auth/auth-card.tsx";
import { UpgradePrompts } from "#components/billing/upgrade-prompts.tsx";
import { CompleteConnection } from "#components/channels/complete-connection.tsx";

const decodePlatform = Schema.decodeUnknownOption(PlatformSchema);

const decodeCallback = Schema.decodeUnknownOption(ConnectCallbackSchema);

// Where a platform sends the browser back after the member signs in there,
// with the state, and a code or an error, in the address: the redirect URI
// Peal registers is this page, for every workspace.
const ConnectCallbackPage = async ({
  params,
  searchParams,
}: PageProps<"/[locale]/connect/[platform]/callback">) => {
  const { platform } = await params;
  const known = decodePlatform(platform);

  if (Option.isNone(known)) {
    notFound();
  }

  const callback = decodeCallback(await searchParams);
  const t = await getTranslations("ConnectCallbackPage");

  return (
    <AuthCard title={t("title")} description={t("description")}>
      <UpgradePrompts current={null}>
        <CompleteConnection
          platform={known.value}
          callback={Option.getOrNull(callback)}
        />
      </UpgradePrompts>
    </AuthCard>
  );
};

export default ConnectCallbackPage;
