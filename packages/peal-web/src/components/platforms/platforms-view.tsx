"use client";

import {
  ChartColumnIcon,
  MessagesSquareIcon,
  SearchIcon,
  Trash2Icon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { Platform } from "peal-contract";
import { Badge } from "peal-ui/components/badge";
import { Input } from "peal-ui/components/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "peal-ui/components/table";
import { useId, useState } from "react";
import type { ReactNode } from "react";
import type { SimpleIcon } from "simple-icons";
import {
  siBluesky,
  siFacebook,
  siGoogle,
  siInstagram,
  siMastodon,
  siPinterest,
  siThreads,
  siTiktok,
  siX,
  siYoutube,
} from "simple-icons";

import { BrandMark } from "#components/shell/brand-mark.tsx";
import { rowMatches } from "#platforms/rows.ts";
import type { PlatformRow } from "#platforms/rows.ts";

// LinkedIn asked to be left out of simple-icons: a lettered tile stands in.
const marks: Readonly<Record<Platform, SimpleIcon | null>> = {
  bluesky: siBluesky,
  facebook: siFacebook,
  googleBusiness: siGoogle,
  instagram: siInstagram,
  linkedin: null,
  mastodon: siMastodon,
  pinterest: siPinterest,
  threads: siThreads,
  tiktok: siTiktok,
  x: siX,
  youtube: siYoutube,
};

const Capability = ({
  children,
  icon,
}: {
  readonly children: ReactNode;
  readonly icon: ReactNode;
}) => (
  <Badge variant="outline">
    {icon}
    {children}
  </Badge>
);

/**
 * The platforms this server posts to (DESIGN.md, "Lists"): a search, then
 * a table of what a post may hold on each, what Peal does there, and the
 * workspace's channels on it.
 */
export const PlatformsView = ({
  rows,
}: {
  readonly rows: readonly PlatformRow[];
}) => {
  const t = useTranslations("Platforms");
  const channels = useTranslations("ChannelsPage");
  const [query, setQuery] = useState("");
  const searchId = useId();

  const nameOf = (platform: Platform) => channels("platform", { platform });

  const capabilitiesOf = (row: PlatformRow): readonly string[] => [
    ...(row.followUps === null ? [] : [t(`followUps.${row.followUps}`)]),
    ...(row.analytics ? [t("analytics")] : []),
    ...(row.unpublish ? [t("unpublish")] : []),
  ];

  const shown = rows.filter((row) =>
    rowMatches(row, query, {
      capabilities: capabilitiesOf(row),
      name: nameOf(row.platform),
    })
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <SearchIcon aria-hidden className="text-muted-foreground size-4" />
        <label htmlFor={searchId} className="sr-only">
          {t("search")}
        </label>
        <Input
          id={searchId}
          type="search"
          value={query}
          placeholder={t("searchPlaceholder")}
          onChange={(event) => {
            setQuery(event.target.value);
          }}
        />
      </div>

      <div className="bg-card rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("columns.platform")}</TableHead>
              <TableHead>{t("columns.id")}</TableHead>
              <TableHead>{t("columns.text")}</TableHead>
              <TableHead>{t("columns.media")}</TableHead>
              <TableHead>{t("columns.capabilities")}</TableHead>
              <TableHead className="text-right">
                {t("columns.channels")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shown.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <p className="text-muted-foreground py-8 text-center">
                    {t("noMatch", { query: query.trim() })}
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              shown.map((row) => {
                const mark = marks[row.platform];

                return (
                  <TableRow key={row.platform}>
                    <TableCell>
                      <span className="flex items-center gap-2.5 font-medium">
                        {mark === null ? (
                          <span
                            aria-hidden
                            className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md text-xs font-bold"
                          >
                            in
                          </span>
                        ) : (
                          <span className="bg-card ring-border flex size-6 items-center justify-center rounded-md ring-1">
                            <BrandMark icon={mark} className="size-4" />
                          </span>
                        )}
                        {nameOf(row.platform)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <code className="text-muted-foreground font-mono">
                        {row.platform}
                      </code>
                    </TableCell>
                    <TableCell>
                      {row.textLimit === null
                        ? t("noLimit")
                        : t("textLimit", {
                            maximum: row.textLimit.maximum,
                            unit: row.textLimit.unit,
                          })}
                    </TableCell>
                    <TableCell>{t("media", { count: row.maxMedia })}</TableCell>
                    <TableCell>
                      <span className="flex flex-wrap gap-1">
                        {row.followUps === null ? null : (
                          <Capability icon={<MessagesSquareIcon aria-hidden />}>
                            {t(`followUps.${row.followUps}`)}
                          </Capability>
                        )}
                        {row.analytics ? (
                          <Capability icon={<ChartColumnIcon aria-hidden />}>
                            {t("analytics")}
                          </Capability>
                        ) : null}
                        {row.unpublish ? (
                          <Capability icon={<Trash2Icon aria-hidden />}>
                            {t("unpublish")}
                          </Capability>
                        ) : null}
                      </span>
                    </TableCell>
                    <TableCell variant="numeric">{row.channels}</TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
