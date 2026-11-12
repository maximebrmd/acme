import { DateTime } from "effect";
import { getTranslations } from "next-intl/server";
import type { StaffShortLink } from "peal-contract";

import { Instant } from "#components/staff/instant.tsx";
import { ShortLinkSwitch } from "#components/staff/short-link-switch.tsx";
import { Link } from "#i18n/navigation.ts";

/** A short link as staff read it, with the switch that turns it off or on. */
export const ShortLinkDetails = async ({
  link,
}: {
  readonly link: StaffShortLink;
}) => {
  const t = await getTranslations("Staff.shortLinks");

  return (
    <div className="flex flex-col gap-6">
      <dl className="grid max-w-2xl grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
        <dt className="text-muted-foreground">{t("code")}</dt>
        <dd className="font-mono">{link.code}</dd>
        <dt className="text-muted-foreground">{t("destination")}</dt>
        <dd className="break-all">{link.destination}</dd>
        <dt className="text-muted-foreground">{t("workspace")}</dt>
        <dd>
          <Link href={`/admin/workspaces/${link.workspaceId}`}>
            {link.workspaceId}
          </Link>
        </dd>
        <dt className="text-muted-foreground">{t("post")}</dt>
        <dd className="font-mono">{link.postId}</dd>
        <dt className="text-muted-foreground">{t("created")}</dt>
        <dd>
          <Instant value={DateTime.formatIso(link.createdAt)} />
        </dd>
        <dt className="text-muted-foreground">{t("state")}</dt>
        <dd>
          {link.disabledAt === null ? (
            t("on")
          ) : (
            <>
              {t("off")} <Instant value={DateTime.formatIso(link.disabledAt)} />
            </>
          )}
        </dd>
      </dl>
      <ShortLinkSwitch code={link.code} disabled={link.disabled} />
    </div>
  );
};
