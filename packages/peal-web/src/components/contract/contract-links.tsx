import { getTranslations } from "next-intl/server";

import { contractFunctions } from "#contract/functions.ts";
import { Link } from "#i18n/navigation.ts";

/**
 * The functions to cancel a contract and to withdraw from one, at the
 * foot of every page, under the words French law gives them (Code de la
 * consommation D215-1 and D221-5): always there, without signing in, as
 * the law wants them easy to reach for as long as a right runs. A server
 * that sells no subscription has no contract, and shows neither.
 */
export const ContractLinks = async () => {
  const { enabled } = await contractFunctions();

  if (!enabled) {
    return null;
  }

  const t = await getTranslations("Contract.links");

  return (
    <nav aria-label={t("label")}>
      <ul className="flex flex-wrap gap-x-6 gap-y-2">
        <li>
          <Link href="/cancel" className="underline underline-offset-4">
            {t("cancel")}
          </Link>
        </li>
        <li>
          <Link href="/withdraw" className="underline underline-offset-4">
            {t("withdraw")}
          </Link>
        </li>
      </ul>
    </nav>
  );
};
