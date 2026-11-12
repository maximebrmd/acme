"use client";

import { useTranslations } from "next-intl";

import { Link, usePathname } from "#i18n/navigation.ts";

export type SettingsSection =
  | "apiKeys"
  | "assistant"
  | "channelSets"
  | "general"
  | "invitations"
  | "members"
  | "feeds"
  | "partner"
  | "queues"
  | "recycling"
  | "security"
  | "signatures"
  | "tags"
  | "webhooks";

const paths: Readonly<Record<SettingsSection, string>> = {
  apiKeys: "/api-keys",
  assistant: "/assistant",
  channelSets: "/channel-sets",
  feeds: "/feeds",
  general: "",
  invitations: "/invitations",
  members: "/members",
  partner: "/partner",
  queues: "/queues",
  recycling: "/recycling",
  security: "/security",
  signatures: "/signatures",
  tags: "/tags",
  webhooks: "/webhooks",
};

// The workspace settings' pages, the one open marked as current.
export const SettingsNav = ({
  sections,
  workspaceId,
}: {
  readonly sections: readonly SettingsSection[];
  readonly workspaceId: string;
}) => {
  const t = useTranslations("WorkspaceSettings.nav");
  const pathname = usePathname();

  return (
    <nav aria-label={t("label")} className="border-b">
      <ul className="flex flex-wrap gap-6 text-sm">
        {sections.map((section) => {
          const href = `/app/${workspaceId}/settings${paths[section]}`;

          return (
            <li key={section}>
              <Link
                href={href}
                aria-current={pathname === href ? "page" : undefined}
                className="text-muted-foreground hover:text-foreground aria-[current=page]:border-foreground aria-[current=page]:text-foreground -mb-px inline-block border-b-2 border-transparent pb-2"
              >
                {t(section)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};
