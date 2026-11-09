import { Option, Schema } from "effect";
import { getTranslations } from "next-intl/server";

import { clientName } from "#auth/oauth-client.ts";
import { currentUser } from "#auth/session.ts";
import { AuthCard } from "#components/auth/auth-card.tsx";
import { OAuthConsent } from "#components/oauth/oauth-consent.tsx";
import { SignInToContinue } from "#components/oauth/sign-in-to-continue.tsx";

const decodeText = Schema.decodeUnknownOption(Schema.NonEmptyString);

const decodeUrl = Schema.decodeUnknownOption(Schema.URLFromString);

// The consent page of an OAuth authorization: Better Auth sends people here
// with the authorization's signed query, which names the client, the
// scopes it asks for and where it sends them back. The client may have
// registered itself, so its name is its own claim: the page says so.
const OAuthConsentPage = async ({
  searchParams,
}: PageProps<"/[locale]/oauth/consent">) => {
  const query = await searchParams;
  const t = await getTranslations("OAuth.consent");
  const oauth = await getTranslations("OAuth");
  const me = await currentUser();
  const clientId = decodeText(query["client_id"]);

  const name = Option.isSome(clientId)
    ? await clientName(clientId.value)
    : Option.none();

  const title = t("title", {
    client: Option.getOrElse(name, () => oauth("unknownClient")),
  });

  if (Option.isNone(me)) {
    return <SignInToContinue title={title} query={query} />;
  }

  const scopes = decodeText(query["scope"]).pipe(
    Option.map((scope) => scope.split(" ").filter((part) => part !== "")),
    Option.getOrElse((): readonly string[] => [])
  );

  const redirectHost = decodeUrl(query["redirect_uri"]).pipe(
    Option.map((url) => url.host),
    Option.getOrNull
  );

  return (
    <AuthCard title={title} description={t("description")}>
      <OAuthConsent redirectHost={redirectHost} scopes={scopes} />
    </AuthCard>
  );
};

export default OAuthConsentPage;
