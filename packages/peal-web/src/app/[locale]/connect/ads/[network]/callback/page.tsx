import { Option, Schema } from "effect";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { AdNetworkSchema } from "peal-contract";

import { AdSignInCallbackSchema } from "#ads/sign-in-callback.ts";
import { CompleteAdSignIn } from "#components/ads/complete-ad-sign-in.tsx";
import { AuthCard } from "#components/auth/auth-card.tsx";

const decodeNetwork = Schema.decodeUnknownOption(AdNetworkSchema);

const decodeCallback = Schema.decodeUnknownOption(AdSignInCallbackSchema);

// Where an ad network sends the browser back after someone signs in there,
// with the state, and a code or an error, in the address: the redirect URI
// Peal registers is this page, for every workspace.
const AdSignInCallbackPage = async ({
  params,
  searchParams,
}: PageProps<"/[locale]/connect/ads/[network]/callback">) => {
  const { network } = await params;
  const known = decodeNetwork(network);

  if (Option.isNone(known)) {
    notFound();
  }

  const callback = decodeCallback(await searchParams);
  const t = await getTranslations("Ads.callback");

  return (
    <AuthCard title={t("title")} description={t("description")}>
      <CompleteAdSignIn
        network={known.value}
        callback={Option.getOrNull(callback)}
      />
    </AuthCard>
  );
};

export default AdSignInCallbackPage;
