import { useTranslations } from "next-intl";
import type { AccountClosure } from "peal-contract";

/**
 * What the law has this server keep of the account once it is closed, as
 * `GET /api/me/closure` says: nothing on most servers, and then nothing is
 * shown. Where French law obliges the operator, who held the account, how
 * they signed in and the connections that created content, for the years
 * the server gives; on a server that stopped keeping these, only the
 * connections it already holds.
 */
export const LegalHoldNotice = ({
  legalHold,
}: {
  readonly legalHold: AccountClosure["legalHold"];
}) => {
  const t = useTranslations("AccountSettings.legalHold");

  if (legalHold === null) {
    return null;
  }

  const { accountYears, connectionYears, identityYears } = legalHold;

  return accountYears === null || identityYears === null
    ? t("connections", { connectionYears })
    : t("identification", { accountYears, identityYears });
};
