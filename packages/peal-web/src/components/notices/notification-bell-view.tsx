"use client";

import { Badge } from "peal-ui/components/badge";
import { Button } from "peal-ui/components/button";
import { Option } from "effect";
import { BellIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactElement } from "react";

/**
 * The bell itself: `link`, to the notices, labelled with how many are
 * unread, with a status region that says so when new ones arrive.
 */
export const NotificationBellView = ({
  announcement,
  link,
  unread,
}: {
  // What the status region says: new notices since the page opened.
  readonly announcement: string;
  readonly link: ReactElement;
  readonly unread: Option.Option<number>;
}) => {
  const t = useTranslations("Notices.bell");
  const count = Option.getOrElse(unread, () => 0);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        render={link}
        nativeButton={false}
        aria-label={t("label", { count })}
      >
        <BellIcon data-icon="inline-start" aria-hidden />
        {count > 0 ? (
          <Badge aria-hidden>{count > 99 ? t("many") : count}</Badge>
        ) : null}
      </Button>
      <output className="sr-only">{announcement}</output>
    </>
  );
};
