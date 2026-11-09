import { Button } from "peal-ui/components/button";
import { Option } from "effect";
import { getTranslations } from "next-intl/server";

import { currentUser } from "#auth/session.ts";
import { AcceptInvitation } from "#components/accept-invitation.tsx";
import { AuthCard } from "#components/auth/auth-card.tsx";
import { Link } from "#i18n/navigation.ts";

// Where an invitation email's link lands. The invitee accepts while signed
// in with the address the invitation went to.
const InvitationPage = async ({
  params,
}: PageProps<"/[locale]/invitations/[id]">) => {
  const { id } = await params;
  const t = await getTranslations("InvitationPage");
  const me = await currentUser();

  return (
    <AuthCard title={t("title")} description={t("description")}>
      {Option.isSome(me) ? (
        <AcceptInvitation invitationId={id} />
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-muted-foreground text-sm">{t("signedOut")}</p>
          <div className="flex gap-2">
            <Button render={<Link href="/sign-in" />} nativeButton={false}>
              {t("signIn")}
            </Button>
            <Button
              variant="outline"
              render={<Link href="/sign-up" />}
              nativeButton={false}
            >
              {t("signUp")}
            </Button>
          </div>
        </div>
      )}
    </AuthCard>
  );
};

export default InvitationPage;
