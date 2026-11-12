import { useTranslations } from "next-intl";
import { Alert, AlertDescription, AlertTitle } from "peal-ui/components/alert";

/**
 * In place of the sign-up form, on a server where accounts are made by
 * invitation, to a visitor no invitation sent: where to start from.
 */
export const SignUpByInvitation = () => {
  const t = useTranslations("SignUpPage");

  return (
    <Alert>
      <AlertTitle>{t("byInvitation")}</AlertTitle>
      <AlertDescription>{t("byInvitationDescription")}</AlertDescription>
    </Alert>
  );
};
