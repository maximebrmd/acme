"use client";

import type { LucideIcon } from "lucide-react";
import {
  CableIcon,
  CalendarDaysIcon,
  ChartColumnIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsUpDownIcon,
  CircleCheckIcon,
  CodeXmlIcon,
  CreditCardIcon,
  FileTextIcon,
  FileUpIcon,
  HouseIcon,
  ImageIcon,
  InboxIcon,
  KeyRoundIcon,
  LayersIcon,
  LayoutGridIcon,
  ListOrderedIcon,
  MailIcon,
  MegaphoneIcon,
  PenLineIcon,
  RecycleIcon,
  ReplyIcon,
  RssIcon,
  SettingsIcon,
  ShieldIcon,
  SlidersHorizontalIcon,
  SparklesIcon,
  SquarePenIcon,
  TagIcon,
  UsersIcon,
  WebhookIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "peal-ui/components/dropdown-menu";
import { cn } from "peal-ui/lib/utils";
import { useState } from "react";
import type { ComponentProps, ComponentType, ReactNode } from "react";

import { useCloseMenu } from "#components/shell/frame-view.tsx";
import { PealMark } from "#components/shell/peal-mark.tsx";
import type { Link, Mode, Navigation, Page } from "#shell/navigation.ts";

/** A link of the app, which the container makes from next-intl's. */
export type LinkComponent = ComponentType<{
  readonly "aria-current"?: "page";
  readonly children: ReactNode;
  readonly className?: string;
  readonly href: string;
  readonly onClick?: () => void;
}>;

const icons: Readonly<Record<Page, LucideIcon>> = {
  ads: MegaphoneIcon,
  analytics: ChartColumnIcon,
  apiKeys: KeyRoundIcon,
  approvals: CircleCheckIcon,
  assistant: SparklesIcon,
  billing: CreditCardIcon,
  calendar: CalendarDaysIcon,
  channelSets: LayersIcon,
  channels: CableIcon,
  drafts: FileTextIcon,
  feeds: RssIcon,
  general: SettingsIcon,
  home: HouseIcon,
  import: FileUpIcon,
  inbox: InboxIcon,
  invitations: MailIcon,
  media: ImageIcon,
  members: UsersIcon,
  partner: UsersIcon,
  platforms: LayoutGridIcon,
  posts: SquarePenIcon,
  queues: ListOrderedIcon,
  recycling: RecycleIcon,
  followUps: ReplyIcon,
  security: ShieldIcon,
  signatures: PenLineIcon,
  tags: TagIcon,
  webhooks: WebhookIcon,
};

const modeIcons: Readonly<Record<Mode, LucideIcon>> = {
  console: CodeXmlIcon,
  studio: SquarePenIcon,
};

// The open mode's segment: ink in Console, so the mode shows at a glance.
const currentModeClass: Readonly<Record<Mode, string>> = {
  console: "bg-primary text-primary-foreground font-medium shadow-xs",
  studio: "bg-card ring-border font-medium shadow-xs ring-1",
};

export const itemClass =
  "flex h-8.5 items-center gap-2.5 rounded-md px-2.5 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent aria-[current=page]:bg-sidebar-accent aria-[current=page]:font-medium aria-[current=page]:text-sidebar-accent-foreground [&_svg]:size-4 [&_svg]:shrink-0";

const ModeSwitch = ({
  link: LinkTo,
  mode,
  modes,
  onNavigate,
}: {
  readonly link: LinkComponent;
  readonly mode: Mode;
  readonly modes: Navigation["modes"];
  readonly onNavigate?: () => void;
}) => {
  const t = useTranslations("WorkspaceShell");

  return (
    <div className="bg-secondary ring-border flex w-full items-center gap-0.75 rounded-lg p-0.75 ring-1 ring-inset">
      <span
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-md",
          mode === "console"
            ? "bg-primary"
            : "bg-card ring-border shadow-xs ring-1"
        )}
      >
        <PealMark className="size-4.5" label={t("productName")} />
      </span>
      <nav
        aria-label={t("modes.label")}
        className="grid flex-1 grid-cols-2 gap-0.5"
      >
        {(["studio", "console"] as const).map((each) => {
          const Icon = modeIcons[each];
          const href = modes[each];

          const content = (
            <>
              <Icon aria-hidden />
              {t(`modes.${each}`)}
            </>
          );

          const shared =
            "flex h-7 items-center justify-center gap-1.5 rounded-md text-sm [&_svg]:size-3.5";

          if (href === null) {
            return (
              <span
                key={each}
                aria-disabled
                title={t("modes.unavailable")}
                className={cn(
                  shared,
                  "text-muted-foreground/60 cursor-not-allowed"
                )}
              >
                {content}
              </span>
            );
          }

          const current = each === mode;

          return (
            <LinkTo
              key={each}
              href={href}
              {...(current ? { "aria-current": "page" as const } : {})}
              {...(onNavigate === undefined ? {} : { onClick: onNavigate })}
              className={cn(
                shared,
                current
                  ? currentModeClass[each]
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {content}
            </LinkTo>
          );
        })}
      </nav>
    </div>
  );
};

const NavLink = ({
  label,
  link: LinkTo,
  onNavigate,
  target,
}: {
  readonly label: string;
  readonly link: LinkComponent;
  readonly onNavigate?: () => void;
  readonly target: Link;
}) => {
  const Icon = icons[target.page];

  return (
    <LinkTo
      href={target.href}
      className={itemClass}
      {...(target.current ? { "aria-current": "page" as const } : {})}
      {...(onNavigate === undefined ? {} : { onClick: onNavigate })}
    >
      <Icon aria-hidden />
      <span className="flex-1 truncate">{label}</span>
      {target.opens === null ? null : (
        <ChevronRightIcon aria-hidden className="text-muted-foreground" />
      )}
    </LinkTo>
  );
};

// The workspace switcher's button, which the menu's trigger renders with its
// own props and ref.
const SwitcherButton = ({ className, ...props }: ComponentProps<"button">) => (
  <button
    type="button"
    className={cn(
      "hover:bg-sidebar-accent flex h-15 shrink-0 items-center gap-2.5 border-t px-3.5 text-left",
      className
    )}
    {...props}
  />
);

/**
 * The workspace's sidebar (DESIGN.md, "The frame"): the mode switch with
 * Peal's mark, the mode's pages in groups, or the open section's pages
 * under a way back, Settings, and the workspace switcher at its foot.
 */
export const SidebarView = ({
  className,
  link,
  navigation,
  onNavigate,
  workspaceId,
  workspaces,
}: {
  readonly className?: string;
  readonly link: LinkComponent;
  readonly navigation: Navigation;
  /** Called when a link is followed, to close the sidebar on a phone. */
  readonly onNavigate?: () => void;
  readonly workspaceId: string;
  readonly workspaces: readonly {
    readonly id: string;
    readonly name: string;
  }[];
}) => {
  const closeMenu = useCloseMenu();
  const navigated = onNavigate ?? closeMenu;
  const t = useTranslations("WorkspaceShell");
  // Back closes the section on the page it was chosen on; following a link
  // that opens a section, or moving to another page, opens it again.
  const [closedOn, setClosedOn] = useState<Page | null>(null);

  const section =
    navigation.section !== null && closedOn !== navigation.current
      ? navigation.section
      : null;

  const followed = (target: Link) => () => {
    if (target.opens !== null) {
      setClosedOn(null);
    }

    navigated();
  };

  const LinkTo = link;
  const current = workspaces.find(({ id }) => id === workspaceId);
  const others = workspaces.filter(({ id }) => id !== workspaceId);

  const labelOf = (target: Link): string =>
    section === "posts" && target.page === "posts"
      ? t("pages.allPosts")
      : t(`pages.${target.page}`);

  return (
    <div
      className={cn(
        "bg-sidebar text-sidebar-foreground flex h-full w-60 flex-col",
        className
      )}
    >
      <div className="flex h-14 shrink-0 items-center border-b px-2.5">
        <ModeSwitch
          link={link}
          mode={navigation.mode}
          modes={navigation.modes}
          onNavigate={navigated}
        />
      </div>

      <nav
        aria-label={t("label")}
        className="flex flex-1 flex-col gap-4 overflow-y-auto px-2.5 py-3"
      >
        {section === null ? (
          navigation.groups.map(({ group, links }) => (
            <div key={group ?? "main"} className="flex flex-col gap-px">
              {group === null ? null : (
                <p className="text-muted-foreground px-2.5 pb-1.5 text-xs">
                  {t(`groups.${group}`)}
                </p>
              )}
              {links.map((target) => (
                <NavLink
                  key={target.page}
                  label={labelOf(target)}
                  link={link}
                  target={target}
                  onNavigate={followed(target)}
                />
              ))}
            </div>
          ))
        ) : (
          <div className="flex flex-col gap-px">
            <button
              type="button"
              aria-label={t("back", { section: t(`sections.${section}`) })}
              onClick={() => {
                setClosedOn(navigation.current);
              }}
              className="text-muted-foreground hover:text-foreground mb-1 flex h-7 items-center gap-1.5 px-2 text-sm [&_svg]:size-3.5"
            >
              <ChevronLeftIcon aria-hidden />
              {t(`sections.${section}`)}
            </button>
            {navigation.sectionLinks.map((target) => (
              <NavLink
                key={target.page}
                label={labelOf(target)}
                link={link}
                target={target}
                onNavigate={followed(target)}
              />
            ))}
          </div>
        )}
      </nav>

      <div className="px-2.5 pb-2">
        <LinkTo
          href={navigation.settings.href}
          className={itemClass}
          {...(navigation.settings.current
            ? { "aria-current": "page" as const }
            : {})}
          onClick={followed(navigation.settings)}
        >
          <SlidersHorizontalIcon aria-hidden />
          <span className="flex-1">{t("sections.settings")}</span>
          <ChevronRightIcon aria-hidden className="text-muted-foreground" />
        </LinkTo>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={<SwitcherButton aria-label={t("workspaces.label")} />}
        >
          <span className="bg-brand-tint text-brand-text flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
            {(current?.name ?? "?").slice(0, 2).toUpperCase()}
          </span>
          <span className="min-w-0 flex-1 truncate text-sm font-medium">
            {current?.name ?? ""}
          </span>
          <ChevronsUpDownIcon
            aria-hidden
            className="text-muted-foreground size-4"
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" side="top" className="w-56">
          {others.length === 0 ? null : (
            <>
              <DropdownMenuLabel>{t("workspaces.switch")}</DropdownMenuLabel>
              {others.map(({ id, name }) => (
                <DropdownMenuItem
                  key={id}
                  render={
                    <LinkTo href={`/app/${id}`} onClick={navigated}>
                      {name}
                    </LinkTo>
                  }
                />
              ))}
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem
            render={
              <LinkTo href="/app" onClick={navigated}>
                {t("workspaces.all")}
              </LinkTo>
            }
          />
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
